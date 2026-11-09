import { describe, expect, it } from 'vitest';
import { CHURCH_APPROACH, GATE_CODE, HEAD_HOME_DELAY, HOLY_CIRCLE, THOUGHTS, TREE_PEEK } from '../src/data/story';
import { createInitialState, type GameState } from '../src/state/store';
import { applyEvent, type Effect, type StoryEvent } from '../src/story/events';
import { HoldMeter } from '../src/story/hold';
import { advanceObjectives, currentObjective } from '../src/story/objectives';
import { inHolyCircle, lockState, resolve } from '../src/world/interact';
import { chimeVolume } from '../src/world/storyProps';

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
  { type: 'head-home' },
  { type: 'reach-gate', x: 0, y: 1, level: 0 },
];

/** Open the church doors the way the game does: the door opens, then the event. */
function withChurchOpen(s: GameState, events: StoryEvent[]): Effect[] {
  return events.flatMap((e) => {
    if (e.type === 'door-opened') s.open_doors.add(e.id);
    return applyEvent(s, e);
  });
}

describe('church-approach thought', () => {
  const unlocked = () => {
    const s = createInitialState();
    applyEvent(s, { type: 'keypad-submit', code: GATE_CODE });
    return s;
  };
  const say = (fx: Effect[]) => fx.filter((f) => f.kind === 'say');

  it('stays quiet out of range, outside the gate, or below ground', () => {
    const s = unlocked();
    expect(applyEvent(s, { type: 'approach-church', x: 0, y: 2, level: 0 })).toEqual([]);
    expect(applyEvent(s, { type: 'approach-church', x: -38, y: 28, level: 0 })).toEqual([]);
    expect(applyEvent(s, { type: 'approach-church', x: 0, y: 55, level: -1 })).toEqual([]);
    const locked = createInitialState();
    expect(applyEvent(locked, { type: 'approach-church', x: 0, y: 40, level: 0 })).toEqual([]);
  });

  it('fires once, about halfway up the path, however long the player lingers', () => {
    const s = unlocked();
    const halfway = CHURCH_APPROACH.y - CHURCH_APPROACH.r + 0.5;
    expect(say(applyEvent(s, { type: 'approach-church', x: 0, y: halfway, level: 0 }))).toEqual([
      { kind: 'say', text: THOUGHTS.churchApproach },
    ]);
    expect(applyEvent(s, { type: 'approach-church', x: 0, y: 45, level: 0 })).toEqual([]);
  });

  it('also fires for a player who reaches the church from across the grounds', () => {
    const s = unlocked();
    expect(say(applyEvent(s, { type: 'approach-church', x: 18, y: 44, level: 0 }))).toHaveLength(1);
  });
});

