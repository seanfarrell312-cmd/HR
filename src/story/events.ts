import { GATE_CODE, S1_END, SMS, THOUGHTS } from '../data/story';
import type { GameState, QuestItem } from '../state/store';
import { advanceObjectives } from './objectives';

// The single place story state changes. Every event is validated against the
// current state and is a no-op when it has already happened, so key spam,
// repeated holds or re-entering a zone can never fire anything twice.

export type StoryEvent =
  | { type: 'receive-sms'; id: string }
  | { type: 'read-sms' }
  | { type: 'keypad-submit'; code: string }
  | { type: 'read-note' }
  | { type: 'take'; item: QuestItem }
  | { type: 'light-candle'; index: number }
  | { type: 'bless-clock' }
  | { type: 'pickup-clock' }
  | { type: 'place-clock' }
  | { type: 'door-opened'; id: string };

export type SfxId = 'buzz' | 'beep' | 'error' | 'unlock' | 'pickup' | 'strike' | 'release' | 'place' | 'paper';

export type Effect =
  | { kind: 'sfx'; id: SfxId }
  | { kind: 'say'; text: string }
  | { kind: 'flash'; text: string }
  | { kind: 'open-door'; id: string }
  | { kind: 'sms'; id: string }
  | { kind: 'ghost' }
  | { kind: 'objective'; id: string };

export function applyEvent(s: GameState, e: StoryEvent): Effect[] {
  const out: Effect[] = [];
  switch (e.type) {
    case 'receive-sms':
      if (!SMS[e.id] || s.inbox.includes(e.id)) return [];
      s.inbox.push(e.id);
      out.push({ kind: 'sfx', id: 'buzz' }, { kind: 'sms', id: e.id });
      break;

    case 'read-sms':
      if (s.inbox.length === 0 || s.flags.has('sms-read')) return [];
      s.flags.add('sms-read');
      break;

    case 'keypad-submit':
      if (s.flags.has('gate-unlocked')) return [];
      if (e.code !== GATE_CODE) {
        out.push({ kind: 'sfx', id: 'error' }, { kind: 'flash', text: 'Wrong code.' });
        return out;
      }
      s.flags.add('gate-unlocked');
      out.push({ kind: 'sfx', id: 'unlock' }, { kind: 'open-door', id: 'gate' }, { kind: 'say', text: THOUGHTS.gateOpen });
      break;

    case 'read-note':
      if (s.flags.has('note-read')) return [];
      s.flags.add('note-read');
      out.push({ kind: 'sfx', id: 'paper' });
      break;

    case 'take':
      if (s.inventory.has(e.item)) return [];
      if (e.item === 'chapel-key' && !s.flags.has('note-read')) {
        return [{ kind: 'say', text: THOUGHTS.keyBeforeNote }];
      }
      s.inventory.add(e.item);
      out.push({ kind: 'sfx', id: 'pickup' });
      break;

    case 'light-candle':
      if (e.index < 0 || e.index > 3 || s.candles_lit.has(e.index)) return [];
      if (!s.inventory.has('matches')) return [{ kind: 'flash', text: 'I need the matches from the shelf.' }];
      s.candles_lit.add(e.index);
      out.push({ kind: 'sfx', id: 'strike' });
      break;

    case 'bless-clock': {
      if (s.flags.has('clock-blessed')) return [];
      const why = blessBlocker(s);
      if (why) return [{ kind: 'flash', text: why }];
      s.flags.add('clock-blessed');
      s.fired_scares.push('d1-clock-ghost');
      out.push({ kind: 'sfx', id: 'release' }, { kind: 'ghost' }, { kind: 'say', text: THOUGHTS.ghost });
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

    case 'door-opened':
      // Only matters for objectives; the door itself is already open.
      break;
  }

  for (const id of advanceObjectives(s)) out.push({ kind: 'objective', id });
  if (s.objective_id === 'D1-07' && !s.flags.has('s1-complete')) {
    s.flags.add('s1-complete');
    out.push({ kind: 'flash', text: S1_END });
  }
  return out;
}

/** Why the clock can't be blessed yet, or null when it can (player position aside). */
export function blessBlocker(s: GameState): string | null {
  if (s.clock !== 'ritual-table') return 'The clock needs to be on the ritual table.';
  if (s.candles_lit.size < 4) return 'The candles need lighting first.';
  if (!s.inventory.has('crucifix')) return 'I need the crucifix from the shelf.';
  return null;
}
