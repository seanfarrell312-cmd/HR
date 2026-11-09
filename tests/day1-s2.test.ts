import { describe, expect, it } from 'vitest';
import { ENVIRONMENTS } from '../src/data/environment';
import { DELIVERY_DELAY, HEAD_HOME_DELAY, HOLY_CIRCLE, REMINDERS, SPOTS, THOUGHTS } from '../src/data/story';
import { createInitialState, type GameState } from '../src/state/store';
import { startDay } from '../src/story/day';
import { applyEvent, type Effect } from '../src/story/events';
import { currentObjective } from '../src/story/objectives';
import { lockState, resolve } from '../src/world/interact';
import { tuneVolume } from '../src/world/storyProps';
import { PLAYTHROUGH, play, playedTo, step } from './playthrough';

// S2 stage tests (doc 9.1): Day 1 runs start to end; out-of-order retrieval is
// safe; the ghost and the evening swap happen once; Day 2 resets correctly.

const at = (upTo: number): GameState => playedTo(upTo, createInitialState());
const inCircle = { x: HOLY_CIRCLE.x, y: HOLY_CIRCLE.y, level: 0 as const };
const inside = { x: 3.7, y: 1.2, level: 0 as const };
const flashes = (fx: Effect[]) => fx.filter((f) => f.kind === 'flash').map((f) => (f as { text: string }).text);

describe('chalice (D1-07)', () => {
  it('stays on the altar until the clock is on the desk', () => {
    const s = at(step('place-clock'));
    expect(flashes(applyEvent(s, { type: 'pickup-chalice' }))).toEqual([REMINDERS.chaliceEarly]);
    expect(s.chalice).toBe('altar');
    expect(resolve('item:chalice', s, inside).action).toEqual({ kind: 'message', text: REMINDERS.chaliceEarly });
  });

  it('cannot be carried with the clock', () => {
    const s = at(step('pickup-clock') + 1);
    s.clock = 'office-desk'; // as if put down, but still holding it below
    s.held_prop_id = 'clock';
    expect(flashes(applyEvent(s, { type: 'pickup-chalice' }))).toEqual([REMINDERS.handsFull]);
  });

  it('sets out the chalice and crucifix together, once', () => {
    const s = at(step('stage-chalice'));
    expect(currentObjective(s).task(s)).toBe('Set the chalice and crucifix out on the ritual table');
    expect(resolve('item:ritual-table', s, inCircle).action).toEqual({ kind: 'story', event: { type: 'stage-chalice' } });
    const fx = applyEvent(s, { type: 'stage-chalice' });
    expect(s.chalice).toBe('ritual-table');
    expect(s.flags.has('crucifix-staged')).toBe(true);
    expect(s.inventory.has('crucifix')).toBe(false);
    expect(s.held_prop_id).toBeNull();
    // The table being ready brings the delivery text a few seconds later.
    expect(fx).toContainEqual({ kind: 'after', seconds: DELIVERY_DELAY, event: { type: 'receive-sms', id: 'delivery1' } });
    expect(applyEvent(s, { type: 'stage-chalice' })).toEqual([]);
    // The crucifix can't be taken from the shelf a second time.
    expect(applyEvent(s, { type: 'take', item: 'crucifix' })).toEqual([]);
  });
});

describe('delivery (D1-08)', () => {
  it('has nothing in the drop box before the text', () => {
    const s = at(step('receive-sms', 2));
    expect(s.relic).toBe('none');
    expect(currentObjective(s).task(s)).toBe('');
    expect(applyEvent(s, { type: 'take-relic' })).toEqual([]);
    expect(resolve('item:drop-box', s, inside).action).toEqual({ kind: 'message', text: REMINDERS.dropBoxEmpty });
  });

  it('asks for the phone, then the drop box', () => {
    const s = at(step('read-sms', 2));
    expect(s.relic).toBe('drop-box');
    expect(currentObjective(s).task(s)).toBe('Check your phone (Q)');
    applyEvent(s, { type: 'read-sms' });
    expect(currentObjective(s).task(s)).toBe('Collect the delivery from the drop box by the gate');
  });

  it('is taken out from inside the gate, with free hands', () => {
    const s = at(step('take-relic'));
    const road = { x: 3.7, y: -1.2, level: 0 as const };
    expect(resolve('item:drop-box', s, road).action).toEqual({ kind: 'message', text: REMINDERS.hatchInside });
    expect(resolve('item:drop-box', s, inside).action).toEqual({ kind: 'story', event: { type: 'take-relic' } });
    applyEvent(s, { type: 'take-relic' });
    expect(s.relic).toBe('held');
    expect(s.held_prop_id).toBe('music-box');
    expect(s.objective_id).toBe('D1-09');
    expect(applyEvent(s, { type: 'take-relic' })).toEqual([]);
  });
});