describe('tree peek', () => {
  /** Clock delivered and the head-home thought played: the end of the day. */
  const homeward = () => {
    const s = createInitialState();
    withChurchOpen(s, PLAYTHROUGH.slice(0, 16));
    return s;
  };
  const near = { type: 'near-peek', x: TREE_PEEK.x - 6, y: TREE_PEEK.y - 4, level: 0 } as const;

  it('waits for the walk home and for the player to come close', () => {
    // Not on the way in, even right next to the tree.
    const arriving = createInitialState();
    applyEvent(arriving, { type: 'keypad-submit', code: GATE_CODE });
    expect(applyEvent(arriving, near)).toEqual([]);
    const s = homeward();
    expect(s.flags.has('heading-home')).toBe(true);
    expect(applyEvent(s, { type: 'near-peek', x: 0, y: 10, level: 0 })).toEqual([]);
    expect(s.fired_scares).toEqual(['d1-clock-ghost']);
  });

  it('giggles and ducks away once', () => {
    const s = homeward();
    expect(applyEvent(s, near)).toEqual([{ kind: 'sfx', id: 'giggle' }]);
    expect(applyEvent(s, near)).toEqual([]);
    expect(s.fired_scares).toEqual(['d1-clock-ghost', 'd1-tree-peek']);
  });
});

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

  it('asks for the code only once the text has been read and put away', () => {
    const s = createInitialState();
    applyEvent(s, { type: 'receive-sms', id: 'gateCode' });
    expect(currentObjective(s).task(s)).toBe('Check your phone (Q)');
    applyEvent(s, { type: 'read-sms' });
    expect(currentObjective(s).task(s)).toBe('Enter the code on the gate keypad');
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
    expect(kinds(applyEvent(s, { type: 'bless-clock' }))).toContain('purify');
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
    expect(fx.filter((f) => f.kind === 'purify')).toHaveLength(1);
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

describe('heading home', () => {
  const placed = () => {
    const s = createInitialState();
    withChurchOpen(s, PLAYTHROUGH.slice(0, 15));
    return s;
  };

  it('thinks back on the clock, then heads home after a pause', () => {
    const s = createInitialState();
    const fx = withChurchOpen(s, PLAYTHROUGH.slice(0, 15));
    expect(fx).toContainEqual({ kind: 'say', text: THOUGHTS.clockPlaced });
    expect(fx).toContainEqual({ kind: 'after', seconds: HEAD_HOME_DELAY, event: { type: 'head-home' } });
    // The walk-back objective stays hidden until the thought plays.
    expect(s.objective_id).toBe('D1-RETURN');
    expect(currentObjective(s).task(s)).toBe('');
    expect(applyEvent(s, { type: 'head-home' })).toEqual([{ kind: 'say', text: THOUGHTS.headHome }]);
    expect(currentObjective(s).task(s)).toBe('Head back to the front gate');
    expect(applyEvent(s, { type: 'head-home' })).toEqual([]);
  });

  it('only counts the gate once the player is heading home', () => {
    const s = placed();
    expect(applyEvent(s, { type: 'reach-gate', x: 0, y: 1, level: 0 })).toEqual([]);
    applyEvent(s, { type: 'head-home' });
    expect(applyEvent(s, { type: 'reach-gate', x: 0, y: 30, level: 0 })).toEqual([]);
    const fx = applyEvent(s, { type: 'reach-gate', x: 0, y: 1, level: 0 });
    expect(fx).toContainEqual({ kind: 'objective', id: 'D1-RETURN' });
    expect(s.objective_id).toBe('D1-07');
  });

  it('ignores an early head-home', () => {
    const s = createInitialState();
    expect(applyEvent(s, { type: 'head-home' })).toEqual([]);
  });
});

describe('clock chime', () => {
  it('is loudest in the chapel and fades away from its door', () => {
    expect(chimeVolume(11, 53, 0)).toBe(1);
    const door = chimeVolume(7, 52.7, 0);
    const churchDoors = chimeVolume(0, 50, 0);
    const office = chimeVolume(-14, 52.9, 0);
    const gate = chimeVolume(0, 0, 0);
    expect(door).toBeGreaterThan(churchDoors);
    expect(churchDoors).toBeGreaterThan(office);
    expect(office).toBeGreaterThan(gate);
    expect(office).toBeGreaterThan(0.05);
    expect(chimeVolume(0, 55, -1)).toBeLessThan(chimeVolume(0, 55, 0));
  });
});

describe('S1 playthrough', () => {
  it('completes D1-01 to D1-06 and the walk back in order, then stops at the end of the build', () => {
    const s = createInitialState();
    const fx = withChurchOpen(s, PLAYTHROUGH);
    expect(fx.filter((f) => f.kind === 'objective').map((f) => (f as { id: string }).id)).toEqual([
      'D1-01',
      'D1-02',
      'D1-03',
      'D1-04',
      'D1-05',
      'D1-06',
      'D1-RETURN',
    ]);
    expect(s.objective_id).toBe('D1-07');
  });

  it('does not duplicate any state when every event is spammed', () => {
    const s = createInitialState();
    const spammed = PLAYTHROUGH.flatMap((e) => [e, e, e]);
    const fx = withChurchOpen(s, spammed);
    expect(s.completed_objectives).toEqual(['D1-01', 'D1-02', 'D1-03', 'D1-04', 'D1-05', 'D1-06', 'D1-RETURN']);
    expect(s.inbox).toEqual(['gateCode']);
    expect(s.candles_lit.size).toBe(4);
    expect(fx.filter((f) => f.kind === 'purify')).toHaveLength(1);
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
