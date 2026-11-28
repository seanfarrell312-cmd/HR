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
  // Day 3, from the basement chalice (D3-02): grey and flat, thunder
  // approaching; birds still sing. PROVISIONAL colours.
  D3_OVERCAST: {
    sky: '#8f979e',
    fogNear: 26,
    fogFar: 100,
    hemiSky: '#c3c9cd',
    hemiGround: '#3f4a3a',
    hemiIntensity: 1.25,
    ambient: 0.5,
    sun: '#d6dadc',
    sunIntensity: 0.55,
    sunPosition: [-20, 60, 30],
  },
  // From the brown box (D3-04): darker grey, and the birds stop.
  // PROVISIONAL colours.
  D3_SILENCE: {
    sky: '#7a8188',
    fogNear: 22,
    fogFar: 90,
    hemiSky: '#aeb4b9',
    hemiGround: '#363f33',
    hemiIntensity: 1.1,
    ambient: 0.44,
    sun: '#c6cacd',
    sunIntensity: 0.4,
    sunPosition: [-20, 60, 30],
  },
};

/** Presets with birdsong (7.1): until the brown box is collected on Day 3. */
export const BIRDSONG: ReadonlySet<EnvironmentPreset> = new Set(['BASE_DAY', 'D1_EVENING', 'D3_OVERCAST']);
/** Presets with distant thunder now and then (7.1). */
export const THUNDER: ReadonlySet<EnvironmentPreset> = new Set(['D3_OVERCAST', 'D3_SILENCE']);

/**
 * Seconds a preset takes to settle in when it arrives during a shift; any
 * other preset switches at once. Day 3's storm darkens while the player
 * remarks on it (designer, 2026-11-27).
 */
export const FADE_IN: Partial<Record<EnvironmentPreset, number>> = { D3_SILENCE: 4 };

function mixHex(a: string, b: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * t).toString(16).padStart(2, '0')).join('');
}

/** Part way (t from 0 to 1) from one look to another. */
export function mixLooks(a: EnvironmentLook, b: EnvironmentLook, t: number): EnvironmentLook {
  const n = (x: number, y: number) => x + (y - x) * t;
  return {
    sky: mixHex(a.sky, b.sky, t),
    fogNear: n(a.fogNear, b.fogNear),
    fogFar: n(a.fogFar, b.fogFar),
    hemiSky: mixHex(a.hemiSky, b.hemiSky, t),
    hemiGround: mixHex(a.hemiGround, b.hemiGround, t),
    hemiIntensity: n(a.hemiIntensity, b.hemiIntensity),
    ambient: n(a.ambient, b.ambient),
    sun: mixHex(a.sun, b.sun, t),
    sunIntensity: n(a.sunIntensity, b.sunIntensity),
    sunPosition: [0, 1, 2].map((i) => n(a.sunPosition[i], b.sunPosition[i])) as [number, number, number],
  };
}

export function environmentLook(preset: EnvironmentPreset): EnvironmentLook {
  return ENVIRONMENTS[preset] ?? ENVIRONMENTS.BASE_DAY!;
}