describe('relic blessing (D1-09)', () => {
  it('rattles on the first blessing and settles', () => {
    const s = at(step('bless-relic'));
    expect(currentObjective(s).task(s)).toBe('Stand in the holy circle and bless the music box');
    expect(resolve('item:music-box', s, { x: 9.5, y: 53, level: 0 }).hold).toBeUndefined();
    expect(resolve('item:music-box', s, inCircle).hold).toEqual({ type: 'bless-relic' });
    const fx = applyEvent(s, { type: 'bless-relic' });
    expect(fx).toEqual([{ kind: 'rattle' }, { kind: 'sfx', id: 'rattle' }, { kind: 'say', text: THOUGHTS.relicRattle }]);
    expect(currentObjective(s).task(s)).toBe('Read from the Bible on the stand');
  });

  it('needs scripture before the second blessing', () => {
    const s = at(step('read-scripture'));
    expect(flashes(applyEvent(s, { type: 'bless-relic' }))).toEqual([REMINDERS.scriptureFirst]);
    expect(s.flags.has('relic-blessed')).toBe(false);
    expect(resolve('item:music-box', s, inCircle).hold).toBeUndefined();
    expect(resolve('item:bible', s, inCircle).action).toEqual({ kind: 'read-bible' });
    applyEvent(s, { type: 'read-scripture' });
    expect(resolve('item:bible', s, inCircle).action).toEqual({ kind: 'none' });
    expect(currentObjective(s).task(s)).toBe('Bless the music box again');
  });

  it('ignores the Bible before the rattle', () => {
    const s = at(step('bless-relic'));
    expect(applyEvent(s, { type: 'read-scripture' })).toEqual([]);
    expect(resolve('item:bible', s, inCircle).action).toEqual({ kind: 'none' });
  });

  it('releases the winking ghost exactly once', () => {
    const s = at(step('bless-relic', 2));
    const fx = [...applyEvent(s, { type: 'bless-relic' }), ...applyEvent(s, { type: 'bless-relic' })];
    expect(fx.filter((f) => f.kind === 'purify')).toEqual([{ kind: 'purify', relic: 'music-box' }]);
    expect(s.objective_id).toBe('D1-10');
  });

  it('cannot put the music box down before the table is ready', () => {
    const s = at(step('place-relic'));
    s.chalice = 'altar';
    expect(flashes(applyEvent(s, { type: 'place-relic' }))).toEqual([REMINDERS.tableNotReady]);
    expect(s.relic).toBe('held');
  });
});

describe('store and leave (D1-10)', () => {
  it('only stores the music box once it is cleansed', () => {
    const s = at(step('pickup-relic'));
    s.flags.delete('relic-blessed');
    expect(applyEvent(s, { type: 'pickup-relic' })).toEqual([]);
  });

  it('brings on the evening once, then the walk home', () => {
    const s = at(step('store-relic'));
    expect(s.environment_preset).toBe('BASE_DAY');
    expect(currentObjective(s).task(s)).toBe('Put the music box on the table outside the chapel');
    const fx = applyEvent(s, { type: 'store-relic' });
    expect(s.environment_preset).toBe('D1_EVENING');
    expect(s.relic).toBe('relic-table');
    expect(fx).toContainEqual({ kind: 'after', seconds: HEAD_HOME_DELAY, event: { type: 'head-home' } });
    expect(currentObjective(s).task(s)).toBe('');
    expect(applyEvent(s, { type: 'store-relic' })).toEqual([]);
    expect(applyEvent(s, { type: 'head-home' })).toEqual([{ kind: 'say', text: THOUGHTS.headHome }]);
    expect(currentObjective(s).task(s)).toBe('Head back to the front gate');
  });

  it('ends the shift at the gate, not before', () => {
    const s = at(step('reach-gate'));
    expect(applyEvent(s, { type: 'reach-gate', x: 0, y: 30, level: 0 })).toEqual([]);
    const fx = applyEvent(s, { type: 'reach-gate', x: 0, y: -2, level: 0 });
    expect(fx).toContainEqual({ kind: 'end-day' });
    expect(applyEvent(s, { type: 'reach-gate', x: 0, y: -2, level: 0 })).toEqual([]);
  });

  it('defines a look for every environment Day 1 reaches', () => {
    expect(ENVIRONMENTS.BASE_DAY).toBeDefined();
    expect(ENVIRONMENTS.D1_EVENING).toBeDefined();
    expect(ENVIRONMENTS.D1_EVENING!.sky).not.toBe(ENVIRONMENTS.BASE_DAY!.sky);
  });
});

describe('Day 2 reset', () => {
  const day2 = () => {
    const s = createInitialState();
    play(s, PLAYTHROUGH);
    return { before: s, after: startDay(s, 2) };
  };

  it('starts Day 2 at the gate with the day reset', () => {
    const { after } = day2();
    expect(after.day_index).toBe(2);
    expect(after.objective_id).toBe('D2-01');
    expect(after.environment_preset).toBe('BASE_DAY');
    expect(after.flags.size).toBe(0);
    expect(after.open_doors.size).toBe(0);
    expect(lockState(after, 'gate')).toBe('locked');
    expect(lockState(after, 'chapel')).toBe('locked');
    expect(after.held_prop_id).toBeNull();
  });

  it('puts the tools back and clears the finished relic', () => {
    const { after } = day2();
    expect(after.inventory.size).toBe(0);
    expect(after.candles_lit.size).toBe(0);
    expect(after.chalice).toBe('altar');
    expect(after.relic).toBe('removed');
  });

  it('keeps what the player changed for good', () => {
    const { before, after } = day2();
    expect(after.clock).toBe('office-desk');
    expect(after.fired_scares).toEqual(before.fired_scares);
    expect(after.completed_objectives).toEqual(before.completed_objectives);
    expect(after.inbox).toEqual(['gateCode', 'delivery1']);
    expect([...after.sms_read]).toEqual(['gateCode', 'delivery1']);
  });

  it('leaves the Day 1 state alone', () => {
    const { before } = day2();
    expect(before.day_index).toBe(1);
    expect(before.environment_preset).toBe('D1_EVENING');
  });
});

describe('music box tune', () => {
  it('is clear close by and faint across the grounds', () => {
    expect(tuneVolume(0)).toBeGreaterThan(0.5);
    const atChurch = tuneVolume(Math.hypot(SPOTS.dropBox.x, 50 - SPOTS.dropBox.y));
    expect(atChurch).toBeLessThan(0.01);
    expect(tuneVolume(8)).toBeGreaterThan(atChurch);
  });
});
