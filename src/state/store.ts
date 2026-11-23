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
export type QuestItem = 'chapel-key' | 'matches' | 'cross' | 'crucifix' | 'bible' | 'storage-key' | 'rod';

/**
 * The delivered relics, one at a time through the drop box (doc 3.2). Day 1:
 * the music box. Day 2 (S3): the teacup is a PLACEHOLDER for relic 1 until
 * the designer names it (decisions 2026-11-13).
 */
export type RelicKind = 'music-box' | 'teacup' | 'clown';

/** Large props carried one at a time, shown in the player's hands (doc 5.2). */
export type HeldProp = 'clock' | 'chalice' | 'bucket' | RelicKind;
/**
 * The holy-water bucket (D2-06): in the storage closet each morning, carried,
 * or set down by the ritual table in the chapel.
 */
export type BucketLocation = 'closet' | 'held' | 'chapel';

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
  | 'returned-to-gate'
  // Day 2 (S3).
  /** A few seconds into the shift, after the day card: the first objective shows. */
  | 'arrived'
  /** At the altar on Day 2 the chalice is gone; then the thought plays out. */
  | 'chalice-missing'
  | 'chalice-missing-thought-done'
  /** Day 2: inside the church at last; the loitering lines stop. */
  | 'entered-church'
  | 'loiter-1'
  | 'loiter-2'
  | 'loiter-3'
  /** Day 2: the crucifix is in hand and its thought has played. */
  | 'crucifix-thought-done'
  /** Searching the church: nudges played after a while with no progress. */
  | 'search-nudge-1'
  | 'search-nudge-2'
  | 'search-nudge-3'
  /** Day 2: the delivery alert has been read and its thought has played. */
  | 'alert-thought-done'
  /** Searching the church for it: behind the office desk, the two locked doors. */
  | 'searched-desk'
  | 'searched-storage'
  | 'searched-basement'
  /** All three checked: the "outside somewhere" thought, then it's on the bench. */
  | 'church-searched'
  | 'church-searched-thought-done'
  /** The prankster's three thoughts, one after another, then the next objective. */
  | 'prank-done'
  | 'prank-thought-done'
  | 'prank-focus-done'
  /** The chalice is on the table with the crucifix: "There. All set." */
  | 'table-set'
  // Day 2, the clown doll (S3 part 2).
  /** The cross made it dance (the dance is playing); then the two thoughts. */
  | 'clown-danced'
  | 'clown-dance-done'
  | 'water-idea'
  /** Holy water is called for: the storage key can be found. */
  | 'water-wanted'
  /** The storage closet has been opened with its key. */
  | 'storage-opened'
  /** Leaving the church for the second delivery: the long-walk thought. */
  | 'long-walk'
  /** The gate-code thought has played (Day 2 on). */
  | 'gate-code-recalled'
  /** The office door has been opened on Day 2, with its clock thought. */
  | 'office-opened';

/**
 * Flags that belong to the delivery in hand rather than the whole day. They
 * clear when the next delivery arrives, so each relic runs the same steps.
 */
export const RELIC_FLAGS: readonly Flag[] = [
  'drop-box-approached',
  'relic-pickup-thought-done',
  'relic-annoyed',
  'relic-rattled',
  'relic-settled',
  'good-book-said',
  'bible-prompted',
  'scripture-opened',
  'scripture-read',
  'relic-weakened',
  'relic-blessed',
  'relic-ghost-gone',
  'relic-thought-done',
  'clown-danced',
  'clown-dance-done',
  'water-idea',
];

export type ClockLocation = 'ritual-table' | 'held' | 'office-desk';
/** On Day 2 a prankster ghost has left it on the west garden bench (D2-02). */
export type ChaliceLocation = 'altar' | 'garden-bench' | 'held' | 'ritual-table';
/**
 * Where the current delivery (`relic_kind`) is: not yet delivered, waiting in
 * the drop box, carried, on the ritual table, on the cleaned-relic table
 * outside the chapel, or cleared away by staff between shifts.
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
  /** Which relic `relic` is about: the latest delivery. */
  relic_kind: RelicKind;
  /** Cleansed relics on the table outside the chapel this shift, in the order put there. */
  relics_stored: RelicKind[];
  bucket: BucketLocation;
  /** Holy water in the bucket (doc 8.3 bucket_filled). */
  bucket_filled: boolean;
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
    relic_kind: 'music-box',
    relics_stored: [],
    bucket: 'closet',
    bucket_filled: false,
  };
}
