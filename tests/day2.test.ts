import { describe, expect, it } from 'vitest';
import {
  afterThought,
  ALTAR_APPROACH,
  D2_DELIVERY_DELAY,
  GATE_CODE,
  HOLY_CIRCLE,
  OFFICE_NOTES,
  PRANK_SECONDS,
  RELIC_LINES,
  RELIC_TABLE_SLOTS,
  REMINDERS,
  S3_PART1_END,
  SMS,
  THOUGHTS,
} from '../src/data/story';
import { createInitialState, type GameState } from '../src/state/store';
import { startDay } from '../src/story/day';
import { applyEvent, type Effect, type StoryEvent } from '../src/story/events';
import { currentObjective } from '../src/story/objectives';
import { resolve } from '../src/world/interact';
import { PLAYTHROUGH, play } from './playthrough';

// S3 part 1 (doc 6.2 D2-01 to D2-04): the Day 2 shift start, the chalice a
// prankster ghost left on the garden bench, and the first delivery cleansed
// with scripture and the cross, then put away.

/** Every Day 2 event so far, in order, as a player would trigger them. */
export const DAY2_PLAYTHROUGH: StoryEvent[] = [
  // D2-01: gate, note, key and candles.
  { type: 'arrived' },
  { type: 'keypad-submit', code: GATE_CODE },
  { type: 'door-opened', id: 'church' },
  { type: 'read-note' },
  { type: 'close-note' },
  { type: 'take', item: 'chapel-key' },
  { type: 'door-opened', id: 'chapel' },
  { type: 'take', item: 'matches' },
  { type: 'light-candle', index: 0 },
  { type: 'light-candle', index: 1 },
  { type: 'light-candle', index: 2 },
  { type: 'light-candle', index: 3 },
  // D2-02: no chalice on the altar; it's on the garden bench.
  { type: 'take', item: 'crucifix' },
  { type: 'near-altar', x: 0, y: 63, level: 0 },
  { type: 'chalice-missing-done' },
  { type: 'pickup-chalice' },
  { type: 'prank-done' },
  { type: 'prank-thought-done' },
  // D2-03: set the table, then the first delivery.
  { type: 'stage-table' },
  { type: 'receive-sms', id: 'd2delivery1' },
  { type: 'read-sms' },
  { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 },
  { type: 'take-relic' },
  { type: 'relic-pickup-thought-done' },
  // D2-04: scripture, then the cross; put it away.
  { type: 'place-relic' },
  { type: 'take', item: 'bible' },
  { type: 'begin-scripture' },
  { type: 'read-scripture' },
  { type: 'take', item: 'cross' },
  { type: 'bless-relic' },
  { type: 'relic-ghost-gone' },
  { type: 'relic-thought-done' },
  { type: 'return-bible' },
  { type: 'pickup-relic' },
  { type: 'store-relic' },
];

function day2Start(): GameState {
  const s = createInitialState();
  play(s, PLAYTHROUGH);
  return startDay(s, 2);
}

function step(type: StoryEvent['type'], nth = 1): number {
  let seen = 0;
  const i = DAY2_PLAYTHROUGH.findIndex((e) => e.type === type && ++seen === nth);
  if (i < 0) throw new Error(`no ${type} #${nth} in the Day 2 playthrough`);
  return i;
}

/** Day 2 played up to (not including) `upTo`. */
const at = (upTo: number): GameState => {
  const s = day2Start();
  play(s, DAY2_PLAYTHROUGH.slice(0, upTo));
  return s;
};
const task = (s: GameState) => currentObjective(s).task(s);
const says = (fx: Effect[]) => fx.filter((f) => f.kind === 'say').map((f) => (f as { text: string }).text);
const flashes = (fx: Effect[]) => fx.filter((f) => f.kind === 'flash').map((f) => (f as { text: string }).text);
const inCircle = { x: HOLY_CIRCLE.x, y: HOLY_CIRCLE.y, level: 0 as const };
const byBench = { x: -27, y: 49, level: 0 as const };

