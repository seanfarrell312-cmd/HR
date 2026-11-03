// Game state store. S0 only holds the keys and shows them in the debug HUD;
// no objective scripting yet. Key names follow design doc section 8.3.

export type EnvironmentPreset =
  | 'BASE_DAY'
  | 'D1_EVENING'
  | 'D3_OVERCAST'
  | 'D3_SILENCE'
  | 'D3_CROWS_DARK'
  | 'D3_RED_SKY'
  | 'D3_BLACK_FOG'
  | 'RESTORED';

export interface GameState {
  day_index: 1 | 2 | 3;
  objective_id: string;
  completed_objectives: string[];
  fired_scares: string[];
  environment_preset: EnvironmentPreset;
  held_prop_id: string | null;
  door_preset: string;
  open_doors: Set<string>;
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
  };
}
