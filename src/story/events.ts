import {
  afterThought,
  ALTAR_APPROACH,
  CHURCH_APPROACH,
  CHURCH_APPROACH_LINES,
  COOKING_BEAT,
  CROSS_PAUSE,
  DELIVERIES,
  DELIVERY_DELAY,
  DROP_BOX_APPROACH,
  GATE_CODE,
  GATE_RECALL_DELAY,
  GATE_RETURN,
  HEAD_HOME_DELAY,
  RATTLE_AGAIN,
  RATTLE_FIRST,
  RATTLE_SECONDS,
  PRANK_SECONDS,
  RELIC_ANNOY,
  RELIC_LINES,
  REMINDERS,
  SEARCH_SPOTS,
  SMS,
  THOUGHT_BEAT,
  THOUGHTS,
  TREE_PEEK,
  WRONG_CODE,
  WRONG_CODE_LATER,
  CHURCH_INSIDE,
  LOITER_LINES,
  SEARCH_NUDGE_SECONDS,
  SEARCH_NUDGES,
  CLOWN_DANCE_SECONDS,
  CLOWN_WIGGLE_SECONDS,
  SPLASH_SECONDS,
  RATTLE_VIOLENT,
  EXORCISE_SECONDS,
  CHURCH_LEFT_Y,
  STORAGE_INSIDE,
} from '../data/story';
import { RELIC_FLAGS, type Flag, type GameState, type QuestItem, type RelicKind } from '../state/store';
import { advanceObjectives } from './objectives';
import { churchSealed, searchCount, searching, searchesDoor } from './search';
import { tableReady } from './table';
import { zoneAt } from '../world/zones';

export { churchSealed, searchCount, searching, searchesDoor } from './search';
export { siteReady, tableReady } from './table';

// The single place story state changes. Every event is validated against the
// current state and is a no-op when it has already happened, so key spam,
// repeated holds or re-entering a zone can never fire anything twice.

export type StoryEvent =
  | { type: 'receive-sms'; id: string }
  /** A few seconds into a shift with no gate-code text (Day 2 on): the first objective shows. */
  | { type: 'arrived' }
  | { type: 'recall-gate-code' }
  /** The player's position; on Day 2 the chalice is missing from the altar. */
  | { type: 'near-altar'; x: number; y: number; level: number }
  /** Timed, after the missing-chalice thought: the search objective shows. */
  | { type: 'chalice-missing-done' }
  /** Searching the church for the chalice (D2-02): the player's position, for stepping into the storage closet. */
  | { type: 'search-closet'; x: number; y: number; level: number }
  | { type: 'try-locked-door'; id: string }
  | { type: 'search-done' }
  /** Trying the church doors from inside during the search: they stay shut. */
  | { type: 'try-church-doors' }
  /** No search progress since `at` places were checked: the `n`th nudge. */
  | { type: 'search-nudge'; at: number; n: number }
  | { type: 'crucifix-thought-done' }
  | { type: 'alert-thought-done' }
  /** Day 2, dawdling outside after the gate: the `n`th line (1 to 3). */
  | { type: 'loiter'; n: number }
  | { type: 'enter-church'; x: number; y: number; level: number }
  /**
   * The clown doll (D2-05 to D2-07, reordered 2026-11-26): the first cross
   * makes it giggle and wiggle; scripture; the second cross makes it dance;
   * holy water stills it; the third cross releases it.
   */
  | { type: 'clown-wiggle-done' }
  /** Timed, after "Yep, that's haunted...": the Bible is wanted. */
  | { type: 'clown-book-wanted' }
  | { type: 'clown-dance-done' }
  | { type: 'water-idea' }
  | { type: 'water-wanted' }
  | { type: 'pickup-bucket' }
  | { type: 'fill-bucket' }
  | { type: 'place-bucket' }
  /** Dip the holy-water rod in the bucket by the ritual table. */
  | { type: 'wet-rod' }
  /** Splash the relic with the wet rod: the clown doll stops and lies still; the hand bell rattles worse. */
  | { type: 'splash-relic' }
  /**
   * Day 2's third relic, the hand bell (D2-09 to D2-11): timed steps after
   * the refill thought, the cross's rattle and the splash's rattle.
   */
  | { type: 'bell-refill-wanted' }
  | { type: 'bell-settled' }
  | { type: 'bell-water-wanted' }
  | { type: 'bell-splash-settled' }
  | { type: 'bell-idea' }
  | { type: 'two-handed-wanted' }
  /** Timed: the two-handed blessing's strikes are done; the ghost comes out. */
  | { type: 'bell-exorcised' }
  /** Move the Bible stand in front of the ritual table for the two-handed blessing. */
  | { type: 'move-bible-stand' }
  /** A lingering ghost (or where it was) has come into view; its thought, once (D2-08, D2-09, D2-12). */
  | { type: 'spotted'; who: Spotted }
  /** The worried ghost has gone while the player looked away (D2-09). */
  | { type: 'worried-vanished' }
  /** Timed: the doll has slumped; its thought plays. */
  | { type: 'clown-cooled' }
  /** Timed, after that thought: the last blessing is asked for. */
  | { type: 'clown-cool-thought-done' }
  | { type: 'search-thought-done' }
  | { type: 'prank-focus-done' }
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
  /** The player's position; Day 3's thought on first seeing the grey sky outside (D3-03). */
  | { type: 'outside-overcast'; x: number; y: number; level: number }
  /** Day 3, timed: after the table-set thought, the bucket is wanted. */
  | { type: 'd3-fill-wanted' }
  /** The player's position; Day 2's long-walk thought on leaving for the second delivery. */
  | { type: 'leave-church'; x: number; y: number; level: number }
  /** Take the delivered relic out of the drop box. */
  | { type: 'take-relic' }
  /** Timed, after the first pickup thought: the second, where the relic has one. */
  | { type: 'relic-pickup-2' }
  /** Timed, after the pickup thoughts: the ritual table objective shows. */
  | { type: 'relic-pickup-thought-done' }
  /** Timed, after the carry thought: the second, where the relic has one. */
  | { type: 'relic-carry-2' }
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
  /** Timed, after the ghost thought: the second, where the relic has one. */
  | { type: 'relic-ghost-2' }
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
  | 'cup-wind-down'
  | 'clown-laugh'
  | 'clown-wind-down'
  | 'fill'
  | 'dip'
  | 'sprinkle'
  | 'bell-rattle'
  | 'bell-wind-down'
  | 'angry-squeak'
  | 'exorcise'
  | 'thunder'
  | 'thunder-far';

