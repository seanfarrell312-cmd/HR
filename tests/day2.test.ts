import { describe, expect, it } from 'vitest';
import {
  afterThought,
  ALTAR_APPROACH,
  GATE_CODE,
  GATE_RECALL_DELAY,
  CHURCH_APPROACH,
  HOLY_CIRCLE,
  OFFICE_NOTES,
  PRANK_SECONDS,
  RELIC_LINES,
  RELIC_TABLE_SLOTS,
  LOITER_LINES,
  REMINDERS,
  SEARCH_NUDGE_SECONDS,
  SEARCH_NUDGES,
  SEARCH_SPOTS,
  RATTLE_VIOLENT,
  STAND_IN_CIRCLE,
  EXORCISE_SECONDS,
  THOUGHT_BEAT,
  CLOWN_DANCE_SECONDS,
  CLOWN_WIGGLE_SECONDS,
  SPLASH_SECONDS,
  CHURCH_LEFT_Y,
  SMS,
  THOUGHTS,
} from '../src/data/story';
import { createInitialState, type GameState } from '../src/state/store';
import { startDay } from '../src/story/day';
import { applyEvent, clownRoaming, ghostsChasing, worriedShown, type Effect, type StoryEvent } from '../src/story/events';
import { bibleStandRect } from '../src/world/storyProps';
import { PROPS } from '../src/data/layout';
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
  { type: 'enter-church', x: 0, y: 52, level: 0 },
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
  { type: 'crucifix-thought-done' },
  { type: 'stage-table' },
  { type: 'take', item: 'storage-key' },
  { type: 'door-opened', id: 'storage' },
  { type: 'search-closet', x: -9.3, y: 61.7, level: 0 },
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
  { type: 'alert-thought-done' },
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
  // D2-05: the clown doll. The cross gets a giggle and a wiggle; scripture;
  // the cross again only makes it dance.
  { type: 'receive-sms', id: 'd2delivery2' },
  { type: 'read-sms' },
  { type: 'leave-church', x: 0, y: 46, level: 0 },
  { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 },
  { type: 'take-relic' },
  { type: 'relic-pickup-2' },
  { type: 'relic-pickup-thought-done' },
  { type: 'relic-near-church', x: 0, y: 40, level: 0 },
  { type: 'relic-carry-2' },
  { type: 'place-relic' },
  { type: 'bless-relic' },
  { type: 'clown-wiggle-done' },
  { type: 'clown-book-wanted' },
  { type: 'take', item: 'bible' },
  { type: 'begin-scripture' },
  { type: 'read-scripture' },
  { type: 'bless-relic' },
  { type: 'clown-dance-done' },
  { type: 'water-idea' },
  { type: 'water-wanted' },
  // D2-06: the Bible back on its stand, then the bucket and rod from the
  // closet the key opened during the search.
  { type: 'return-bible' },
  { type: 'pickup-bucket' },
  { type: 'take', item: 'rod' },
  // D2-07: fill it at the fountain and set it down, dip the rod, splash the
  // doll still, the cross once more, put the doll away.
  { type: 'fill-bucket' },
  { type: 'place-bucket' },
  { type: 'wet-rod' },
  { type: 'splash-relic' },
  { type: 'clown-cooled' },
  { type: 'clown-cool-thought-done' },
  { type: 'bless-relic' },
  { type: 'relic-ghost-gone' },
  { type: 'relic-ghost-2' },
  { type: 'relic-thought-done' },
  { type: 'pickup-relic' },
  { type: 'store-relic' },
  // D2-08 (S3 part 3): the third text and the hand bell. The clown's ghost
  // drifts among the east graves.
  { type: 'receive-sms', id: 'd2delivery3' },
  { type: 'read-sms' },
  { type: 'spotted', who: 'clown-roaming' },
  { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 },
  { type: 'take-relic' },
  { type: 'relic-pickup-thought-done' },
  { type: 'relic-near-church', x: 0, y: 40, level: 0 },
  // D2-09: onto the table, then the refill; the worried ghost at the old
  // priest's grave, gone when looked for again.
  { type: 'place-relic' },
  { type: 'bell-refill-wanted' },
  { type: 'pickup-bucket' },
  { type: 'spotted', who: 'worried' },
  { type: 'fill-bucket' },
  { type: 'worried-vanished' },
  { type: 'spotted', who: 'worried-gone' },
  { type: 'place-bucket' },
  // D2-10: the cross, then holy water; it only rattles harder.
  { type: 'bless-relic' },
  { type: 'bell-settled' },
  { type: 'bell-water-wanted' },
  { type: 'wet-rod' },
  { type: 'splash-relic' },
  { type: 'bell-splash-settled' },
  { type: 'bell-idea' },
  { type: 'two-handed-wanted' },
  // D2-11: the Bible stand into the circle, the rod dipped again, the
  // two-handed blessing, put it away.
  { type: 'move-bible-stand' },
  { type: 'wet-rod' },
  { type: 'bless-relic' },
  { type: 'bell-exorcised' },
  { type: 'relic-ghost-gone' },
  { type: 'relic-thought-done' },
  { type: 'pickup-relic' },
  { type: 'store-relic' },
  // D2-12: out through the gate past the two ghosts chasing each other.
  { type: 'head-home' },
  { type: 'spotted', who: 'chase' },
  { type: 'reach-gate', x: 0, y: 2, level: 0 },
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
/** The checklist under the objective, as "x Text" (done) or "- Text". */
const checklist = (s: GameState) => (currentObjective(s).checklist?.(s) ?? []).map((i) => `${i.done ? 'x' : '-'} ${i.text}`);
const says = (fx: Effect[]) => fx.filter((f) => f.kind === 'say').map((f) => (f as { text: string }).text);
const flashes = (fx: Effect[]) => fx.filter((f) => f.kind === 'flash').map((f) => (f as { text: string }).text);
const inCircle = { x: HOLY_CIRCLE.x, y: HOLY_CIRCLE.y, level: 0 as const };
/** Beside the north end of the east garden bench, inside the garden. */
const byBench = { x: -24.8, y: 56, level: 0 as const };
/** In the office, in front of the desk. */
const inOffice = { x: -12, y: 52.9, level: 0 as const };
/** Between the office desk and the west wall, where the drawers are. */
const behindDesk = { x: -15.5, y: 52.9, level: 0 as const };
/** In the nave by the storage closet door, and inside the closet. */
const byCloset = { x: -6.8, y: 61.7, level: 0 as const };
const inCloset = { x: -9.3, y: 61.7, level: 0 as const };
/** Day 2 played up to the storage key being found in the desk (the search under way). */
const keyStep = () => DAY2_PLAYTHROUGH.findIndex((e) => e.type === 'take' && e.item === 'storage-key');

