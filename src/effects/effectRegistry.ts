import type { EffectType, EffectSettings, FrameAdjustments, RadialSettings, FlashSettings, ImageSettings, EffectLayer } from '../types';
import { renderRadialBurst } from './radialBurst';
import { renderColorFlash } from './colorFlash';
import { renderImageOverlay } from './imageOverlay';

export async function applyEffect(
  ctx: CanvasRenderingContext2D,
  type: EffectType,
  settings: EffectSettings,
  adjustments: FrameAdjustments,
  width: number,
  height: number,
) {
  if (type === 'radial') {
    renderRadialBurst(ctx, settings as RadialSettings, adjustments, width, height);
  } else if (type === 'flash') {
    renderColorFlash(ctx, settings as FlashSettings, adjustments, width, height);
  } else if (type === 'image') {
    await renderImageOverlay(ctx, settings as ImageSettings, adjustments, width, height);
  }
}

// Bayer 4×4 ordered dither matrix (values 0–15, normalized to 0–255 range)
const BAYER_4X4 = [
  [  0, 128,  32, 160],
  [192,  64, 224,  96],
  [ 48, 176,  16, 144],
  [240, 112, 208,  80],
];

function applyBayerDither(d: Uint8ClampedArray, width: number, threshold: number) {
  for (let i = 0; i < d.length; i += 4) {
    const px = (i / 4) % width;
    const py = Math.floor(i / 4 / width);
    const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const adjusted = gray + (BAYER_4X4[py % 4][px % 4] - 128) * (threshold / 255);
    const val = adjusted >= threshold ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = val;
  }
}

function applyFloydSteinberg(d: Uint8ClampedArray, width: number, height: number, threshold: number) {
  // work on a float buffer to accumulate error
  const gray = new Float32Array(width * height);
  for (let i = 0; i < d.length; i += 4) {
    gray[i / 4] = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
  }
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const old = gray[idx];
      const val = old >= threshold ? 255 : 0;
      const err = old - val;
      gray[idx] = val;
      if (x + 1 < width)             gray[idx + 1]         += err * 7 / 16;
      if (y + 1 < height) {
        if (x > 0)                    gray[idx + width - 1] += err * 3 / 16;
                                      gray[idx + width]     += err * 5 / 16;
        if (x + 1 < width)            gray[idx + width + 1] += err * 1 / 16;
      }
    }
  }
  for (let i = 0; i < d.length; i += 4) {
    d[i] = d[i + 1] = d[i + 2] = Math.round(Math.max(0, Math.min(255, gray[i / 4])));
  }
}

export function applyAdjustments(
  ctx: CanvasRenderingContext2D,
  adjustments: FrameAdjustments,
  width: number,
  height: number,
) {
  const { dimming, bAndW, bAndWThreshold, invertColor, dithering } = adjustments;

  if (dimming > 0) {
    ctx.save();
    ctx.globalAlpha = dimming;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  if (bAndW || dithering !== 'none') {
    const imageData = ctx.getImageData(0, 0, width, height);
    const d = imageData.data;
    if (dithering === 'bayer') {
      applyBayerDither(d, width, bAndWThreshold);
    } else if (dithering === 'floyd-steinberg') {
      applyFloydSteinberg(d, width, height, bAndWThreshold);
    } else {
      // plain threshold B&W
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const val = gray >= bAndWThreshold ? 255 : 0;
        d[i] = d[i + 1] = d[i + 2] = val;
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  if (invertColor) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const d = imageData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = 255 - d[i];
      d[i + 1] = 255 - d[i + 1];
      d[i + 2] = 255 - d[i + 2];
    }
    ctx.putImageData(imageData, 0, 0);
  }
}

// unused but kept for future use
export async function applyLayers(
  ctx: CanvasRenderingContext2D,
  layers: EffectLayer[],
  adjustments: FrameAdjustments,
  width: number,
  height: number,
) {
  for (const layer of layers) {
    await applyEffect(ctx, layer.type, layer.settings, adjustments, width, height);
  }
}

export function buildCssFilter(adjustments: FrameAdjustments): string {
  const parts: string[] = [];
  if (adjustments.contrast !== 1) parts.push(`contrast(${adjustments.contrast})`);
  if (adjustments.saturation !== 1) parts.push(`saturate(${adjustments.saturation})`);
  return parts.join(' ');
}
