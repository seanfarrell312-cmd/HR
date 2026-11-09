import { createInitialState, type GameState } from '../state/store';

// Between shifts (doc 3.2, 5.2): tools go back to their day-start places,
// staff clear finished relics from the cleaned-relic table, doors are shut and
// locked again, and the sky returns to day. What the player has changed for
// good stays: the clock remains on the supervisor's desk, one-shot scares stay
// fired, and the phone keeps its old texts.

/** First objective of each day. Day 2's are built in S3. */
const FIRST_OBJECTIVE: Record<2 | 3, string> = { 2: 'D2-01', 3: 'D3-01' };

export function startDay(prev: GameState, day: 2 | 3): GameState {
  const s = createInitialState(prev.door_preset);
  s.day_index = day;
  s.objective_id = FIRST_OBJECTIVE[day];
  s.completed_objectives = [...prev.completed_objectives];
  s.fired_scares = [...prev.fired_scares];
  s.inbox = [...prev.inbox];
  s.sms_read = new Set(prev.inbox);
  // The cleansed clock is set dressing now (D1-07). The chalice and crucifix
  // are back on the altar, so the table is set again each day.
  if (prev.clock === 'office-desk' || prev.clock === 'held') s.clock = 'office-desk';
  // Staff clear finished relics from the table between shifts.
  if (prev.relic === 'relic-table' || prev.relic === 'removed') s.relic = 'removed';
  return s;
}