describe('Day 2 part 1 playthrough', () => {
  it('runs from the gate to the first relic put away', () => {
    const s = day2Start();
    const seen = [s.objective_id];
    for (const e of DAY2_PLAYTHROUGH) {
      play(s, [e]);
      if (seen[seen.length - 1] !== s.objective_id) seen.push(s.objective_id);
    }
    expect(seen).toEqual(['D2-01', 'D2-02', 'D2-03', 'D2-04', 'D2-05']);
    expect(s.relics_stored).toEqual(['teacup']);
    expect(task(s)).toBe(S3_PART1_END);
  });

  it('never fires anything twice when every event is repeated', () => {
    const s = day2Start();
    for (const e of DAY2_PLAYTHROUGH) {
      play(s, [e]);
      const flags = [...s.flags].sort().join();
      const again = applyEvent(s, e).filter((f) => f.kind !== 'flash');
      // Opening the scripture again before it's read just re-opens the page,
      // as on Day 1; nothing in the story changes.
      if (e.type === 'begin-scripture') expect([...s.flags].sort().join()).toBe(flags);
      else expect(again, e.type).toEqual([]);
    }
    expect(s.fired_scares.filter((f) => f === 'd2-prank')).toHaveLength(1);
    expect(s.fired_scares.filter((f) => f === 'd2-teacup-ghost')).toHaveLength(1);
  });

  it('leaves Day 1 untouched: finishing it does not tick off Day 2', () => {
    const s = createInitialState();
    play(s, PLAYTHROUGH);
    expect(s.objective_id).toBe('D2-01');
    expect(s.completed_objectives).not.toContain('D2-01');
  });
});

describe('shift start (D2-01)', () => {
  it('shows nothing until the day card has gone, then the gate', () => {
    const s = day2Start();
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'arrived' });
    expect(task(s)).toBe('Enter the code on the gate keypad');
  });

  it('walks through note, key, chapel and candles', () => {
    expect(task(at(step('read-note')))).toBe('Read the note on the office desk');
    expect(task(at(step('take', 1)))).toBe('Take the chapel key from the hooks by the office door');
    expect(task(at(step('door-opened', 2)))).toBe('Unlock the chapel');
    expect(task(at(step('take', 2)))).toBe('Pick up the matches from the shelf');
    expect(task(at(step('light-candle', 3)))).toBe('Light the candles around the holy circle (2/4)');
  });

  it('has its own note about lingering, pranking ghosts', () => {
    expect(OFFICE_NOTES[2]).toMatch(/linger/);
    expect(OFFICE_NOTES[2]).toMatch(/prank/);
    expect(OFFICE_NOTES[2]).not.toBe(OFFICE_NOTES[1]);
  });

  it("skips Day 1's first-visit thoughts", () => {
    const s = at(step('door-opened'));
    expect(applyEvent(s, { type: 'approach-church', x: 0, y: 40, level: 0 })).toEqual([]);
    const opened = applyEvent(s, { type: 'door-opened', id: 'church' });
    expect(says(opened)).toEqual([]);
  });
});

