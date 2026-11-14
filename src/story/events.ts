import {
  afterThought,
  ALTAR_APPROACH,
  CHURCH_APPROACH,
  COOKING_BEAT,
  CROSS_PAUSE,
  D2_DELIVERY_DELAY,
  DELIVERIES,
  DELIVERY_DELAY,
  DROP_BOX_APPROACH,
  GATE_CODE,
  GATE_RETURN,
  HEAD_HOME_DELAY,
  RATTLE_AGAIN,
  RATTLE_FIRST,
  RATTLE_SECONDS,
  PRANK_SECONDS,
  RELIC_ANNOY,
  RELIC_LINES,
  REMINDERS,
  SMS,
  THOUGHT_BEAT,
  THOUGHTS,
  TREE_PEEK,
  WRONG_CODE,
} from '../data/story';
import { RELIC_FLAGS, type GameState, type QuestItem, type RelicKind } from '../state/store';
import { advanceObjectives } from './objectives';
import { tableReady } from './table';

export { siteReady, tableReady } from './table';

// The single place story state changes. Every event is validated against the
// current state and is a no-op when it has already happened, so key spam,
// repeated holds or re-entering a zone can never fire anything twice.

export type StoryEvent =
  | { type: 'receive-sms'; id: string }
  /** A few seconds into a shift with no gate-code text (Day 2 on): the first objective shows. */
  | { type: 'arrived' }
  /** The player's position; on Day 2 the chalice is missing from the altar. */
  | { type: 'near-altar'; x: number; y: number; level: number }
  /** Timed, after the missing-chalice thought: the search objective shows. */
  | { type: 'chalice-missing-done' }
  /** Timed: the prankster ghost has floated off; its thought plays. */
  | { type: 'prank-done' }
  /** Timed, after that thought: the next objective shows. */
  | { type: 'prank-thought-done' }
  /** The phone has been put away: everything in it counts as read. */
  | { type: 'read-sms' }
  | { type: 'keypad-submit'; code: string }
  /** The player's position; fires the church-approach thought once, in range. */
  | { type: 'approach-church'; x: number; y: number; level: number }
  | { type: 'read-note' }
  /** The note has been put down: the key objective follows. */
  | { type: 'close-note' }
  | { type: 'take'; item: QuestItem }
  | { type: 'light-candle'; index: number }
  /** Timed, after the chapel-door thought: the matches objective shows. */
  | { type: 'chapel-thought-done' }
  /** Timed, after the candles thought: the altar pieces are asked for. */
  | { type: 'candles-thought-done' }
  /** Timed, a beat after the table is set: "Now we're cooking." */
  | { type: 'now-cooking' }
  /** Timed, a pause after that thought: the cross objective shows. */
  | { type: 'cross-prompt' }
  | { type: 'pickup-chalice' }
  /** Set whatever the player carries of the chalice and crucifix out on the ritual table. */
  | { type: 'stage-table' }
  | { type: 'bless-clock' }
  /** The clock's ghost has risen and gone (from the view's timing). */
  | { type: 'clock-ghost-gone' }
  /** Timed, after the clock ghost thought: the desk objective shows. */
  | { type: 'clock-thought-done' }
  | { type: 'pickup-clock' }
  | { type: 'place-clock' }
  /** The player's position; the drop-box thought once the music box is in it. */
  | { type: 'approach-drop-box'; x: number; y: number; level: number }
  /** Take the delivered relic out of the drop box. */
  | { type: 'take-relic' }
  /** Timed, after the pickup thought: the ritual table objective shows. */
  | { type: 'relic-pickup-thought-done' }
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
  /** Timed: the shudder after the scripture has stopped; the second blessing can go ahead. */
  | { type: 'relic-weakened' }
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
  | 'giggle'
  | 'raspberry'
  | 'clink'
  | 'cup-wind-down';

export type PurifiedRelic = 'clock' | RelicKind;

export type Effect =
  | { kind: 'sfx'; id: SfxId }
  | { kind: 'say'; text: string }
  | { kind: 'flash'; text: string }
  | { kind: 'open-door'; id: string }
  | { kind: 'sms'; id: string }
  /** A blessed relic settles, sparkles, then releases its ghost (timed by the view). */
  | { kind: 'purify'; relic: PurifiedRelic }
  /** The relic fights back: a rattle of this strength (1 = the first, hardest) that dies down. */
  | { kind: 'rattle'; seconds: number; strength: number }
  /** Show the scripture panel (read from the Bible in hand). */
  | { kind: 'open-scripture' }
  /** The prankster ghost pops up behind the garden bench and floats off (D2-02). */
  | { kind: 'prank' }
  | { kind: 'objective'; id: string }
  /** Apply `event` after `seconds` of unpaused play (the game keeps the timer). */
  | { kind: 'after'; seconds: number; event: StoryEvent }
  /** The shift is over: fade out and start the next day. */
  | { kind: 'end-day' };