export type PurifiedRelic = 'clock' | RelicKind;

/** Day 2's lingering ghosts, or the empty grave where the worried one stood. */
export type Spotted = 'clown-roaming' | 'worried' | 'worried-gone' | 'chase';

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
  /** The clown doll giggles and wiggles where it lies (the first cross, D2-05). */
  | { kind: 'wiggle' }
  /** The clown doll stands up on the table, laughs and dances (D2-05). */
  | { kind: 'dance' }
  /** The rod strikes at the doll, splashing it, and the doll goes still (D2-07). */
  | { kind: 'splash' }
  /** The holy-water rod dips into the bucket by the ritual table and comes out wet (D2-07). */
  | { kind: 'dip' }
  /** The two-handed blessing: rod splash, then cross, four times (D2-11). */
  | { kind: 'exorcise' }
  /** The basement lights flicker and fail (D3-02). */
  | { kind: 'lights-out' }
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
      // Once the first objective has folded away, the code comes to mind.
      out.push({ kind: 'after', seconds: GATE_RECALL_DELAY, event: { type: 'recall-gate-code' } });
      break;

    case 'recall-gate-code':
      if (!s.flags.has('arrived') || s.flags.has('gate-code-recalled') || s.flags.has('gate-unlocked')) return [];
      s.flags.add('gate-code-recalled');
      out.push({ kind: 'say', text: THOUGHTS.gateCodeRecall });
      break;

    case 'read-sms': {
      const unread = s.inbox.filter((id) => !s.sms_read.has(id));
      if (unread.length === 0) return [];
      for (const id of unread) s.sms_read.add(id);
      // Day 2: the forwarded alert gets a thought before the objective.
      if (unread.includes('d2delivery1')) {
        out.push(
          { kind: 'say', text: THOUGHTS.alertRead },
          { kind: 'after', seconds: afterThought(THOUGHTS.alertRead), event: { type: 'alert-thought-done' } },
        );
      }
      break;
    }

    case 'alert-thought-done':
      if (!s.sms_read.has('d2delivery1') || s.flags.has('alert-thought-done')) return [];
      s.flags.add('alert-thought-done');
      break;

    case 'loiter': {
      const line = LOITER_LINES[e.n - 1];
      const flag = (['loiter-1', 'loiter-2', 'loiter-3'] as const)[e.n - 1];
      if (!line || !flag || s.day_index !== 2 || s.flags.has('entered-church') || s.flags.has(flag)) return [];
      s.flags.add(flag);
      out.push({ kind: 'say', text: line.text });
      break;
    }

    case 'd3-fill-wanted':
      if (!s.flags.has('d3-table-set') || s.flags.has('d3-fill-wanted')) return [];
      s.flags.add('d3-fill-wanted');
      break;

    case 'outside-overcast': {
      // Out under the grey sky without opening the church doors (D3-03):
      // the same thunder and thought as at the doors.
      if (!overcastUnseen(s)) return [];
      if (e.level !== 0 || zoneAt(e.x, e.y, 0)?.roof) return [];
      overcastSeen(s, out);
      break;
    }

    case 'leave-church':
      // Day 2: heading out for the second delivery (designer copy, 2026-11-22).
      if (s.flags.has('long-walk') || !s.inbox.includes('d2delivery2') || s.relic_kind !== 'clown' || s.relic !== 'drop-box') return [];
      if (e.level !== 0 || e.y > CHURCH_LEFT_Y) return [];
      s.flags.add('long-walk');
      out.push({ kind: 'say', text: THOUGHTS.longWalk });
      break;

    case 'enter-church':
      if (s.flags.has('entered-church') || e.level !== 0) return [];
      if (e.x < CHURCH_INSIDE.x1 || e.x > CHURCH_INSIDE.x2 || e.y < CHURCH_INSIDE.y1 || e.y > CHURCH_INSIDE.y2) return [];
      s.flags.add('entered-church');
      break;

    case 'keypad-submit':
      if (s.flags.has('gate-unlocked')) return [];
      if (e.code !== GATE_CODE) {
        out.push({ kind: 'sfx', id: 'error' }, { kind: 'flash', text: s.day_index === 1 ? WRONG_CODE : WRONG_CODE_LATER });
        return out;
      }
      s.flags.add('gate-unlocked');
      out.push({ kind: 'sfx', id: 'unlock' }, { kind: 'open-door', id: 'gate' }, { kind: 'say', text: THOUGHTS.gateOpen });
      // Day 2: dawdle outside and the thoughts start nagging.
      if (s.day_index === 2) {
        LOITER_LINES.forEach((l, i) => out.push({ kind: 'after', seconds: l.seconds, event: { type: 'loiter', n: i + 1 } }));
      }
      break;

    case 'approach-church': {
      // Each day has its own line for the walk up, if any.
      const line = CHURCH_APPROACH_LINES[s.day_index];
      if (!line || s.flags.has('church-approached') || !s.flags.has('gate-unlocked')) return [];
      if (e.level !== 0 || Math.hypot(e.x - CHURCH_APPROACH.x, e.y - CHURCH_APPROACH.y) > CHURCH_APPROACH.r) return [];
      s.flags.add('church-approached');
      out.push({ kind: 'say', text: line });
      break;
    }

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
      // The key is in the office desk drawers while the church is searched
      // (D2-02, 2026-11-28).
      if (e.item === 'storage-key' && !storageKeyWanted(s)) return [];
      // Day 3: by the ritual table, where it was left (D3-01 note).
      if (e.item === 'rod' && s.day_index !== 3 && (!s.flags.has('storage-opened') || !closetFetch(s))) return [];
      s.inventory.add(e.item);
      out.push({ kind: 'sfx', id: 'pickup' });
      // Day 3: the basement key hangs with the chapel key (D3-01).
      if (e.item === 'chapel-key' && s.day_index === 3) s.inventory.add('basement-key');
      if (e.item === 'storage-key') {
        s.flags.add('searched-desk');
        searched(s, out, THOUGHTS.searchDesk);
      }
      // Day 2: no chalice to go with it yet (D2-02).
      if (e.item === 'crucifix' && s.day_index === 2 && s.chalice === 'garden-bench') {
        out.push(
          { kind: 'say', text: THOUGHTS.crucifixFirst },
          { kind: 'after', seconds: afterThought(THOUGHTS.crucifixFirst), event: { type: 'crucifix-thought-done' } },
        );
      }
      break;

    case 'crucifix-thought-done':
      if (s.day_index !== 2 || s.flags.has('crucifix-thought-done')) return [];
      if (!s.inventory.has('crucifix') && !s.flags.has('crucifix-staged')) return [];
      s.flags.add('crucifix-thought-done');
      break;

    case 'pickup-chalice':
      // Day 3: on the basement's far shelf. Taking it, the lights fail and
      // distant thunder begins; outside the sky turns grey (D3-02, 7.1
      // D3_OVERCAST).
      if (s.chalice === 'basement') {
        if (s.held_prop_id) return flash(REMINDERS.handsFull);
        s.chalice = 'held';
        s.held_prop_id = 'chalice';
        s.flags.add('basement-dark');
        s.environment_preset = 'D3_OVERCAST';
        out.push(
          { kind: 'sfx', id: 'pickup' },
          { kind: 'lights-out' },
          { kind: 'sfx', id: 'thunder' },
          { kind: 'say', text: THOUGHTS.basementDark },
        );
        break;
      }
      // Day 2: on the garden bench, where the prankster left it (D2-02).
      // Not there to find until the church has been searched.
      if (s.chalice === 'garden-bench') {
        if (!s.flags.has('church-searched-thought-done')) return [];
        if (s.held_prop_id) return flash(REMINDERS.handsFull);
        s.chalice = 'held';
        s.held_prop_id = 'chalice';
        out.push({ kind: 'sfx', id: 'pickup' });
        if (!s.fired_scares.includes('d2-prank')) {
          s.fired_scares.push('d2-prank');
          // The yelp comes with the scare, not after it.
          out.push(
            { kind: 'prank' },
            { kind: 'sfx', id: 'raspberry' },
            { kind: 'say', text: THOUGHTS.prankScare },
            { kind: 'after', seconds: Math.max(PRANK_SECONDS, afterThought(THOUGHTS.prankScare)), event: { type: 'prank-done' } },
          );
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
      // Day 2: the crucifix is down, so the search for the chalice begins.
      if (crucifix && searching(s)) nudgeLater(s, out);
      // Both down on Day 1: the clock chimes harder, then the thought.
      if (tableReady(s) && s.day_index === 1) out.push({ kind: 'after', seconds: COOKING_BEAT, event: { type: 'now-cooking' } });
      // Day 3: the table is set, then the bucket (D3-03).
      if (tableReady(s) && s.day_index === 3 && !s.flags.has('d3-table-set')) {
        s.flags.add('d3-table-set');
        out.push(
          { kind: 'say', text: THOUGHTS.tableSetDay3 },
          { kind: 'after', seconds: afterThought(THOUGHTS.tableSetDay3), event: { type: 'd3-fill-wanted' } },
        );
      }
      // Day 2: the table is set, then the first delivery's alert (D2-03).
      if (tableReady(s) && s.day_index === 2 && !s.flags.has('table-set')) {
        s.flags.add('table-set');
        out.push(
          { kind: 'say', text: THOUGHTS.tableSetDay2 },
          { kind: 'after', seconds: afterThought(THOUGHTS.tableSetDay2), event: { type: 'receive-sms', id: 'd2delivery1' } },
        );
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

    case 'search-closet': {
      // Opened with the key from the desk: a bucket and rod, no chalice.
      if (!searching(s) || s.flags.has('searched-storage') || !s.flags.has('storage-opened')) return [];
      const r = STORAGE_INSIDE;
      if (e.level !== 0 || e.x < r.x1 || e.x > r.x2 || e.y < r.y1 || e.y > r.y2) return [];
      s.flags.add('searched-storage');
      searched(s, out, THOUGHTS.searchCloset);
      break;
    }

    case 'try-locked-door':
      if (!searchesDoor(s, e.id)) return [];
      // No key yet: a pointer to the office, every time, like a reminder.
      if (!s.inventory.has('storage-key')) return [{ kind: 'say', text: THOUGHTS.searchLocked }];
      // The key only fits the closet; the basement stays shut.
      s.flags.add('searched-basement');
      searched(s, out, THOUGHTS.searchBasement);
      break;

    case 'try-church-doors':
      // A reminder each time, like the "too early" lines; nothing changes.
      if (!churchSealed(s)) return [];
      return [{ kind: 'say', text: THOUGHTS.searchStayInside }];

    case 'search-nudge': {
      // Only if nothing has been checked since it was scheduled.
      const flag = (['search-nudge-1', 'search-nudge-2', 'search-nudge-3'] as const)[e.n - 1];
      if (!flag || !searching(s) || searchCount(s) !== e.at || s.flags.has(flag)) return [];
      s.flags.add(flag);
      out.push({ kind: 'say', text: s.inventory.has('storage-key') ? THOUGHTS.searchNudgeKey : THOUGHTS.searchNudge });
      nudgeLater(s, out);
      break;
    }

    case 'search-done':
      if (searchCount(s) < SEARCH_SPOTS || s.flags.has('church-searched')) return [];
      s.flags.add('church-searched');
      out.push(
        { kind: 'say', text: THOUGHTS.searchOutside },
        { kind: 'after', seconds: afterThought(THOUGHTS.searchOutside), event: { type: 'search-thought-done' } },
      );
      break;

    case 'search-thought-done':
      if (!s.flags.has('church-searched') || s.flags.has('church-searched-thought-done')) return [];
      s.flags.add('church-searched-thought-done');
      break;

    // After the scare: two more thoughts, one after another.
    case 'prank-done':
      if (!s.fired_scares.includes('d2-prank') || s.flags.has('prank-done')) return [];
      s.flags.add('prank-done');
      out.push(
        { kind: 'say', text: THOUGHTS.prankHarmless },
        { kind: 'after', seconds: afterThought(THOUGHTS.prankHarmless), event: { type: 'prank-thought-done' } },
      );
      break;

    case 'prank-thought-done':
      if (!s.flags.has('prank-done') || s.flags.has('prank-thought-done')) return [];
      s.flags.add('prank-thought-done');
      out.push(
        { kind: 'say', text: THOUGHTS.prankFocus },
        { kind: 'after', seconds: afterThought(THOUGHTS.prankFocus), event: { type: 'prank-focus-done' } },
      );
      break;

    case 'prank-focus-done':
      if (!s.flags.has('prank-thought-done') || s.flags.has('prank-focus-done')) return [];
      s.flags.add('prank-focus-done');
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
      if (s.relic !== 'drop-box' || s.flags.has('drop-box-approached') || !deliveryRead(s)) return [];
      if (!near(e, DROP_BOX_APPROACH)) return [];
      s.flags.add('drop-box-approached');
      out.push({ kind: 'say', text: RELIC_LINES[s.relic_kind].approach });
      break;

    case 'take-relic':
      // Not until its text has been read and the phone put away (designer, 2026-12-01).
      if (s.relic !== 'drop-box' || !deliveryRead(s)) return [];
      if (s.held_prop_id) return flash(REMINDERS.handsFull);
      s.relic = 'held';
      s.held_prop_id = s.relic_kind;
      s.flags.add('drop-box-approached');
      {
        const lines = RELIC_LINES[s.relic_kind];
        const next: StoryEvent = { type: lines.pickup2 ? 'relic-pickup-2' : 'relic-pickup-thought-done' };
        out.push(
          { kind: 'sfx', id: 'pickup' },
          { kind: 'say', text: lines.pickup },
          { kind: 'after', seconds: afterThought(lines.pickup), event: next },
        );
      }
      break;

    case 'relic-pickup-2': {
      const line = RELIC_LINES[s.relic_kind].pickup2;
      if (!line || s.relic === 'drop-box' || s.relic === 'none' || s.flags.has('relic-pickup-2')) return [];
      s.flags.add('relic-pickup-2');
      // The box: the sky darkens and the birds stop as this is said (D3-04, 7.1 D3_SILENCE).
      if (s.relic_kind === 'box') s.environment_preset = 'D3_SILENCE';
      out.push({ kind: 'say', text: line }, { kind: 'after', seconds: afterThought(line), event: { type: 'relic-pickup-thought-done' } });
      break;
    }

    case 'relic-pickup-thought-done':
      if (s.relic === 'drop-box' || s.relic === 'none' || s.flags.has('relic-pickup-thought-done')) return [];
      if (RELIC_LINES[s.relic_kind].pickup2 && !s.flags.has('relic-pickup-2')) return [];
      s.flags.add('relic-pickup-thought-done');
      break;

    case 'relic-near-church':
      // Carrying the still-possessed relic up towards the church doors.
      if (s.relic !== 'held' || s.flags.has('relic-rattled') || s.flags.has('relic-annoyed')) return [];
      if (!near(e, RELIC_ANNOY)) return [];
      s.flags.add('relic-annoyed');
      {
        const lines = RELIC_LINES[s.relic_kind];
        out.push({ kind: 'say', text: lines.carry });
        if (lines.carry2) out.push({ kind: 'after', seconds: afterThought(lines.carry), event: { type: 'relic-carry-2' } });
      }
      break;

    case 'relic-carry-2': {
      const line = RELIC_LINES[s.relic_kind].carry2;
      if (!line || !s.flags.has('relic-annoyed') || s.flags.has('relic-carry-2')) return [];
      s.flags.add('relic-carry-2');
      out.push({ kind: 'say', text: line });
      break;
    }

    case 'place-relic':
      if (s.relic !== 'held') return [];
      if (!tableReady(s)) return flash(REMINDERS.tableNotReady);
      s.relic = 'ritual-table';
      s.held_prop_id = null;
      out.push({ kind: 'sfx', id: 'place' });
      // The hand bell (D2-09): fill the bucket before starting.
      if (s.relic_kind === 'bell' && !s.flags.has('bell-refill-wanted')) {
        out.push(
          { kind: 'say', text: THOUGHTS.bellRefill },
          { kind: 'after', seconds: afterThought(THOUGHTS.bellRefill), event: { type: 'bell-refill-wanted' } },
        );
      }
      break;

    case 'bless-relic': {
      if (s.relic !== 'ritual-table' || s.flags.has('relic-blessed')) return [];
      if (!tableReady(s)) return flash(REMINDERS.tableNotReady);
      if (!s.inventory.has('cross')) return flash(REMINDERS.needCross);
      // The clown doll (designer, 2026-11-26): the first cross gets a small
      // giggle and wiggle; after scripture the second sets it dancing; once
      // holy water has stilled it, the third releases it.
      // The hand bell (D2-10, D2-11): the cross sets it rattling; after the
      // holy water fails too, the two-handed blessing with the Bible on its
      // stand in front releases it.
      if (s.relic_kind === 'bell') {
        if (!s.flags.has('bell-refill-wanted')) return [];
        if (!s.flags.has('bell-crossed')) {
          if (s.bucket !== 'chapel' || !s.bucket_filled) return flash(REMINDERS.holyWaterFirst);
          s.flags.add('bell-crossed');
          out.push(
            { kind: 'rattle', ...RATTLE_VIOLENT },
            { kind: 'sfx', id: 'bell-rattle' },
            { kind: 'sfx', id: 'angry-squeak' },
            { kind: 'after', seconds: RATTLE_VIOLENT.seconds + THOUGHT_BEAT, event: { type: 'bell-settled' } },
          );
          break;
        }
        if (!s.flags.has('two-handed-wanted') || s.flags.has('bell-exorcising')) return [];
        if (!s.flags.has('bible-stand-moved')) return flash(REMINDERS.standFirst);
        if (!s.inventory.has('rod')) return flash(REMINDERS.needRod);
        if (!s.flags.has('rod-wet')) return flash(s.bucket === 'chapel' && s.bucket_filled ? REMINDERS.rodDry : REMINDERS.holyWaterFirst);
        // Rod and cross strike at it in turn, four times; then its ghost
        // (designer, 2026-11-27). The strikes use up the water.
        s.flags.add('bell-exorcising');
        s.flags.delete('rod-wet');
        s.bucket_filled = false;
        out.push(
          { kind: 'exorcise' },
          { kind: 'sfx', id: 'exorcise' },
          { kind: 'say', text: THOUGHTS.powerOfChrist },
          { kind: 'rattle', seconds: EXORCISE_SECONDS, strength: 1.2 },
          { kind: 'sfx', id: 'angry-squeak' },
          { kind: 'after', seconds: EXORCISE_SECONDS + THOUGHT_BEAT, event: { type: 'bell-exorcised' } },
        );
        break;
      }
      if (s.relic_kind === 'clown') {
        if (!s.flags.has('clown-wiggled')) {
          s.flags.add('clown-wiggled');
          out.push({ kind: 'wiggle' }, { kind: 'after', seconds: CLOWN_WIGGLE_SECONDS, event: { type: 'clown-wiggle-done' } });
          break;
        }
        if (!s.flags.has('clown-book-wanted')) return [];
        if (!s.flags.has('scripture-read')) return flash(REMINDERS.scriptureFirst);
        if (!s.flags.has('clown-danced')) {
          s.flags.add('clown-danced');
          out.push(
            { kind: 'dance' },
            { kind: 'sfx', id: 'clown-laugh' },
            { kind: 'after', seconds: CLOWN_DANCE_SECONDS, event: { type: 'clown-dance-done' } },
          );
          break;
        }
        if (!s.flags.has('clown-cool-thought-done')) return [];
        s.flags.add('relic-blessed');
        s.fired_scares.push('d2-clown-ghost');
        out.push({ kind: 'purify', relic: 'clown' });
        break;
      }
      // Day 2's first relic (D2-04): scripture, then the cross, and it's done.
      if (s.relic_kind === 'teacup') {
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

    case 'clown-wiggle-done':
      if (!s.flags.has('clown-wiggled') || s.flags.has('clown-wiggle-done')) return [];
      s.flags.add('clown-wiggle-done');
      out.push(
        { kind: 'say', text: THOUGHTS.clownHaunted },
        { kind: 'after', seconds: afterThought(THOUGHTS.clownHaunted), event: { type: 'clown-book-wanted' } },
      );
      break;

    case 'clown-book-wanted':
      if (!s.flags.has('clown-wiggle-done') || s.flags.has('clown-book-wanted')) return [];
      s.flags.add('clown-book-wanted');
      break;

    case 'clown-dance-done':
      if (!s.flags.has('clown-danced') || s.flags.has('clown-dance-done')) return [];
      s.flags.add('clown-dance-done');
      out.push(
        { kind: 'say', text: THOUGHTS.clownDance },
        { kind: 'after', seconds: afterThought(THOUGHTS.clownDance), event: { type: 'water-idea' } },
      );
      break;

    case 'water-idea':
      if (!s.flags.has('clown-dance-done') || s.flags.has('water-idea')) return [];
      s.flags.add('water-idea');
      out.push(
        { kind: 'say', text: THOUGHTS.clownWater },
        { kind: 'after', seconds: afterThought(THOUGHTS.clownWater), event: { type: 'water-wanted' } },
      );
      break;

    case 'water-wanted':
      if (!s.flags.has('water-idea') || s.flags.has('water-wanted')) return [];
      s.flags.add('water-wanted');
      break;

    case 'pickup-bucket':
      // From the closet, or an empty one from beside the ritual table.
      if (s.bucket === 'held' || (s.bucket === 'chapel' && s.bucket_filled)) return [];
      // Seen in the closet during the search, but only taken for the clown doll.
      if (s.bucket === 'closet' && (!s.flags.has('storage-opened') || !closetFetch(s))) return [];
      if (s.held_prop_id) return flash(REMINDERS.handsFull);
      s.bucket = 'held';
      s.held_prop_id = 'bucket';
      out.push({ kind: 'sfx', id: 'pickup' });
      break;

    case 'fill-bucket':
      if (s.bucket !== 'held' || s.bucket_filled) return [];
      s.bucket_filled = true;
      out.push({ kind: 'sfx', id: 'fill' });
      break;

    case 'place-bucket':
      if (s.bucket !== 'held') return [];
      if (!s.bucket_filled) return flash(REMINDERS.bucketEmpty);
      s.bucket = 'chapel';
      s.held_prop_id = null;
      out.push({ kind: 'sfx', id: 'place' });
      // Day 3: ready for the delivery (D3-04).
      if (s.day_index === 3 && s.flags.has('d3-fill-wanted') && !s.flags.has('d3-water-ready')) {
        s.flags.add('d3-water-ready');
        out.push(
          { kind: 'say', text: THOUGHTS.waterReady },
          { kind: 'after', seconds: afterThought(THOUGHTS.waterReady), event: { type: 'receive-sms', id: 'd3delivery' } },
        );
      }
      break;

    case 'wet-rod':
      // The rod goes into the bucket by the ritual table (designer, 2026-11-26).
      if (!rodDipWanted(s)) return [];
      if (!s.inventory.has('rod')) return flash(REMINDERS.needRod);
      if (s.bucket !== 'chapel' || !s.bucket_filled) return flash(REMINDERS.holyWaterFirst);
      s.flags.add('rod-wet');
      // The rod goes into the water and out again; the slosh comes with the
      // view's timing (2026-11-29).
      out.push({ kind: 'dip' });
      break;

    case 'splash-relic':
      // The hand bell (D2-10): it only rattles worse. The splash uses up the
      // water, as with the doll.
      if (s.relic === 'ritual-table' && s.relic_kind === 'bell') {
        if (!s.flags.has('bell-water-wanted') || s.flags.has('bell-splashed')) return [];
        if (!s.inventory.has('rod')) return flash(REMINDERS.needRod);
        if (!s.flags.has('rod-wet')) return flash(s.bucket === 'chapel' && s.bucket_filled ? REMINDERS.rodDry : REMINDERS.holyWaterFirst);
        // The rod is used, but there's water left for the last blessing
        // (designer, 2026-11-27: the rod is dipped again for it).
        s.flags.add('bell-splashed');
        s.flags.delete('rod-wet');
        out.push(
          { kind: 'splash' },
          { kind: 'sfx', id: 'sprinkle' },
          { kind: 'rattle', ...RATTLE_VIOLENT },
          { kind: 'sfx', id: 'bell-rattle' },
          { kind: 'sfx', id: 'angry-squeak' },
          { kind: 'after', seconds: RATTLE_VIOLENT.seconds + THOUGHT_BEAT, event: { type: 'bell-splash-settled' } },
        );
        break;
      }
      // Splashed with holy water, the doll stops and lies still (D2-07). The
      // splash uses up the water in the bucket.
      if (s.relic !== 'ritual-table' || s.relic_kind !== 'clown' || s.flags.has('clown-doused')) return [];
      if (!s.flags.has('water-wanted')) return [];
      if (!s.inventory.has('rod')) return flash(REMINDERS.needRod);
      if (!s.flags.has('rod-wet')) return flash(s.bucket === 'chapel' && s.bucket_filled ? REMINDERS.rodDry : REMINDERS.holyWaterFirst);
      s.flags.add('clown-doused');
      s.bucket_filled = false;
      out.push({ kind: 'splash' }, { kind: 'sfx', id: 'sprinkle' }, { kind: 'after', seconds: SPLASH_SECONDS, event: { type: 'clown-cooled' } });
      break;

    case 'bell-refill-wanted':
      if (s.relic_kind !== 'bell' || s.relic !== 'ritual-table' || s.flags.has('bell-refill-wanted')) return [];
      s.flags.add('bell-refill-wanted');
      break;

    case 'bell-settled':
      if (!s.flags.has('bell-crossed') || s.flags.has('bell-cross-settled')) return [];
      s.flags.add('bell-cross-settled');
      out.push(
        { kind: 'say', text: THOUGHTS.bellCross },
        { kind: 'after', seconds: afterThought(THOUGHTS.bellCross), event: { type: 'bell-water-wanted' } },
      );
      break;

    case 'bell-water-wanted':
      if (!s.flags.has('bell-cross-settled') || s.flags.has('bell-water-wanted')) return [];
      s.flags.add('bell-water-wanted');
      break;

    case 'bell-splash-settled':
      if (!s.flags.has('bell-splashed') || s.flags.has('bell-splash-settled')) return [];
      s.flags.add('bell-splash-settled');
      out.push(
        { kind: 'say', text: THOUGHTS.bellSplash },
        { kind: 'after', seconds: afterThought(THOUGHTS.bellSplash), event: { type: 'bell-idea' } },
      );
      break;

    case 'bell-idea':
      if (!s.flags.has('bell-splash-settled') || s.flags.has('bell-idea')) return [];
      s.flags.add('bell-idea');
      out.push(
        { kind: 'say', text: THOUGHTS.bellIdea },
        { kind: 'after', seconds: afterThought(THOUGHTS.bellIdea), event: { type: 'two-handed-wanted' } },
      );
      break;

    case 'two-handed-wanted':
      if (!s.flags.has('bell-idea') || s.flags.has('two-handed-wanted')) return [];
      s.flags.add('two-handed-wanted');
      break;

    case 'bell-exorcised':
      if (!s.flags.has('bell-exorcising') || s.flags.has('relic-blessed')) return [];
      s.flags.add('relic-blessed');
      s.fired_scares.push('d2-bell-ghost');
      out.push({ kind: 'purify', relic: 'bell' });
      break;

    case 'move-bible-stand':
      if (!standMoveWanted(s)) return [];
      s.flags.add('bible-stand-moved');
      out.push({ kind: 'sfx', id: 'place' });
      break;

    case 'spotted': {
      const line = spottedLine(s, e.who);
      if (!line) return [];
      s.flags.add(line.flag);
      if (line.text) out.push({ kind: 'say', text: line.text });
      break;
    }

    case 'worried-vanished':
      if (!s.flags.has('worried-spotted') || s.flags.has('worried-vanished')) return [];
      s.flags.add('worried-vanished');
      break;

    case 'clown-cooled':
      if (!s.flags.has('clown-doused') || s.flags.has('clown-cooled')) return [];
      s.flags.add('clown-cooled');
      out.push(
        { kind: 'say', text: THOUGHTS.cooledOff },
        { kind: 'after', seconds: afterThought(THOUGHTS.cooledOff), event: { type: 'clown-cool-thought-done' } },
      );
      break;

    case 'clown-cool-thought-done':
      if (!s.flags.has('clown-cooled') || s.flags.has('clown-cool-thought-done')) return [];
      s.flags.add('clown-cool-thought-done');
      break;

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
      if (!bibleReturnable(s)) return [];
      s.inventory.delete('bible');
      out.push({ kind: 'sfx', id: 'place' });
      break;

    case 'relic-ghost-gone':
      if (!s.flags.has('relic-blessed') || s.flags.has('relic-ghost-gone')) return [];
      s.flags.add('relic-ghost-gone');
      {
        const lines = RELIC_LINES[s.relic_kind];
        const next: StoryEvent = { type: lines.ghost2 ? 'relic-ghost-2' : 'relic-thought-done' };
        out.push({ kind: 'say', text: lines.ghost }, { kind: 'after', seconds: afterThought(lines.ghost), event: next });
      }
      break;

    case 'relic-ghost-2': {
      const line = RELIC_LINES[s.relic_kind].ghost2;
      if (!line || !s.flags.has('relic-ghost-gone') || s.flags.has('relic-ghost-2')) return [];
      s.flags.add('relic-ghost-2');
      out.push({ kind: 'say', text: line }, { kind: 'after', seconds: afterThought(line), event: { type: 'relic-thought-done' } });
      break;
    }

    case 'relic-thought-done':
      if (!s.flags.has('relic-ghost-gone') || s.flags.has('relic-thought-done')) return [];
      if (RELIC_LINES[s.relic_kind].ghost2 && !s.flags.has('relic-ghost-2')) return [];
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
        // Day 2: the teacup is away; the clown doll is next (D2-05).
        // A hopeful thought, then the text.
        if (s.relic_kind === 'teacup' && !s.inbox.includes('d2delivery2')) {
          out.push(
            { kind: 'say', text: THOUGHTS.homeEarly },
            { kind: 'after', seconds: afterThought(THOUGHTS.homeEarly), event: { type: 'receive-sms', id: 'd2delivery2' } },
          );
        }
        // The clown doll is away; the third delivery (D2-08).
        if (s.relic_kind === 'clown' && !s.inbox.includes('d2delivery3')) {
          out.push(
            { kind: 'say', text: THOUGHTS.lastOne },
            { kind: 'after', seconds: afterThought(THOUGHTS.lastOne), event: { type: 'receive-sms', id: 'd2delivery3' } },
          );
        }
        // The hand bell is away: dusk, and the shift is over (D2-12).
        if (s.relic_kind === 'bell') {
          s.environment_preset = 'D1_EVENING';
          out.push(
            { kind: 'say', text: THOUGHTS.shiftDone },
            { kind: 'after', seconds: afterThought(THOUGHTS.shiftDone), event: { type: 'head-home' } },
          );
        }
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
      // Day 2: "Three in one shift" has already played; straight to the gate.
      if (s.day_index === 2) {
        s.flags.add('gate-prompted');
        break;
      }
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
      if (s.day_index !== 1 || s.fired_scares.includes('d1-tree-peek') || !s.flags.has('heading-home')) return [];
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
      if (e.id === 'storage' && s.inventory.has('storage-key') && !s.flags.has('storage-opened')) s.flags.add('storage-opened');
      // Day 3: opening the church doors after the lights fail, thunder rolls
      // and the sky outside is grey (designer, 2026-11-27).
      if (e.id === 'church' && overcastUnseen(s)) overcastSeen(s, out);
      // Day 2: the cleansed clock, on the desk since yesterday.
      if (e.id === 'office' && s.day_index === 2 && !s.flags.has('office-opened')) {
        s.flags.add('office-opened');
        out.push({ kind: 'say', text: THOUGHTS.officeClock });
      }
      break;
  }

  for (const id of advanceObjectives(s)) {
    out.push({ kind: 'objective', id });
    // The clock is on the desk: the first delivery is on its way (D1-08).
    if (id === 'D1-07') out.push({ kind: 'after', seconds: DELIVERY_DELAY, event: { type: 'receive-sms', id: 'delivery1' } });
    // Out through the gate: the shift is over.
    if (id === 'D1-10' || id === 'D2-12') out.push({ kind: 'end-day' });
  }
  return out;
}

/** Day 3: the sky has turned (D3-02) but the player hasn't been out under it yet. */
function overcastUnseen(s: GameState): boolean {
  return s.day_index === 3 && !s.flags.has('overcast-seen') && s.environment_preset !== 'BASE_DAY';
}

/** A roll of thunder, and the thought that goes with it (D3-03). */
function overcastSeen(s: GameState, out: Effect[]): void {
  s.flags.add('overcast-seen');
  out.push({ kind: 'sfx', id: 'thunder' }, { kind: 'say', text: THOUGHTS.skyGrey });
}

/** Why the clock can't be blessed yet, or null when it can (player position aside). */
export function blessBlocker(s: GameState): string | null {
  if (s.clock !== 'ritual-table') return 'The clock needs to be on the ritual table.';
  if (s.candles_lit.size < 4) return 'The candles need lighting first.';
  if (!tableReady(s)) return REMINDERS.tableNotReady;
  if (!s.inventory.has('cross')) return REMINDERS.needCross;
  return null;
}

/** One more place checked: its thought, and once all are done, the next. */
function searched(s: GameState, out: Effect[], line: string): void {
  out.push({ kind: 'say', text: line });
  if (searchCount(s) === SEARCH_SPOTS) out.push({ kind: 'after', seconds: afterThought(line), event: { type: 'search-done' } });
  else nudgeLater(s, out);
}

/** The next search nudge, if nothing more is checked in the meantime (up to SEARCH_NUDGES). */
function nudgeLater(s: GameState, out: Effect[]): void {
  const n = (['search-nudge-1', 'search-nudge-2', 'search-nudge-3'] as const).filter((f) => s.flags.has(f)).length + 1;
  if (n > SEARCH_NUDGES) return;
  out.push({ kind: 'after', seconds: SEARCH_NUDGE_SECONDS, event: { type: 'search-nudge', at: searchCount(s), n } });
}

/**
 * The chalice and crucifix can come off the altar once the objective asks for
 * them (D1-05), not before (S2 playtest, 2026-11-09). Later days set their
 * own rules in S3.
 */
export function altarOpen(s: GameState): boolean {
  // Day 2 on: once the candles are lit (D2-02), whatever is left on the altar.
  if (s.day_index >= 2) return s.candles_lit.size === 4;
  return s.objective_id === 'D1-05' && s.flags.has('candles-thought-done');
}

/**
 * The Bible goes back on its stand once the relic is cleansed, or, for the
 * clown doll, once it's done with and holy water is wanted, so it isn't
 * carried through the fetch for the water (designer, 2026-11-27).
 */
export function bibleReturnable(s: GameState): boolean {
  if (!s.inventory.has('bible')) return false;
  return s.flags.has('relic-blessed') || (s.relic_kind === 'clown' && s.flags.has('water-wanted'));
}

/** The rod can go into the bucket now: for the clown doll, or the hand bell. */
export function rodDipWanted(s: GameState): boolean {
  if (s.flags.has('rod-wet')) return false;
  if (s.relic_kind === 'clown') return s.flags.has('water-wanted') && !s.flags.has('clown-doused');
  if (s.relic_kind === 'bell') {
    // Before the splash, and again for the two-handed blessing once the
    // Bible stand is in the circle (designer, 2026-11-27).
    if (s.flags.has('bell-water-wanted') && !s.flags.has('bell-splashed')) return true;
    return s.flags.has('two-handed-wanted') && s.flags.has('bible-stand-moved') && !s.flags.has('bell-exorcising');
  }
  return false;
}

/** The Bible stand can be moved into the holy circle (D2-11). */
export function standMoveWanted(s: GameState): boolean {
  return (
    s.relic_kind === 'bell' &&
    s.relic === 'ritual-table' &&
    s.flags.has('two-handed-wanted') &&
    !s.flags.has('bible-stand-moved') &&
    !s.inventory.has('bible')
  );
}

/** The clown's ghost drifts among the east graves from the third text until the shift ends (D2-08). */
export function clownRoaming(s: GameState): boolean {
  return s.day_index === 2 && s.inbox.includes('d2delivery3') && !s.relics_stored.includes('bell');
}

/** The worried ghost stares at the old priest's grave on the hand bell's refill trip, until it vanishes (D2-09). */
export function worriedShown(s: GameState): boolean {
  return s.day_index === 2 && s.relic_kind === 'bell' && s.flags.has('bell-refill-wanted') && !s.flags.has('worried-vanished') && !s.relics_stored.includes('bell');
}

/** The clown's ghost chases the angry one among the east graves at the end of the shift (D2-12). */
export function ghostsChasing(s: GameState): boolean {
  return s.day_index === 2 && s.relics_stored.includes('bell');
}

/** The delivery text that brought the current relic has been read and the phone put away. */
export function deliveryRead(s: GameState): boolean {
  const id = Object.keys(DELIVERIES).filter((k) => DELIVERIES[k] === s.relic_kind && s.inbox.includes(k)).pop();
  return !id || s.sms_read.has(id);
}

/** The thought for a lingering ghost coming into view (or '' for none), and the flag it sets, or null if it's done or out of turn. */
function spottedLine(s: GameState, who: Spotted): { flag: Flag; text: string } | null {
  const pick = (ok: boolean, flag: Flag, text: string) => (ok && !s.flags.has(flag) ? { flag, text } : null);
  switch (who) {
    case 'clown-roaming':
      return pick(clownRoaming(s), 'clown-roaming-spotted', THOUGHTS.clownRoaming);
    case 'worried':
      // Seen, without a thought: the moment is meant to be subtle (designer, 2026-12-01).
      return pick(worriedShown(s), 'worried-spotted', '');
    case 'worried-gone':
      return pick(s.flags.has('worried-vanished'), 'worried-looked-back', THOUGHTS.worriedGone);
    case 'chase':
      return pick(ghostsChasing(s), 'chase-spotted', THOUGHTS.chaseSpotted);
  }
}

/**
 * The storage closet key can be found in the office desk drawers: while the
 * church is searched for the chalice, until it's found (D2-02, 2026-11-28).
 */
export function storageKeyWanted(s: GameState): boolean {
  return searching(s) && !s.inventory.has('storage-key');
}

/**
 * The bucket and holy-water rod come out of the storage closet once holy water
 * is wanted for the clown doll and the Bible is back on its stand (D2-06).
 */
export function closetFetch(s: GameState): boolean {
  return s.flags.has('water-wanted') && !s.inventory.has('bible');
}

/**
 * The Bible comes off its stand while the relic on the ritual table needs
 * scripture: the music box once its first blessing has failed (Day 1); Day
 * 2's first relic as soon as it's on the table (D2-04); the clown doll once
 * the first cross has set it giggling (D2-05).
 */
export function bibleWanted(s: GameState): boolean {
  if (s.relic !== 'ritual-table' || s.flags.has('scripture-read')) return false;
  if (s.relic_kind === 'teacup') return true;
  if (s.relic_kind === 'clown') return s.flags.has('clown-book-wanted');
  return s.relic_kind === 'music-box' && s.flags.has('bible-prompted');
}

const near = (p: { x: number; y: number; level: number }, c: { x: number; y: number; r: number }): boolean =>
  p.level === 0 && Math.hypot(p.x - c.x, p.y - c.y) <= c.r;
