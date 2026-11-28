import { describe, expect, it } from 'vitest';
import { BIRDSONG, THUNDER } from '../src/data/environment';
import { afterThought, GATE_CODE, OFFICE_NOTES, RELIC_LINES, REMINDERS, S4_PART1_END, SPOTS, THOUGHTS } from '../src/data/story';
import { PROPS } from '../src/data/layout';
import { createInitialState, type GameState } from '../src/state/store';
import { startDay } from '../src/story/day';
import { applyEvent, type Effect, type StoryEvent } from '../src/story/events';
import { currentObjective } from '../src/story/objectives';
import { lockState, resolve } from '../src/world/interact';
import { PLAYTHROUGH, play } from './playthrough';

// S4 part 1 (doc 6.3 D3-01 to D3-04): Day 3's start, the chalice in the
// basement as the lights fail and the sky greys, the bucket filled, and a
// plain brown box as the birds go quiet.

/** Every Day 3 event so far, in order, as a player would trigger them. */
export const DAY3_PLAYTHROUGH: StoryEvent[] = [
  // D3-01: gate, note, both keys, candles.
  { type: 'arrived' },
  { type: 'recall-gate-code' },
  { type: 'keypad-submit', code: GATE_CODE },
  { type: 'door-opened', id: 'church' },
  { type: 'door-opened', id: 'office' },
  { type: 'read-note' },
  { type: 'close-note' },
  { type: 'take', item: 'chapel-key' },
  { type: 'door-opened', id: 'chapel' },
  { type: 'take', item: 'matches' },
  { type: 'light-candle', index: 0 },
  { type: 'light-candle', index: 1 },
  { type: 'light-candle', index: 2 },
  { type: 'light-candle', index: 3 },
  // D3-02: the crucifix to the table, the chalice from the basement.
  { type: 'take', item: 'crucifix' },
  { type: 'stage-table' },
  { type: 'door-opened', id: 'basement' },
  { type: 'pickup-chalice' },
  { type: 'outside-overcast', x: 0, y: 46, level: 0 },
  { type: 'stage-table' },
  // D3-03: fill the bucket.
  { type: 'd3-fill-wanted' },
  { type: 'pickup-bucket' },
  { type: 'fill-bucket' },
  { type: 'place-bucket' },
  // D3-04: the text and the brown box.
  { type: 'receive-sms', id: 'd3delivery' },
  { type: 'read-sms' },
  { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 },
  { type: 'take-relic' },
  { type: 'relic-pickup-thought-done' },
  { type: 'relic-near-church', x: 0, y: 40, level: 0 },
  { type: 'place-relic' },
];

function day3Start(): GameState {
  const s = createInitialState();
  play(s, PLAYTHROUGH);
  return startDay(startDay(s, 2), 3);
}

function step(type: StoryEvent['type'], nth = 1): number {
  let seen = 0;
  const i = DAY3_PLAYTHROUGH.findIndex((e) => e.type === type && ++seen === nth);
  if (i < 0) throw new Error(`no ${type} #${nth} in the Day 3 playthrough`);
  return i;
}
const at = (upTo: number): GameState => {
  const s = day3Start();
  play(s, DAY3_PLAYTHROUGH.slice(0, upTo));
  return s;
};
const task = (s: GameState) => currentObjective(s).task(s);
const says = (fx: Effect[]) => fx.filter((f) => f.kind === 'say').map((f) => (f as { text: string }).text);
const inCircle = { x: 11.4, y: 53.1, level: 0 as const };
const byHooks = { x: -9.3, y: 51.4, level: 0 as const };
const farShelf = { x: -6.3, y: 54, level: -1 as const };

