import type { EnvironmentPreset } from '../state/store';

// Lighting and sky per environment preset (doc 7.1). Plain data; the game
// applies whichever preset the state names. Only the presets the build has
// reached are defined; later days add theirs.

export interface EnvironmentLook {
  sky: string;
  /** Fog starts and ends (metres); it takes the sky colour. */
  fogNear: number;
  fogFar: number;
  hemiSky: string;
  hemiGround: string;
  hemiIntensity: number;
  ambient: number;
  sun: string;
  sunIntensity: number;
  /** Sun position, Three.js world coordinates. */
  sunPosition: [number, number, number];
}

export const ENVIRONMENTS: Partial<Record<EnvironmentPreset, EnvironmentLook>> = {
  BASE_DAY: {
    sky: '#a9c6e0',
    fogNear: 30,
    fogFar: 110,
    hemiSky: '#dfeaf5',
    hemiGround: '#4b5a3a',
    hemiIntensity: 1.6,
    ambient: 0.6,
    sun: '#fff4dd',
    sunIntensity: 1.4,
    sunPosition: [-30, 60, 20],
  },
  // Dusk after the first relic is put away (D1-10): warm, low sun, still
  // peaceful. PROVISIONAL colours (decisions 2026-11-09).
  D1_EVENING: {
    sky: '#d98f6a',
    fogNear: 22,
    fogFar: 95,
    hemiSky: '#f2c3a0',
    hemiGround: '#3c3446',
    hemiIntensity: 1.05,
    ambient: 0.45,
    sun: '#ffab6b',
    sunIntensity: 1.0,
    sunPosition: [-70, 14, 10],
  },
};

export function environmentLook(preset: EnvironmentPreset): EnvironmentLook {
  return ENVIRONMENTS[preset] ?? ENVIRONMENTS.BASE_DAY!;
}
