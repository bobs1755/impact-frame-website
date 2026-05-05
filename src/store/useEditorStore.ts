import { create } from 'zustand';
import type { ImpactFrame, VideoMetadata, EffectType, EffectLayer } from '../types';
import { defaultAdjustments, defaultLayerSettings } from '../types';

function makeId() {
  return Math.random().toString(36).slice(2, 10);
}

interface EditorStore {
  videoFile: File | null;
  videoUrl: string | null;
  videoMetadata: VideoMetadata | null;
  currentFrame: number;
  impactFrames: ImpactFrame[];
  selectedFrameId: string | null;
  selectedLayerId: string | null;

  setVideo: (file: File) => void;
  setVideoMetadata: (meta: VideoMetadata) => void;
  seekToFrame: (frame: number) => void;

  addImpactFrame: (atFrame: number) => string;
  updateImpactFrame: (id: string, updates: Partial<ImpactFrame>) => void;
  removeImpactFrame: (id: string) => void;
  duplicateImpactFrame: (id: string) => void;
  selectFrame: (id: string | null) => void;
  replaceFramePosition: (id: string, newFrame: number) => void;

  addLayer: (frameId: string, type: EffectType) => string;
  updateLayer: (frameId: string, layerId: string, updates: Partial<EffectLayer>) => void;
  removeLayer: (frameId: string, layerId: string) => void;
  selectLayer: (layerId: string | null) => void;
}

export const useEditorStore = create<EditorStore>((set, get) => ({
  videoFile: null,
  videoUrl: null,
  videoMetadata: null,
  currentFrame: 0,
  impactFrames: [],
  selectedFrameId: null,
  selectedLayerId: null,

  setVideo: (file) => {
    const prev = get().videoUrl;
    if (prev) URL.revokeObjectURL(prev);
    const url = URL.createObjectURL(file);
    set({ videoFile: file, videoUrl: url, currentFrame: 0, impactFrames: [], selectedFrameId: null, selectedLayerId: null });
  },

  setVideoMetadata: (meta) => set({ videoMetadata: meta }),

  seekToFrame: (frame) => {
    const meta = get().videoMetadata;
    if (!meta) return;
    const clamped = Math.max(0, Math.min(meta.totalFrames - 1, Math.round(frame)));
    set({ currentFrame: clamped });
  },

  addImpactFrame: (atFrame) => {
    const id = makeId();
    const frame: ImpactFrame = {
      id,
      videoFrameNumber: atFrame,
      durationFrames: 1,
      layers: [],
      adjustments: { ...defaultAdjustments },
      thumbnail: '',
    };
    set((s) => ({
      impactFrames: [...s.impactFrames, frame].sort((a, b) => a.videoFrameNumber - b.videoFrameNumber),
      selectedFrameId: id,
      selectedLayerId: null,
    }));
    return id;
  },

  updateImpactFrame: (id, updates) => {
    set((s) => ({
      impactFrames: s.impactFrames.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    }));
  },

  removeImpactFrame: (id) => {
    set((s) => {
      const remaining = s.impactFrames.filter((f) => f.id !== id);
      const newSelected = s.selectedFrameId === id ? (remaining[0]?.id ?? null) : s.selectedFrameId;
      return { impactFrames: remaining, selectedFrameId: newSelected, selectedLayerId: null };
    });
  },

  duplicateImpactFrame: (id) => {
    const frame = get().impactFrames.find((f) => f.id === id);
    if (!frame) return;
    const newId = makeId();
    const copy: ImpactFrame = {
      ...frame,
      id: newId,
      videoFrameNumber: frame.videoFrameNumber + 1,
      layers: frame.layers.map((l) => ({ ...l, id: makeId(), settings: { ...l.settings } as EffectLayer['settings'] })),
      adjustments: { ...frame.adjustments },
    };
    set((s) => ({
      impactFrames: [...s.impactFrames, copy].sort((a, b) => a.videoFrameNumber - b.videoFrameNumber),
      selectedFrameId: newId,
      selectedLayerId: null,
    }));
  },

  selectFrame: (id) => set({ selectedFrameId: id, selectedLayerId: null }),

  replaceFramePosition: (id, newFrame) => {
    set((s) => ({
      impactFrames: s.impactFrames
        .map((f) => (f.id === id ? { ...f, videoFrameNumber: newFrame } : f))
        .sort((a, b) => a.videoFrameNumber - b.videoFrameNumber),
    }));
  },

  addLayer: (frameId, type) => {
    const layerId = makeId();
    const layer: EffectLayer = { id: layerId, type, settings: defaultLayerSettings(type) };
    set((s) => ({
      impactFrames: s.impactFrames.map((f) =>
        f.id === frameId ? { ...f, layers: [...f.layers, layer] } : f,
      ),
      selectedLayerId: layerId,
    }));
    return layerId;
  },

  updateLayer: (frameId, layerId, updates) => {
    set((s) => ({
      impactFrames: s.impactFrames.map((f) =>
        f.id === frameId
          ? { ...f, layers: f.layers.map((l) => (l.id === layerId ? { ...l, ...updates } : l)) }
          : f,
      ),
    }));
  },

  removeLayer: (frameId, layerId) => {
    set((s) => {
      const frame = s.impactFrames.find((f) => f.id === frameId);
      const remaining = frame?.layers.filter((l) => l.id !== layerId) ?? [];
      const newLayerId = s.selectedLayerId === layerId ? (remaining[0]?.id ?? null) : s.selectedLayerId;
      return {
        impactFrames: s.impactFrames.map((f) =>
          f.id === frameId ? { ...f, layers: remaining } : f,
        ),
        selectedLayerId: newLayerId,
      };
    });
  },

  selectLayer: (layerId) => set({ selectedLayerId: layerId }),
}));
