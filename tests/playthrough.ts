import { GATE_CODE } from '../src/data/story';
import type { GameState } from '../src/state/store';
import { applyEvent, type Effect, type StoryEvent } from '../src/story/events';

/** Every Day 1 event in order, as a player would trigger them. */
export const PLAYTHROUGH: StoryEvent[] = [
  // D1-01 to D1-03: gate, church, note and key.
  { type: 'receive-sms', id: 'gateCode' },
  { type: 'read-sms' },
  { type: 'keypad-submit', code: GATE_CODE },
  { type: 'door-opened', id: 'church' },
  { type: 'read-note' },
  { type: 'close-note' },
  { type: 'take', item: 'chapel-key' },
  // D1-04 and D1-05: prepare the ritual site.
  { type: 'door-opened', id: 'chapel' },
  { type: 'take', item: 'matches' },
  { type: 'light-candle', index: 0 },
  { type: 'light-candle', index: 1 },
  { type: 'light-candle', index: 2 },
  { type: 'light-candle', index: 3 },
  { type: 'pickup-chalice' },
  { type: 'take', item: 'crucifix' },
  { type: 'stage-table' },
  // D1-06 and D1-07: bless the clock, take it to the desk.
  { type: 'take', item: 'cross' },
  { type: 'bless-clock' },
  { type: 'clock-ghost-gone' },
  { type: 'clock-thought-done' },
  { type: 'pickup-clock' },
  { type: 'place-clock' },
  // D1-08: the delivery.
  { type: 'receive-sms', id: 'delivery1' },
  { type: 'read-sms' },
  { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 },
  { type: 'take-relic' },
  { type: 'relic-pickup-thought-done' },
  { type: 'relic-near-church', x: 0, y: 36, level: 0 },
  // D1-09: the two-stage blessing.
  { type: 'place-relic' },
  { type: 'bless-relic' },
  { type: 'relic-settled' },
  { type: 'good-book' },
  { type: 'bible-prompt' },
  { type: 'take', item: 'bible' },
  { type: 'begin-scripture' },
  { type: 'read-scripture' },
  { type: 'relic-weakened' },
  { type: 'bless-relic' },
  { type: 'relic-ghost-gone' },
  { type: 'relic-thought-done' },
  // D1-10: Bible back, store the music box and leave.
  { type: 'return-bible' },
  { type: 'pickup-relic' },
  { type: 'store-relic' },
  { type: 'head-home' },
  { type: 'gate-prompt' },
  { type: 'reach-gate', x: 0, y: 1, level: 0 },
];

/** Index of an event in PLAYTHROUGH, so tests can stop just before or after it. */
export function step(type: StoryEvent['type'], nth = 1): number {
  let seen = 0;
  const i = PLAYTHROUGH.findIndex((e) => e.type === type && ++seen === nth);
  if (i < 0) throw new Error(`no ${type} #${nth} in the playthrough`);
  return i;
}

/** Run events the way the game does: a door opens, then its event. */
export function play(s: GameState, events: StoryEvent[]): Effect[] {
  return events.flatMap((e) => {
    if (e.type === 'door-opened') s.open_doors.add(e.id);
    return applyEvent(s, e);
  });
}

/** A fresh state played up to (not including) `upTo`. */
export function playedTo(upTo: number, s: GameState): GameState {
  play(s, PLAYTHROUGH.slice(0, upTo));
  return s;
}