describe('Day 3 playthrough so far (S4 part 1)', () => {
  it('runs from the gate to the brown box on the ritual table', () => {
    const s = day3Start();
    expect(s.day_index).toBe(3);
    const seen = [s.objective_id];
    for (const e of DAY3_PLAYTHROUGH) {
      play(s, [e]);
      if (seen[seen.length - 1] !== s.objective_id) seen.push(s.objective_id);
    }
    expect(seen).toEqual(['D3-01', 'D3-02', 'D3-03', 'D3-04', 'S4-P1-END']);
    expect(task(s)).toBe(S4_PART1_END);
    expect(s.environment_preset).toBe('D3_SILENCE');
  });

  it('never fires anything twice when every event is repeated', () => {
    const s = day3Start();
    for (const e of DAY3_PLAYTHROUGH) {
      play(s, [e]);
      expect(applyEvent(s, e).filter((f) => f.kind !== 'flash'), e.type).toEqual([]);
    }
  });
});

describe('the start of Day 3 (D3-01)', () => {
  it('starts with the chalice in the basement and the bucket, empty, by the ritual table', () => {
    const s = day3Start();
    expect(s.chalice).toBe('basement');
    expect(s.bucket).toBe('chapel');
    expect(s.bucket_filled).toBe(false);
    expect(s.environment_preset).toBe('BASE_DAY');
    expect(OFFICE_NOTES[3]).toContain('basement key');
  });

  it('hands over the chapel and basement keys together, which opens the basement door', () => {
    const s = at(step('take'));
    expect(task(s)).toBe('Take the chapel and basement keys from the hooks by the office door');
    expect(lockState(s, 'basement')).toBe('locked');
    expect(resolve('item:chapel-key', s, byHooks).prompt).toBe('E  Take the keys');
    applyEvent(s, { type: 'take', item: 'chapel-key' });
    expect(s.inventory.has('basement-key')).toBe(true);
    expect(lockState(s, 'basement')).toBe('unlocked');
  });
});

describe('the chalice in the basement (D3-02)', () => {
  it('asks for the crucifix first, then the chalice from the basement', () => {
    const s = at(step('take', 3));
    expect(task(s)).toBe('Fetch the crucifix from the altar');
    applyEvent(s, { type: 'take', item: 'crucifix' });
    expect(task(s)).toBe('Put the crucifix on the ritual table');
    applyEvent(s, { type: 'stage-table' });
    expect(task(s)).toBe('Fetch the chalice from the basement');
  });

  it('fails the lights and brings thunder and a grey sky as it is taken', () => {
    const s = at(step('pickup-chalice'));
    expect(resolve('item:chalice', s, farShelf).prompt).toBe('E  Take the chalice');
    const fx = applyEvent(s, { type: 'pickup-chalice' });
    expect(fx).toContainEqual({ kind: 'lights-out' });
    expect(fx).toContainEqual({ kind: 'sfx', id: 'thunder' });
    expect(says(fx)).toEqual(['...Of course. Of course the lights go now.']);
    expect(s.chalice).toBe('held');
    expect(s.flags.has('basement-dark')).toBe(true);
    expect(s.environment_preset).toBe('D3_OVERCAST');
    expect(task(s)).toBe('Place the chalice on the ritual table');
  });

  it('sits on the far shelving in the basement', () => {
    const shelf = PROPS.find((p) => p.id === 'shelf-far-1')!;
    const c = SPOTS.chaliceBasement;
    expect(shelf.level).toBe(-1);
    expect(c.x).toBeGreaterThan(shelf.rect.x1);
    expect(c.x).toBeLessThan(shelf.rect.x2);
    expect(c.y).toBeGreaterThan(shelf.rect.y1);
    expect(c.y).toBeLessThan(shelf.rect.y2);
    expect(c.z).toBeCloseTo((shelf.base ?? 0) + shelf.height, 3);
  });

  it('notices the grey sky once, outside only', () => {
    const before = at(step('pickup-chalice'));
    expect(applyEvent(before, { type: 'outside-overcast', x: 0, y: 46, level: 0 })).toEqual([]);
    const s = at(step('outside-overcast'));
    // Indoors, or underground: not yet.
    expect(applyEvent(s, { type: 'outside-overcast', x: 0, y: 55, level: 0 })).toEqual([]);
    expect(applyEvent(s, { type: 'outside-overcast', x: 0, y: 55, level: -1 })).toEqual([]);
    expect(says(applyEvent(s, { type: 'outside-overcast', x: 0, y: 46, level: 0 }))).toEqual(['Was that thunder? It was sunny a minute ago.']);
    expect(applyEvent(s, { type: 'outside-overcast', x: 0, y: 40, level: 0 })).toEqual([]);
  });
});