describe('Day 2 playthrough (S3)', () => {
  it('runs from the gate to the end of the shift', () => {
    const s = day2Start();
    const seen = [s.objective_id];
    for (const e of DAY2_PLAYTHROUGH) {
      play(s, [e]);
      if (seen[seen.length - 1] !== s.objective_id) seen.push(s.objective_id);
    }
    // Day 2's last objective done, the next is Day 3's first (the fade takes over).
    expect(seen).toEqual(['D2-01', 'D2-02', 'D2-03', 'D2-04', 'D2-05', 'D2-06', 'D2-07', 'D2-08', 'D2-09', 'D2-10', 'D2-11', 'D2-12', 'D3-01']);
    // Three deliveries, in order (doc 9, S3 tests).
    expect(s.relics_stored).toEqual(['teacup', 'clown', 'bell']);
    expect(s.environment_preset).toBe('D1_EVENING');
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
    expect(s.fired_scares.filter((f) => f === 'd2-clown-ghost')).toHaveLength(1);
    expect(s.fired_scares.filter((f) => f === 'd2-bell-ghost')).toHaveLength(1);
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
    expect(THOUGHTS.officeClock).toBe('That clock really does look nice in here.');
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
    expect(says(fx)).toEqual(["Here's the crucifix, but no chalice..."]);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.chaliceMissing), event: { type: 'chalice-missing-done' } });
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'chalice-missing-done' });
    expect(task(s)).toBe('Fetch the crucifix from the altar');
    const took = applyEvent(s, { type: 'take', item: 'crucifix' });
    expect(says(took)).toEqual(["I guess I'll drop this off first, then look for the cup."]);
    expect(took).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.crucifixFirst), event: { type: 'crucifix-thought-done' } });
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'crucifix-thought-done' });
    expect(task(s)).toBe('Put the crucifix on the ritual table');
    expect(resolve('item:ritual-table', s, inCircle).prompt).toBe('E  Set out the crucifix');
    applyEvent(s, { type: 'stage-table' });
    expect(task(s)).toBe('Search the church for the chalice');
    expect(checklist(s)).toEqual(['- Check the office', '- Check the storage closet', '- Check the basement']);
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

  it('points to the office while the doors are locked and the key not found', () => {
    const s = at(keyStep());
    expect(task(s)).toBe('Search the church for the chalice');
    for (const id of ['storage', 'basement']) {
      expect(resolve(`door:${id}`, s, byCloset).action).toEqual({ kind: 'story', event: { type: 'try-locked-door', id } });
      // Every time, like a reminder; it doesn't count as checking.
      for (let i = 0; i < 2; i++) {
        expect(applyEvent(s, { type: 'try-locked-door', id })).toEqual([{ kind: 'say', text: "Locked. Maybe there's a key in the office?" }]);
      }
    }
    expect(checklist(s)).toEqual(['- Check the office', '- Check the storage closet', '- Check the basement']);
  });

  it('finds a key in the desk drawers, from behind the desk only', () => {
    const s = at(keyStep());
    expect(resolve('item:office-desk', s, inOffice)).toEqual({ prompt: 'Desk', action: { kind: 'message', text: REMINDERS.drawersOtherSide } });
    // Either end of the strip behind it counts.
    for (const p of [behindDesk, { x: -16, y: 51, level: 0 as const }, { x: -15, y: 55.5, level: 0 as const }]) {
      expect(resolve('item:office-desk', s, p).prompt).toBe('E  Search the desk drawers');
    }
    const fx = applyEvent(s, { type: 'take', item: 'storage-key' });
    expect(says(fx)).toEqual(["No chalice in these drawers, but there's a key. Maybe it opens the storage closet, or the basement?"]);
    expect(s.inventory.has('storage-key')).toBe(true);
    expect(checklist(s)).toEqual(['x Check the office', '- Check the storage closet', '- Check the basement']);
    // Nothing more in the drawers.
    expect(resolve('item:office-desk', s, behindDesk).prompt).toBe('');
    expect(applyEvent(s, { type: 'take', item: 'storage-key' })).toEqual([]);
  });

  it('opens the closet with the key, and counts it once the player steps inside', () => {
    const s = at(step('door-opened', 4));
    expect(resolve('door:storage', s, byCloset).prompt).toBe('E  Open storage closet');
    applyEvent(s, { type: 'door-opened', id: 'storage' });
    expect(s.flags.has('storage-opened')).toBe(true);
    // Opening the door isn't looking inside.
    expect(applyEvent(s, { type: 'search-closet', ...byCloset })).toEqual([]);
    // The bucket and rod are there, but not to be taken yet.
    expect(resolve('item:bucket', s, inCloset).prompt).toBe('');
    expect(resolve('item:rod', s, inCloset).prompt).toBe('');
    expect(applyEvent(s, { type: 'pickup-bucket' })).toEqual([]);
    expect(applyEvent(s, { type: 'take', item: 'rod' })).toEqual([]);
    const fx = applyEvent(s, { type: 'search-closet', ...inCloset });
    expect(says(fx)).toEqual(['Just a bucket and a holy-water rod. No chalice in here.']);
    expect(checklist(s)).toEqual(['x Check the office', 'x Check the storage closet', '- Check the basement']);
  });

  it("finds the key won't open the basement, then heads outside", () => {
    const s = at(step('try-locked-door'));
    expect(resolve('door:basement', s, byCloset).action).toEqual({ kind: 'story', event: { type: 'try-locked-door', id: 'basement' } });
    const last = applyEvent(s, { type: 'try-locked-door', id: 'basement' });
    expect(says(last)).toEqual(["It doesn't fit. It must only be for the closet."]);
    expect(last).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.searchBasement), event: { type: 'search-done' } });
    expect(s.open_doors.has('basement')).toBe(false);
    // Once tried, it's just locked.
    expect(resolve('door:basement', s, byCloset).action).toEqual({ kind: 'message', text: "It's locked." });
    // All crossed off, and still up through the "outside" thought.
    expect(checklist(s)).toEqual(['x Check the office', 'x Check the storage closet', 'x Check the basement']);
    expect(says(applyEvent(s, { type: 'search-done' }))).toEqual(["I guess it's outside somewhere?"]);
    expect(task(s)).toBe('');
    expect(checklist(s)).toHaveLength(3);
    applyEvent(s, { type: 'search-thought-done' });
    expect(task(s)).toBe('Search the grounds for the chalice');
    expect(checklist(s)).toEqual([]);
  });

  it('can try the basement with the key before looking in the closet', () => {
    const s = at(step('door-opened', 4));
    applyEvent(s, { type: 'try-locked-door', id: 'basement' });
    expect(checklist(s)).toEqual(['x Check the office', '- Check the storage closet', 'x Check the basement']);
    applyEvent(s, { type: 'door-opened', id: 'storage' });
    const last = applyEvent(s, { type: 'search-closet', ...inCloset });
    expect(last).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.searchCloset), event: { type: 'search-done' } });
  });

  it('keeps the church doors shut from inside until the search is done', () => {
    const shut = (g: GameState) => {
      g.open_doors.delete('church');
      return g;
    };
    const inside = { x: 0, y: 51, level: 0 as const };
    const outside = { x: 0, y: 48, level: 0 as const };
    // Before the crucifix goes down: the doors open as usual.
    // The doors shut themselves behind the player (AUTO_CLOSE_DOORS).
    const before = shut(at(step('stage-table')));
    expect(resolve('door:church', before, inside).prompt).toBe('E  Open church doors');
    expect(checklist(before)).toEqual([]);

    const s = shut(at(keyStep()));
    const res = resolve('door:church', s, inside);
    expect(res.prompt).toBe('Church doors');
    expect(res.action).toEqual({ kind: 'story', event: { type: 'try-church-doors' } });
    expect(says(applyEvent(s, { type: 'try-church-doors' }))).toEqual(["I need to find the chalice. I haven't checked all the rooms yet."]);
    expect(s.open_doors.has('church')).toBe(false);
    // Someone outside (a debug teleport) can still get in.
    expect(resolve('door:church', s, outside).prompt).toBe('E  Open church doors');

    // Shut until the last place is checked; open as soon as the "outside"
    // thought appears (designer, 2026-12-01).
    const last = shut(at(step('search-done')));
    expect(resolve('door:church', last, inside).action).toEqual({ kind: 'story', event: { type: 'try-church-doors' } });
    expect(says(applyEvent(last, { type: 'search-done' }))).toEqual(["I guess it's outside somewhere?"]);
    expect(resolve('door:church', last, inside).prompt).toBe('E  Open church doors');
    expect(applyEvent(last, { type: 'try-church-doors' })).toEqual([]);
    // The checklist stays up, all crossed off, while the thought plays.
    expect(checklist(last)).toEqual(['x Check the office', 'x Check the storage closet', 'x Check the basement']);
  });

  it('only starts the search once the crucifix is on the table', () => {
    const s = at(step('stage-table'));
    // No key in the drawers yet, and the doors are just locked.
    expect(resolve('item:office-desk', s, behindDesk).prompt).toBe('');
    expect(applyEvent(s, { type: 'take', item: 'storage-key' })).toEqual([]);
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
    expect(says(harmless)).toEqual(['Harmless, huh? I almost had a heart attack!']);
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

describe('dawdling outside (Day 2)', () => {
  const unlocked = () => {
    const s = day2Start();
    applyEvent(s, { type: 'arrived' });
    return { s, fx: applyEvent(s, { type: 'keypad-submit', code: GATE_CODE }) };
  };

  it('nags at 60, 120 and 180 seconds after the gate opens', () => {
    const { s, fx } = unlocked();
    expect(LOITER_LINES.map((l) => l.seconds)).toEqual([60, 120, 180]);
    for (const n of [1, 2, 3]) {
      expect(fx).toContainEqual({ kind: 'after', seconds: LOITER_LINES[n - 1].seconds, event: { type: 'loiter', n } });
    }
    expect(says(applyEvent(s, { type: 'loiter', n: 1 }))).toEqual(['These grounds are really pristine.']);
    expect(says(applyEvent(s, { type: 'loiter', n: 2 }))).toEqual(["Maybe I'll just hang out here all day."]);
    expect(says(applyEvent(s, { type: 'loiter', n: 3 }))).toEqual(['I should head inside.']);
    expect(applyEvent(s, { type: 'loiter', n: 3 })).toEqual([]);
  });

  it('stops once the player is inside the church', () => {
    const { s } = unlocked();
    applyEvent(s, { type: 'loiter', n: 1 });
    // Outside the doors doesn't count.
    applyEvent(s, { type: 'enter-church', x: 0, y: 49, level: 0 });
    expect(s.flags.has('entered-church')).toBe(false);
    applyEvent(s, { type: 'enter-church', x: 0, y: 52, level: 0 });
    expect(applyEvent(s, { type: 'loiter', n: 2 })).toEqual([]);
    expect(applyEvent(s, { type: 'loiter', n: 3 })).toEqual([]);
  });

  it('does not nag on Day 1', () => {
    const s = createInitialState();
    const fx = applyEvent(s, { type: 'keypad-submit', code: GATE_CODE });
    expect(fx.filter((f) => f.kind === 'after')).toEqual([]);
    expect(applyEvent(s, { type: 'loiter', n: 1 })).toEqual([]);
  });
});

describe('search nudges (D2-02)', () => {
  const nudge = THOUGHTS.searchNudge;
  const nudgesIn = (fx: Effect[]) => fx.filter((f) => f.kind === 'after' && f.event.type === 'search-nudge');

  it('nudges after 30 s with nothing checked, up to three times', () => {
    const s = at(step('stage-table'));
    const fx = applyEvent(s, { type: 'stage-table' });
    expect(nudgesIn(fx)).toEqual([{ kind: 'after', seconds: SEARCH_NUDGE_SECONDS, event: { type: 'search-nudge', at: 0, n: 1 } }]);
    expect(SEARCH_NUDGE_SECONDS).toBe(30);
    expect(SEARCH_NUDGES).toBe(3);
    const one = applyEvent(s, { type: 'search-nudge', at: 0, n: 1 });
    expect(says(one)).toEqual(["I should look around the office. Maybe there's a key for these doors."]);
    expect(nudgesIn(one)).toEqual([{ kind: 'after', seconds: 30, event: { type: 'search-nudge', at: 0, n: 2 } }]);
    expect(says(applyEvent(s, { type: 'search-nudge', at: 0, n: 2 }))).toEqual([nudge]);
    const three = applyEvent(s, { type: 'search-nudge', at: 0, n: 3 });
    expect(says(three)).toEqual([nudge]);
    // Three and done.
    expect(nudgesIn(three)).toEqual([]);
    expect(applyEvent(s, { type: 'search-nudge', at: 0, n: 3 })).toEqual([]);
  });

  it('restarts the 30 s on each check and drops a stale nudge', () => {
    const s = at(step('stage-table'));
    applyEvent(s, { type: 'stage-table' });
    const desk = applyEvent(s, { type: 'take', item: 'storage-key' });
    expect(nudgesIn(desk)).toEqual([{ kind: 'after', seconds: 30, event: { type: 'search-nudge', at: 1, n: 1 } }]);
    // The one scheduled before the desk check no longer applies.
    expect(applyEvent(s, { type: 'search-nudge', at: 0, n: 1 })).toEqual([]);
    // With the key in hand, the nudge says to try it.
    expect(says(applyEvent(s, { type: 'search-nudge', at: 1, n: 1 }))).toEqual(['I should try this key on the locked doors.']);
    // The last check ends the search: no more nudges.
    applyEvent(s, { type: 'door-opened', id: 'storage' });
    applyEvent(s, { type: 'search-closet', ...inCloset });
    const last = applyEvent(s, { type: 'try-locked-door', id: 'basement' });
    expect(nudgesIn(last)).toEqual([]);
    expect(applyEvent(s, { type: 'search-nudge', at: 2, n: 2 })).toEqual([]);
  });
});

describe('Day 2 thoughts on the way in', () => {
  it('gets its steps in walking up to the church, once', () => {
    const s = at(step('door-opened'));
    const near = { x: CHURCH_APPROACH.x, y: CHURCH_APPROACH.y - CHURCH_APPROACH.r + 1, level: 0 };
    expect(says(applyEvent(s, { type: 'approach-church', ...near }))).toEqual(["I'm definitely getting my steps in today."]);
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
    const read = applyEvent(s, { type: 'read-sms' });
    expect(says(read)).toEqual(['Christ-LERTS? Nice.']);
    expect(read).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.alertRead), event: { type: 'alert-thought-done' } });
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'alert-thought-done' });
    expect(task(s)).toBe('Collect the delivery from the drop box by the gate');
    expect(SMS.d2delivery1.text).toBe('FWD: A package has been delivered to your drop box. Thank you for using Christ-LERTS.');
  });

  it('has its own lines for the teacup', () => {
    const s = at(step('approach-drop-box'));
    expect(says(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 }))).toEqual(['Sounds like... rattling china?']);
    const fx = applyEvent(s, { type: 'take-relic' });
    expect(says(fx)).toEqual(["A bouncing teacup? It's a wonder it hasn't shattered."]);
    expect(s.held_prop_id).toBe('teacup');
    // Not yet near the doors; then its own line on the way up, once.
    expect(applyEvent(s, { type: 'relic-near-church', x: 0, y: 20, level: 0 })).toEqual([]);
    expect(says(applyEvent(s, { type: 'relic-near-church', x: 0, y: 36, level: 0 }))).toEqual([
      "I should hurry, this thing's about to bounce out of my hands.",
    ]);
    expect(applyEvent(s, { type: 'relic-near-church', x: 0, y: 40, level: 0 })).toEqual([]);
    expect(RELIC_LINES.teacup.carry).not.toBe(RELIC_LINES['music-box'].carry);
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
    expect(fx).toEqual([
      { kind: 'sfx', id: 'place' },
      // A hopeful thought, then the clown doll is on its way.
      { kind: 'say', text: "If they're all like this today, I might get to go home early." },
      { kind: 'after', seconds: afterThought(THOUGHTS.homeEarly), event: { type: 'receive-sms', id: 'd2delivery2' } },
      { kind: 'objective', id: 'D2-04' },
    ]);
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

