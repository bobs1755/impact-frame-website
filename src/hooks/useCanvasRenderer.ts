import { useEffect, useCallback } from 'react';
import type { ImpactFrame } from '../types';
import { applyLayers, applyAdjustments } from '../effects/effectRegistry';

export function useCanvasRenderer(
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  currentFrameDataUrl: string | null,
  activeImpactFrame: ImpactFrame | null,
  width: number,
  height: number,
) {
  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas || width === 0 || height === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    if (currentFrameDataUrl) {
      await new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => { ctx.drawImage(img, 0, 0, width, height); resolve(); };
        img.onerror = () => resolve();
        img.src = currentFrameDataUrl;
      });
    } else {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, width, height);
    }

    if (activeImpactFrame) {
      applyAdjustments(ctx, activeImpactFrame.adjustments, width, height);
      await applyLayers(ctx, activeImpactFrame.layers, activeImpactFrame.adjustments, width, height);
    }
  }, [canvasRef, currentFrameDataUrl, activeImpactFrame, width, height]);

  useEffect(() => {
    render();
  }, [render]);

  return { render };
}
