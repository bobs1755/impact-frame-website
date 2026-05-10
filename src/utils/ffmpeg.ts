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

async function captureVideoFrame(
  videoFile: File,
  timeSeconds: number,
  width: number,
  height: number,
): Promise<HTMLCanvasElement> {
  const url = URL.createObjectURL(videoFile);
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.preload = 'auto';
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;
    const cleanup = () => URL.revokeObjectURL(url);
    video.addEventListener('seeked', () => {
      ctx.drawImage(video, 0, 0, width, height);
      cleanup();
      resolve(canvas);
    }, { once: true });
    video.addEventListener('error', (e) => { cleanup(); reject(e); }, { once: true });
    video.addEventListener('loadedmetadata', () => { video.currentTime = timeSeconds; }, { once: true });
    video.src = url;
    setTimeout(() => { cleanup(); reject(new Error(`Seek timeout at ${timeSeconds}s`)); }, 10000);
  });
}

async function renderFrameToUint8(frame: ImpactFrame, meta: VideoMetadata, videoFile: File): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  canvas.width = meta.width;
  canvas.height = meta.height;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, meta.width, meta.height);

  // If any adjustment needs video pixels (invert, B&W, dither), capture the actual video frame
  // and bake everything into a fully opaque PNG — identical pipeline to the preview.
  // Otherwise leave the canvas transparent so the overlay only covers the effect layers.
  const needsVideoPixels =
    frame.adjustments.invertColor ||
    frame.adjustments.bAndW ||
    frame.adjustments.dithering !== 'none';

  if (needsVideoPixels) {
    const videoCanvas = await captureVideoFrame(videoFile, frame.videoFrameNumber / meta.fps, meta.width, meta.height);
    ctx.drawImage(videoCanvas, 0, 0);
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

  // Capture all FFmpeg log output so we can surface meaningful errors
  const logs: string[] = [];
  const logHandler = ({ message }: { message: string }) => {
    logs.push(message);
  };
  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress?.(Math.min(Math.round(progress * 100), 99));
  };
  ffmpeg.on('log', logHandler);
  ffmpeg.on('progress', progressHandler);

  try {
    // Write input video (FFmpeg auto-detects format from headers, not extension)
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
      // Write each impact frame PNG. Frames with invert/B&W/dither have the captured video
      // frame baked in (fully opaque), so FFmpeg's overlay replaces those frames entirely.
      // Frames with only dimming/layers remain transparent and alpha-composite as before.
      for (let i = 0; i < activeFrames.length; i++) {
        const png = await renderFrameToUint8(activeFrames[i], meta, videoFile);
        await ffmpeg.writeFile(`impact_${i}.png`, png);
      }

      // Build input list: video first, then each looped overlay image
      const inputs: string[] = ['-i', 'input.mp4'];
      for (let i = 0; i < activeFrames.length; i++) {
        inputs.push('-loop', '1', '-i', `impact_${i}.png`);
      }

      // Chain overlay filters.
      // The overlay filter composites the PNG alpha over the video automatically.
      // After all overlays, format=yuv420p drops the alpha channel so libx264 can encode it.
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
          '-pix_fmt', 'yuv420p',   // required for H.264 compatibility
          '-c:a', 'copy',           // copy audio — no re-encode
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

    // Copy into a plain ArrayBuffer (avoids SharedArrayBuffer type constraint)
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
