// Game state store. Key names follow design doc section 8.3 where it names
// them; S1 adds the Day 1 inventory, flags and item locations.

export type EnvironmentPreset =
  | 'BASE_DAY'
  | 'D1_EVENING'
  | 'D3_OVERCAST'
  | 'D3_SILENCE'
  | 'D3_CROWS_DARK'
  | 'D3_RED_SKY'
  | 'D3_BLACK_FOG'
  | 'RESTORED';

/** Invisible quest inventory (doc 5.2): keys and small tools. */
export type QuestItem = 'chapel-key' | 'matches' | 'crucifix';

/** One-shot story facts. Once set, never unset within a run. */
export type Flag =
  | 'sms-read'
  | 'gate-unlocked'
  | 'church-approached'
  | 'note-read'
  | 'clock-blessed'
  | 'heading-home'
  | 'returned-to-gate'
  | 's1-complete';

export type ClockLocation = 'ritual-table' | 'held' | 'office-desk';

export interface GameState {
  day_index: 1 | 2 | 3;
  objective_id: string;
  completed_objectives: string[];
  fired_scares: string[];
  environment_preset: EnvironmentPreset;
  held_prop_id: string | null;
  door_preset: string;
  open_doors: Set<string>;
  inventory: Set<QuestItem>;
  flags: Set<Flag>;
  /** SMS ids received, newest last. */
  inbox: string[];
  /** Candle indexes lit this shift. */
  candles_lit: Set<number>;
  clock: ClockLocation;
}

export function createInitialState(doorPreset = 'day1-start'): GameState {
  return {
    day_index: 1,
    objective_id: 'D1-01',
    completed_objectives: [],
    fired_scares: [],
    environment_preset: 'BASE_DAY',
    held_prop_id: null,
    door_preset: doorPreset,
    open_doors: new Set(),
    inventory: new Set(),
    flags: new Set(),
    inbox: [],
    candles_lit: new Set(),
    clock: 'ritual-table',
  };
}
