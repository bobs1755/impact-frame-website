import type { ImageSettings } from '../../../types';
import { useEditorStore } from '../../../store/useEditorStore';

interface Props {
  frameId: string;
  layerId: string;
  settings: ImageSettings;
}

function Slider({ label, value, min, max, step = 0.01, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-neutral-400">
        <span>{label}</span>
        <span className="font-mono">{value.toFixed(2)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 rounded accent-blue-500"
      />
    </div>
  );
}

export function ImageEditor({ frameId, layerId, settings }: Props) {
  const { updateLayer } = useEditorStore();

  const update = (patch: Partial<ImageSettings>) =>
    updateLayer(frameId, layerId, { settings: { ...settings, ...patch } });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) update({ src: ev.target.result as string });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Image file (PNG recommended)</label>
        {settings.src && (
          <img src={settings.src} alt="" className="w-full h-24 object-contain bg-neutral-800 rounded mb-2" />
        )}
        <label className="block w-full py-1.5 text-xs text-center rounded bg-neutral-700 hover:bg-neutral-600 text-neutral-200 cursor-pointer">
          {settings.src ? 'Change image' : 'Upload image'}
          <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      <Slider label="Scale" value={settings.scale} min={0.05} max={5} onChange={(v) => update({ scale: v })} />
      <Slider label="Opacity" value={settings.opacity} min={0} max={1} onChange={(v) => update({ opacity: v })} />
      <Slider label="X Position" value={settings.x} min={0} max={1} onChange={(v) => update({ x: v })} />
      <Slider label="Y Position" value={settings.y} min={0} max={1} onChange={(v) => update({ y: v })} />
    </div>
  );
}
