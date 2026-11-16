import { describe, expect, it } from 'vitest';
import {
  afterThought,
  ALTAR_APPROACH,
  GATE_CODE,
  GATE_RECALL_DELAY,
  BEHIND_DESK,
  CHURCH_APPROACH,
  HOLY_CIRCLE,
  OFFICE_NOTES,
  PRANK_SECONDS,
  RELIC_LINES,
  RELIC_TABLE_SLOTS,
  REMINDERS,
  SEARCH_SPOTS,
  S3_PART1_END,
  SMS,
  THOUGHTS,
} from '../src/data/story';
import { createInitialState, type GameState } from '../src/state/store';
import { startDay } from '../src/story/day';
import { applyEvent, type Effect, type StoryEvent } from '../src/story/events';
import { currentObjective } from '../src/story/objectives';
import { OBJECTIVE_SECONDS } from '../src/ui/hud';
import { resolve } from '../src/world/interact';
import { PLAYTHROUGH, play } from './playthrough';

// S3 part 1 (doc 6.2 D2-01 to D2-04): the Day 2 shift start, the chalice a
// prankster ghost left on the garden bench, and the first delivery cleansed
// with scripture and the cross, then put away.

/** Every Day 2 event so far, in order, as a player would trigger them. */
export const DAY2_PLAYTHROUGH: StoryEvent[] = [
  // D2-01: gate, note, key and candles.
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
  // D2-02: no chalice on the altar. Stage the crucifix, search the church,
  // then find it on the garden bench.
  { type: 'near-altar', x: 0, y: 63, level: 0 },
  { type: 'chalice-missing-done' },
  { type: 'take', item: 'crucifix' },
  { type: 'stage-table' },
  { type: 'search-desk', x: -15.5, y: 52.9, level: 0 },
  { type: 'try-locked-door', id: 'storage' },
  { type: 'try-locked-door', id: 'basement' },
  { type: 'search-done' },
  { type: 'search-thought-done' },
  { type: 'pickup-chalice' },
  { type: 'prank-done' },
  { type: 'prank-thought-done' },
  { type: 'prank-focus-done' },
  // D2-03: the chalice on the table, then the first delivery.
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
/** Beside the north end of the east garden bench, inside the garden. */
const byBench = { x: -24.8, y: 56, level: 0 as const };

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
    expect(task(at(step('door-opened', 3)))).toBe('Unlock the chapel');
    expect(task(at(step('take', 2)))).toBe('Pick up the matches from the shelf');
    expect(task(at(step('light-candle', 3)))).toBe('Light the candles around the holy circle (2/4)');
  });

  it('has its own note about lingering, pranking ghosts', () => {
    expect(OFFICE_NOTES[2]).toMatch(/linger/);
    expect(OFFICE_NOTES[2]).toMatch(/prank/);
    expect(OFFICE_NOTES[2]).not.toBe(OFFICE_NOTES[1]);
  });

  it('remembers the gate code once the first objective has folded away', () => {
    const s = day2Start();
    const fx = applyEvent(s, { type: 'arrived' });
    expect(fx).toContainEqual({ kind: 'after', seconds: GATE_RECALL_DELAY, event: { type: 'recall-gate-code' } });
    expect(GATE_RECALL_DELAY).toBeGreaterThanOrEqual(OBJECTIVE_SECONDS);
    expect(says(applyEvent(s, { type: 'recall-gate-code' }))).toEqual(['Good thing I remembered the gate code: 4173.']);
    expect(GATE_CODE).toBe('4173');
  });

  it('keeps the gate code to itself if the gate is already open', () => {
    const s = day2Start();
    applyEvent(s, { type: 'arrived' });
    applyEvent(s, { type: 'keypad-submit', code: GATE_CODE });
    expect(applyEvent(s, { type: 'recall-gate-code' })).toEqual([]);
  });

  it('admires the clock the first time the office door opens', () => {
    const s = at(step('door-opened', 2));
    expect(says(applyEvent(s, { type: 'door-opened', id: 'office' }))).toEqual([THOUGHTS.officeClock]);
    expect(THOUGHTS.officeClock).toBe('Huh, the clock does look nice in here.');
    expect(applyEvent(s, { type: 'door-opened', id: 'office' })).toEqual([]);
  });

  it('says nothing about the clock when the office opens on Day 1', () => {
    const s = createInitialState();
    expect(applyEvent(s, { type: 'door-opened', id: 'office' })).toEqual([]);
  });

  it("skips Day 1's first-visit thoughts", () => {
    const s = at(step('door-opened'));
    // Day 2 has its own line for the walk up instead.
    expect(says(applyEvent(s, { type: 'approach-church', x: 0, y: 40, level: 0 }))).not.toContain(THOUGHTS.churchApproach);
    const opened = applyEvent(s, { type: 'door-opened', id: 'church' });
    expect(says(opened)).toEqual([]);
  });
});

