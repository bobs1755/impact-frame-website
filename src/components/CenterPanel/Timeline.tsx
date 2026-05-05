import { useRef } from 'react';
import { useEditorStore } from '../../store/useEditorStore';

export function Timeline() {
  const { currentFrame, videoMetadata, seekToFrame, impactFrames } = useEditorStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const total = videoMetadata?.totalFrames ?? 1;

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekToFrame(Number(e.target.value));
  };

  const handleTextCommit = () => {
    const v = Number(inputRef.current?.value ?? currentFrame);
    seekToFrame(v);
  };

  const handleTextKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleTextCommit();
  };

  // build tick markers for impact frames on the slider
  const ticks = impactFrames.map((f) => ((f.videoFrameNumber / (total - 1)) * 100).toFixed(2));

  return (
    <div className="px-4 py-2 space-y-2">
      {/* scrub slider with tick marks */}
      <div className="relative">
        <input
          type="range"
          min={0}
          max={Math.max(total - 1, 1)}
          value={currentFrame}
          onChange={handleSlider}
          className="w-full h-2 rounded appearance-none bg-neutral-700 accent-blue-500"
        />
        {ticks.map((pct, i) => (
          <div
            key={i}
            className="absolute top-0 w-0.5 h-2 bg-yellow-400 pointer-events-none"
            style={{ left: `${pct}%` }}
          />
        ))}
      </div>

      {/* fine controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => seekToFrame(currentFrame - 1)}
          className="w-7 h-7 rounded bg-neutral-700 hover:bg-neutral-600 text-sm font-bold text-neutral-200 flex items-center justify-center"
        >
          −
        </button>
        <div className="flex items-center gap-1">
          <span className="text-xs text-neutral-500">Frame</span>
          <input
            ref={inputRef}
            type="number"
            defaultValue={currentFrame}
            key={currentFrame}
            onBlur={handleTextCommit}
            onKeyDown={handleTextKey}
            className="w-20 text-center text-sm font-mono bg-neutral-800 border border-neutral-600 rounded px-1 py-0.5 text-neutral-100 outline-none focus:border-blue-500"
          />
          <span className="text-xs text-neutral-500">/ {total - 1}</span>
        </div>
        <button
          onClick={() => seekToFrame(currentFrame + 1)}
          className="w-7 h-7 rounded bg-neutral-700 hover:bg-neutral-600 text-sm font-bold text-neutral-200 flex items-center justify-center"
        >
          +
        </button>
      </div>
    </div>
  );
}
