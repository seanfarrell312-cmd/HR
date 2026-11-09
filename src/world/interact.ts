import { DOOR_PRESETS, LOCK_MESSAGES } from '../data/doorPresets';
import { DOORS, PLAYER_RADIUS, TRANSITIONS, type Level, type LockState, type Spawn } from '../data/layout';
import { HOLY_CIRCLE, REMINDERS } from '../data/story';
import type { GameState } from '../state/store';
import { blessBlocker, type StoryEvent } from '../story/events';
import { circleHitsRect, doorRect } from './collision';

export type Action =
  | { kind: 'toggle-door'; doorId: string }
  | { kind: 'travel'; to: Spawn }
  | { kind: 'message'; text: string }
  | { kind: 'story'; event: StoryEvent }
  | { kind: 'open-keypad' }
  | { kind: 'read-note' }
  | { kind: 'read-bible' }
  | { kind: 'none' };

export interface Resolution {
  /** Short verb line shown under the crosshair. */
  prompt: string;
  /** What pressing E does. */
  action: Action;
  /** What holding the primary button completes, when the target supports it. */
  hold?: StoryEvent;
}

type Player = { x: number; y: number; level: Level };

const NONE: Resolution = { prompt: '', action: { kind: 'none' } };

export function lockState(state: GameState, doorId: string): LockState {
  // Story progress unlocks doors the preset starts locked.
  if (doorId === 'gate' && state.flags.has('gate-unlocked')) return 'unlocked';
  if (doorId === 'chapel' && state.inventory.has('chapel-key')) return 'unlocked';
  const preset = DOOR_PRESETS.find((p) => p.id === state.door_preset);
  return preset?.locks[doorId] ?? 'unlocked';
}

export function inHolyCircle(p: Player): boolean {
  return p.level === 0 && Math.hypot(p.x - HOLY_CIRCLE.x, p.y - HOLY_CIRCLE.y) <= HOLY_CIRCLE.r;
}

/**
 * Decide what pressing E (or holding the primary button) on a target does.
 * Never mutates state: the caller applies the action, so repeated presses
 * can't fire anything twice.
 */
export function resolve(targetId: string | null, state: GameState, player: Player): Resolution {
  if (!targetId) return NONE;
  const [kind, id] = targetId.split(':');

  if (kind === 'door') {
    const door = DOORS.find((d) => d.id === id);
    if (!door) return NONE;
    const lock = lockState(state, id);
    if (lock !== 'unlocked') {
      const text = id === 'gate' ? "It's locked. There's a keypad beside it." : LOCK_MESSAGES[lock];
      return { prompt: `${door.label} — ${lock}`, action: { kind: 'message', text } };
    }
    if (state.open_doors.has(id)) {
      // Never swing a door shut onto the player.
      if (player.level === door.level && circleHitsRect(player.x, player.y, PLAYER_RADIUS + 0.05, doorRect(door))) {
        return { prompt: `${door.label}`, action: { kind: 'message', text: 'Step out of the doorway first.' } };
      }
      return { prompt: `E  Close ${door.label.toLowerCase()}`, action: { kind: 'toggle-door', doorId: id } };
    }
    return { prompt: `E  Open ${door.label.toLowerCase()}`, action: { kind: 'toggle-door', doorId: id } };
  }

  if (kind === 'transition') {
    const t = TRANSITIONS.find((tr) => tr.id === id);
    if (!t) return NONE;
    return { prompt: `E  ${t.label}`, action: { kind: 'travel', to: t.to } };
  }

  if (kind === 'item') return resolveItem(id, state, player);
  return NONE;
}

const story = (prompt: string, event: StoryEvent): Resolution => ({ prompt, action: { kind: 'story', event } });
const say = (prompt: string, text: string): Resolution => ({ prompt, action: { kind: 'message', text } });

