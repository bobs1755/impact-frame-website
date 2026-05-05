import type { ImageSettings, FrameAdjustments } from '../types';

const imageCache = new Map<string, HTMLImageElement>();

function loadImage(src: string): Promise<HTMLImageElement> {
  if (imageCache.has(src)) return Promise.resolve(imageCache.get(src)!);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => { imageCache.set(src, img); resolve(img); };
    img.onerror = reject;
    img.src = src;
  });
}

export async function renderImageOverlay(
  ctx: CanvasRenderingContext2D,
  settings: ImageSettings,
  _adjustments: FrameAdjustments,
  width: number,
  height: number,
) {
  if (!settings.src) return;
  try {
    const img = await loadImage(settings.src);
    const { x, y, scale, opacity } = settings;
    const drawW = img.naturalWidth * scale;
    const drawH = img.naturalHeight * scale;
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(img, x * width - drawW / 2, y * height - drawH / 2, drawW, drawH);
    ctx.restore();
  } catch {
    // image failed to load, skip
  }
}
