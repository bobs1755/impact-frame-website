import { useEditorStore } from '../../store/useEditorStore';
import { FrameThumbnail } from './FrameThumbnail';

export function LeftPanel() {
  const {
    impactFrames,
    selectedFrameId,
    currentFrame,
    addImpactFrame,
    replaceFramePosition,
    videoMetadata,
  } = useEditorStore();

  const handleAddFrame = () => {
    addImpactFrame(currentFrame);
  };

  const handleReplace = () => {
    if (!selectedFrameId) return;
    replaceFramePosition(selectedFrameId, currentFrame);
  };

  return (
    <div className="flex flex-col h-full bg-neutral-900 border-r border-neutral-700">
      <div className="px-3 py-2 border-b border-neutral-700">
        <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Your Frames</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {impactFrames.length === 0 && (
          <p className="text-neutral-600 text-xs text-center py-6 leading-relaxed">
            {videoMetadata ? 'No impact frames yet.\nClick "Edit Frame" to add one.' : 'Upload a video to start.'}
          </p>
        )}
        {impactFrames.map((frame) => (
          <FrameThumbnail
            key={frame.id}
            frame={frame}
            isSelected={frame.id === selectedFrameId}
          />
        ))}
      </div>

      <div className="p-2 border-t border-neutral-700 space-y-1">
        <div className="flex gap-1">
          <button
            onClick={handleAddFrame}
            disabled={!videoMetadata}
            className="flex-1 py-1.5 text-xs rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white"
          >
            Edit Frame
          </button>
          <button
            onClick={handleReplace}
            disabled={!selectedFrameId}
            className="flex-1 py-1.5 text-xs rounded bg-neutral-700 hover:bg-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed text-neutral-200"
          >
            Replace
          </button>
        </div>
      </div>
    </div>
  );
}