describe('the clown doll arrives and the cross fails (D2-05)', () => {
  it('comes through the drop box as the second delivery', () => {
    const s = at(step('receive-sms', 2));
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'receive-sms', id: 'd2delivery2' });
    expect(s.relic).toBe('drop-box');
    expect(s.relic_kind).toBe('clown');
    // The teacup's steps are cleared for the new relic.
    expect(s.flags.has('relic-blessed')).toBe(false);
    expect(task(s)).toBe('Check your phone (Q)');
    // No "Christ-LERTS? Nice." the second time.
    expect(says(applyEvent(s, { type: 'read-sms' }))).toEqual([]);
    expect(task(s)).toBe('Collect the delivery from the drop box by the gate');
  });

  it('grumbles about the walk on leaving the church for it, once', () => {
    const s = at(step('leave-church'));
    // Still inside, or upstairs: nothing yet.
    expect(applyEvent(s, { type: 'leave-church', x: 0, y: 55, level: 0 })).toEqual([]);
    expect(applyEvent(s, { type: 'leave-church', x: 0, y: 40, level: 1 })).toEqual([]);
    expect(says(applyEvent(s, { type: 'leave-church', x: 0, y: CHURCH_LEFT_Y - 1, level: 0 }))).toEqual([
      'I should have brought a bike or something. This walk is ridiculous.',
    ]);
    expect(applyEvent(s, { type: 'leave-church', x: 0, y: 30, level: 0 })).toEqual([]);
  });

  it('says nothing about the walk before the text, or once the doll is collected', () => {
    const before = at(step('receive-sms', 2));
    expect(applyEvent(before, { type: 'leave-church', x: 0, y: 40, level: 0 })).toEqual([]);
    const after = at(step('take-relic', 2));
    applyEvent(after, { type: 'take-relic' });
    expect(applyEvent(after, { type: 'leave-church', x: 0, y: 40, level: 0 })).toEqual([]);
  });

  it('has its own lines, two at a time when picked up and carried', () => {
    const s = at(step('approach-drop-box', 2));
    expect(says(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 }))).toEqual([RELIC_LINES.clown.approach]);
    const fx = applyEvent(s, { type: 'take-relic' });
    expect(says(fx)).toEqual(['A doll?']);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought('A doll?'), event: { type: 'relic-pickup-2' } });
    expect(s.held_prop_id).toBe('clown');
    // The table objective waits for the second line.
    expect(applyEvent(s, { type: 'relic-pickup-thought-done' })).toEqual([]);
    expect(task(s)).toBe('');
    const more = applyEvent(s, { type: 'relic-pickup-2' });
    expect(says(more)).toEqual(["I'm not exactly sure what's haunted about it, but I guess a little blessing couldn't hurt."]);
    applyEvent(s, { type: 'relic-pickup-thought-done' });
    expect(task(s)).toBe('Put the clown doll on the ritual table');
    const carry = applyEvent(s, { type: 'relic-near-church', x: 0, y: 40, level: 0 });
    expect(says(carry)).toEqual(["I wonder if it's just a clown thing. A lot of people think they're creepy nowadays."]);
    expect(carry).toContainEqual({ kind: 'after', seconds: afterThought(RELIC_LINES.clown.carry), event: { type: 'relic-carry-2' } });
    expect(says(applyEvent(s, { type: 'relic-carry-2' }))).toEqual(['Poor little guy.']);
  });

  it("keeps the other relics' single lines", () => {
    for (const kind of ['music-box', 'teacup'] as const) {
      expect(RELIC_LINES[kind].pickup2).toBeUndefined();
      expect(RELIC_LINES[kind].carry2).toBeUndefined();
      expect(RELIC_LINES[kind].ghost2).toBeUndefined();
    }
    // The teacup's pickup still goes straight to the table objective.
    const s = at(step('take-relic'));
    expect(applyEvent(s, { type: 'take-relic' })).toContainEqual({
      kind: 'after',
      seconds: afterThought(RELIC_LINES.teacup.pickup),
      event: { type: 'relic-pickup-thought-done' },
    });
  });

  it('wants the cross first: no Bible yet', () => {
    const s = at(step('bless-relic', 2));
    expect(task(s)).toBe('Stand in the holy circle and bless the clown doll');
    expect(resolve('item:bible', s, inCircle).prompt).toBe('');
    expect(resolve('item:ritual-table', s, inCircle).hold).toEqual({ type: 'bless-relic' });
    expect(resolve('item:clown', s, { x: 9, y: 53, level: 0 }).action).toEqual({ kind: 'message', text: REMINDERS.standInCircle });
  });

  it('giggles and wiggles at the first cross, then wants scripture', () => {
    const s = at(step('bless-relic', 2));
    const fx = applyEvent(s, { type: 'bless-relic' });
    expect(fx).toEqual([{ kind: 'wiggle' }, { kind: 'after', seconds: CLOWN_WIGGLE_SECONDS, event: { type: 'clown-wiggle-done' } }]);
    expect(task(s)).toBe('');
    expect(resolve('item:clown', s, inCircle).prompt).toBe('');
    // "Yep, that's haunted..." first (designer, 2026-11-27).
    const haunted = applyEvent(s, { type: 'clown-wiggle-done' });
    expect(says(haunted)).toEqual(["Yep, that's haunted. Let's see how they like some of the Good Book."]);
    expect(haunted).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.clownHaunted), event: { type: 'clown-book-wanted' } });
    expect(task(s)).toBe('');
    expect(resolve('item:clown', s, inCircle).prompt).toBe('');
    expect(resolve('item:bible', s, inCircle).prompt).toBe('');
    applyEvent(s, { type: 'clown-book-wanted' });
    expect(task(s)).toBe('Pick up the Bible from the stand');
    expect(resolve('item:clown', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.bibleFirst });
    // No skipping the scripture.
    expect(flashes(applyEvent(s, { type: 'bless-relic' }))).toEqual([REMINDERS.scriptureFirst]);
    expect(resolve('item:bible', s, inCircle).prompt).toBe('E  Pick up the Bible');
    applyEvent(s, { type: 'take', item: 'bible' });
    expect(task(s)).toBe('Read the clown doll some scripture');
    expect(resolve('item:clown', s, inCircle).hold).toEqual({ type: 'begin-scripture' });
    applyEvent(s, { type: 'begin-scripture' });
    // It doesn't react to the scripture; the cross comes next.
    expect(applyEvent(s, { type: 'read-scripture' })).toEqual([]);
    expect(task(s)).toBe('Bless the clown doll again');
    expect(resolve('item:clown', s, inCircle).hold).toEqual({ type: 'bless-relic' });
  });

  it('dances and laughs at the second cross, then the two thoughts', () => {
    const s = at(step('bless-relic', 3));
    const fx = applyEvent(s, { type: 'bless-relic' });
    expect(fx).toContainEqual({ kind: 'dance' });
    expect(fx).toContainEqual({ kind: 'sfx', id: 'clown-laugh' });
    expect(fx).toContainEqual({ kind: 'after', seconds: CLOWN_DANCE_SECONDS, event: { type: 'clown-dance-done' } });
    expect(fx.some((f) => f.kind === 'purify')).toBe(false);
    expect(s.flags.has('relic-blessed')).toBe(false);
    expect(task(s)).toBe('');
    // Nothing to do with it while it dances and the thoughts play.
    expect(resolve('item:clown', s, inCircle).prompt).toBe('');
    expect(says(applyEvent(s, { type: 'clown-dance-done' }))).toEqual([THOUGHTS.clownDance]);
    expect(says(applyEvent(s, { type: 'water-idea' }))).toEqual(['Time for some holy water. There was a bucket and a rod in the storage closet.']);
    applyEvent(s, { type: 'water-wanted' });
    expect(s.objective_id).toBe('D2-06');
    // The Bible goes back before the fetch for holy water.
    expect(task(s)).toBe('Put the Bible back on the stand');
    expect(resolve('item:bible', s, inCircle).prompt).toBe('E  Put the Bible back');
    applyEvent(s, { type: 'return-bible' });
    expect(s.inventory.has('bible')).toBe(false);
    // The closet is already open from the search.
    expect(task(s)).toBe('Take the bucket and holy-water rod from the storage closet');
    // And can't be taken again.
    expect(resolve('item:bible', s, inCircle).prompt).toBe('');
    expect(applyEvent(s, { type: 'take', item: 'bible' })).toEqual([]);
  });

  it("keeps the Bible in hand while it's still needed", () => {
    const s = at(step('bless-relic', 3));
    expect(resolve('item:bible', s, inCircle).prompt).toBe('');
    expect(applyEvent(s, { type: 'return-bible' })).toEqual([]);
  });
});

