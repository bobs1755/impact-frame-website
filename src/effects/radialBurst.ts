import type { RadialSettings, FrameAdjustments } from '../types';

export function renderRadialBurst(
  ctx: CanvasRenderingContext2D,
  settings: RadialSettings,
  _adjustments: FrameAdjustments,
  width: number,
  height: number,
) {
  const { x, y, shape, lineCount, lineThickness, expansionFactor, rotation } = settings;
  const cx = x * width;
  const cy = y * height;
  const maxLen = Math.sqrt(width * width + height * height) * 0.7 * expansionFactor;
  const minLen = maxLen * 0.15;
  const angleStep = (Math.PI * 2) / lineCount;
  const rotRad = (rotation * Math.PI) / 180;

  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = lineThickness;

  if (shape === 'sharp') {
    // alternating long/short sharp wedge lines
    for (let i = 0; i < lineCount; i++) {
      const angle = rotRad + i * angleStep;
      const len = i % 2 === 0 ? maxLen : maxLen * 0.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      ctx.stroke();
    }
  } else {
    // round: tapered lines drawn as filled paths
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < lineCount; i++) {
      const angle = rotRad + i * angleStep;
      const halfSpread = angleStep * 0.25;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(
        cx + Math.cos(angle - halfSpread) * minLen,
        cy + Math.sin(angle - halfSpread) * minLen,
      );
      ctx.lineTo(
        cx + Math.cos(angle) * maxLen,
        cy + Math.sin(angle) * maxLen,
      );
      ctx.lineTo(
        cx + Math.cos(angle + halfSpread) * minLen,
        cy + Math.sin(angle + halfSpread) * minLen,
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}
