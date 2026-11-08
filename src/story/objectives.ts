import { S1_END } from '../data/story';
import type { GameState } from '../state/store';

// Day 1 objectives built in S1 (doc 6.1). Each completes on validated state,
// never on approach, and the sequencer only moves forward.

export interface Objective {
  id: string;
  /** Task line for the HUD; can depend on progress within the objective. */
  task: (s: GameState) => string;
  done: (s: GameState) => boolean;
}

export const DAY1: Objective[] = [
  {
    id: 'D1-01',
    task: (s) => (s.flags.has('sms-read') ? 'Enter the code on the gate keypad' : 'Check your phone (Q)'),
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
    id: 'D1-04',
    task: (s) =>
      s.inventory.has('matches')
        ? `Light the candles around the holy circle (${s.candles_lit.size}/4)`
        : 'Fetch the matches from the chapel shelf',
    done: (s) => s.candles_lit.size === 4,
  },
  {
    id: 'D1-05',
    task: (s) =>
      s.inventory.has('crucifix')
        ? 'Stand in the holy circle and bless the clock'
        : 'Take the crucifix from the chapel shelf',
    done: (s) => s.flags.has('clock-blessed'),
  },
  {
    id: 'D1-06',
    task: () => "Put the clock on the supervisor's desk",
    done: (s) => s.clock === 'office-desk',
  },
  {
    id: 'D1-07',
    task: () => S1_END,
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
