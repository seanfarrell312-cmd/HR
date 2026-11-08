import { describe, expect, it } from 'vitest';
import { GATE_CODE, HOLY_CIRCLE } from '../src/data/story';
import { createInitialState, type GameState } from '../src/state/store';
import { applyEvent, type Effect, type StoryEvent } from '../src/story/events';
import { HoldMeter } from '../src/story/hold';
import { advanceObjectives } from '../src/story/objectives';
import { inHolyCircle, lockState, resolve } from '../src/world/interact';

// S1 stage tests (doc 9.1): gate only opens on the correct code; the ritual
// only works after its preconditions; the ghost and each objective complete
// once; spamming input never duplicates state.

const run = (s: GameState, events: StoryEvent[]): Effect[] => events.flatMap((e) => applyEvent(s, e));
const kinds = (fx: Effect[]) => fx.map((f) => f.kind);
const inCircle = { x: HOLY_CIRCLE.x, y: HOLY_CIRCLE.y, level: 0 as const };

/** Every S1 event in order, as a player would trigger them. */
const PLAYTHROUGH: StoryEvent[] = [
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
];

/** Open the church doors the way the game does: the door opens, then the event. */
function withChurchOpen(s: GameState, events: StoryEvent[]): Effect[] {
  return events.flatMap((e) => {
    if (e.type === 'door-opened') s.open_doors.add(e.id);
    return applyEvent(s, e);
  });
}

describe('gate keypad (D1-01)', () => {
  it('rejects a wrong code and keeps the gate locked', () => {
    const s = createInitialState();
    const fx = applyEvent(s, { type: 'keypad-submit', code: '0000' });
    expect(kinds(fx)).toContain('flash');
    expect(lockState(s, 'gate')).toBe('locked');
    expect(s.objective_id).toBe('D1-01');
  });

  it('opens the gate on the correct code, once', () => {
    const s = createInitialState();
    const first = applyEvent(s, { type: 'keypad-submit', code: GATE_CODE });
    expect(first).toContainEqual({ kind: 'open-door', id: 'gate' });
    expect(lockState(s, 'gate')).toBe('unlocked');
    expect(s.objective_id).toBe('D1-02');
    expect(applyEvent(s, { type: 'keypad-submit', code: GATE_CODE })).toEqual([]);
  });

  it('delivers the supervisor text once', () => {
    const s = createInitialState();
    run(s, [{ type: 'receive-sms', id: 'gateCode' }, { type: 'receive-sms', id: 'gateCode' }]);
    expect(s.inbox).toEqual(['gateCode']);
  });
});

describe('office and chapel key (D1-03)', () => {
  it('will not hand over the key before the note is read', () => {
    const s = createInitialState();
    applyEvent(s, { type: 'take', item: 'chapel-key' });
    expect(s.inventory.has('chapel-key')).toBe(false);
    expect(lockState(s, 'chapel')).toBe('locked');
  });

  it('unlocks the chapel once the key is taken', () => {
    const s = createInitialState();
    run(s, [{ type: 'read-note' }, { type: 'take', item: 'chapel-key' }]);
    expect(lockState(s, 'chapel')).toBe('unlocked');
  });
});

