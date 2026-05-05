export async function extractFrame(
  video: HTMLVideoElement,
  frameNumber: number,
  fps: number,
  width: number,
  height: number,
): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const targetTime = frameNumber / fps;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      ctx.drawImage(video, 0, 0, width, height);
      resolve(ctx.getImageData(0, 0, width, height));
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = targetTime;

    setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      reject(new Error(`Seek timeout for frame ${frameNumber}`));
    }, 5000);
  });
}

export async function extractFrameDataUrl(
  video: HTMLVideoElement,
  frameNumber: number,
  fps: number,
  width: number,
  height: number,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const targetTime = frameNumber / fps;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d')!;

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      ctx.drawImage(video, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = targetTime;

    setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      reject(new Error(`Seek timeout for frame ${frameNumber}`));
    }, 5000);
  });
}

export async function detectFps(video: HTMLVideoElement): Promise<number> {
  return new Promise((resolve) => {
    if ('requestVideoFrameCallback' in video) {
      let count = 0;
      let startTime = 0;
      const cb = (_now: number, meta: VideoFrameCallbackMetadata) => {
        if (count === 0) startTime = meta.mediaTime;
        count++;
        if (count < 10) {
          (video as any).requestVideoFrameCallback(cb);
        } else {
          const elapsed = meta.mediaTime - startTime;
          resolve(elapsed > 0 ? Math.round((count - 1) / elapsed) : 30);
        }
      };
      (video as any).requestVideoFrameCallback(cb);
      video.play().catch(() => {});
    } else {
      resolve(30);
    }
  });
}
