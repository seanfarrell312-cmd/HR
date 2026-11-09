import {
  afterThought,
  CHURCH_APPROACH,
  DELIVERY_DELAY,
  DROP_BOX_APPROACH,
  GATE_CODE,
  GATE_RETURN,
  HEAD_HOME_DELAY,
  RATTLE_SECONDS,
  RELIC_ANNOY,
  REMINDERS,
  SMS,
  THOUGHT_BEAT,
  THOUGHTS,
  TREE_PEEK,
  WRONG_CODE,
} from '../data/story';
import type { GameState, QuestItem } from '../state/store';
import { advanceObjectives } from './objectives';
import { tableReady } from './table';

export { siteReady, tableReady } from './table';

// The single place story state changes. Every event is validated against the
// current state and is a no-op when it has already happened, so key spam,
// repeated holds or re-entering a zone can never fire anything twice.

export type StoryEvent =
  | { type: 'receive-sms'; id: string }
  /** The phone has been put away: everything in it counts as read. */
  | { type: 'read-sms' }
  | { type: 'keypad-submit'; code: string }
  /** The player's position; fires the church-approach thought once, in range. */
  | { type: 'approach-church'; x: number; y: number; level: number }
  | { type: 'read-note' }
  | { type: 'take'; item: QuestItem }
  | { type: 'light-candle'; index: number }
  | { type: 'pickup-chalice' }
  /** Set whatever the player carries of the chalice and crucifix out on the ritual table. */
  | { type: 'stage-table' }
  | { type: 'bless-clock' }
  | { type: 'pickup-clock' }
  | { type: 'place-clock' }
  /** The player's position; the drop-box thought once the music box is in it. */
  | { type: 'approach-drop-box'; x: number; y: number; level: number }
  /** Take the delivered relic out of the drop box. */
  | { type: 'take-relic' }
  /** The player's position; the "annoying" thought carrying the music box up to the church. */
  | { type: 'relic-near-church'; x: number; y: number; level: number }
  | { type: 'place-relic' }
  /** First hold rattles the relic; after scripture, the second releases it. */
  | { type: 'bless-relic' }
  /** Timed: the rattle has died away. */
  | { type: 'relic-settled' }
  /** Timed, after the "stubborn" thought: the Good Book thought. */
  | { type: 'good-book' }
  /** Timed, after the Good Book thought: the Bible pickup objective shows. */
  | { type: 'bible-prompt' }
  /** Holding on the music box with the Bible in hand: open the scripture. */
  | { type: 'begin-scripture' }
  /** The scripture has been read and put away. */
  | { type: 'read-scripture' }
  /** Put the Bible back on its stand once the music box is cleansed. */
  | { type: 'return-bible' }
  /** The music box's ghost has risen and gone (from the view's timing). */
  | { type: 'relic-ghost-gone' }
  /** Timed: a beat after the wink thought, the music box's next objective shows. */
  | { type: 'relic-thought-done' }
  | { type: 'pickup-relic' }
  /** Put the cleansed relic on the table outside the chapel. */
  | { type: 'store-relic' }
  /** Timed: the thought a few seconds after the relic is put away. */
  | { type: 'head-home' }
  /** Timed, after the head-home thought: the gate objective shows. */
  | { type: 'gate-prompt' }
  /** The player's position; completes the walk out once at the gate. */
  | { type: 'reach-gate'; x: number; y: number; level: number }
  /** The player's position; the tree ghost ducks away once they come close. */
  | { type: 'near-peek'; x: number; y: number; level: number }
  | { type: 'door-opened'; id: string };

export type SfxId =
  | 'buzz'
  | 'beep'
  | 'error'
  | 'unlock'
  | 'pickup'
  | 'strike'
  | 'release'
  | 'place'
  | 'paper'
  | 'wind-down'
  | 'box-wind-down'
  | 'sparkle'
  | 'rattle'
  | 'giggle';

export type PurifiedRelic = 'clock' | 'music-box';

export type Effect =
  | { kind: 'sfx'; id: SfxId }
  | { kind: 'say'; text: string }
  | { kind: 'flash'; text: string }
  | { kind: 'open-door'; id: string }
  | { kind: 'sms'; id: string }
  /** A blessed relic settles, sparkles, then releases its ghost (timed by the view). */
  | { kind: 'purify'; relic: PurifiedRelic }
  /** The relic fights the first blessing: a hard rattle that dies down. */
  | { kind: 'rattle' }
  /** Show the scripture panel (read from the Bible in hand). */
  | { kind: 'open-scripture' }
  | { kind: 'objective'; id: string }
  /** Apply `event` after `seconds` of unpaused play (the game keeps the timer). */
  | { kind: 'after'; seconds: number; event: StoryEvent }
  /** The shift is over: fade out and start the next day. */
  | { kind: 'end-day' };

