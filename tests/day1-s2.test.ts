import { describe, expect, it } from 'vitest';
import { ENVIRONMENTS } from '../src/data/environment';
import {
  afterThought,
  COOKING_BEAT,
  CROSS_PAUSE,
  DELIVERY_DELAY,
  GATE_TEXT_DELAY,
  HEAD_HOME_DELAY,
  HOLY_CIRCLE,
  RATTLE_AGAIN,
  RATTLE_FIRST,
  RATTLE_SECONDS,
  REMINDERS,
  SMS,
  SPOTS,
  THOUGHTS,
  thoughtSeconds,
} from '../src/data/story';
import { createInitialState, type GameState } from '../src/state/store';
import { startDay } from '../src/story/day';
import { applyEvent, siteReady, type Effect } from '../src/story/events';
import { currentObjective } from '../src/story/objectives';
import { lockState, resolve } from '../src/world/interact';
import { tuneVolume } from '../src/world/storyProps';
import { PLAYTHROUGH, play, playedTo, step } from './playthrough';

// S2 stage tests (doc 9.1): Day 1 runs start to end; out-of-order retrieval is
// safe; the ghost and the evening swap happen once; Day 2 resets correctly.
// The ritual table is set before the first blessing (S2 playtest, 2026-11-09).

const at = (upTo: number): GameState => playedTo(upTo, createInitialState());
const inCircle = { x: HOLY_CIRCLE.x, y: HOLY_CIRCLE.y, level: 0 as const };
const inside = { x: 3.7, y: 1.2, level: 0 as const };
const flashes = (fx: Effect[]) => fx.filter((f) => f.kind === 'flash').map((f) => (f as { text: string }).text);
const says = (fx: Effect[]) => fx.filter((f) => f.kind === 'say').map((f) => (f as { text: string }).text);

describe('arrival (D1-01)', () => {
  it('shows no objective until the gate-code text arrives', () => {
    const s = createInitialState();
    expect(currentObjective(s).task(s)).toBe('');
    applyEvent(s, { type: 'receive-sms', id: 'gateCode' });
    expect(currentObjective(s).task(s)).toBe('Check your phone (Q)');
    applyEvent(s, { type: 'read-sms' });
    expect(currentObjective(s).task(s)).toBe('Enter the code on the gate keypad');
  });

  it('sends the text after the day card and the control guide', () => {
    // Day card and guide at 3.2 s; the text a few seconds after.
    expect(GATE_TEXT_DELAY).toBeGreaterThanOrEqual(3.2 + 3);
  });
});

describe('the note and the key (D1-03)', () => {
  it('asks for the key only once the note has been put down', () => {
    const s = at(step('read-note'));
    expect(currentObjective(s).task(s)).toBe('Read the note on the office desk');
    applyEvent(s, { type: 'read-note' });
    // Still reading: nothing new yet.
    expect(currentObjective(s).task(s)).toBe('Read the note on the office desk');
    applyEvent(s, { type: 'close-note' });
    expect(currentObjective(s).task(s)).toBe('Take the chapel key from the hooks by the office door');
    expect(applyEvent(s, { type: 'close-note' })).toEqual([]);
  });

  it('ignores putting down a note that was never read', () => {
    const s = at(step('read-note'));
    applyEvent(s, { type: 'close-note' });
    expect(s.flags.has('note-closed')).toBe(false);
  });
});

describe('into the chapel (D1-04)', () => {
  it('asks to unlock the chapel, then for the matches', () => {
    const s = at(step('door-opened', 2));
    expect(s.objective_id).toBe('D1-04');
    expect(currentObjective(s).task(s)).toBe('Unlock the chapel');
    s.open_doors.add('chapel');
    const fx = applyEvent(s, { type: 'door-opened', id: 'chapel' });
    expect(says(fx)).toEqual([THOUGHTS.chapelOpen]);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.chapelOpen), event: { type: 'chapel-thought-done' } });
    // Opening it again says nothing more.
    expect(applyEvent(s, { type: 'door-opened', id: 'chapel' })).toEqual([]);
    // The matches line waits for the thought.
    expect(currentObjective(s).task(s)).toBe('');
    applyEvent(s, { type: 'chapel-thought-done' });
    expect(currentObjective(s).task(s)).toBe('Pick up the matches from the shelf');
    applyEvent(s, { type: 'take', item: 'matches' });
    expect(currentObjective(s).task(s)).toBe('Light the candles around the holy circle (0/4)');
  });
});