describe('the missing chalice (D2-02)', () => {
  it('starts the day on the garden bench, not the altar', () => {
    expect(day2Start().chalice).toBe('garden-bench');
  });

  it('notices at the altar once the candles are lit, then asks to find it', () => {
    const s = at(step('near-altar'));
    expect(task(s)).toBe('Fetch the chalice and crucifix from the altar');
    // Too far away: nothing.
    expect(applyEvent(s, { type: 'near-altar', x: 0, y: ALTAR_APPROACH.y - ALTAR_APPROACH.r - 1, level: 0 })).toEqual([]);
    const fx = applyEvent(s, { type: 'near-altar', x: 0, y: 63, level: 0 });
    expect(says(fx)).toEqual([THOUGHTS.chaliceMissing]);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.chaliceMissing), event: { type: 'chalice-missing-done' } });
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'chalice-missing-done' });
    expect(task(s)).toBe('Find the missing chalice');
  });

  it('does not notice before the candles are lit', () => {
    const s = at(step('light-candle', 4));
    expect(applyEvent(s, { type: 'near-altar', x: 0, y: 63, level: 0 })).toEqual([]);
  });

  it('lets the crucifix come off the altar once the candles are lit', () => {
    const before = at(step('light-candle', 4));
    expect(resolve('item:crucifix', before, inCircle).prompt).toBe('Crucifix');
    const after = at(step('take', 3));
    expect(resolve('item:crucifix', after, inCircle).prompt).toBe('E  Take crucifix');
  });

  it('blows a raspberry once when the chalice is taken from the bench, then the thought', () => {
    const s = at(step('pickup-chalice'));
    expect(resolve('item:chalice', s, byBench).prompt).toBe('E  Take the chalice');
    const fx = applyEvent(s, { type: 'pickup-chalice' });
    expect(fx).toContainEqual({ kind: 'prank' });
    expect(fx).toContainEqual({ kind: 'sfx', id: 'raspberry' });
    expect(fx).toContainEqual({ kind: 'after', seconds: PRANK_SECONDS, event: { type: 'prank-done' } });
    expect(s.chalice).toBe('held');
    expect(task(s)).toBe('');
    expect(says(applyEvent(s, { type: 'prank-done' }))).toEqual([THOUGHTS.prank]);
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'prank-thought-done' });
    expect(s.objective_id).toBe('D2-03');
    expect(task(s)).toBe('Set the chalice and crucifix out on the ritual table');
  });

  it('is fine to find the chalice before the altar was even checked', () => {
    const s = at(step('light-candle'));
    applyEvent(s, { type: 'pickup-chalice' });
    applyEvent(s, { type: 'prank-done' });
    applyEvent(s, { type: 'prank-thought-done' });
    for (const i of [0, 1, 2, 3]) applyEvent(s, { type: 'light-candle', index: i });
    // D2-01 and D2-02 both done; the crucifix is still on the altar.
    expect(s.objective_id).toBe('D2-03');
    expect(task(s)).toBe('Fetch the crucifix from the altar');
    // No missing-chalice thought now it has been found.
    expect(applyEvent(s, { type: 'near-altar', x: 0, y: 63, level: 0 })).toEqual([]);
  });

  it('keeps hands free for one thing at a time', () => {
    const s = at(step('pickup-chalice'));
    s.held_prop_id = 'clock';
    expect(resolve('item:chalice', s, byBench).action).toEqual({ kind: 'message', text: REMINDERS.handsFull });
    expect(flashes(applyEvent(s, { type: 'pickup-chalice' }))).toEqual([REMINDERS.handsFull]);
    expect(s.chalice).toBe('garden-bench');
  });
});

describe('the first delivery (D2-03)', () => {
  it('sends the text once the table is set', () => {
    const s = at(step('stage-table'));
    const fx = applyEvent(s, { type: 'stage-table' });
    expect(fx).toContainEqual({ kind: 'after', seconds: D2_DELIVERY_DELAY, event: { type: 'receive-sms', id: 'd2delivery1' } });
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'receive-sms', id: 'd2delivery1' });
    expect(s.relic).toBe('drop-box');
    expect(s.relic_kind).toBe('teacup');
    expect(task(s)).toBe('Check your phone (Q)');
    applyEvent(s, { type: 'read-sms' });
    expect(task(s)).toBe('Collect the delivery from the drop box by the gate');
    expect(SMS.d2delivery1.text).toMatch(/drop box/i);
  });

  it('has its own lines for the teacup', () => {
    const s = at(step('approach-drop-box'));
    expect(says(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 }))).toEqual([RELIC_LINES.teacup.approach]);
    const fx = applyEvent(s, { type: 'take-relic' });
    expect(says(fx)).toEqual([RELIC_LINES.teacup.pickup]);
    expect(s.held_prop_id).toBe('teacup');
    // No music-box grumbling on the way up.
    expect(applyEvent(s, { type: 'relic-near-church', x: 0, y: 36, level: 0 })).toEqual([]);
  });

  it('clears yesterday\'s relic steps so the new delivery starts fresh', () => {
    const s = at(step('receive-sms'));
    s.flags.add('relic-blessed');
    applyEvent(s, { type: 'receive-sms', id: 'd2delivery1' });
    expect(s.flags.has('relic-blessed')).toBe(false);
  });
});

