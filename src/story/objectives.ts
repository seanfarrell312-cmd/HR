import { RELIC_NAMES, S3_PART1_END, SEARCH_CHECKLIST } from '../data/story';
import type { GameState } from '../state/store';
import { churchSealed } from './search';
import { tableReady } from './table';

// Objectives for each day (doc 6.1, 6.2). Day 1 was built in S1 and S2, Day 2
// in S3. Each completes on validated state, never on approach, and the
// sequencer only moves forward. A day's objectives only complete on that day,
// so finishing Day 1 never ticks off Day 2's.

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface Objective {
  id: string;
  /** Task line for the HUD; can depend on progress within the objective. */
  task: (s: GameState) => string;
  done: (s: GameState) => boolean;
  /** Persistent list shown under the objective, with items crossed off as they're done. */
  checklist?: (s: GameState) => ChecklistItem[];
}

export const DAY1: Objective[] = [
  {
    id: 'D1-01',
    // Nothing until the text arrives, a few seconds into the day.
    task: (s) =>
      !s.inbox.includes('gateCode') ? '' : s.sms_read.has('gateCode') ? 'Enter the code on the gate keypad' : 'Check your phone (Q)',
    done: (s) => s.flags.has('gate-unlocked'),
  },
  {
    id: 'D1-02',
    task: () => 'Head up the path into the church',
    done: (s) => s.open_doors.has('church'),
  },
  {
    id: 'D1-03',
    // The key line follows once the note has been read and put down.
    task: (s) => (s.flags.has('note-closed') ? 'Take the chapel key from the hooks by the office door' : 'Read the note on the office desk'),
    done: (s) => s.flags.has('note-read') && s.inventory.has('chapel-key'),
  },
  {
    // Preparing the ritual site, part one: into the chapel, then the candles.
    id: 'D1-04',
    task: (s) => {
      if (!s.flags.has('chapel-opened')) return 'Unlock the chapel';
      // The chapel-door thought plays first.
      if (!s.flags.has('chapel-thought-done')) return '';
      if (!s.inventory.has('matches')) return 'Pick up the matches from the shelf';
      return `Light the candles around the holy circle (${s.candles_lit.size}/4)`;
    },
    done: (s) => s.candles_lit.size === 4,
  },
  {
    // Preparing the ritual site, part two (decisions 2026-11-09, S2 playtest:
    // moved ahead of the first blessing and repeated each day). The altar
    // pieces only come away once this objective is current.
    id: 'D1-05',
    task: (s) => {
      // The candles thought plays first.
      if (!s.flags.has('candles-thought-done')) return '';
      const chaliceAtAltar = s.chalice === 'altar';
      const crucifixAtAltar = !s.inventory.has('crucifix') && !s.flags.has('crucifix-staged');
      if (chaliceAtAltar && crucifixAtAltar) return 'Fetch the chalice and crucifix from the altar';
      if (chaliceAtAltar) return 'Fetch the chalice from the altar';
      if (crucifixAtAltar) return 'Fetch the crucifix from the altar';
      return 'Set the chalice and crucifix out on the ritual table';
    },
    done: (s) => tableReady(s),
  },
  {
    id: 'D1-06',
    // "Now we're cooking." and a pause first.
    task: (s) =>
      !s.flags.has('cross-prompted')
        ? ''
        : s.inventory.has('cross')
          ? 'Stand in the holy circle and bless the clock'
          : 'Take the cross from the chapel shelf',
    done: (s) => s.flags.has('clock-blessed'),
  },
  {
    id: 'D1-07',
    // Waits until the ghost has gone and its thought has played.
    task: (s) => (s.flags.has('clock-thought-done') ? "Put the clock on the supervisor's desk" : ''),
    done: (s) => s.clock === 'office-desk',
  },
  {
    id: 'D1-08',
    // Nothing to show while the delivery text is on its way.
    task: (s) =>
      !s.inbox.includes('delivery1')
        ? ''
        : s.sms_read.has('delivery1')
          ? 'Collect the delivery from the drop box by the gate'
          : 'Check your phone (Q)',
    done: (s) => s.relic === 'held' || s.relic === 'ritual-table',
  },
  {
    id: 'D1-09',
    task: (s) => {
      // The pickup thought plays before the next line.
      if (s.relic === 'held') return s.flags.has('relic-pickup-thought-done') ? 'Put the music box on the ritual table' : '';
      if (!s.flags.has('relic-rattled')) return 'Stand in the holy circle and bless the music box';
      // Nothing new while it rattles and the two thoughts play out.
      if (!s.flags.has('bible-prompted')) return '';
      if (!s.inventory.has('bible') && !s.flags.has('scripture-read')) return 'Pick up the Bible from the stand';
      // Shown again only once the scripture has been read and put away.
      if (!s.flags.has('scripture-read')) return 'Read the music box some scripture';
      // Nothing new while it shudders after the scripture.
      if (!s.flags.has('relic-weakened')) return '';
      return 'Bless the music box again';
    },
    done: (s) => s.flags.has('relic-blessed'),
  },
  {
    // Store the relic, then leave the grounds (decisions 2026-11-09: the walk
    // home and the tree peek end the day). The walk-out line waits for the
    // head-home thought.
    id: 'D1-10',
    task: (s) => {
      if (s.relic === 'relic-table') return s.flags.has('gate-prompted') ? 'Head back to the front gate' : '';
      // Waits until the ghost has gone and the wink thought has played.
      if (!s.flags.has('relic-thought-done')) return '';
      if (s.relic === 'held') return 'Put the music box on the table outside the chapel';
      return 'Put the Bible back on the stand and pick up the music box';
    },
    done: (s) => s.flags.has('returned-to-gate'),
  },
];

