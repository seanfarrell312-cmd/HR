import { GATE_CODE } from '../src/data/story';
import type { GameState } from '../src/state/store';
import { applyEvent, type Effect, type StoryEvent } from '../src/story/events';

/** Every Day 1 event in order, as a player would trigger them. */
export const PLAYTHROUGH: StoryEvent[] = [
  // S1: D1-01 to D1-06.
  { type: 'receive-sms', id: 'gateCode' },
  { type: 'read-sms' },
  { type: 'keypad-submit', code: GATE_CODE },
  { type: 'door-opened', id: 'church' },
  { type: 'read-note' },
  { type: 'take', item: 'chapel-key' },
  { type: 'take', item: 'matches' },
  { type: 'light-candle', index: 0 },
  { type: 'light-candle', index: 1 },
  { type: 'light-candle', index: 2 },
  { type: 'light-candle', index: 3 },
  { type: 'take', item: 'crucifix' },
  { type: 'bless-clock' },
  { type: 'pickup-clock' },
  { type: 'place-clock' },
  // S2: D1-07 to D1-10.
  { type: 'pickup-chalice' },
  { type: 'stage-chalice' },
  { type: 'receive-sms', id: 'delivery1' },
  { type: 'read-sms' },
  { type: 'take-relic' },
  { type: 'place-relic' },
  { type: 'bless-relic' },
  { type: 'read-scripture' },
  { type: 'bless-relic' },
  { type: 'pickup-relic' },
  { type: 'store-relic' },
  { type: 'head-home' },
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