const flash = (text: string): Effect[] => [{ kind: 'flash', text }];

export function applyEvent(s: GameState, e: StoryEvent): Effect[] {
  const out: Effect[] = [];
  switch (e.type) {
    case 'receive-sms':
      if (!SMS[e.id] || s.inbox.includes(e.id)) return [];
      s.inbox.push(e.id);
      // The delivery text means the relic is waiting in the drop box.
      if (e.id === 'delivery1' && s.relic === 'none') s.relic = 'drop-box';
      out.push({ kind: 'sfx', id: 'buzz' }, { kind: 'sms', id: e.id });
      break;

    case 'read-sms': {
      const unread = s.inbox.filter((id) => !s.sms_read.has(id));
      if (unread.length === 0) return [];
      for (const id of unread) s.sms_read.add(id);
      break;
    }

    case 'keypad-submit':
      if (s.flags.has('gate-unlocked')) return [];
      if (e.code !== GATE_CODE) {
        out.push({ kind: 'sfx', id: 'error' }, { kind: 'flash', text: WRONG_CODE });
        return out;
      }
      s.flags.add('gate-unlocked');
      out.push({ kind: 'sfx', id: 'unlock' }, { kind: 'open-door', id: 'gate' }, { kind: 'say', text: THOUGHTS.gateOpen });
      break;

    case 'approach-church':
      if (s.flags.has('church-approached') || !s.flags.has('gate-unlocked')) return [];
      if (e.level !== 0 || Math.hypot(e.x - CHURCH_APPROACH.x, e.y - CHURCH_APPROACH.y) > CHURCH_APPROACH.r) return [];
      s.flags.add('church-approached');
      out.push({ kind: 'say', text: THOUGHTS.churchApproach });
      break;

    case 'read-note':
      if (s.flags.has('note-read')) return [];
      s.flags.add('note-read');
      out.push({ kind: 'sfx', id: 'paper' });
      break;

    case 'take':
      if (s.inventory.has(e.item)) return [];
      // A staged crucifix is on the ritual table, not back on the altar.
      if (e.item === 'crucifix' && s.flags.has('crucifix-staged')) return [];
      if (e.item === 'chapel-key' && !s.flags.has('note-read')) {
        return [{ kind: 'say', text: THOUGHTS.keyBeforeNote }];
      }
      // The altar pieces stay put until the objective asks for them.
      if (e.item === 'crucifix' && !altarOpen(s)) return [{ kind: 'say', text: THOUGHTS.crucifixEarly }];
      // The Bible comes off its stand once the music box needs scripture.
      if (e.item === 'bible' && (!s.flags.has('bible-prompted') || s.flags.has('scripture-read'))) return [];
      s.inventory.add(e.item);
      out.push({ kind: 'sfx', id: 'pickup' });
      break;

    case 'pickup-chalice':
      if (s.chalice !== 'altar') return [];
      if (!altarOpen(s)) return [{ kind: 'say', text: THOUGHTS.chaliceEarly }];
      if (s.held_prop_id) return flash(REMINDERS.handsFull);
      s.chalice = 'held';
      s.held_prop_id = 'chalice';
      out.push({ kind: 'sfx', id: 'pickup' });
      break;

    case 'stage-table': {
      // Preparing the table (D1-05): the chalice and the standing crucifix
      // either side of the relic socket. Either can go down first.
      const chalice = s.chalice === 'held';
      const crucifix = s.inventory.has('crucifix') && !s.flags.has('crucifix-staged');
      if (!chalice && !crucifix) return [];
      if (chalice) {
        s.chalice = 'ritual-table';
        s.held_prop_id = null;
      }
      if (crucifix) {
        s.inventory.delete('crucifix');
        s.flags.add('crucifix-staged');
      }
      out.push({ kind: 'sfx', id: 'place' });
      break;
    }

    case 'light-candle':
      if (e.index < 0 || e.index > 3 || s.candles_lit.has(e.index)) return [];
      if (!s.inventory.has('matches')) return flash('I need the matches from the shelf.');
      s.candles_lit.add(e.index);
      out.push({ kind: 'sfx', id: 'strike' });
      break;

    case 'bless-clock': {
      if (s.flags.has('clock-blessed')) return [];
      const why = blessBlocker(s);
      if (why) return flash(why);
      s.flags.add('clock-blessed');
      s.fired_scares.push('d1-clock-ghost');
      // The release sound and the ghost thought are timed by the view.
      out.push({ kind: 'purify', relic: 'clock' });
      break;
    }

    case 'pickup-clock':
      if (s.clock !== 'ritual-table' || !s.flags.has('clock-blessed') || s.held_prop_id) return [];
      s.clock = 'held';
      s.held_prop_id = 'clock';
      out.push({ kind: 'sfx', id: 'pickup' });
      break;

    case 'place-clock':
      if (s.clock !== 'held') return [];
      s.clock = 'office-desk';
      s.held_prop_id = null;
      out.push({ kind: 'sfx', id: 'place' }, { kind: 'say', text: THOUGHTS.clockPlaced });
      break;

    case 'approach-drop-box':
      if (s.relic !== 'drop-box' || s.flags.has('drop-box-approached')) return [];
      if (!near(e, DROP_BOX_APPROACH)) return [];
      s.flags.add('drop-box-approached');
      out.push({ kind: 'say', text: THOUGHTS.dropBox });
      break;

    case 'take-relic':
      if (s.relic !== 'drop-box') return [];
      if (s.held_prop_id) return flash(REMINDERS.handsFull);
      s.relic = 'held';
      s.held_prop_id = 'music-box';
      s.flags.add('drop-box-approached');
      out.push({ kind: 'sfx', id: 'pickup' }, { kind: 'say', text: THOUGHTS.relicPickup });
      break;

    case 'relic-near-church':
      if (s.relic !== 'held' || s.flags.has('relic-rattled') || s.flags.has('relic-annoyed')) return [];
      if (!near(e, RELIC_ANNOY)) return [];
      s.flags.add('relic-annoyed');
      out.push({ kind: 'say', text: THOUGHTS.relicAnnoying });
      break;

    case 'place-relic':
      if (s.relic !== 'held') return [];
      if (!tableReady(s)) return flash(REMINDERS.tableNotReady);
      s.relic = 'ritual-table';
      s.held_prop_id = null;
      out.push({ kind: 'sfx', id: 'place' });
      break;

    case 'bless-relic': {
      if (s.relic !== 'ritual-table' || s.flags.has('relic-blessed')) return [];
      if (!tableReady(s)) return flash(REMINDERS.tableNotReady);
      if (!s.inventory.has('cross')) return flash(REMINDERS.needCross);
      if (!s.flags.has('relic-rattled')) {
        // Cross: the relic fights it, rattles and goes still; the thought
        // waits until it has.
        s.flags.add('relic-rattled');
        out.push(
          { kind: 'rattle' },
          { kind: 'sfx', id: 'rattle' },
          { kind: 'after', seconds: RATTLE_SECONDS + THOUGHT_BEAT, event: { type: 'relic-settled' } },
        );
        break;
      }
      if (!s.flags.has('relic-settled') || !s.flags.has('scripture-read')) return flash(REMINDERS.scriptureFirst);
      // Scripture, then cross again: the spirit is released.
      s.flags.add('relic-blessed');
      s.fired_scares.push('d1-relic-ghost');
      out.push({ kind: 'purify', relic: 'music-box' });
      break;
    }

    case 'relic-settled':
      if (!s.flags.has('relic-rattled') || s.flags.has('relic-settled')) return [];
      s.flags.add('relic-settled');
      out.push(
        { kind: 'say', text: THOUGHTS.relicSettled },
        { kind: 'after', seconds: afterThought(THOUGHTS.relicSettled), event: { type: 'good-book' } },
      );
      break;

    case 'good-book':
      if (!s.flags.has('relic-settled') || s.flags.has('good-book-said')) return [];
      s.flags.add('good-book-said');
      out.push(
        { kind: 'say', text: THOUGHTS.goodBook },
        { kind: 'after', seconds: afterThought(THOUGHTS.goodBook), event: { type: 'bible-prompt' } },
      );
      break;

    case 'bible-prompt':
      if (!s.flags.has('good-book-said') || s.flags.has('bible-prompted')) return [];
      s.flags.add('bible-prompted');
      break;

    case 'begin-scripture':
      if (s.relic !== 'ritual-table' || !s.flags.has('bible-prompted') || s.flags.has('scripture-read')) return [];
      if (!s.inventory.has('bible')) return flash(REMINDERS.bibleFirst);
      s.flags.add('scripture-opened');
      out.push({ kind: 'sfx', id: 'paper' }, { kind: 'open-scripture' });
      break;

    case 'read-scripture':
      // Counts once the scripture has been opened and then put away.
      if (!s.flags.has('scripture-opened') || s.flags.has('scripture-read')) return [];
      s.flags.add('scripture-read');
      break;

    case 'return-bible':
      if (!s.inventory.has('bible') || !s.flags.has('relic-blessed')) return [];
      s.inventory.delete('bible');
      out.push({ kind: 'sfx', id: 'place' });
      break;

    case 'relic-ghost-gone':
      if (!s.flags.has('relic-blessed') || s.flags.has('relic-ghost-gone')) return [];
      s.flags.add('relic-ghost-gone');
      out.push(
        { kind: 'say', text: THOUGHTS.relicGhost },
        { kind: 'after', seconds: afterThought(THOUGHTS.relicGhost), event: { type: 'relic-thought-done' } },
      );
      break;

    case 'relic-thought-done':
      if (!s.flags.has('relic-ghost-gone') || s.flags.has('relic-thought-done')) return [];
      s.flags.add('relic-thought-done');
      break;

    case 'pickup-relic':
      if (s.relic !== 'ritual-table' || !s.flags.has('relic-blessed')) return [];
      if (s.held_prop_id) return flash(REMINDERS.handsFull);
      s.relic = 'held';
      s.held_prop_id = 'music-box';
      out.push({ kind: 'sfx', id: 'pickup' });
      break;

    case 'store-relic':
      if (s.relic !== 'held' || !s.flags.has('relic-blessed')) return [];
      s.relic = 'relic-table';
      s.held_prop_id = null;
      // Day 1's second relic is done: dusk falls (doc 7.1 D1_EVENING).
      s.environment_preset = 'D1_EVENING';
      out.push(
        { kind: 'sfx', id: 'place' },
        { kind: 'say', text: THOUGHTS.late },
        { kind: 'after', seconds: HEAD_HOME_DELAY, event: { type: 'head-home' } },
      );
      break;

    case 'head-home':
      if (s.relic !== 'relic-table' || s.flags.has('heading-home')) return [];
      // The tree ghost starts peeking now; the gate objective waits for the thought.
      s.flags.add('heading-home');
      out.push(
        { kind: 'say', text: THOUGHTS.headHome },
        { kind: 'after', seconds: afterThought(THOUGHTS.headHome), event: { type: 'gate-prompt' } },
      );
      break;

    case 'gate-prompt':
      if (!s.flags.has('heading-home') || s.flags.has('gate-prompted')) return [];
      s.flags.add('gate-prompted');
      break;

    case 'reach-gate': {
      if (!s.flags.has('heading-home') || s.flags.has('returned-to-gate')) return [];
      const r = GATE_RETURN;
      if (e.level !== 0 || e.x < r.x1 || e.x > r.x2 || e.y < r.y1 || e.y > r.y2) return [];
      s.flags.add('returned-to-gate');
      break;
    }

    case 'near-peek':
      if (s.fired_scares.includes('d1-tree-peek') || !s.flags.has('heading-home')) return [];
      if (e.level !== 0 || Math.hypot(e.x - TREE_PEEK.x, e.y - TREE_PEEK.y) > TREE_PEEK.trigger) return [];
      s.fired_scares.push('d1-tree-peek');
      out.push({ kind: 'sfx', id: 'giggle' });
      break;

    case 'door-opened':
      // Only matters for objectives; the door itself is already open.
      if (e.id === 'chapel') s.flags.add('chapel-opened');
      break;
  }

  for (const id of advanceObjectives(s)) {
    out.push({ kind: 'objective', id });
    // The clock is on the desk: the first delivery is on its way (D1-08).
    if (id === 'D1-07') out.push({ kind: 'after', seconds: DELIVERY_DELAY, event: { type: 'receive-sms', id: 'delivery1' } });
    // Out through the gate: the shift is over.
    if (id === 'D1-10') out.push({ kind: 'end-day' });
  }
  return out;
}

/** Why the clock can't be blessed yet, or null when it can (player position aside). */
export function blessBlocker(s: GameState): string | null {
  if (s.clock !== 'ritual-table') return 'The clock needs to be on the ritual table.';
  if (s.candles_lit.size < 4) return 'The candles need lighting first.';
  if (!tableReady(s)) return REMINDERS.tableNotReady;
  if (!s.inventory.has('cross')) return REMINDERS.needCross;
  return null;
}

/**
 * The chalice and crucifix can come off the altar once the objective asks for
 * them (D1-05), not before (S2 playtest, 2026-11-09). Later days set their
 * own rules in S3.
 */
export function altarOpen(s: GameState): boolean {
  return s.objective_id === 'D1-05';
}

const near = (p: { x: number; y: number; level: number }, c: { x: number; y: number; r: number }): boolean =>
  p.level === 0 && Math.hypot(p.x - c.x, p.y - c.y) <= c.r;