/** The chalice and crucifix still to fetch for the ritual table, or '' once both are in hand or set out. */
function altarPiecesLine(s: GameState): string {
  const chalice = s.chalice === 'altar' || s.chalice === 'garden-bench';
  const crucifix = !s.inventory.has('crucifix') && !s.flags.has('crucifix-staged');
  if (chalice && crucifix) return 'Fetch the chalice and crucifix from the altar';
  if (crucifix) return 'Fetch the crucifix from the altar';
  return '';
}

/** Day 2 (doc 6.2): the friendly things begin behaving oddly. Built in S3. */
export const DAY2: Objective[] = [
  {
    // Gate, note, key and candles: the start of every shift (doc 3.2).
    id: 'D2-01',
    task: (s) => {
      // Nothing until the day card and the bus have gone.
      if (!s.flags.has('arrived')) return '';
      if (!s.flags.has('gate-unlocked')) return 'Enter the code on the gate keypad';
      if (!s.flags.has('note-closed')) return 'Read the note on the office desk';
      if (!s.inventory.has('chapel-key')) return 'Take the chapel key from the hooks by the office door';
      if (!s.flags.has('chapel-opened')) return 'Unlock the chapel';
      if (!s.inventory.has('matches')) return 'Pick up the matches from the shelf';
      return `Light the candles around the holy circle (${s.candles_lit.size}/4)`;
    },
    done: (s) => s.day_index === 2 && s.flags.has('note-read') && s.candles_lit.size === 4,
  },
  {
    // The chalice isn't on the altar: a prankster ghost has left it on the
    // west garden bench, and pops up when it's taken (D2-02).
    id: 'D2-02',
    task: (s) => {
      if (s.chalice === 'garden-bench') {
        if (!s.flags.has('chalice-missing')) return altarPiecesLine(s) || 'Fetch the chalice from the altar';
        // Each thought plays out before the next step shows.
        if (!s.flags.has('chalice-missing-thought-done')) return '';
        if (!s.flags.has('crucifix-staged')) {
          if (!s.inventory.has('crucifix')) return 'Fetch the crucifix from the altar';
          // "I'll drop this off first" plays before it's asked for.
          if (!s.flags.has('crucifix-thought-done')) return '';
          return 'Put the crucifix on the ritual table';
        }
        // The checklist under the objective says where to look.
        if (!s.flags.has('church-searched')) return 'Search the church for the chalice';
        if (!s.flags.has('church-searched-thought-done')) return '';
        return 'Search the grounds for the chalice';
      }
      // Found: the scare and its three thoughts play out first.
      return '';
    },
    // Where to look, crossed off as each is checked; it stays up through the
    // "outside somewhere" thought.
    checklist: (s) => {
      if (!churchSealed(s)) return [];
      const done = [s.flags.has('searched-desk'), s.flags.has('searched-storage'), s.flags.has('searched-basement')];
      return SEARCH_CHECKLIST.map((text, i) => ({ text, done: done[i] }));
    },
    done: (s) => s.day_index === 2 && s.chalice !== 'garden-bench' && s.flags.has('prank-focus-done'),
  },
  {
    // Set the table, then the first delivery (D2-03).
    id: 'D2-03',
    task: (s) => {
      if (!tableReady(s)) {
        if (!s.flags.has('crucifix-staged')) return 'Put the crucifix on the ritual table';
        return 'Place the chalice on the ritual table';
      }
      // "There. All set.", then the alert.
      if (!s.inbox.includes('d2delivery1')) return '';
      if (!s.sms_read.has('d2delivery1')) return 'Check your phone (Q)';
      // "Christ-LERTS? Nice." first.
      if (!s.flags.has('alert-thought-done')) return '';
      return 'Collect the delivery from the drop box by the gate';
    },
    done: (s) => s.day_index === 2 && s.relic_kind === 'teacup' && (s.relic === 'held' || s.relic === 'ritual-table'),
  },
  {
    // Scripture and the cross on the first relic, then put it away (D2-04).
    id: 'D2-04',
    task: (s) => {
      const name = RELIC_NAMES[s.relic_kind];
      if (s.relic === 'held' && !s.flags.has('relic-blessed')) {
        return s.flags.has('relic-pickup-thought-done') ? `Put the ${name} on the ritual table` : '';
      }
      if (!s.flags.has('relic-blessed')) {
        if (!s.flags.has('scripture-read')) {
          return s.inventory.has('bible') ? `Read the ${name} some scripture` : 'Pick up the Bible from the stand';
        }
        if (!s.inventory.has('cross')) return 'Take the cross from the chapel shelf';
        return `Stand in the holy circle and bless the ${name}`;
      }
      // Waits until the ghost has gone and its thought has played.
      if (!s.flags.has('relic-thought-done')) return '';
      if (s.relic === 'held') return `Put the ${name} on the table outside the chapel`;
      return `Put the Bible back on the stand and pick up the ${name}`;
    },
    done: (s) => s.day_index === 2 && s.relics_stored.includes('teacup'),
  },
  {
    // The rest of Day 2 comes in the next parts of S3.
    id: 'D2-05',
    task: () => S3_PART1_END,
    done: () => false,
  },
];

/** Every objective in play order. */
const ALL: Objective[] = [...DAY1, ...DAY2];

export function currentObjective(s: GameState): Objective {
  return ALL.find((o) => o.id === s.objective_id) ?? ALL[ALL.length - 1];
}

/**
 * Complete every objective whose condition now holds, in order. Returns the
 * ids completed by this call; calling it again with no change returns none.
 */
export function advanceObjectives(s: GameState): string[] {
  const completed: string[] = [];
  for (;;) {
    const o = currentObjective(s);
    if (!o.done(s)) break;
    const i = ALL.indexOf(o);
    if (i < 0 || i === ALL.length - 1) break;
    s.completed_objectives.push(o.id);
    completed.push(o.id);
    s.objective_id = ALL[i + 1].id;
  }
  return completed;
}