describe('the bucket and rod from the closet (D2-06)', () => {
  it('waits for the Bible to go back before handing them out', () => {
    const s = at(step('return-bible', 2));
    expect(s.inventory.has('storage-key')).toBe(true);
    expect(task(s)).toBe('Put the Bible back on the stand');
    expect(resolve('item:bucket', s, inCloset).prompt).toBe('');
    expect(resolve('item:rod', s, inCloset).prompt).toBe('');
    expect(applyEvent(s, { type: 'pickup-bucket' })).toEqual([]);
    expect(applyEvent(s, { type: 'take', item: 'rod' })).toEqual([]);
    applyEvent(s, { type: 'return-bible' });
    expect(resolve('item:bucket', s, inCloset).prompt).toBe('E  Pick up the bucket');
  });

  it('takes the bucket and the rod in either order', () => {
    const s = at(step('pickup-bucket'));
    const closet = { x: -9.3, y: 61.7, level: 0 as const };
    expect(resolve('item:bucket', s, closet).prompt).toBe('E  Pick up the bucket');
    expect(resolve('item:rod', s, closet).prompt).toBe('E  Take the holy-water rod');
    applyEvent(s, { type: 'take', item: 'rod' });
    expect(task(s)).toBe('Pick up the bucket from the storage closet');
    applyEvent(s, { type: 'pickup-bucket' });
    expect(s.held_prop_id).toBe('bucket');
    expect(s.objective_id).toBe('D2-07');
    expect(task(s)).toBe('Fill the bucket at the fountain in the west garden');
  });

});