describe('cleansing the teacup (D2-04)', () => {
  it('wants scripture first, then the cross', () => {
    const s = at(step('place-relic'));
    expect(task(s)).toBe('Put the teacup on the ritual table');
    applyEvent(s, { type: 'place-relic' });
    expect(task(s)).toBe('Pick up the Bible from the stand');
    expect(resolve('item:teacup', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.bibleFirst });
    // No cross-first blessing: it needs the scripture.
    s.inventory.add('cross');
    expect(flashes(applyEvent(s, { type: 'bless-relic' }))).toEqual([REMINDERS.scriptureFirst]);
    s.inventory.delete('cross');
    expect(resolve('item:bible', s, inCircle).prompt).toBe('E  Pick up the Bible');
    applyEvent(s, { type: 'take', item: 'bible' });
    expect(task(s)).toBe('Read the teacup some scripture');
    expect(resolve('item:teacup', s, inCircle).hold).toEqual({ type: 'begin-scripture' });
    expect(applyEvent(s, { type: 'begin-scripture' })).toContainEqual({ kind: 'open-scripture' });
    // Closing the scripture: no shudder this time; the cross is next.
    const read = applyEvent(s, { type: 'read-scripture' });
    expect(read.filter((f) => f.kind === 'rattle')).toEqual([]);
    expect(task(s)).toBe('Take the cross from the chapel shelf');
    applyEvent(s, { type: 'take', item: 'cross' });
    expect(task(s)).toBe('Stand in the holy circle and bless the teacup');
    expect(resolve('item:teacup', s, inCircle).hold).toEqual({ type: 'bless-relic' });
    expect(applyEvent(s, { type: 'bless-relic' })).toEqual([{ kind: 'purify', relic: 'teacup' }]);
  });

  it('lets the table stand in for the small, hopping teacup', () => {
    const s = at(step('begin-scripture'));
    expect(resolve('item:ritual-table', s, inCircle)).toEqual(resolve('item:teacup', s, inCircle));
    expect(resolve('item:ritual-table', s, inCircle).hold).toEqual({ type: 'begin-scripture' });
    // Day 1's music box too.
    const d1 = createInitialState();
    play(d1, PLAYTHROUGH.slice(0, PLAYTHROUGH.findIndex((e) => e.type === 'bless-relic')));
    expect(resolve('item:ritual-table', d1, inCircle).hold).toEqual({ type: 'bless-relic' });
  });

  it('thinks about the ghost, then asks for the Bible back and the teacup away', () => {
    const s = at(step('relic-ghost-gone'));
    expect(task(s)).toBe('');
    expect(says(applyEvent(s, { type: 'relic-ghost-gone' }))).toEqual([RELIC_LINES.teacup.ghost]);
    applyEvent(s, { type: 'relic-thought-done' });
    expect(task(s)).toBe('Put the Bible back on the stand and pick up the teacup');
    expect(resolve('item:teacup', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.bibleBack });
    applyEvent(s, { type: 'return-bible' });
    expect(resolve('item:teacup', s, inCircle).prompt).toBe('E  Pick up the teacup');
    applyEvent(s, { type: 'pickup-relic' });
    expect(task(s)).toBe('Put the teacup on the table outside the chapel');
    expect(resolve('item:relic-table', s, inCircle).prompt).toBe('E  Put the teacup on the table');
  });

  it("puts it away without Day 1's dusk or walk home", () => {
    const s = at(step('store-relic'));
    const fx = applyEvent(s, { type: 'store-relic' });
    expect(fx).toEqual([{ kind: 'sfx', id: 'place' }, { kind: 'objective', id: 'D2-04' }]);
    expect(s.environment_preset).toBe('BASE_DAY');
    expect(s.relics_stored).toEqual(['teacup']);
  });

  it('has a place on the cleaned-relic table for each of the three deliveries', () => {
    expect(RELIC_TABLE_SLOTS).toHaveLength(3);
    const ys = RELIC_TABLE_SLOTS.map((p) => p.y);
    expect(new Set(ys).size).toBe(3);
    // All on the table (rect 6.9..7.85 x 50.3..51.8).
    for (const p of RELIC_TABLE_SLOTS) {
      expect(p.x).toBeGreaterThan(6.9);
      expect(p.x).toBeLessThan(7.85);
      expect(p.y).toBeGreaterThan(50.3);
      expect(p.y).toBeLessThan(51.8);
    }
  });
});
