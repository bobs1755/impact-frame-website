import type { RadialSettings } from '../../../types';
import { useEditorStore } from '../../../store/useEditorStore';

interface Props {
  frameId: string;
  layerId: string;
  settings: RadialSettings;
}

function Slider({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded accent-blue-500"
      />
    </div>
  );
}

export function RadialEditor({ frameId, layerId, settings }: Props) {
  const { updateLayer } = useEditorStore();

  const update = (patch: Partial<RadialSettings>) =>
    updateLayer(frameId, layerId, { settings: { ...settings, ...patch } });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-neutral-400">Shape</span>
        {(['sharp', 'round'] as const).map((s) => (
          <button
            key={s}
            onClick={() => update({ shape: s })}
            className={`flex-1 py-1 text-xs rounded capitalize ${
              settings.shape === s ? 'bg-blue-600 text-white' : 'bg-neutral-700 hover:bg-neutral-600 text-neutral-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <Slider label="Line Count" value={settings.lineCount} min={4} max={64} step={1} onChange={(v) => update({ lineCount: v })} />
      <Slider label="Line Thickness" value={settings.lineThickness} min={1} max={20} step={0.5} onChange={(v) => update({ lineThickness: v })} />
      <Slider label="Expansion" value={settings.expansionFactor} min={0.1} max={3} onChange={(v) => update({ expansionFactor: v })} />
      <Slider label="Rotation °" value={settings.rotation} min={0} max={360} step={1} onChange={(v) => update({ rotation: v })} />

      <div className="flex items-center justify-between">
        <span className="text-xs text-neutral-400">Multi-frame</span>
        <button
          onClick={() => update({ multiFrame: !settings.multiFrame })}
          className={`px-3 py-1 text-xs rounded ${
            settings.multiFrame ? 'bg-blue-600 text-white' : 'bg-neutral-700 text-neutral-300'
          }`}
        >
          {settings.multiFrame ? 'On' : 'Off'}
        </button>
      </div>

      <p className="text-xs text-neutral-500 italic">Click the canvas to set the burst origin.</p>
    </div>
  );
}