describe('holy water for the clown doll (D2-07)', () => {
  const garden = { x: -29.25, y: 51, level: 0 as const };

  it('fills the bucket at the fountain, and only an empty one', () => {
    const s = at(step('fill-bucket'));
    expect(resolve('item:fountain', s, garden).prompt).toBe('E  Fill the bucket');
    // Not to be put down empty.
    expect(flashes(applyEvent(s, { type: 'place-bucket' }))).toEqual([REMINDERS.bucketEmpty]);
    expect(applyEvent(s, { type: 'fill-bucket' })).toContainEqual({ kind: 'sfx', id: 'fill' });
    expect(s.bucket_filled).toBe(true);
    expect(resolve('item:fountain', s, garden).prompt).toBe('');
    expect(task(s)).toBe('Put the bucket down by the ritual table');
    expect(resolve('item:ritual-table', s, inCircle).prompt).toBe('E  Put the bucket down');
    applyEvent(s, { type: 'place-bucket' });
    expect(s.bucket).toBe('chapel');
    expect(task(s)).toBe('Dip the holy-water rod in the bucket');
  });

  it('dips the rod in the bucket by the table, once', () => {
    const s = at(step('wet-rod'));
    // Not splashed with a dry rod.
    expect(resolve('item:clown', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.rodDry });
    expect(flashes(applyEvent(s, { type: 'splash-relic' }))).toEqual([REMINDERS.rodDry]);
    expect(resolve('item:bucket', s, inCircle).prompt).toBe('E  Dip the rod in the holy water');
    expect(applyEvent(s, { type: 'wet-rod' })).toEqual([{ kind: 'dip' }]);
    expect(s.bucket_filled).toBe(true);
    expect(resolve('item:bucket', s, inCircle).prompt).toBe('');
    expect(task(s)).toBe('Stand in the holy circle and splash the clown doll with holy water');
  });

  it('needs the rod and the water by the table to dip it', () => {
    const noRod = at(step('wet-rod'));
    noRod.inventory.delete('rod');
    expect(resolve('item:bucket', noRod, inCircle).prompt).toBe('');
    expect(flashes(applyEvent(noRod, { type: 'wet-rod' }))).toEqual([REMINDERS.needRod]);
    const noWater = at(step('wet-rod'));
    noWater.bucket_filled = false;
    expect(flashes(applyEvent(noWater, { type: 'wet-rod' }))).toEqual([REMINDERS.holyWaterFirst]);
    expect(resolve('item:clown', noWater, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.holyWaterFirst });
  });

  it('splashes the doll still with the rod, then the thought', () => {
    const s = at(step('splash-relic'));
    expect(resolve('item:ritual-table', s, inCircle).hold).toEqual({ type: 'splash-relic' });
    expect(resolve('item:clown', s, { x: 9, y: 53, level: 0 }).action).toEqual({ kind: 'message', text: REMINDERS.standInCircle });
    const fx = applyEvent(s, { type: 'splash-relic' });
    expect(fx).toEqual([
      { kind: 'splash' },
      { kind: 'sfx', id: 'sprinkle' },
      { kind: 'after', seconds: SPLASH_SECONDS, event: { type: 'clown-cooled' } },
    ]);
    // Not released yet: the cross does that.
    expect(s.flags.has('relic-blessed')).toBe(false);
    expect(s.bucket_filled).toBe(false);
    expect(task(s)).toBe('');
    expect(resolve('item:clown', s, inCircle).prompt).toBe('');
    const cooled = applyEvent(s, { type: 'clown-cooled' });
    expect(says(cooled)).toEqual(['Looks like that cooled him off.']);
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'clown-cool-thought-done' });
    expect(task(s)).toBe('Bless the clown doll again');
    expect(resolve('item:clown', s, inCircle).hold).toEqual({ type: 'bless-relic' });
  });

  it('releases the wigged ghost at the cross, then two thoughts', () => {
    const s = at(step('bless-relic', 4));
    const fx = applyEvent(s, { type: 'bless-relic' });
    expect(fx).toContainEqual({ kind: 'purify', relic: 'clown' });
    expect(s.flags.has('relic-blessed')).toBe(true);
    expect(task(s)).toBe('');
    const gone = applyEvent(s, { type: 'relic-ghost-gone' });
    expect(says(gone)).toEqual(['I suppose a toy makes more sense than a teacup.']);
    expect(gone).toContainEqual({ kind: 'after', seconds: afterThought(RELIC_LINES.clown.ghost), event: { type: 'relic-ghost-2' } });
    // The next objective waits for the second thought.
    expect(applyEvent(s, { type: 'relic-thought-done' })).toEqual([]);
    expect(task(s)).toBe('');
    expect(says(applyEvent(s, { type: 'relic-ghost-2' }))).toEqual(['The things these spirits will get into these days.']);
    applyEvent(s, { type: 'relic-thought-done' });
    // The Bible went back before the fetch for holy water.
    expect(task(s)).toBe('Pick up the clown doll');
    expect(resolve('item:clown', s, inCircle).prompt).toBe('E  Pick up the clown doll');
    applyEvent(s, { type: 'pickup-relic' });
    expect(task(s)).toBe('Put the clown doll on the table outside the chapel');
    expect(resolve('item:relic-table', s, inCircle).prompt).toBe('E  Put the clown doll on the table');
  });

  it('can pick the empty bucket up again for a refill, but not a full one', () => {
    const full = at(step('splash-relic'));
    expect(resolve('item:bucket', full, inCircle).prompt).toBe('');
    applyEvent(full, { type: 'splash-relic' });
    expect(resolve('item:bucket', full, inCircle).prompt).toBe('E  Pick up the bucket');
  });

  it('puts the bucket back in the closet, empty, for the next shift', () => {
    const s = at(DAY2_PLAYTHROUGH.length);
    expect(s.bucket).toBe('chapel');
    const next = startDay(s, 2);
    expect(next.bucket).toBe('closet');
    expect(next.bucket_filled).toBe(false);
    expect(next.inventory.has('rod')).toBe(false);
  });
});

