import { useRef, useCallback } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { useVideoFrames } from '../../hooks/useVideoFrames';
import { useCanvasRenderer } from '../../hooks/useCanvasRenderer';
import { VideoPlayer } from './VideoPlayer';
import { Timeline } from './Timeline';
import { FrameStrip } from './FrameStrip';
import type { RadialSettings } from '../../types';

export function CenterPanel() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { videoMetadata, videoFile, setVideo, currentFrame, impactFrames, selectedFrameId, selectedLayerId, updateLayer } =
    useEditorStore();

  const { currentFrameDataUrl, stripFrames, STRIP_RADIUS } = useVideoFrames(videoRef);

  const activeImpactFrame =
    impactFrames.find((f) => f.id === selectedFrameId && f.videoFrameNumber === currentFrame) ?? null;

  const selectedLayer = activeImpactFrame?.layers.find((l) => l.id === selectedLayerId) ?? null;

  const w = videoMetadata?.width ?? 1280;
  const h = videoMetadata?.height ?? 720;

  useCanvasRenderer(canvasRef, currentFrameDataUrl, activeImpactFrame, w, h);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setVideo(file);
    e.target.value = '';
  };

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!selectedLayer || selectedLayer.type !== 'radial' || !activeImpactFrame) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      updateLayer(activeImpactFrame.id, selectedLayer.id, {
        settings: { ...(selectedLayer.settings as RadialSettings), x, y },
      });
    },
    [selectedLayer, activeImpactFrame, updateLayer],
  );

  const isRadialSelected = selectedLayer?.type === 'radial';

  return (
    <div className="flex flex-col h-full bg-neutral-950">
      <VideoPlayer videoRef={videoRef} />

      <div className="flex-1 flex items-center justify-center p-4 min-h-0 relative">
        {!videoFile ? (
          <label className="flex flex-col items-center gap-3 cursor-pointer group">
            <div className="w-32 h-32 rounded-full border-2 border-dashed border-neutral-600 group-hover:border-blue-500 flex items-center justify-center transition-colors">
              <svg className="w-10 h-10 text-neutral-500 group-hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <span className="text-neutral-400 text-sm group-hover:text-blue-400 transition-colors">Upload video to start</span>
            <input type="file" accept="video/*" onChange={handleUpload} className="hidden" />
          </label>
        ) : (
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className={`max-w-full max-h-full object-contain rounded shadow-2xl ${isRadialSelected ? 'cursor-crosshair' : 'cursor-default'}`}
            style={{ maxHeight: 'calc(100vh - 280px)' }}
          />
        )}
      </div>

      {videoMetadata && (
        <div className="bg-neutral-900 border-t border-neutral-700">
          <Timeline />
          <div className="border-t border-neutral-800">
            <FrameStrip stripFrames={stripFrames} stripRadius={STRIP_RADIUS} />
          </div>
        </div>
      )}
    </div>
  );
}
