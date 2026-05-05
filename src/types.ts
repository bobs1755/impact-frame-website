export type EffectType = 'radial' | 'flash' | 'image';
export type DitheringMode = 'none' | 'bayer' | 'floyd-steinberg';

export interface RadialSettings {
  x: number;
  y: number;
  shape: 'round' | 'sharp';
  lineCount: number;
  lineThickness: number;
  expansionFactor: number;
  rotation: number;
  multiFrame: boolean;
}

export interface FlashSettings {
  color: string;
  opacity: number;
}

export interface ImageSettings {
  src: string;
  x: number;
  y: number;
  scale: number;
  opacity: number;
}

export type EffectSettings = RadialSettings | FlashSettings | ImageSettings;

export interface EffectLayer {
  id: string;
  type: EffectType;
  settings: EffectSettings;
}

export interface FrameAdjustments {
  dimming: number;
  contrast: number;
  saturation: number;
  bAndW: boolean;
  bAndWThreshold: number;
  invertColor: boolean;
  dithering: DitheringMode;
}

export const defaultAdjustments: FrameAdjustments = {
  dimming: 0,
  contrast: 1,
  saturation: 1,
  bAndW: false,
  bAndWThreshold: 128,
  invertColor: false,
  dithering: 'none',
};

export const defaultRadial: RadialSettings = {
  x: 0.5,
  y: 0.5,
  shape: 'sharp',
  lineCount: 24,
  lineThickness: 3,
  expansionFactor: 1,
  rotation: 0,
  multiFrame: false,
};

export const defaultFlash: FlashSettings = {
  color: '#ffffff',
  opacity: 0.9,
};

export const defaultImage: ImageSettings = {
  src: '',
  x: 0.5,
  y: 0.5,
  scale: 1,
  opacity: 1,
};

export function defaultLayerSettings(type: EffectType): EffectSettings {
  if (type === 'radial') return { ...defaultRadial };
  if (type === 'flash') return { ...defaultFlash };
  return { ...defaultImage };
}

export interface ImpactFrame {
  id: string;
  videoFrameNumber: number;
  durationFrames: number;
  layers: EffectLayer[];
  adjustments: FrameAdjustments;
  thumbnail: string;
}

export interface VideoMetadata {
  duration: number;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
}
