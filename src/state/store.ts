// Game state store. Key names follow design doc section 8.3 where it names
// them; S1 and S2 add the Day 1 inventory, flags and item locations.

export type EnvironmentPreset =
  | 'BASE_DAY'
  | 'D1_EVENING'
  | 'D3_OVERCAST'
  | 'D3_SILENCE'
  | 'D3_CROWS_DARK'
  | 'D3_RED_SKY'
  | 'D3_BLACK_FOG'
  | 'RESTORED';

/**
 * Invisible quest inventory (doc 5.2): keys and small tools. The cross is the
 * small hand cross from the chapel shelf, held up for blessings; the crucifix
 * is the larger standing one from the altar, set out on the ritual table
 * (decisions 2026-11-09, S2 playtest).
 */
export type QuestItem = 'chapel-key' | 'matches' | 'cross' | 'crucifix' | 'bible';

/** Large props carried one at a time, shown in the player's hands (doc 5.2). */
export type HeldProp = 'clock' | 'chalice' | 'music-box';

/** One-shot story facts for the current day. A new day starts with none. */
export type Flag =
  | 'gate-unlocked'
  | 'church-approached'
  | 'note-read'
  | 'note-closed'
  | 'chapel-opened'
  | 'chapel-thought-done'
  | 'candles-thought-done'
  | 'cooking-said'
  | 'cross-prompted'
  | 'clock-blessed'
  | 'clock-ghost-gone'
  | 'clock-thought-done'
  | 'crucifix-staged'
  | 'drop-box-approached'
  | 'relic-pickup-thought-done'
  | 'relic-annoyed'
  | 'relic-rattled'
  | 'relic-settled'
  | 'good-book-said'
  | 'bible-prompted'
  | 'scripture-opened'
  | 'scripture-read'
  | 'relic-weakened'
  | 'relic-blessed'
  | 'relic-ghost-gone'
  | 'relic-thought-done'
  | 'heading-home'
  | 'gate-prompted'
  | 'returned-to-gate';

export type ClockLocation = 'ritual-table' | 'held' | 'office-desk';
export type ChaliceLocation = 'altar' | 'held' | 'ritual-table';
/**
 * Day 1's delivered relic (the music box): not yet delivered, waiting in the
 * drop box, carried, on the ritual table, on the cleaned-relic table outside
 * the chapel, or cleared away by staff between shifts.
 */
export type RelicLocation = 'none' | 'drop-box' | 'held' | 'ritual-table' | 'relic-table' | 'removed';

export interface GameState {
  day_index: 1 | 2 | 3;
  objective_id: string;
  completed_objectives: string[];
  fired_scares: string[];
  environment_preset: EnvironmentPreset;
  held_prop_id: HeldProp | null;
  door_preset: string;
  open_doors: Set<string>;
  inventory: Set<QuestItem>;
  flags: Set<Flag>;
  /** SMS ids received, newest last. */
  inbox: string[];
  /** SMS ids the player has read and put away. */
  sms_read: Set<string>;
  /** Candle indexes lit this shift. */
  candles_lit: Set<number>;
  clock: ClockLocation;
  chalice: ChaliceLocation;
  relic: RelicLocation;
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
    sms_read: new Set(),
    candles_lit: new Set(),
    clock: 'ritual-table',
    chalice: 'altar',
    relic: 'none',
  };
}
