import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { ImpactFrame, VideoMetadata } from '../types';
import { applyLayers, applyAdjustments } from '../effects/effectRegistry';

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<boolean> | null = null;

async function ensureLoaded(): Promise<FFmpeg> {
  if (!ffmpegInstance) {
    ffmpegInstance = new FFmpeg();
  }
  if (ffmpegInstance.loaded) return ffmpegInstance;

  if (!loadPromise) {
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm';
    loadPromise = ffmpegInstance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
  }
  await loadPromise;
  return ffmpegInstance;
}

async function loadImageToCanvas(
  ctx: CanvasRenderingContext2D,
  bytes: Uint8Array,
  width: number,
  height: number,
): Promise<void> {
  const plainBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([plainBuffer], { type: 'image/png' });
  const url = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve();
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load extracted frame image'));
    };
    img.src = url;
  });
}

async function renderFrameToUint8(
  frame: ImpactFrame,
  meta: VideoMetadata,
  ffmpeg: FFmpeg,
): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = meta.width;
  canvas.height = meta.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, meta.width, meta.height);

  // Adjustments like invert/B&W/dither operate on video pixels.
  // Use FFmpeg (which already has input.mp4 in its VFS) to extract
  // the exact frame, draw it on canvas, then apply adjustments.
  // This matches the preview pipeline exactly.
  const needsVideoPixels =
    frame.adjustments.invertColor ||
    frame.adjustments.bAndW ||
    frame.adjustments.dithering !== 'none';

  if (needsVideoPixels) {
    const t = (frame.videoFrameNumber / meta.fps).toFixed(6);
    await ffmpeg.exec(['-ss', t, '-i', 'input.mp4', '-vframes', '1', '_frame.png']);
    const raw = await ffmpeg.readFile('_frame.png');
    await ffmpeg.deleteFile('_frame.png');
    const bytes = raw instanceof Uint8Array ? raw : new TextEncoder().encode(raw as string);
    await loadImageToCanvas(ctx, bytes, meta.width, meta.height);
  }

  applyAdjustments(ctx, frame.adjustments, meta.width, meta.height);
  await applyLayers(ctx, frame.layers, frame.adjustments, meta.width, meta.height);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) throw new Error('canvas.toBlob returned null — canvas may be tainted or out of memory');
  return new Uint8Array(await blob.arrayBuffer());
}

async function execChecked(ffmpeg: FFmpeg, args: string[], logs: string[]): Promise<void> {
  const ret = await ffmpeg.exec(args);
  if (ret !== 0) {
    throw new Error(
      `FFmpeg exited with code ${ret}.\n\nCommand: ffmpeg ${args.join(' ')}\n\nLogs:\n${logs.slice(-40).join('\n')}`,
    );
  }
}

export async function exportVideo(
  videoFile: File,
  impactFrames: ImpactFrame[],
  meta: VideoMetadata,
  onProgress?: (p: number) => void,
): Promise<Blob> {
  const ffmpeg = await ensureLoaded();

  const logs: string[] = [];
  const logHandler = ({ message }: { message: string }) => { logs.push(message); };
  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(Math.round(progress * 100), 99));
  };
  ffmpeg.on('log', logHandler);
  ffmpeg.on('progress', progressHandler);

  try {
    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));

    const activeFrames = impactFrames
      .filter((f) => f.layers.length > 0)
      .sort((a, b) => a.videoFrameNumber - b.videoFrameNumber);

    if (activeFrames.length === 0) {
      // Passthrough: copy first video + first audio only — skip Apple metadata/data tracks
      await execChecked(
        ffmpeg,
        ['-i', 'input.mp4', '-map', '0:v:0', '-map', '0:a:0?', '-c', 'copy', 'output.mp4'],
        logs,
      );
    } else {
      // For frames with invert/B&W/dither: FFmpeg extracts the video frame, adjustments are
      // applied on canvas, result is a fully opaque PNG that replaces those video frames.
      // For frames with only dimming/layers: transparent PNG composites over the video.
      for (let i = 0; i < activeFrames.length; i++) {
        const png = await renderFrameToUint8(activeFrames[i], meta, ffmpeg);
        await ffmpeg.writeFile(`impact_${i}.png`, png);
      }

      const inputs: string[] = ['-i', 'input.mp4'];
      for (let i = 0; i < activeFrames.length; i++) {
        inputs.push('-loop', '1', '-i', `impact_${i}.png`);
      }

      // Chain overlay filters. Fully opaque PNGs replace those frames entirely;
      // transparent PNGs alpha-composite over the video.
      // format=yuv420p on the last step strips alpha so libx264 can encode it.
      let lastLabel = '[0:v]';
      const filters: string[] = [];
      for (let i = 0; i < activeFrames.length; i++) {
        const s = (activeFrames[i].videoFrameNumber / meta.fps).toFixed(6);
        const e = ((activeFrames[i].videoFrameNumber + activeFrames[i].durationFrames) / meta.fps).toFixed(6);
        const isLast = i === activeFrames.length - 1;
        const outLabel = isLast ? '[vout]' : `[v${i}]`;
        const formatSuffix = isLast ? ',format=yuv420p' : '';
        filters.push(
          `${lastLabel}[${i + 1}:v]overlay=enable='between(t,${s},${e})'${formatSuffix}${outLabel}`,
        );
        lastLabel = outLabel;
      }

      await execChecked(
        ffmpeg,
        [
          ...inputs,
          '-filter_complex', filters.join(';'),
          '-map', '[vout]',
          '-map', '0:a:0?',
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'copy',
          '-shortest',
          'output.mp4',
        ],
        logs,
      );
    }

    const data = await ffmpeg.readFile('output.mp4');
    const uint8 = data instanceof Uint8Array ? data : new TextEncoder().encode(data as string);
    if (uint8.byteLength === 0) {
      throw new Error(`FFmpeg produced an empty file.\n\nLogs:\n${logs.slice(-20).join('\n')}`);
    }

    const out = new ArrayBuffer(uint8.byteLength);
    new Uint8Array(out).set(uint8);
    onProgress?.(100);
    return new Blob([out], { type: 'video/mp4' });
  } finally {
    ffmpeg.off('log', logHandler);
    ffmpeg.off('progress', progressHandler);
  }
}

export async function isFFmpegLoaded(): Promise<boolean> {
  return ffmpegInstance?.loaded ?? false;
}