describe('part 2 interaction details', () => {
  it('lets the clock on the desk stand in for the desk when searching the drawers', () => {
    const s = (() => {
      const g = day2Start();
      play(g, DAY2_PLAYTHROUGH.slice(0, DAY2_PLAYTHROUGH.findIndex((e) => e.type === 'take' && 'item' in e && e.item === 'storage-key')));
      return g;
    })();
    expect(resolve('item:clock', s, { x: -15.5, y: 52.9, level: 0 }).prompt).toBe('E  Search the desk drawers');
  });

  it('shows nothing for the bucket and rod while the closet is locked', () => {
    const s = day2Start();
    const closet = { x: -9.3, y: 61.7, level: 0 as const };
    expect(resolve('item:bucket', s, closet).prompt).toBe('');
    expect(resolve('item:rod', s, closet).prompt).toBe('');
  });
});

describe('setting the bucket down', () => {
  it('works aiming at the doll on the table as well as the table', () => {
    const s = day2Start();
    play(s, DAY2_PLAYTHROUGH.slice(0, DAY2_PLAYTHROUGH.findIndex((e) => e.type === 'place-bucket')));
    expect(resolve('item:clown', s, { x: 11.4, y: 53.1, level: 0 }).prompt).toBe('E  Put the bucket down');
  });
});

// ---------------------------------------------------------------------------
// S3 part 3 (doc 6.2 D2-08 to D2-12): the third delivery, a placeholder hand
// bell; the clown's ghost among the graves; the worried ghost at the old
// priest's grave; the cross and holy water failing; the two-handed blessing;
// the end of the shift.

describe('the third delivery (D2-08)', () => {
  it('follows the clown doll onto the cleaned-relic table, after a thought', () => {
    const s = at(step('store-relic', 2));
    const fx = applyEvent(s, { type: 'store-relic' });
    expect(says(fx)).toEqual(['Two down. Please let that be the last one.']);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.lastOne), event: { type: 'receive-sms', id: 'd2delivery3' } });
    expect(s.objective_id).toBe('D2-08');
    expect(task(s)).toBe('');
    applyEvent(s, { type: 'receive-sms', id: 'd2delivery3' });
    expect(s.relic).toBe('drop-box');
    expect(s.relic_kind).toBe('bell');
    // The clown doll's steps are cleared for the new relic.
    expect(s.flags.has('relic-blessed')).toBe(false);
    expect(s.flags.has('rod-wet')).toBe(false);
    expect(task(s)).toBe('Check your phone (Q)');
    applyEvent(s, { type: 'read-sms' });
    expect(task(s)).toBe('Collect the delivery from the drop box by the gate');
  });

  it('keeps the drop box shut to each delivery until its text is read and the phone put away', () => {
    for (const n of [1, 2, 3]) {
      const s = at(step('read-sms', n));
      expect(s.relic).toBe('drop-box');
      const box = { x: 3.7, y: 1.5, level: 0 as const };
      expect(resolve('item:drop-box', s, box).action).toEqual({ kind: 'message', text: REMINDERS.checkPhone });
      expect(applyEvent(s, { type: 'take-relic' })).toEqual([]);
      expect(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 })).toEqual([]);
      applyEvent(s, { type: 'read-sms' });
      expect(resolve('item:drop-box', s, box).prompt).toBe('E  Take the delivery');
    }
  });

  it("notices the clown's ghost among the graves once, only after the text", () => {
    const before = at(step('receive-sms', 3));
    expect(applyEvent(before, { type: 'spotted', who: 'clown-roaming' })).toEqual([]);
    const s = at(step('spotted'));
    expect(says(applyEvent(s, { type: 'spotted', who: 'clown-roaming' }))).toEqual(["Is that the clown out there? Guess he's in no rush to move on."]);
    expect(applyEvent(s, { type: 'spotted', who: 'clown-roaming' })).toEqual([]);
  });

  it('has its own lines', () => {
    const s = at(step('approach-drop-box', 3));
    expect(says(applyEvent(s, { type: 'approach-drop-box', x: 3.7, y: 6, level: 0 }))).toEqual(['Is that... a bell ringing?']);
    expect(says(applyEvent(s, { type: 'take-relic' }))).toEqual(["An old hand bell. It won't stop shaking."]);
    expect(s.held_prop_id).toBe('bell');
    expect(s.objective_id).toBe('D2-09');
    applyEvent(s, { type: 'relic-pickup-thought-done' });
    expect(task(s)).toBe('Put the hand bell on the ritual table');
    expect(says(applyEvent(s, { type: 'relic-near-church', x: 0, y: 40, level: 0 }))).toEqual(['Alright, alright! I hear you.']);
  });
});