describe('candles and blessing (D1-04, D1-05)', () => {
  it('cannot light candles without matches', () => {
    const s = createInitialState();
    applyEvent(s, { type: 'light-candle', index: 0 });
    expect(s.candles_lit.size).toBe(0);
  });

  it('refuses the blessing until candles are lit and the crucifix is in hand', () => {
    const s = createInitialState();
    applyEvent(s, { type: 'take', item: 'matches' });
    expect(kinds(applyEvent(s, { type: 'bless-clock' }))).toEqual(['flash']);
    run(s, [0, 1, 2, 3].map((index) => ({ type: 'light-candle', index }) as StoryEvent));
    expect(kinds(applyEvent(s, { type: 'bless-clock' }))).toEqual(['flash']);
    applyEvent(s, { type: 'take', item: 'crucifix' });
    expect(kinds(applyEvent(s, { type: 'bless-clock' }))).toContain('ghost');
    expect(s.flags.has('clock-blessed')).toBe(true);
  });

  it('only offers the hold-to-bless action from inside the holy circle', () => {
    const s = createInitialState();
    run(s, [{ type: 'take', item: 'matches' }, { type: 'take', item: 'crucifix' }]);
    run(s, [0, 1, 2, 3].map((index) => ({ type: 'light-candle', index }) as StoryEvent));
    const outside = { x: 9, y: 52.7, level: 0 as const };
    expect(inHolyCircle(outside)).toBe(false);
    expect(resolve('item:clock', s, outside).hold).toBeUndefined();
    expect(resolve('item:clock', s, inCircle).hold).toEqual({ type: 'bless-clock' });
  });

  it('releases the ghost exactly once, however often the blessing fires', () => {
    const s = createInitialState();
    const fx = run(s, [...PLAYTHROUGH.slice(6, 13), { type: 'bless-clock' }, { type: 'bless-clock' }]);
    expect(fx.filter((f) => f.kind === 'ghost')).toHaveLength(1);
    expect(s.fired_scares).toEqual(['d1-clock-ghost']);
  });
});

describe('clock delivery (D1-06)', () => {
  it('cannot pick up the clock before it is blessed', () => {
    const s = createInitialState();
    applyEvent(s, { type: 'pickup-clock' });
    expect(s.clock).toBe('ritual-table');
    expect(s.held_prop_id).toBeNull();
  });

  it('carries one clock at a time and places it once', () => {
    const s = createInitialState();
    withChurchOpen(s, PLAYTHROUGH.slice(0, 14));
    expect(s.clock).toBe('held');
    expect(resolve('item:office-desk', s, inCircle).action).toEqual({ kind: 'story', event: { type: 'place-clock' } });
    applyEvent(s, { type: 'place-clock' });
    expect(applyEvent(s, { type: 'place-clock' })).toEqual([]);
    expect(s.clock).toBe('office-desk');
    expect(s.held_prop_id).toBeNull();
  });
});

describe('S1 playthrough', () => {
  it('completes D1-01 to D1-06 in order and stops at the end of the build', () => {
    const s = createInitialState();
    const fx = withChurchOpen(s, PLAYTHROUGH);
    expect(fx.filter((f) => f.kind === 'objective').map((f) => (f as { id: string }).id)).toEqual([
      'D1-01',
      'D1-02',
      'D1-03',
      'D1-04',
      'D1-05',
      'D1-06',
    ]);
    expect(s.objective_id).toBe('D1-07');
  });

  it('does not duplicate any state when every event is spammed', () => {
    const s = createInitialState();
    const spammed = PLAYTHROUGH.flatMap((e) => [e, e, e]);
    const fx = withChurchOpen(s, spammed);
    expect(s.completed_objectives).toEqual(['D1-01', 'D1-02', 'D1-03', 'D1-04', 'D1-05', 'D1-06']);
    expect(s.inbox).toEqual(['gateCode']);
    expect(s.candles_lit.size).toBe(4);
    expect(fx.filter((f) => f.kind === 'ghost')).toHaveLength(1);
    expect(fx.filter((f) => f.kind === 'open-door')).toHaveLength(1);
  });

  it('cannot complete a later objective early', () => {
    const s = createInitialState();
    // Everything from the chapel onwards, before the gate or the note.
    run(s, PLAYTHROUGH.slice(6));
    expect(s.objective_id).toBe('D1-01');
    expect(advanceObjectives(s)).toEqual([]);
  });
});

describe('hold meter', () => {
  it('fires after the full duration, once per press', () => {
    const m = new HoldMeter(2);
    expect(m.update(1, true, true)).toBe(false);
    expect(m.update(1, true, true)).toBe(true);
    // Still held: must not fire again.
    expect(m.update(5, true, true)).toBe(false);
    m.update(0.1, false, true);
    expect(m.update(2, true, true)).toBe(true);
  });

  it('empties when released or the target is lost', () => {
    const m = new HoldMeter(2);
    m.update(1.5, true, true);
    m.update(0.1, false, true);
    expect(m.update(1, true, true)).toBe(false);
    m.update(0.9, true, false);
    expect(m.progress).toBe(0);
  });
});