describe('the missing chalice (D2-02)', () => {
  it('starts the day on the garden bench, not the altar', () => {
    expect(day2Start().chalice).toBe('garden-bench');
  });

  it('notices at the altar once the candles are lit, then asks for the crucifix on the table', () => {
    const s = at(step('near-altar'));
    expect(task(s)).toBe('Fetch the chalice and crucifix from the altar');
    // Too far away: nothing.
    expect(applyEvent(s, { type: 'near-altar', x: 0, y: ALTAR_APPROACH.y - ALTAR_APPROACH.r - 1, level: 0 })).toEqual([]);
    const fx = applyEvent(s, { type: 'near-altar', x: 0, y: 63, level: 0 });
    expect(says(fx)).toEqual(["Here's the crucifix, but no chalice."]);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.chaliceMissing), event: { type: 'chalice-missing-done' } });
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'chalice-missing-done' });
    expect(task(s)).toBe('Put the crucifix on the ritual table');
    applyEvent(s, { type: 'take', item: 'crucifix' });
    expect(resolve('item:ritual-table', s, inCircle).prompt).toBe('E  Set out the crucifix');
    applyEvent(s, { type: 'stage-table' });
    expect(task(s)).toBe('Search the church for the chalice (0/3)');
    expect(SEARCH_SPOTS).toBe(3);
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

  it('searches behind the office desk and both locked doors, in any order', () => {
    const s = at(step('search-desk'));
    // In the office but in front of the desk: not yet.
    expect(applyEvent(s, { type: 'search-desk', x: -12, y: 52.9, level: 0 })).toEqual([]);
    const desk = applyEvent(s, { type: 'search-desk', x: (BEHIND_DESK.x1 + BEHIND_DESK.x2) / 2, y: 52.9, level: 0 });
    expect(says(desk)).toEqual(["I don't think the chalice would fit in these drawers."]);
    expect(task(s)).toBe('Search the church for the chalice (1/3)');

    // The basement first this time; the door stays locked.
    expect(resolve('door:basement', s, inCircle).action).toEqual({ kind: 'story', event: { type: 'try-locked-door', id: 'basement' } });
    expect(says(applyEvent(s, { type: 'try-locked-door', id: 'basement' }))).toEqual(["Locked tight. I hope it's not in there."]);
    expect(task(s)).toBe('Search the church for the chalice (2/3)');
    expect(s.open_doors.has('basement')).toBe(false);
    // Once checked, it's just locked.
    expect(resolve('door:basement', s, inCircle).action).toEqual({ kind: 'message', text: "It's locked." });

    const last = applyEvent(s, { type: 'try-locked-door', id: 'storage' });
    expect(says(last)).toEqual([THOUGHTS.searchLocked]);
    expect(last).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.searchLocked), event: { type: 'search-done' } });
    expect(task(s)).toBe('Search the church for the chalice (3/3)');
    expect(says(applyEvent(s, { type: 'search-done' }))).toEqual(["I guess it's outside somewhere?"]);
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'search-thought-done' });
    expect(task(s)).toBe('Search the grounds for the chalice');
  });

  it('only counts the search once the crucifix is on the table', () => {
    const s = at(step('stage-table'));
    expect(applyEvent(s, { type: 'search-desk', x: -15.5, y: 52.9, level: 0 })).toEqual([]);
    expect(applyEvent(s, { type: 'try-locked-door', id: 'storage' })).toEqual([]);
    expect(resolve('door:storage', s, inCircle).action).toEqual({ kind: 'message', text: "It's locked." });
  });

  it('cannot be found on the bench until the church has been searched', () => {
    for (const s of [at(step('light-candle')), at(step('stage-table')), at(step('search-thought-done'))]) {
      expect(resolve('item:chalice', s, byBench).prompt).toBe('');
      expect(applyEvent(s, { type: 'pickup-chalice' })).toEqual([]);
      expect(s.chalice).toBe('garden-bench');
      expect(s.fired_scares).not.toContain('d2-prank');
    }
    const s = at(step('pickup-chalice'));
    expect(resolve('item:chalice', s, byBench).prompt).toBe('E  Take the chalice');
  });

  it('yelps with the scare, then two more thoughts, then back to the chapel', () => {
    const s = at(step('pickup-chalice'));
    const fx = applyEvent(s, { type: 'pickup-chalice' });
    expect(fx).toContainEqual({ kind: 'prank' });
    expect(fx).toContainEqual({ kind: 'sfx', id: 'raspberry' });
    // In parallel with the scare, not after it.
    expect(says(fx)).toEqual(['JESUS!']);
    expect(fx).toContainEqual({ kind: 'after', seconds: Math.max(PRANK_SECONDS, afterThought('JESUS!')), event: { type: 'prank-done' } });
    expect(s.chalice).toBe('held');
    expect(task(s)).toBe('');
    const harmless = applyEvent(s, { type: 'prank-done' });
    expect(says(harmless)).toEqual(['Harmless, huh? I almost had a heart attack.']);
    expect(harmless).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.prankHarmless), event: { type: 'prank-thought-done' } });
    expect(task(s)).toBe('');
    const focus = applyEvent(s, { type: 'prank-thought-done' });
    expect(says(focus)).toEqual(['Gotta stay focused, back to the chapel.']);
    expect(focus).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.prankFocus), event: { type: 'prank-focus-done' } });
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'prank-focus-done' });
    expect(s.objective_id).toBe('D2-03');
    expect(task(s)).toBe('Place the chalice on the ritual table');
  });

  it('keeps hands free for one thing at a time', () => {
    const s = at(step('pickup-chalice'));
    s.held_prop_id = 'clock';
    expect(resolve('item:chalice', s, byBench).action).toEqual({ kind: 'message', text: REMINDERS.handsFull });
    expect(flashes(applyEvent(s, { type: 'pickup-chalice' }))).toEqual([REMINDERS.handsFull]);
    expect(s.chalice).toBe('garden-bench');
  });
});

