import type { GameState } from '../state/store';

// Day 2 (D2-02): searching the church for the missing chalice. Shared by the
// story events, the objectives and the interaction prompts.

/** Day 2: the crucifix is on the table and the church is being searched for the chalice. */
export function searching(s: GameState): boolean {
  return (
    s.day_index === 2 &&
    s.chalice === 'garden-bench' &&
    s.flags.has('chalice-missing-thought-done') &&
    s.flags.has('crucifix-staged') &&
    !s.flags.has('church-searched')
  );
}

/**
 * Day 2: the church doors stay shut from the crucifix going down until the
 * "outside somewhere" thought has played and the grounds objective shows.
 */
export function churchSealed(s: GameState): boolean {
  return (
    s.day_index === 2 &&
    s.chalice === 'garden-bench' &&
    s.flags.has('crucifix-staged') &&
    !s.flags.has('church-searched-thought-done')
  );
}

/** Places checked so far in the search (0 to SEARCH_SPOTS). */
export function searchCount(s: GameState): number {
  return (['searched-desk', 'searched-storage', 'searched-basement'] as const).filter((f) => s.flags.has(f)).length;
}

/** True when trying this locked door still counts towards the search. */
export function searchesDoor(s: GameState, doorId: string): boolean {
  if (!searching(s)) return false;
  if (doorId === 'storage') return !s.flags.has('searched-storage');
  if (doorId === 'basement') return !s.flags.has('searched-basement');
  return false;
}

