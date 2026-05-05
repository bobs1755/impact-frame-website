import { useEditorStore } from '../../store/useEditorStore';

interface Props {
  stripFrames: Map<number, string>;
  stripRadius: number;
}

export function FrameStrip({ stripFrames, stripRadius }: Props) {
  const { currentFrame, seekToFrame, impactFrames } = useEditorStore();
  const impactSet = new Set(impactFrames.map((f) => f.videoFrameNumber));

  const frames: number[] = [];
  for (let i = currentFrame - stripRadius; i <= currentFrame + stripRadius; i++) {
    frames.push(i);
  }

  return (
    <div className="flex items-end justify-center gap-1 px-4 py-2 overflow-x-auto">
      {frames.map((f) => {
        const isCurrent = f === currentFrame;
        const isImpact = impactSet.has(f);
        const src = stripFrames.get(f);
        return (
          <button
            key={f}
            onClick={() => f >= 0 && seekToFrame(f)}
            className={`relative flex-shrink-0 rounded overflow-hidden border-2 transition-all ${
              isCurrent
                ? 'border-blue-500 scale-110'
                : isImpact
                ? 'border-yellow-400'
                : 'border-transparent hover:border-neutral-500'
            } ${f < 0 ? 'opacity-0 pointer-events-none' : ''}`}
            style={{ width: isCurrent ? 80 : 56, height: isCurrent ? 56 : 40 }}
          >
            {src ? (
              <img src={src} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-neutral-800" />
            )}
            <span className="absolute bottom-0 left-0 right-0 text-center text-white text-[8px] font-mono bg-black/60">
              {f}
            </span>
            {isImpact && (
              <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-yellow-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