describe('the hand bell on the table, and the refill (D2-09)', () => {
  it('wants the bucket refilled before anything else', () => {
    const s = at(step('place-relic', 3));
    const fx = applyEvent(s, { type: 'place-relic' });
    expect(says(fx)).toEqual(['Better fill that bucket before I start. Just in case.']);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.bellRefill), event: { type: 'bell-refill-wanted' } });
    expect(task(s)).toBe('');
    expect(resolve('item:bell', s, inCircle).prompt).toBe('');
    applyEvent(s, { type: 'bell-refill-wanted' });
    expect(task(s)).toBe('Fill the bucket at the fountain in the west garden');
    // No blessing yet: the water isn't there.
    expect(resolve('item:bell', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.holyWaterFirst });
    expect(flashes(applyEvent(s, { type: 'bless-relic' }))).toEqual([REMINDERS.holyWaterFirst]);
    // The empty bucket by the table can be picked up again (refills never strand).
    expect(s.bucket).toBe('chapel');
    expect(s.bucket_filled).toBe(false);
    expect(resolve('item:bucket', s, inCircle).prompt).toBe('E  Pick up the bucket');
    applyEvent(s, { type: 'pickup-bucket' });
    applyEvent(s, { type: 'fill-bucket' });
    expect(task(s)).toBe('Put the bucket down by the ritual table');
    applyEvent(s, { type: 'place-bucket' });
    expect(s.objective_id).toBe('D2-10');
    expect(task(s)).toBe('Stand in the holy circle and bless the hand bell');
  });

  it("shows the concerned ghost on the refill trip, and it's gone when looked for again", () => {
    const early = at(step('bell-refill-wanted'));
    expect(worriedShown(early)).toBe(false);
    expect(applyEvent(early, { type: 'spotted', who: 'worried' })).toEqual([]);
    const s = at(step('spotted', 2));
    expect(worriedShown(s)).toBe(true);
    // It can't vanish before it's been seen.
    expect(applyEvent(s, { type: 'worried-vanished' })).toEqual([]);
    expect(applyEvent(s, { type: 'spotted', who: 'worried-gone' })).toEqual([]);
    // Seen without a word (designer, 2026-12-01).
    expect(applyEvent(s, { type: 'spotted', who: 'worried' })).toEqual([]);
    expect(s.flags.has('worried-spotted')).toBe(true);
    applyEvent(s, { type: 'worried-vanished' });
    expect(worriedShown(s)).toBe(false);
    expect(says(applyEvent(s, { type: 'spotted', who: 'worried-gone' }))).toEqual(["...Where'd it go?"]);
    expect(applyEvent(s, { type: 'spotted', who: 'worried-gone' })).toEqual([]);
  });

  it("doesn't need the worried ghost seen to carry on", () => {
    const s = at(step('place-bucket', 2));
    s.flags.delete('worried-spotted');
    s.flags.delete('worried-vanished');
    s.flags.delete('worried-looked-back');
    applyEvent(s, { type: 'place-bucket' });
    expect(s.objective_id).toBe('D2-10');
  });
});

describe('the cross and holy water fail on the hand bell (D2-10)', () => {
  it('rattles hard at the cross, then wants holy water', () => {
    const s = at(step('bless-relic', 5));
    expect(resolve('item:ritual-table', s, inCircle).hold).toEqual({ type: 'bless-relic' });
    expect(resolve('item:bell', s, { x: 9, y: 53, level: 0 }).action).toEqual({ kind: 'message', text: REMINDERS.standInCircle });
    const fx = applyEvent(s, { type: 'bless-relic' });
    expect(fx).toContainEqual({ kind: 'rattle', ...RATTLE_VIOLENT });
    expect(fx).toContainEqual({ kind: 'sfx', id: 'bell-rattle' });
    expect(fx).toContainEqual({ kind: 'sfx', id: 'angry-squeak' });
    expect(fx).toContainEqual({ kind: 'after', seconds: RATTLE_VIOLENT.seconds + THOUGHT_BEAT, event: { type: 'bell-settled' } });
    expect(fx.some((f) => f.kind === 'purify')).toBe(false);
    // Harder than the music box's first rattle.
    expect(RATTLE_VIOLENT.strength).toBeGreaterThan(1);
    expect(task(s)).toBe('');
    expect(resolve('item:bell', s, inCircle).prompt).toBe('');
    expect(says(applyEvent(s, { type: 'bell-settled' }))).toEqual(["I don't think it liked that."]);
    applyEvent(s, { type: 'bell-water-wanted' });
    expect(task(s)).toBe('Dip the holy-water rod in the bucket');
    expect(resolve('item:bell', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.rodDry });
    expect(resolve('item:bucket', s, inCircle).prompt).toBe('E  Dip the rod in the holy water');
    expect(applyEvent(s, { type: 'wet-rod' })).toEqual([{ kind: 'dip' }]);
    expect(task(s)).toBe('Stand in the holy circle and splash the hand bell with holy water');
  });

  it('rattles harder at the splash, leaves water for later, then the idea', () => {
    const s = at(step('splash-relic', 2));
    expect(resolve('item:bell', s, inCircle).hold).toEqual({ type: 'splash-relic' });
    const fx = applyEvent(s, { type: 'splash-relic' });
    expect(fx).toContainEqual({ kind: 'splash' });
    expect(fx).toContainEqual({ kind: 'rattle', ...RATTLE_VIOLENT });
    expect(fx).toContainEqual({ kind: 'sfx', id: 'angry-squeak' });
    // The rod is used, but the bucket keeps its water for the last blessing.
    expect(s.bucket_filled).toBe(true);
    expect(s.flags.has('rod-wet')).toBe(false);
    expect(s.flags.has('relic-blessed')).toBe(false);
    expect(task(s)).toBe('');
    const worse = applyEvent(s, { type: 'bell-splash-settled' });
    expect(says(worse)).toEqual(["It's only getting angrier!"]);
    expect(worse).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.bellSplash), event: { type: 'bell-idea' } });
    expect(says(applyEvent(s, { type: 'bell-idea' }))).toEqual(['Maybe it needs everything at once. The Bible, the cross, and the water.']);
    applyEvent(s, { type: 'two-handed-wanted' });
    expect(s.objective_id).toBe('D2-11');
    expect(task(s)).toBe('Move the Bible stand into the holy circle');
  });
});

