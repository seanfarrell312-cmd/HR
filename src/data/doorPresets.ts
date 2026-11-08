import type { LockState } from './layout';

// Test configurations for which doors can be opened (S0: "block door access
// according to a test config"). Doors not listed are unlocked.

export interface DoorPreset {
  id: string;
  label: string;
  locks: Record<string, LockState>;
}

export const DOOR_PRESETS: DoorPreset[] = [
  {
    id: 'day1-start',
    label: 'Day 1 start',
    locks: {
      // Opened by the keypad code (D1-01) and the chapel key (D1-03).
      gate: 'locked',
      chapel: 'locked',
      storage: 'locked',
      basement: 'locked',
      shed: 'jammed',
    },
  },
  { id: 'all-open', label: 'All unlocked', locks: {} },
];

export const LOCK_MESSAGES: Record<Exclude<LockState, 'unlocked'>, string> = {
  locked: "It's locked.",
  jammed: "It's jammed shut.",
};