const flash = (text: string): Effect[] => [{ kind: 'flash', text }];

export function applyEvent(s: GameState, e: StoryEvent): Effect[] {
  const out: Effect[] = [];
  switch (e.type) {
    case 'receive-sms': {
      if (!SMS[e.id] || s.inbox.includes(e.id)) return [];
      s.inbox.push(e.id);
      // A delivery text means its relic is waiting in the drop box. One at a
      // time: the last one has been put away (or none has come yet).
      const kind = DELIVERIES[e.id];
      if (kind && (s.relic === 'none' || s.relic === 'removed' || s.relic === 'relic-table')) {
        s.relic = 'drop-box';
        s.relic_kind = kind;
        for (const f of RELIC_FLAGS) s.flags.delete(f);
      }
      out.push({ kind: 'sfx', id: 'buzz' }, { kind: 'sms', id: e.id });
      break;
    }

    case 'arrived':
      if (s.flags.has('arrived')) return [];
      s.flags.add('arrived');
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
      // Day 1's first impression only.
      if (s.day_index !== 1 || s.flags.has('church-approached') || !s.flags.has('gate-unlocked')) return [];
      if (e.level !== 0 || Math.hypot(e.x - CHURCH_APPROACH.x, e.y - CHURCH_APPROACH.y) > CHURCH_APPROACH.r) return [];
      s.flags.add('church-approached');
      out.push({ kind: 'say', text: THOUGHTS.churchApproach });
      break;

    case 'read-note':
      if (s.flags.has('note-read')) return [];
      s.flags.add('note-read');
      out.push({ kind: 'sfx', id: 'paper' });
      break;

    case 'close-note':
      if (!s.flags.has('note-read') || s.flags.has('note-closed')) return [];
      s.flags.add('note-closed');
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
      // The Bible comes off its stand once the relic needs scripture.
      if (e.item === 'bible' && !bibleWanted(s)) return [];
      s.inventory.add(e.item);
      out.push({ kind: 'sfx', id: 'pickup' });
      break;

    case 'pickup-chalice':
      // Day 2: on the garden bench, where the prankster left it (D2-02).
      if (s.chalice === 'garden-bench') {
        if (s.held_prop_id) return flash(REMINDERS.handsFull);
        s.chalice = 'held';
        s.held_prop_id = 'chalice';
        out.push({ kind: 'sfx', id: 'pickup' });
        if (!s.fired_scares.includes('d2-prank')) {
          s.fired_scares.push('d2-prank');
          out.push({ kind: 'prank' }, { kind: 'sfx', id: 'raspberry' }, { kind: 'after', seconds: PRANK_SECONDS, event: { type: 'prank-done' } });
        }
        break;
      }
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
      // Both down on Day 1: the clock chimes harder, then the thought.
      if (tableReady(s) && s.day_index === 1) out.push({ kind: 'after', seconds: COOKING_BEAT, event: { type: 'now-cooking' } });
      // Day 2: the table is set, so the first delivery is on its way (D2-03).
      if (tableReady(s) && s.day_index === 2 && !s.inbox.includes('d2delivery1')) {
        out.push({ kind: 'after', seconds: D2_DELIVERY_DELAY, event: { type: 'receive-sms', id: 'd2delivery1' } });
      }
      break;
    }

    case 'near-altar':
      // Day 2: the chalice isn't where it should be (D2-02).
      if (s.day_index !== 2 || s.chalice !== 'garden-bench' || s.flags.has('chalice-missing')) return [];
      if (s.candles_lit.size < 4 || !near(e, ALTAR_APPROACH)) return [];
      s.flags.add('chalice-missing');
      out.push(
        { kind: 'say', text: THOUGHTS.chaliceMissing },
        { kind: 'after', seconds: afterThought(THOUGHTS.chaliceMissing), event: { type: 'chalice-missing-done' } },
      );
      break;

    case 'chalice-missing-done':
      if (!s.flags.has('chalice-missing') || s.flags.has('chalice-missing-thought-done')) return [];
      s.flags.add('chalice-missing-thought-done');
      break;

    case 'prank-done':
      if (!s.fired_scares.includes('d2-prank') || s.flags.has('prank-done')) return [];
      s.flags.add('prank-done');
      out.push(
        { kind: 'say', text: THOUGHTS.prank },
        { kind: 'after', seconds: afterThought(THOUGHTS.prank), event: { type: 'prank-thought-done' } },
      );
      break;

    case 'prank-thought-done':
      if (!s.flags.has('prank-done') || s.flags.has('prank-thought-done')) return [];
      s.flags.add('prank-thought-done');
      break;

    case 'light-candle':
      if (e.index < 0 || e.index > 3 || s.candles_lit.has(e.index)) return [];
      if (!s.inventory.has('matches')) return flash('I need the matches from the shelf.');
      s.candles_lit.add(e.index);
      out.push({ kind: 'sfx', id: 'strike' });
      // The last candle: a thought, then the altar pieces are asked for.
      if (s.candles_lit.size === 4 && s.day_index === 1) {
        out.push(
          { kind: 'say', text: THOUGHTS.candlesLit },
          { kind: 'after', seconds: afterThought(THOUGHTS.candlesLit), event: { type: 'candles-thought-done' } },
        );
      }
      break;

    case 'candles-thought-done':
      if (s.candles_lit.size < 4 || s.flags.has('candles-thought-done')) return [];
      s.flags.add('candles-thought-done');
      break;

    case 'chapel-thought-done':
      if (!s.flags.has('chapel-opened') || s.flags.has('chapel-thought-done')) return [];
      s.flags.add('chapel-thought-done');
      break;

    case 'now-cooking':
      if (!tableReady(s) || s.flags.has('cooking-said')) return [];
      s.flags.add('cooking-said');
      out.push(
        { kind: 'say', text: THOUGHTS.tableSet },
        { kind: 'after', seconds: afterThought(THOUGHTS.tableSet) + CROSS_PAUSE, event: { type: 'cross-prompt' } },
      );
      break;

    case 'cross-prompt':
      if (!s.flags.has('cooking-said') || s.flags.has('cross-prompted')) return [];
      s.flags.add('cross-prompted');
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

    case 'clock-ghost-gone':
      if (!s.flags.has('clock-blessed') || s.flags.has('clock-ghost-gone')) return [];
      s.flags.add('clock-ghost-gone');
      out.push(
        { kind: 'say', text: THOUGHTS.ghost },
        { kind: 'after', seconds: afterThought(THOUGHTS.ghost), event: { type: 'clock-thought-done' } },
      );
      break;

    case 'clock-thought-done':
      if (!s.flags.has('clock-ghost-gone') || s.flags.has('clock-thought-done')) return [];
      s.flags.add('clock-thought-done');
      break;

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
      out.push({ kind: 'say', text: RELIC_LINES[s.relic_kind].approach });
      break;

    case 'take-relic':
      if (s.relic !== 'drop-box') return [];
      if (s.held_prop_id) return flash(REMINDERS.handsFull);
      s.relic = 'held';
      s.held_prop_id = s.relic_kind;
      s.flags.add('drop-box-approached');
      {
        const line = RELIC_LINES[s.relic_kind].pickup;
        out.push(
          { kind: 'sfx', id: 'pickup' },
          { kind: 'say', text: line },
          { kind: 'after', seconds: afterThought(line), event: { type: 'relic-pickup-thought-done' } },
        );
      }
      break;

    case 'relic-pickup-thought-done':
      if (s.relic === 'drop-box' || s.relic === 'none' || s.flags.has('relic-pickup-thought-done')) return [];
      s.flags.add('relic-pickup-thought-done');
      break;

    case 'relic-near-church':
      // The music box's tune, on Day 1.
      if (s.relic_kind !== 'music-box') return [];
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
      // Day 2's first relic (D2-04): scripture, then the cross, and it's done.
      if (s.relic_kind !== 'music-box') {
        if (!s.flags.has('scripture-read')) return flash(REMINDERS.scriptureFirst);
        s.flags.add('relic-blessed');
        s.fired_scares.push(`d2-${s.relic_kind}-ghost`);
        out.push({ kind: 'purify', relic: s.relic_kind });
        break;
      }
      if (!s.flags.has('relic-rattled')) {
        // Cross: the relic fights it, rattles and goes still; the thought
        // waits until it has.
        s.flags.add('relic-rattled');
        out.push(
          { kind: 'rattle', ...RATTLE_FIRST },
          { kind: 'sfx', id: 'rattle' },
          { kind: 'after', seconds: RATTLE_SECONDS + THOUGHT_BEAT, event: { type: 'relic-settled' } },
        );
        break;
      }
      if (!s.flags.has('relic-settled') || !s.flags.has('scripture-read')) return flash(REMINDERS.scriptureFirst);
      // Still shuddering after the scripture.
      if (!s.flags.has('relic-weakened')) return [];
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
      if (!bibleWanted(s)) return [];
      if (!s.inventory.has('bible')) return flash(REMINDERS.bibleFirst);
      s.flags.add('scripture-opened');
      out.push({ kind: 'sfx', id: 'paper' }, { kind: 'open-scripture' });
      break;

    case 'read-scripture':
      // Counts once the scripture has been opened and then put away.
      if (!s.flags.has('scripture-opened') || s.flags.has('scripture-read')) return [];
      s.flags.add('scripture-read');
      // Day 2's first relic just goes quiet; the cross comes next.
      if (s.relic_kind !== 'music-box') break;
      // The spirit shudders again, weaker: the next blessing will hold.
      out.push(
        { kind: 'rattle', ...RATTLE_AGAIN },
        { kind: 'sfx', id: 'rattle' },
        { kind: 'after', seconds: RATTLE_AGAIN.seconds + THOUGHT_BEAT, event: { type: 'relic-weakened' } },
      );
      break;

    case 'relic-weakened':
      if (!s.flags.has('scripture-read') || s.flags.has('relic-weakened')) return [];
      s.flags.add('relic-weakened');
      break;

    case 'return-bible':
      if (!s.inventory.has('bible') || !s.flags.has('relic-blessed')) return [];
      s.inventory.delete('bible');
      out.push({ kind: 'sfx', id: 'place' });
      break;

    case 'relic-ghost-gone':
      if (!s.flags.has('relic-blessed') || s.flags.has('relic-ghost-gone')) return [];
      s.flags.add('relic-ghost-gone');
      {
        const line = RELIC_LINES[s.relic_kind].ghost;
        out.push({ kind: 'say', text: line }, { kind: 'after', seconds: afterThought(line), event: { type: 'relic-thought-done' } });
      }
      break;

    case 'relic-thought-done':
      if (!s.flags.has('relic-ghost-gone') || s.flags.has('relic-thought-done')) return [];
      s.flags.add('relic-thought-done');
      break;

    case 'pickup-relic':
      if (s.relic !== 'ritual-table' || !s.flags.has('relic-blessed')) return [];
      if (s.held_prop_id) return flash(REMINDERS.handsFull);
      // The Bible goes back on its stand before the music box comes away.
      if (s.inventory.has('bible')) return flash(REMINDERS.bibleBack);
      s.relic = 'held';
      s.held_prop_id = s.relic_kind;
      out.push({ kind: 'sfx', id: 'pickup' });
      break;

    case 'store-relic':
      if (s.relic !== 'held' || !s.flags.has('relic-blessed')) return [];
      s.relic = 'relic-table';
      s.held_prop_id = null;
      s.relics_stored.push(s.relic_kind);
      if (s.day_index !== 1) {
        out.push({ kind: 'sfx', id: 'place' });
        break;
      }
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
      // Only matters for the story; the door itself is already open.
      if (e.id === 'chapel' && !s.flags.has('chapel-opened')) {
        s.flags.add('chapel-opened');
        if (s.day_index === 1) {
          out.push(
            { kind: 'say', text: THOUGHTS.chapelOpen },
            { kind: 'after', seconds: afterThought(THOUGHTS.chapelOpen), event: { type: 'chapel-thought-done' } },
          );
        }
      }
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
  // Day 2: once the candles are lit (D2-02), whatever is left on the altar.
  if (s.day_index === 2) return s.candles_lit.size === 4;
  return s.objective_id === 'D1-05' && s.flags.has('candles-thought-done');
}

/**
 * The Bible comes off its stand while the relic on the ritual table needs
 * scripture: the music box once its first blessing has failed (Day 1); Day
 * 2's first relic as soon as it's on the table (D2-04).
 */
export function bibleWanted(s: GameState): boolean {
  if (s.relic !== 'ritual-table' || s.flags.has('scripture-read')) return false;
  return s.relic_kind !== 'music-box' || s.flags.has('bible-prompted');
}

const near = (p: { x: number; y: number; level: number }, c: { x: number; y: number; r: number }): boolean =>
  p.level === 0 && Math.hypot(p.x - c.x, p.y - c.y) <= c.r;
