import type { FrameAdjustments, DitheringMode } from '../../types';
import { useEditorStore } from '../../store/useEditorStore';

interface Props {
  id: string;
  adjustments: FrameAdjustments;
}

function Slider({ label, value, min, max, step = 0.01, format, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const display = format ? format(value) : value.toFixed(step < 1 ? 2 : 0);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="font-mono">{display}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded accent-blue-500"
      />
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-neutral-400">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`px-3 py-0.5 text-xs rounded transition-colors ${
          value ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300'
        }`}
      >
        {value ? 'On' : 'Off'}
      </button>
    </div>
  );
}

const DITHER_OPTIONS: { value: DitheringMode; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'bayer', label: 'Ordered (Bayer)' },
  { value: 'floyd-steinberg', label: 'Floyd-Steinberg' },
];

export function AdjustmentsPanel({ id, adjustments }: Props) {
  const { updateImpactFrame } = useEditorStore();

  const update = (patch: Partial<FrameAdjustments>) =>
    updateImpactFrame(id, { adjustments: { ...adjustments, ...patch } });

  const bwActive = adjustments.bAndW || adjustments.dithering !== 'none';

  return (
    <div className="space-y-3">
      <Slider label="Dimming" value={adjustments.dimming} min={0} max={1} onChange={(v) => update({ dimming: v })} />
      <Slider label="Contrast" value={adjustments.contrast} min={0} max={3} onChange={(v) => update({ contrast: v })} />
      <Slider label="Saturation" value={adjustments.saturation} min={0} max={3} onChange={(v) => update({ saturation: v })} />

      <div className="border-t border-neutral-800 pt-3 space-y-3">
        <Toggle label="Black & White" value={adjustments.bAndW} onChange={(v) => update({ bAndW: v })} />
        {bwActive && (
          <Slider
            label="B&W Cutoff"
            value={adjustments.bAndWThreshold}
            min={0} max={255} step={1}
            format={(v) => String(Math.round(v))}
            onChange={(v) => update({ bAndWThreshold: v })}
          />
        )}

        <div className="space-y-1">
          <span className="text-xs text-neutral-400">Dithering</span>
          <div className="flex gap-1 flex-wrap">
            {DITHER_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => update({ dithering: value })}
                className={`flex-1 py-1 text-xs rounded whitespace-nowrap transition-colors ${
                  adjustments.dithering === value
                    ? 'bg-blue-600 text-white'
                    : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-neutral-800 pt-3">
        <Toggle label="Invert Colors" value={adjustments.invertColor} onChange={(v) => update({ invertColor: v })} />
      </div>
    </div>
  );
}
