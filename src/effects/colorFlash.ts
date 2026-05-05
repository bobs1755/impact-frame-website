import type { FlashSettings, FrameAdjustments } from '../types';

export function renderColorFlash(
  ctx: CanvasRenderingContext2D,
  settings: FlashSettings,
  _adjustments: FrameAdjustments,
  width: number,
  height: number,
) {
  const { color, opacity } = settings;
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
