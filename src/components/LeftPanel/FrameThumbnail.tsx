import type { ImpactFrame } from '../../types';
import { useEditorStore } from '../../store/useEditorStore';

interface Props {
  frame: ImpactFrame;
  isSelected: boolean;
}

export function FrameThumbnail({ frame, isSelected }: Props) {
  const { selectFrame, seekToFrame } = useEditorStore();

  const handleClick = () => {
    selectFrame(frame.id);
    seekToFrame(frame.videoFrameNumber);
  };

  const layerCount = frame.layers.length;
  const subtitle = layerCount === 0 ? 'No layers' : `${layerCount} layer${layerCount === 1 ? '' : 's'}`;

  return (
    <button
      onClick={handleClick}
      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
        isSelected
          ? 'bg-blue-600 text-white'
          : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200'
      }`}
    >
      <div className="w-12 h-8 rounded overflow-hidden bg-neutral-900 flex-shrink-0">
        {frame.thumbnail ? (
          <img src={frame.thumbnail} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600 text-xs">
            {layerCount > 0 ? layerCount : '—'}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-mono truncate">#{frame.videoFrameNumber}</div>
        <div className={`text-xs truncate ${isSelected ? 'text-blue-200' : 'text-neutral-400'}`}>
          {subtitle}
        </div>
      </div>
    </button>
  );
}