describe('the bucket (D3-03)', () => {
  it('wants the bucket filled once the table is set', () => {
    const s = at(step('stage-table', 2));
    const fx = applyEvent(s, { type: 'stage-table' });
    expect(says(fx)).toEqual(['There. Now to fill the bucket before the delivery comes.']);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.tableSetDay3), event: { type: 'd3-fill-wanted' } });
    expect(s.objective_id).toBe('D3-03');
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'd3-fill-wanted' });
    expect(task(s)).toBe('Fill the bucket at the fountain in the west garden');
    expect(resolve('item:bucket', s, inCircle).prompt).toBe('E  Pick up the bucket');
    // The rod lies by it, ready for later.
    expect(resolve('item:rod', s, inCircle).prompt).toBe('E  Take the holy-water rod');
  });

  it('brings the delivery text once the filled bucket is by the table', () => {
    const s = at(step('place-bucket'));
    const fx = applyEvent(s, { type: 'place-bucket' });
    expect(says(fx)).toEqual(['All set. Now I just wait.']);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.waterReady), event: { type: 'receive-sms', id: 'd3delivery' } });
    expect(s.objective_id).toBe('D3-04');
  });
});

describe('the brown box (D3-04)', () => {
  it('arrives with the alert and waits in the drop box until the text is read', () => {
    const s = at(step('receive-sms'));
    applyEvent(s, { type: 'receive-sms', id: 'd3delivery' });
    expect(s.relic).toBe('drop-box');
    expect(s.relic_kind).toBe('box');
    expect(task(s)).toBe('Check your phone (Q)');
    expect(resolve('item:drop-box', s, { x: 3.7, y: 1.5, level: 0 }).action).toEqual({ kind: 'message', text: REMINDERS.checkPhone });
    applyEvent(s, { type: 'read-sms' });
    expect(task(s)).toBe('Collect the delivery from the drop box by the gate');
  });

  it('is quiet, and the birds stop as it is picked up', () => {
    const s = at(step('approach-drop-box'));
    expect(says(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 }))).toEqual([RELIC_LINES.box.approach]);
    expect(BIRDSONG.has(s.environment_preset)).toBe(true);
    expect(says(applyEvent(s, { type: 'take-relic' }))).toEqual(['Is this a cigar box? It feels empty.']);
    expect(s.environment_preset).toBe('D3_SILENCE');
    expect(BIRDSONG.has(s.environment_preset)).toBe(false);
    expect(THUNDER.has(s.environment_preset)).toBe(true);
    applyEvent(s, { type: 'relic-pickup-thought-done' });
    expect(task(s)).toBe('Put the brown box on the ritual table');
    expect(says(applyEvent(s, { type: 'relic-near-church', x: 0, y: 40, level: 0 }))).toEqual(["It's gone really quiet. Where did all the birds go?"]);
  });

  it('goes on the ritual table, and part 1 ends', () => {
    const s = at(step('place-relic'));
    applyEvent(s, { type: 'place-relic' });
    expect(s.relic).toBe('ritual-table');
    expect(task(s)).toBe(S4_PART1_END);
  });
});

describe('birds and thunder (7.1)', () => {
  it('has birdsong on Days 1 and 2 and Day 3 until the box, and thunder from the chalice on', () => {
    expect([...BIRDSONG].sort()).toEqual(['BASE_DAY', 'D1_EVENING', 'D3_OVERCAST']);
    expect([...THUNDER].sort()).toEqual(['D3_OVERCAST', 'D3_SILENCE']);
  });
});
