import { DOOR_PRESETS, LOCK_MESSAGES } from '../data/doorPresets';
import { DOORS, PLAYER_RADIUS, TRANSITIONS, type Level, type LockState, type Spawn } from '../data/layout';
import type { GameState } from '../state/store';
import { circleHitsRect, doorRect } from './collision';

export type Action =
  | { kind: 'toggle-door'; doorId: string }
  | { kind: 'travel'; to: Spawn }
  | { kind: 'message'; text: string }
  | { kind: 'none' };

export interface Resolution {
  /** Short verb line shown under the crosshair. */
  prompt: string;
  action: Action;
}

export function lockState(state: GameState, doorId: string): LockState {
  const preset = DOOR_PRESETS.find((p) => p.id === state.door_preset);
  return preset?.locks[doorId] ?? 'unlocked';
}

/**
 * Decide what pressing E on a target does. Never mutates state: the caller
 * applies the action, so repeated presses can't fire anything twice.
 */
export function resolve(
  targetId: string | null,
  state: GameState,
  player: { x: number; y: number; level: Level },
): Resolution {
  if (!targetId) return { prompt: '', action: { kind: 'none' } };
  const [kind, id] = targetId.split(':');

  if (kind === 'door') {
    const door = DOORS.find((d) => d.id === id);
    if (!door) return { prompt: '', action: { kind: 'none' } };
    const lock = lockState(state, id);
    if (lock !== 'unlocked') {
      return { prompt: `${door.label} — ${lock}`, action: { kind: 'message', text: LOCK_MESSAGES[lock] } };
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
    if (!t) return { prompt: '', action: { kind: 'none' } };
    return { prompt: `E  ${t.label}`, action: { kind: 'travel', to: t.to } };
  }

  return { prompt: '', action: { kind: 'none' } };
}