function resolveItem(id: string, s: GameState, player: Player): Resolution {
  if (id.startsWith('candle-')) {
    const index = Number(id.slice('candle-'.length));
    if (s.candles_lit.has(index)) return NONE;
    if (!s.inventory.has('matches')) return say('Candle', 'I need the matches from the shelf.');
    return story('E  Light candle', { type: 'light-candle', index });
  }

  switch (id) {
    case 'keypad':
      if (s.flags.has('gate-unlocked')) return NONE;
      return { prompt: 'E  Use keypad', action: { kind: 'open-keypad' } };
    case 'drop-box':
      if (s.relic === 'none') return say('Relic drop box', REMINDERS.dropBoxEmpty);
      if (s.relic !== 'drop-box') return NONE;
      // Deliveries go in from the road; staff take them out from inside the gate.
      if (player.y < 0) return say('Relic drop box', REMINDERS.hatchInside);
      if (s.held_prop_id) return say('Relic drop box', REMINDERS.handsFull);
      return story('E  Take the delivery', { type: 'take-relic' });
    case 'office-note':
      return { prompt: 'E  Read note', action: { kind: 'read-note' } };
    case 'chapel-key':
      if (s.inventory.has('chapel-key')) return NONE;
      return story('E  Take chapel key', { type: 'take', item: 'chapel-key' });
    case 'matches':
      if (s.inventory.has('matches')) return NONE;
      return story('E  Take matches', { type: 'take', item: 'matches' });
    case 'crucifix':
      if (s.inventory.has('crucifix')) return NONE;
      return story('E  Take crucifix', { type: 'take', item: 'crucifix' });
    case 'clock': {
      if (s.clock !== 'ritual-table') return NONE;
      if (s.flags.has('clock-blessed')) {
        if (s.held_prop_id) return say('Mantel clock', 'My hands are full.');
        return story('E  Pick up clock', { type: 'pickup-clock' });
      }
      const why = blessBlocker(s) ?? (inHolyCircle(player) ? null : 'I should stand in the holy circle.');
      if (why) return say('Mantel clock', why);
      return {
        prompt: 'Hold click  Bless the clock',
        action: { kind: 'message', text: 'Hold the left mouse button to bless it.' },
        hold: { type: 'bless-clock' },
      };
    }
    case 'office-desk':
      if (s.clock !== 'held') return NONE;
      return story('E  Put the clock down', { type: 'place-clock' });

    case 'chalice':
      if (s.chalice !== 'altar') return NONE;
      if (s.clock !== 'office-desk') return say('Chalice', REMINDERS.chaliceEarly);
      if (s.held_prop_id) return say('Chalice', REMINDERS.handsFull);
      return story('E  Take the chalice', { type: 'pickup-chalice' });

    case 'ritual-table':
      if (s.held_prop_id === 'chalice') return story('E  Set out the chalice and crucifix', { type: 'stage-chalice' });
      if (s.held_prop_id === 'music-box' && s.relic === 'held' && !s.flags.has('relic-blessed')) {
        if (s.chalice !== 'ritual-table') return say('Ritual table', REMINDERS.tableNotReady);
        return story('E  Put the music box down', { type: 'place-relic' });
      }
      return NONE;

    case 'music-box': {
      if (s.relic !== 'ritual-table') return NONE;
      if (s.flags.has('relic-blessed')) {
        if (s.held_prop_id) return say('Music box', REMINDERS.handsFull);
        return story('E  Pick up music box', { type: 'pickup-relic' });
      }
      if (!inHolyCircle(player)) return say('Music box', REMINDERS.standInCircle);
      if (s.flags.has('relic-rattled') && !s.flags.has('scripture-read')) return say('Music box', REMINDERS.scriptureFirst);
      return {
        prompt: 'Hold click  Bless the music box',
        action: { kind: 'message', text: 'Hold the left mouse button to bless it.' },
        hold: { type: 'bless-relic' },
      };
    }

    case 'bible':
      if (!s.flags.has('relic-rattled') || s.flags.has('scripture-read')) return NONE;
      return { prompt: 'E  Read scripture', action: { kind: 'read-bible' } };

    case 'relic-table':
      if (s.held_prop_id !== 'music-box' || !s.flags.has('relic-blessed')) return NONE;
      return story('E  Put the music box on the table', { type: 'store-relic' });
  }
  return NONE;
}