describe('preparing the ritual table (D1-05)', () => {
  it('leaves the altar pieces alone until the objective asks, with a thought', () => {
    const s = at(step('light-candle', 4));
    expect(s.objective_id).toBe('D1-04');
    expect(applyEvent(s, { type: 'pickup-chalice' })).toEqual([{ kind: 'say', text: THOUGHTS.chaliceEarly }]);
    expect(applyEvent(s, { type: 'take', item: 'crucifix' })).toEqual([{ kind: 'say', text: THOUGHTS.crucifixEarly }]);
    expect(s.chalice).toBe('altar');
    expect(s.held_prop_id).toBeNull();
    expect(s.inventory.has('crucifix')).toBe(false);
    // Just their names, no "Take", but E still gives the thought.
    expect(resolve('item:chalice', s, inCircle)).toEqual({ prompt: 'Chalice', action: { kind: 'story', event: { type: 'pickup-chalice' } } });
    expect(resolve('item:crucifix', s, inCircle)).toEqual({ prompt: 'Crucifix', action: { kind: 'story', event: { type: 'take', item: 'crucifix' } } });
    // Even with full hands, the thought rather than "my hands are full".
    s.held_prop_id = 'clock';
    expect(resolve('item:chalice', s, inCircle).action).toEqual({ kind: 'story', event: { type: 'pickup-chalice' } });
  });

  it('thinks about the energies after the last candle, then asks for the altar pieces', () => {
    const s = at(step('light-candle', 4));
    const fx = applyEvent(s, { type: 'light-candle', index: 3 });
    expect(says(fx)).toEqual([THOUGHTS.candlesLit]);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.candlesLit), event: { type: 'candles-thought-done' } });
    expect(s.objective_id).toBe('D1-05');
    // Not yet: the thought is still playing.
    expect(currentObjective(s).task(s)).toBe('');
    expect(applyEvent(s, { type: 'pickup-chalice' })).toEqual([{ kind: 'say', text: THOUGHTS.chaliceEarly }]);
    expect(resolve('item:chalice', s, inCircle).prompt).toBe('Chalice');
    applyEvent(s, { type: 'candles-thought-done' });
    expect(currentObjective(s).task(s)).toBe('Fetch the chalice and crucifix from the altar');
    expect(resolve('item:chalice', s, inCircle).prompt).toBe('E  Take the chalice');
  });

  it("says \"Now we're cooking\" once the table is set, then pauses before the cross", () => {
    const s = at(step('stage-table'));
    const fx = applyEvent(s, { type: 'stage-table' });
    expect(says(fx)).toEqual([]);
    expect(fx).toContainEqual({ kind: 'after', seconds: COOKING_BEAT, event: { type: 'now-cooking' } });
    expect(s.objective_id).toBe('D1-06');
    expect(currentObjective(s).task(s)).toBe('');
    const cooking = applyEvent(s, { type: 'now-cooking' });
    expect(says(cooking)).toEqual([THOUGHTS.tableSet]);
    expect(cooking).toContainEqual({
      kind: 'after',
      seconds: afterThought(THOUGHTS.tableSet) + CROSS_PAUSE,
      event: { type: 'cross-prompt' },
    });
    expect(applyEvent(s, { type: 'now-cooking' })).toEqual([]);
    expect(currentObjective(s).task(s)).toBe('');
    applyEvent(s, { type: 'cross-prompt' });
    expect(currentObjective(s).task(s)).toBe('Take the cross from the chapel shelf');
  });

  it('only thinks "cooking" once both pieces are down', () => {
    const s = at(step('pickup-chalice'));
    applyEvent(s, { type: 'pickup-chalice' });
    const fx = applyEvent(s, { type: 'stage-table' });
    expect(fx.filter((f) => f.kind === 'after')).toEqual([]);
    expect(applyEvent(s, { type: 'now-cooking' })).toEqual([]);
  });

  it('offers to take the altar pieces once the objective asks', () => {
    const s = at(step('pickup-chalice'));
    expect(s.objective_id).toBe('D1-05');
    expect(resolve('item:chalice', s, inCircle).prompt).toBe('E  Take the chalice');
    expect(resolve('item:crucifix', s, inCircle).prompt).toBe('E  Take crucifix');
  });

  it('follows the candles, asking for both altar pieces', () => {
    const s = at(step('pickup-chalice'));
    expect(s.objective_id).toBe('D1-05');
    expect(currentObjective(s).task(s)).toBe('Fetch the chalice and crucifix from the altar');
    applyEvent(s, { type: 'pickup-chalice' });
    expect(currentObjective(s).task(s)).toBe('Fetch the crucifix from the altar');
    applyEvent(s, { type: 'take', item: 'crucifix' });
    expect(currentObjective(s).task(s)).toBe('Set the chalice and crucifix out on the ritual table');
  });

  it('sets out the chalice and crucifix together, once', () => {
    const s = at(step('stage-table'));
    expect(resolve('item:ritual-table', s, inCircle)).toMatchObject({
      prompt: 'E  Set out the chalice and crucifix',
      action: { kind: 'story', event: { type: 'stage-table' } },
    });
    applyEvent(s, { type: 'stage-table' });
    expect(s.chalice).toBe('ritual-table');
    expect(s.flags.has('crucifix-staged')).toBe(true);
    expect(s.inventory.has('crucifix')).toBe(false);
    expect(s.held_prop_id).toBeNull();
    expect(s.objective_id).toBe('D1-06');
    expect(applyEvent(s, { type: 'stage-table' })).toEqual([]);
    // The crucifix can't be taken from the altar a second time.
    expect(applyEvent(s, { type: 'take', item: 'crucifix' })).toEqual([]);
    expect(resolve('item:crucifix', s, inCircle).action).toEqual({ kind: 'none' });
  });

  it('can be set one piece at a time', () => {
    const s = at(step('pickup-chalice'));
    applyEvent(s, { type: 'take', item: 'crucifix' });
    expect(resolve('item:ritual-table', s, inCircle).prompt).toBe('E  Set out the crucifix');
    applyEvent(s, { type: 'stage-table' });
    expect(s.flags.has('crucifix-staged')).toBe(true);
    expect(currentObjective(s).task(s)).toBe('Fetch the chalice from the altar');
    applyEvent(s, { type: 'pickup-chalice' });
    expect(resolve('item:ritual-table', s, inCircle).prompt).toBe('E  Set out the chalice');
    applyEvent(s, { type: 'stage-table' });
    expect(s.objective_id).toBe('D1-06');
  });

  it('keeps the clock calm until the candles and the table are both ready', () => {
    const s = at(step('pickup-chalice'));
    expect(s.candles_lit.size).toBe(4);
    expect(siteReady(s)).toBe(false);
    play(s, [{ type: 'pickup-chalice' }, { type: 'take', item: 'crucifix' }, { type: 'stage-table' }]);
    expect(siteReady(s)).toBe(true);
  });

  it('tells the hand cross apart from the standing crucifix', () => {
    const s = at(step('take', 4)); // the cross, after the table is set
    expect(s.inventory.has('cross')).toBe(false);
    expect(currentObjective(s).task(s)).toBe('Take the cross from the chapel shelf');
    expect(resolve('item:cross', s, inCircle).prompt).toBe('E  Take cross');
    expect(resolve('item:clock', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.needCross });
    applyEvent(s, { type: 'take', item: 'cross' });
    expect(currentObjective(s).task(s)).toBe('Stand in the holy circle and bless the clock');
  });

  it('cannot carry the chalice with the clock', () => {
    const s = at(step('pickup-chalice'));
    s.held_prop_id = 'clock';
    expect(flashes(applyEvent(s, { type: 'pickup-chalice' }))).toEqual([REMINDERS.handsFull]);
    expect(s.chalice).toBe('altar');
  });
});

