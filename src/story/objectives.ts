import { S2_END } from '../data/story';
import type { GameState } from '../state/store';
import { tableReady } from './table';

// Day 1 objectives (doc 6.1), built in S1 and S2. Each completes on validated
// state, never on approach, and the sequencer only moves forward. Day 2's
// objectives arrive in S3; until then D2-01 is a placeholder.

export interface Objective {
  id: string;
  /** Task line for the HUD; can depend on progress within the objective. */
  task: (s: GameState) => string;
  done: (s: GameState) => boolean;
}

export const DAY1: Objective[] = [
  {
    id: 'D1-01',
    task: (s) => (s.sms_read.has('gateCode') ? 'Enter the code on the gate keypad' : 'Check your phone (Q)'),
    done: (s) => s.flags.has('gate-unlocked'),
  },
  {
    id: 'D1-02',
    task: () => 'Head up the path into the church',
    done: (s) => s.open_doors.has('church'),
  },
  {
    id: 'D1-03',
    task: (s) => (s.flags.has('note-read') ? 'Take the chapel key from the hooks by the office door' : 'Read the note on the office desk'),
    done: (s) => s.flags.has('note-read') && s.inventory.has('chapel-key'),
  },
  {
    // Preparing the ritual site, part one. The table (D1-05) can be set first
    // or in between; its objective then completes the moment this one does.
    id: 'D1-04',
    task: (s) =>
      s.inventory.has('matches')
        ? `Light the candles around the holy circle (${s.candles_lit.size}/4)`
        : 'Fetch the matches from the chapel shelf',
    done: (s) => s.candles_lit.size === 4,
  },
  {
    // Preparing the ritual site, part two (decisions 2026-11-09, S2 playtest:
    // moved ahead of the first blessing and repeated each day).
    id: 'D1-05',
    task: (s) => {
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
    task: (s) =>
      s.inventory.has('cross') ? 'Stand in the holy circle and bless the clock' : 'Take the cross from the chapel shelf',
    done: (s) => s.flags.has('clock-blessed'),
  },
  {
    id: 'D1-07',
    task: () => "Put the clock on the supervisor's desk",
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
      if (s.relic === 'held') return 'Put the music box on the ritual table';
      if (!s.flags.has('relic-rattled')) return 'Stand in the holy circle and bless the music box';
      // Nothing new until it has gone still and the thought has played.
      if (!s.flags.has('relic-settled')) return '';
      if (!s.flags.has('scripture-read')) return 'Read from the Bible on the stand';
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
      if (s.relic === 'relic-table') return s.flags.has('heading-home') ? 'Head back to the front gate' : '';
      // Waits until the ghost has gone and the wink thought has played.
      if (!s.flags.has('relic-thought-done')) return '';
      return s.relic === 'held'
        ? 'Put the music box on the table outside the chapel'
        : 'Take the music box to the table outside the chapel';
    },
    done: (s) => s.flags.has('returned-to-gate'),
  },
  {
    id: 'D2-01',
    task: () => S2_END,
    done: () => false,
  },
];

export function currentObjective(s: GameState): Objective {
  return DAY1.find((o) => o.id === s.objective_id) ?? DAY1[DAY1.length - 1];
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
    const i = DAY1.indexOf(o);
    if (i < 0 || i === DAY1.length - 1) break;
    s.completed_objectives.push(o.id);
    completed.push(o.id);
    s.objective_id = DAY1[i + 1].id;
  }
  return completed;
}