describe('Day 2 thoughts on the way in', () => {
  it('gets its steps in walking up to the church, once', () => {
    const s = at(step('door-opened'));
    const near = { x: CHURCH_APPROACH.x, y: CHURCH_APPROACH.y - CHURCH_APPROACH.r + 1, level: 0 };
    expect(says(applyEvent(s, { type: 'approach-church', ...near }))).toEqual(['Definitely getting my steps in.']);
    expect(applyEvent(s, { type: 'approach-church', ...near })).toEqual([]);
  });

  it('has the designer\'s note on the desk', () => {
    expect(OFFICE_NOTES[2].startsWith('Great job yesterday!')).toBe(true);
    expect(OFFICE_NOTES[2]).toMatch(/key to the chapel is behind you on the ring again/);
    expect(OFFICE_NOTES[2].endsWith('Good Luck!')).toBe(true);
  });
});

describe('the first delivery (D2-03)', () => {
  it('is all set once the chalice is on the table, then the alert comes', () => {
    const s = at(step('stage-table', 2));
    expect(resolve('item:ritual-table', s, inCircle).prompt).toBe('E  Set out the chalice');
    const fx = applyEvent(s, { type: 'stage-table' });
    expect(says(fx)).toEqual(['There. All set.']);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.tableSetDay2), event: { type: 'receive-sms', id: 'd2delivery1' } });
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'receive-sms', id: 'd2delivery1' });
    expect(s.relic).toBe('drop-box');
    expect(s.relic_kind).toBe('teacup');
    expect(task(s)).toBe('Check your phone (Q)');
    applyEvent(s, { type: 'read-sms' });
    expect(task(s)).toBe('Collect the delivery from the drop box by the gate');
    expect(SMS.d2delivery1.text).toBe('FWD: A package has been delivered to your drop box. Thank you for using Christ-LERTS.');
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
    expect(says(applyEvent(s, { type: 'relic-ghost-gone' }))).toEqual(['I guess he must have really liked tea.']);
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