describe('clock to the desk (D1-07)', () => {
  it('asks for the desk only after the ghost thought has played', () => {
    const s = at(step('clock-ghost-gone'));
    expect(s.objective_id).toBe('D1-07');
    expect(currentObjective(s).task(s)).toBe('');
    const fx = applyEvent(s, { type: 'clock-ghost-gone' });
    expect(says(fx)).toEqual([THOUGHTS.ghost]);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.ghost), event: { type: 'clock-thought-done' } });
    expect(applyEvent(s, { type: 'clock-ghost-gone' })).toEqual([]);
    expect(currentObjective(s).task(s)).toBe('');
    applyEvent(s, { type: 'clock-thought-done' });
    expect(currentObjective(s).task(s)).toBe("Put the clock on the supervisor's desk");
  });
});

describe('delivery (D1-08)', () => {
  it('arrives a few seconds after the clock is on the desk', () => {
    const s = at(step('place-clock'));
    const fx = applyEvent(s, { type: 'place-clock' });
    expect(fx).toContainEqual({ kind: 'after', seconds: DELIVERY_DELAY, event: { type: 'receive-sms', id: 'delivery1' } });
  });

  it('has nothing in the drop box before the text', () => {
    const s = at(step('receive-sms', 2));
    expect(s.relic).toBe('none');
    expect(currentObjective(s).task(s)).toBe('');
    expect(applyEvent(s, { type: 'take-relic' })).toEqual([]);
    expect(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 2, level: 0 })).toEqual([]);
    expect(resolve('item:drop-box', s, inside).action).toEqual({ kind: 'message', text: REMINDERS.dropBoxEmpty });
  });

  it('only tells the player a relic is at the drop box', () => {
    expect(SMS.delivery1.text).toMatch(/drop box/);
    expect(SMS.delivery1.text).not.toMatch(/clock/i);
  });

  it('asks for the phone, then the drop box', () => {
    const s = at(step('read-sms', 2));
    expect(s.relic).toBe('drop-box');
    expect(currentObjective(s).task(s)).toBe('Check your phone (Q)');
    applyEvent(s, { type: 'read-sms' });
    expect(currentObjective(s).task(s)).toBe('Collect the delivery from the drop box by the gate');
  });

  it('thinks "another noisy one" once, nearing the drop box', () => {
    const s = at(step('approach-drop-box'));
    expect(applyEvent(s, { type: 'approach-drop-box', x: 0, y: 30, level: 0 })).toEqual([]);
    expect(says(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 }))).toEqual([THOUGHTS.dropBox]);
    expect(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 2, level: 0 })).toEqual([]);
  });

  it('is taken out from inside the gate, with free hands, and recognised', () => {
    const s = at(step('take-relic'));
    const road = { x: 3.7, y: -1.2, level: 0 as const };
    expect(resolve('item:drop-box', s, road).action).toEqual({ kind: 'message', text: REMINDERS.hatchInside });
    expect(resolve('item:drop-box', s, inside).action).toEqual({ kind: 'story', event: { type: 'take-relic' } });
    expect(says(applyEvent(s, { type: 'take-relic' }))).toEqual([THOUGHTS.relicPickup]);
    expect(s.relic).toBe('held');
    expect(s.held_prop_id).toBe('music-box');
    expect(s.objective_id).toBe('D1-09');
    expect(applyEvent(s, { type: 'take-relic' })).toEqual([]);
  });

  it('asks for the ritual table only after the pickup thought has played', () => {
    const s = at(step('take-relic'));
    const fx = applyEvent(s, { type: 'take-relic' });
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.relicPickup), event: { type: 'relic-pickup-thought-done' } });
    expect(currentObjective(s).task(s)).toBe('');
    applyEvent(s, { type: 'relic-pickup-thought-done' });
    expect(currentObjective(s).task(s)).toBe('Put the music box on the ritual table');
  });

  it('gets annoying once, carried up towards the church', () => {
    const s = at(step('relic-near-church'));
    expect(applyEvent(s, { type: 'relic-near-church', x: 0, y: 10, level: 0 })).toEqual([]);
    expect(says(applyEvent(s, { type: 'relic-near-church', x: 0, y: 36, level: 0 }))).toEqual([THOUGHTS.relicAnnoying]);
    expect(applyEvent(s, { type: 'relic-near-church', x: 0, y: 45, level: 0 })).toEqual([]);
  });
});

