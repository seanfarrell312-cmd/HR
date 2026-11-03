import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/state/store';
import { resolve } from '../src/world/interact';

const outside = { x: 0, y: 40, level: 0 as const };

describe('interaction resolver', () => {
  it('opens and closes an unlocked door', () => {
    const state = createInitialState();
    expect(resolve('door:church', state, outside).action).toEqual({ kind: 'toggle-door', doorId: 'church' });
    expect(resolve('door:church', state, outside).prompt).toMatch(/^E {2}Open/);
    state.open_doors.add('church');
    expect(resolve('door:church', state, outside).prompt).toMatch(/^E {2}Close/);
  });

  it('gives lock feedback instead of opening on the Day 1 preset', () => {
    const state = createInitialState('day1-start');
    expect(resolve('door:chapel', state, outside).action).toEqual({ kind: 'message', text: "It's locked." });
    expect(resolve('door:shed', state, outside).action).toEqual({ kind: 'message', text: "It's jammed shut." });
  });

  it('unlocks everything on the all-open preset', () => {
    const state = createInitialState('all-open');
    expect(resolve('door:shed', state, outside).action.kind).toBe('toggle-door');
  });

  it('refuses to close a door on a player standing in the doorway', () => {
    const state = createInitialState();
    state.open_doors.add('church');
    const inDoorway = { x: 0, y: 50, level: 0 as const };
    expect(resolve('door:church', state, inDoorway).action.kind).toBe('message');
  });

  it('does nothing without a target', () => {
    expect(resolve(null, createInitialState(), outside)).toEqual({ prompt: '', action: { kind: 'none' } });
  });
});
