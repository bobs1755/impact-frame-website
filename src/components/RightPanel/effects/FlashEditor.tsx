import type { FlashSettings } from '../../../types';
import { useEditorStore } from '../../../store/useEditorStore';

interface Props {
  frameId: string;
  layerId: string;
  settings: FlashSettings;
}

export function FlashEditor({ frameId, layerId, settings }: Props) {
  const { updateLayer } = useEditorStore();

  const update = (patch: Partial<FlashSettings>) =>
    updateLayer(frameId, layerId, { settings: { ...settings, ...patch } });

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <span className="text-xs text-neutral-400">Color</span>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={settings.color}
            onChange={(e) => update({ color: e.target.value })}
            className="w-10 h-8 rounded cursor-pointer border border-neutral-600 bg-neutral-800 p-0.5"
          />
          <input
            type="text"
            value={settings.color}
            onChange={(e) => update({ color: e.target.value })}
            className="flex-1 text-xs font-mono bg-neutral-800 border border-neutral-600 rounded px-2 py-1.5 text-neutral-100 outline-none focus:border-blue-500"
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs text-neutral-400">
          <span>Opacity</span>
          <span className="font-mono">{settings.opacity.toFixed(2)}</span>
        </div>
        <input
          type="range" min={0} max={1} step={0.01} value={settings.opacity}
          onChange={(e) => update({ opacity: Number(e.target.value) })}
          className="w-full h-1.5 rounded accent-blue-500"
        />
      </div>
    </div>
  );
}