describe('relic blessing (D1-09)', () => {
  it('rattles on the first blessing, then two thoughts, then asks for the Bible', () => {
    const s = at(step('bless-relic'));
    expect(currentObjective(s).task(s)).toBe('Stand in the holy circle and bless the music box');
    expect(resolve('item:music-box', s, { x: 9.5, y: 53, level: 0 }).hold).toBeUndefined();
    expect(resolve('item:music-box', s, inCircle).hold).toEqual({ type: 'bless-relic' });
    const fx = applyEvent(s, { type: 'bless-relic' });
    expect(fx).toEqual([
      { kind: 'rattle', ...RATTLE_FIRST },
      { kind: 'sfx', id: 'rattle' },
      { kind: 'after', seconds: expect.any(Number), event: { type: 'relic-settled' } },
    ]);
    const after = fx[2] as { seconds: number };
    expect(after.seconds).toBeGreaterThanOrEqual(RATTLE_SECONDS);
    // Nothing new to do, and no Bible, until it has gone still and both thoughts have played.
    const quiet = () => {
      expect(currentObjective(s).task(s)).toBe('');
      expect(resolve('item:bible', s, inCircle).action).toEqual({ kind: 'none' });
      expect(resolve('item:music-box', s, inCircle).hold).toBeUndefined();
    };
    quiet();
    const settled = applyEvent(s, { type: 'relic-settled' });
    expect(says(settled)).toEqual([THOUGHTS.relicSettled]);
    expect(settled).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.relicSettled), event: { type: 'good-book' } });
    expect(applyEvent(s, { type: 'relic-settled' })).toEqual([]);
    quiet();
    const book = applyEvent(s, { type: 'good-book' });
    expect(says(book)).toEqual([THOUGHTS.goodBook]);
    expect(book).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.goodBook), event: { type: 'bible-prompt' } });
    quiet();
    applyEvent(s, { type: 'bible-prompt' });
    expect(currentObjective(s).task(s)).toBe('Pick up the Bible from the stand');
  });

  it('never stacks an objective on top of the thought before it', () => {
    for (const text of [THOUGHTS.relicSettled, THOUGHTS.goodBook, THOUGHTS.relicGhost, THOUGHTS.headHome]) {
      expect(afterThought(text)).toBeGreaterThan(thoughtSeconds(text));
    }
  });

  it('takes the Bible into the hand, then reads it to the music box with a hold', () => {
    const s = at(step('take', 5));
    expect(resolve('item:bible', s, inCircle)).toMatchObject({ prompt: 'E  Pick up the Bible' });
    expect(resolve('item:music-box', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.bibleFirst });
    applyEvent(s, { type: 'take', item: 'bible' });
    expect(s.inventory.has('bible')).toBe(true);
    expect(currentObjective(s).task(s)).toBe('Read the music box some scripture');
    expect(resolve('item:music-box', s, { x: 9.5, y: 53, level: 0 }).hold).toBeUndefined();
    expect(resolve('item:music-box', s, inCircle)).toMatchObject({
      prompt: 'Hold click  Read the music box some scripture',
      hold: { type: 'begin-scripture' },
    });
    expect(applyEvent(s, { type: 'begin-scripture' })).toContainEqual({ kind: 'open-scripture' });
    // Still reading: the next objective waits for the scripture to be closed.
    expect(currentObjective(s).task(s)).toBe('Read the music box some scripture');
    // Closing it: the music box shudders again, weaker, and only then is
    // the second blessing asked for.
    const read = applyEvent(s, { type: 'read-scripture' });
    expect(read).toContainEqual({ kind: 'rattle', ...RATTLE_AGAIN });
    expect(read).toContainEqual({ kind: 'after', seconds: expect.any(Number), event: { type: 'relic-weakened' } });
    expect(RATTLE_AGAIN.strength).toBeLessThan(RATTLE_FIRST.strength);
    expect(currentObjective(s).task(s)).toBe('');
    expect(resolve('item:music-box', s, inCircle).hold).toBeUndefined();
    expect(applyEvent(s, { type: 'bless-relic' })).toEqual([]);
    expect(s.flags.has('relic-blessed')).toBe(false);
    applyEvent(s, { type: 'relic-weakened' });
    expect(currentObjective(s).task(s)).toBe('Bless the music box again');
    expect(resolve('item:music-box', s, inCircle).hold).toEqual({ type: 'bless-relic' });
  });

  it('needs scripture before the second blessing', () => {
    const s = at(step('read-scripture'));
    expect(flashes(applyEvent(s, { type: 'bless-relic' }))).toEqual([REMINDERS.scriptureFirst]);
    expect(s.flags.has('relic-blessed')).toBe(false);
  });

  it('ignores the Bible and the scripture before they are wanted', () => {
    const s = at(step('bless-relic'));
    expect(applyEvent(s, { type: 'take', item: 'bible' })).toEqual([]);
    expect(applyEvent(s, { type: 'begin-scripture' })).toEqual([]);
    expect(applyEvent(s, { type: 'read-scripture' })).toEqual([]);
    expect(resolve('item:bible', s, inCircle).action).toEqual({ kind: 'none' });
  });

  it('puts the Bible back on its stand before the music box comes away', () => {
    const s = at(step('return-bible'));
    expect(s.inventory.has('bible')).toBe(true);
    expect(currentObjective(s).task(s)).toBe('Put the Bible back on the stand and pick up the music box');
    expect(resolve('item:music-box', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.bibleBack });
    expect(flashes(applyEvent(s, { type: 'pickup-relic' }))).toEqual([REMINDERS.bibleBack]);
    expect(s.relic).toBe('ritual-table');
    expect(resolve('item:bible', s, inCircle).prompt).toBe('E  Put the Bible back');
    applyEvent(s, { type: 'return-bible' });
    expect(s.inventory.has('bible')).toBe(false);
    expect(resolve('item:bible', s, inCircle).action).toEqual({ kind: 'none' });
    expect(currentObjective(s).task(s)).toBe('Put the Bible back on the stand and pick up the music box');
    applyEvent(s, { type: 'pickup-relic' });
    expect(currentObjective(s).task(s)).toBe('Put the music box on the table outside the chapel');
  });

  it('keeps the Bible stand outside the circle on Day 1', () => {
    const d = Math.hypot(SPOTS.bible.x - HOLY_CIRCLE.x, SPOTS.bible.y - HOLY_CIRCLE.y);
    expect(d).toBeGreaterThan(HOLY_CIRCLE.r + 0.5);
    // Still within reach of the circle's edge.
    expect(d - HOLY_CIRCLE.r).toBeLessThan(2.9);
  });

  it('releases the winking ghost exactly once', () => {
    const s = at(step('bless-relic', 2));
    const fx = [...applyEvent(s, { type: 'bless-relic' }), ...applyEvent(s, { type: 'bless-relic' })];
    expect(fx.filter((f) => f.kind === 'purify')).toEqual([{ kind: 'purify', relic: 'music-box' }]);
    expect(s.objective_id).toBe('D1-10');
  });

  it('shows the next objective only after the wink thought', () => {
    const s = at(step('relic-ghost-gone'));
    expect(currentObjective(s).task(s)).toBe('');
    const fx = applyEvent(s, { type: 'relic-ghost-gone' });
    expect(says(fx)).toEqual([THOUGHTS.relicGhost]);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.relicGhost), event: { type: 'relic-thought-done' } });
    expect(applyEvent(s, { type: 'relic-ghost-gone' })).toEqual([]);
    expect(currentObjective(s).task(s)).toBe('');
    applyEvent(s, { type: 'relic-thought-done' });
    expect(currentObjective(s).task(s)).toBe('Put the Bible back on the stand and pick up the music box');
  });

  it('cannot put the music box down before the table is set', () => {
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
    // "So late" straight away, then a pause before the head-home thought.
    expect(says(fx)).toEqual([THOUGHTS.late]);
    expect(fx).toContainEqual({ kind: 'after', seconds: HEAD_HOME_DELAY, event: { type: 'head-home' } });
    expect(HEAD_HOME_DELAY).toBeGreaterThan(afterThought(THOUGHTS.late));
    expect(currentObjective(s).task(s)).toBe('');
    expect(applyEvent(s, { type: 'store-relic' })).toEqual([]);
    const home = applyEvent(s, { type: 'head-home' });
    expect(says(home)).toEqual([THOUGHTS.headHome]);
    expect(home).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.headHome), event: { type: 'gate-prompt' } });
    // The objective waits until the thought has played.
    expect(currentObjective(s).task(s)).toBe('');
    applyEvent(s, { type: 'gate-prompt' });
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

  it('puts the tools and the altar pieces back and clears the finished relic', () => {
    const { after } = day2();
    expect(after.inventory.size).toBe(0);
    expect(after.candles_lit.size).toBe(0);
    expect(after.chalice).toBe('altar');
    expect(after.flags.has('crucifix-staged')).toBe(false);
    expect(after.inventory.has('bible')).toBe(false);
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