describe('the two-handed blessing (D2-11)', () => {
  it('moves the Bible stand into the circle, then the rod is dipped again', () => {
    const s = at(step('move-bible-stand'));
    expect(resolve('item:bell', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.standFirst });
    expect(flashes(applyEvent(s, { type: 'bless-relic' }))).toEqual([REMINDERS.standFirst]);
    // Not dipped before the stand is in place.
    expect(resolve('item:bucket', s, inCircle).prompt).toBe('');
    expect(resolve('item:bible', s, inCircle).prompt).toBe('E  Move the Bible stand into the holy circle');
    const home = bibleStandRect(s);
    applyEvent(s, { type: 'move-bible-stand' });
    const moved = bibleStandRect(s);
    expect((moved.x1 + moved.x2) / 2).toBeCloseTo(STAND_IN_CIRCLE.x);
    expect((moved.y1 + moved.y2) / 2).toBeCloseTo(STAND_IN_CIRCLE.y);
    expect(moved.x2 - moved.x1).toBeCloseTo(home.x2 - home.x1);
    // Inside the circle's east side, in front of the player in the middle,
    // and leaving room to stand there.
    expect(moved.x1).toBeGreaterThan(HOLY_CIRCLE.x + 0.3);
    expect(moved.x2).toBeLessThanOrEqual(HOLY_CIRCLE.x + HOLY_CIRCLE.r);
    // Nothing more to do with the Bible.
    expect(resolve('item:bible', s, inCircle).prompt).toBe('');
    expect(task(s)).toBe('Dip the holy-water rod in the bucket');
    expect(resolve('item:bell', s, inCircle).action).toEqual({ kind: 'message', text: REMINDERS.rodDry });
    expect(resolve('item:bucket', s, inCircle).prompt).toBe('E  Dip the rod in the holy water');
    expect(applyEvent(s, { type: 'wet-rod' })).toEqual([{ kind: 'dip' }]);
    expect(task(s)).toBe('Stand in the holy circle and bless the hand bell with the cross and rod together');
    expect(resolve('item:bell', s, inCircle).prompt).toBe('Hold click  Bless the hand bell with the cross and rod');
  });

  it("doesn't move the stand before it's wanted", () => {
    const s = at(step('two-handed-wanted'));
    expect(resolve('item:bible', s, inCircle).prompt).toBe('');
    expect(applyEvent(s, { type: 'move-bible-stand' })).toEqual([]);
  });

  it('strikes four times with "The power of Christ compels you!", then the angry ghost', () => {
    const s = at(step('bless-relic', 6));
    const fx = applyEvent(s, { type: 'bless-relic' });
    expect(fx).toContainEqual({ kind: 'exorcise' });
    expect(fx).toContainEqual({ kind: 'sfx', id: 'exorcise' });
    expect(says(fx)).toEqual(['The power of Christ compels you!']);
    expect(fx).toContainEqual({ kind: 'after', seconds: EXORCISE_SECONDS + THOUGHT_BEAT, event: { type: 'bell-exorcised' } });
    expect(fx.some((f) => f.kind === 'purify')).toBe(false);
    expect(EXORCISE_SECONDS).toBeCloseTo(4 * 0.7);
    // The strikes use the water and the rod.
    expect(s.bucket_filled).toBe(false);
    expect(s.flags.has('rod-wet')).toBe(false);
    expect(task(s)).toBe('');
    expect(resolve('item:bell', s, inCircle).prompt).toBe('');
    expect(applyEvent(s, { type: 'bless-relic' })).toEqual([]);
    expect(applyEvent(s, { type: 'bell-exorcised' })).toEqual([{ kind: 'purify', relic: 'bell' }]);
    expect(task(s)).toBe('');
    expect(says(applyEvent(s, { type: 'relic-ghost-gone' }))).toEqual(["Well, somebody's in a mood."]);
    applyEvent(s, { type: 'relic-thought-done' });
    expect(task(s)).toBe('Pick up the hand bell');
    expect(resolve('item:bell', s, inCircle).prompt).toBe('E  Pick up the hand bell');
    applyEvent(s, { type: 'pickup-relic' });
    expect(task(s)).toBe('Put the hand bell on the table outside the chapel');
    expect(resolve('item:relic-table', s, inCircle).prompt).toBe('E  Put the hand bell on the table');
  });
});

describe('the end of the shift (D2-12)', () => {
  it('falls dusk once the hand bell is away, then the gate', () => {
    const s = at(step('store-relic', 3));
    const fx = applyEvent(s, { type: 'store-relic' });
    expect(says(fx)).toEqual(["That one really took it out of me. I'm ready to call it a day."]);
    expect(fx).toContainEqual({ kind: 'after', seconds: afterThought(THOUGHTS.shiftDone), event: { type: 'head-home' } });
    expect(s.environment_preset).toBe('D1_EVENING');
    expect(s.relics_stored).toEqual(['teacup', 'clown', 'bell']);
    expect(task(s)).toBe('');
    // No second thought on Day 2: straight to the gate.
    expect(applyEvent(s, { type: 'head-home' })).toEqual([]);
    expect(task(s)).toBe('Head back to the front gate');
    expect(ghostsChasing(s)).toBe(true);
    expect(clownRoaming(s)).toBe(false);
  });

  it('sees the two ghosts chasing, once', () => {
    const s = at(step('spotted', 4));
    expect(says(applyEvent(s, { type: 'spotted', who: 'chase' }))).toEqual(['Ha. Looks like those two are getting along.']);
    expect(applyEvent(s, { type: 'spotted', who: 'chase' })).toEqual([]);
  });

  it('ends at the gate with the fade to Day 3, and the tree ghost stays on Day 1', () => {
    const s = at(step('reach-gate'));
    expect(applyEvent(s, { type: 'near-peek', x: 12, y: 18, level: 0 })).toEqual([]);
    expect(applyEvent(s, { type: 'reach-gate', x: 0, y: 30, level: 0 })).toEqual([]);
    const fx = applyEvent(s, { type: 'reach-gate', x: 0, y: 2, level: 0 });
    expect(fx).toEqual([{ kind: 'objective', id: 'D2-12' }, { kind: 'end-day' }]);
  });

  it('resets cleanly for the next day', () => {
    const s = at(DAY2_PLAYTHROUGH.length);
    const next = startDay(s, 3);
    expect(next.flags.size).toBe(0);
    expect(next.relic).toBe('removed');
    // Day 3: the bucket is left by the ritual table, empty (D3-01 note).
    expect(next.bucket).toBe('chapel');
    expect(next.bucket_filled).toBe(false);
    expect(next.chalice).toBe('basement');
    expect(next.environment_preset).toBe('BASE_DAY');
    expect(bibleStandRect(next)).toEqual(PROPS.find((p) => p.id === 'bible-stand')!.rect);
  });
});

describe('the gate keypad on Day 2 (2026-11-27)', () => {
  it("doesn't point to the messages on a wrong code: the code came as a thought", () => {
    const s = day2Start();
    expect(applyEvent(s, { type: 'keypad-submit', code: '0000' })).toEqual([
      { kind: 'sfx', id: 'error' },
      { kind: 'flash', text: 'Wrong code.' },
    ]);
    // Day 1 still does: the code came by text.
    const d1 = createInitialState();
    expect(flashes(applyEvent(d1, { type: 'keypad-submit', code: '0000' }))).toEqual(['Wrong code. I should check my messages.']);
  });
});

