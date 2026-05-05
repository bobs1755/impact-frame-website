import { useState } from 'react';
import { useEditorStore } from '../../store/useEditorStore';
import { AdjustmentsPanel } from './AdjustmentsPanel';
import { RadialEditor } from './effects/RadialEditor';
import { FlashEditor } from './effects/FlashEditor';
import { ImageEditor } from './effects/ImageEditor';
import type { RadialSettings, FlashSettings, ImageSettings, EffectType } from '../../types';
import { exportVideo } from '../../utils/ffmpeg';

const EFFECT_LABELS: Record<EffectType, string> = {
  radial: 'Radial Burst',
  flash: 'Color Flash',
  image: 'Image Overlay',
};

const EFFECT_ICONS: Record<EffectType, string> = {
  radial: '✦',
  flash: '◈',
  image: '⊞',
};

export function RightPanel() {
  const {
    impactFrames,
    selectedFrameId,
    selectedLayerId,
    removeImpactFrame,
    duplicateImpactFrame,
    addLayer,
    removeLayer,
    selectLayer,
    videoFile,
    videoMetadata,
  } = useEditorStore();

  const [showLayerPicker, setShowLayerPicker] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const selectedFrame = impactFrames.find((f) => f.id === selectedFrameId) ?? null;
  const selectedLayer = selectedFrame?.layers.find((l) => l.id === selectedLayerId) ?? null;

  const handleAddLayer = (type: EffectType) => {
    if (!selectedFrame) return;
    addLayer(selectedFrame.id, type);
    setShowLayerPicker(false);
  };

  const handleExport = async () => {
    if (!videoFile || !videoMetadata) return;
    setExportProgress(0);
    setExportError(null);
    try {
      const blob = await exportVideo(videoFile, impactFrames, videoMetadata, (p) =>
        setExportProgress(p),
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'impact_export.mp4';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(String(err));
    } finally {
      setExportProgress(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-l border-neutral-700 overflow-hidden">
      <div className="px-3 py-2 border-b border-neutral-700">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          {selectedFrame ? `Frame #${selectedFrame.videoFrameNumber}` : 'Frame Options'}
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!selectedFrame ? (
          <p className="text-neutral-600 text-xs text-center py-6 px-3">
            Select a frame from the left panel to edit it.
          </p>
        ) : (
          <>
            {/* Layer list */}
            <div className="p-3 border-b border-neutral-800 space-y-1">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase">Layers</span>
                <button
                  onClick={() => setShowLayerPicker((v) => !v)}
                  className="text-xs px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-white"
                >
                  + Add
                </button>
              </div>

              {showLayerPicker && (
                <div className="flex flex-col gap-1 mb-2 p-2 bg-neutral-800 rounded">
                  {(['radial', 'flash', 'image'] as EffectType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleAddLayer(t)}
                      className="flex items-center gap-2 px-2 py-1 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 text-left"
                    >
                      <span>{EFFECT_ICONS[t]}</span>
                      {EFFECT_LABELS[t]}
                    </button>
                  ))}
                  <button
                    onClick={() => setShowLayerPicker(false)}
                    className="text-xs text-neutral-500 hover:text-neutral-300 text-center py-0.5"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {selectedFrame.layers.length === 0 && (
                <p className="text-neutral-600 text-xs py-2 text-center">No layers. Click "+ Add" to add an effect.</p>
              )}

              {selectedFrame.layers.map((layer) => (
                <div
                  key={layer.id}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors ${
                    layer.id === selectedLayerId
                      ? 'bg-blue-600 text-white'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
                  }`}
                  onClick={() => selectLayer(layer.id)}
                >
                  <span className="text-sm">{EFFECT_ICONS[layer.type]}</span>
                  <span className="flex-1 text-xs">{EFFECT_LABELS[layer.type]}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeLayer(selectedFrame.id, layer.id); }}
                    className={`text-xs px-1 rounded hover:bg-red-700 transition-colors ${
                      layer.id === selectedLayerId ? 'text-blue-200 hover:text-white' : 'text-neutral-500 hover:text-white'
                    }`}
                    title="Remove layer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {/* Selected layer editor */}
            {selectedLayer && (
              <div className="p-3 border-b border-neutral-800 space-y-3">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase">
                  {EFFECT_LABELS[selectedLayer.type]} Settings
                </h3>
                {selectedLayer.type === 'radial' && (
                  <RadialEditor
                    frameId={selectedFrame.id}
                    layerId={selectedLayer.id}
                    settings={selectedLayer.settings as RadialSettings}
                  />
                )}
                {selectedLayer.type === 'flash' && (
                  <FlashEditor
                    frameId={selectedFrame.id}
                    layerId={selectedLayer.id}
                    settings={selectedLayer.settings as FlashSettings}
                  />
                )}
                {selectedLayer.type === 'image' && (
                  <ImageEditor
                    frameId={selectedFrame.id}
                    layerId={selectedLayer.id}
                    settings={selectedLayer.settings as ImageSettings}
                  />
                )}
              </div>
            )}

            {/* Frame-level adjustments */}
            <div className="p-3 border-b border-neutral-800 space-y-3">
              <h3 className="text-xs font-semibold text-neutral-500 uppercase">Frame Adjustments</h3>
              <AdjustmentsPanel id={selectedFrame.id} adjustments={selectedFrame.adjustments} />
            </div>
          </>
        )}
      </div>

      {/* Bottom actions */}
      <div className="p-3 border-t border-neutral-700 space-y-2">
        {selectedFrame && (
          <div className="flex gap-1">
            <button
              onClick={() => duplicateImpactFrame(selectedFrame.id)}
              className="flex-1 py-1.5 text-xs rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200"
            >
              Duplicate
            </button>
            <button
              onClick={() => removeImpactFrame(selectedFrame.id)}
              className="flex-1 py-1.5 text-xs rounded bg-red-900 hover:bg-red-800 text-red-200"
            >
              Remove
            </button>
          </div>
        )}

        {videoFile && (
          <div className="space-y-1">
            {exportError && (
              <details className="group">
                <summary className="text-red-400 text-xs cursor-pointer select-none">
                  Export failed — click for details
                </summary>
                <pre className="mt-1 text-red-300 text-[10px] bg-neutral-950 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap break-all">
                  {exportError}
                </pre>
              </details>
            )}
            {exportProgress !== null ? (
              <div className="space-y-1">
                <div className="text-xs text-neutral-400 text-center">
                  {exportProgress === 0 ? 'Loading FFmpeg…' : `Exporting… ${exportProgress}%`}
                </div>
                <div className="w-full h-1.5 bg-neutral-800 rounded overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: exportProgress === 0 ? '5%' : `${exportProgress}%` }}
                  />
                </div>
              </div>
            ) : (
              <button
                onClick={handleExport}
                className="w-full py-2 text-xs font-semibold rounded bg-green-700 hover:bg-green-600 text-white"
              >
                Export Video
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
