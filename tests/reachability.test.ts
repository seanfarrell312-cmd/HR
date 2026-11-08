import { describe, expect, it } from 'vitest';
import { AREAS, ARRIVAL, DOORS, PLAYER_RADIUS, TRANSITIONS, type Level } from '../src/data/layout';
import { blocked, closedDoorColliders, staticColliders } from '../src/world/collision';
import { createInitialState, type GameState } from '../src/state/store';
import { lockState } from '../src/world/interact';
import { zoneAt } from '../src/world/zones';

// Flood-fill the walkable grid from the arrival point, the way a player would
// walk it, and report which zones were reached. Transitions link levels.

const STEP = 0.25;
const BOUNDS = { x1: -44, y1: -12, x2: 44, y2: 88 };

function reachableZones(openDoors: Set<string>): Set<string> {
  const colliders = [...staticColliders(), ...closedDoorColliders(openDoors)];
  const seen = new Set<string>();
  const zones = new Set<string>();
  const queue: [number, number, Level][] = [];
  const key = (i: number, j: number, l: Level) => `${l}:${i}:${j}`;
  const push = (x: number, y: number, l: Level) => {
    const i = Math.round(x / STEP);
    const j = Math.round(y / STEP);
    const k = key(i, j, l);
    if (seen.has(k)) return;
    seen.add(k);
    const px = i * STEP;
    const py = j * STEP;
    if (px < BOUNDS.x1 || px > BOUNDS.x2 || py < BOUNDS.y1 || py > BOUNDS.y2) return;
    if (blocked(px, py, l, PLAYER_RADIUS, colliders)) return;
    queue.push([px, py, l]);
  };

  push(ARRIVAL.x, ARRIVAL.y, ARRIVAL.level);
  while (queue.length) {
    const [x, y, l] = queue.pop()!;
    const z = zoneAt(x, y, l);
    if (z) zones.add(z.id);
    for (const t of TRANSITIONS) {
      if (t.level === l && Math.hypot(t.x - x, t.y - y) < 0.9) push(t.to.x, t.to.y, t.to.level);
    }
    push(x + STEP, y, l);
    push(x - STEP, y, l);
    push(x, y + STEP, l);
    push(x, y - STEP, l);
  }
  return zones;
}

/** Doors the player could open in this state, all of them opened. */
function openableDoors(state: GameState): Set<string> {
  return new Set(DOORS.filter((d) => lockState(state, d.id) === 'unlocked').map((d) => d.id));
}

describe('reachability', () => {
  it('reaches every zone with every door open', () => {
    const zones = reachableZones(new Set(DOORS.map((d) => d.id)));
    for (const a of AREAS) expect(zones.has(a.id), a.id).toBe(true);
  });

  it('cannot leave the arrival strip with every door shut', () => {
    const zones = reachableZones(new Set());
    expect([...zones].sort()).toEqual(['outside']);
  });

  it('on Day 1, keeps the player outside until the gate code is entered', () => {
    const zones = reachableZones(openableDoors(createInitialState('day1-start')));
    expect([...zones].sort()).toEqual(['outside']);
  });

  it('after the gate code, reaches the nave and office but not the locked rooms', () => {
    const s = createInitialState('day1-start');
    s.flags.add('gate-unlocked');
    const zones = reachableZones(openableDoors(s));
    for (const id of ['outside', 'gate', 'path', 'west-garden', 'east-graves', 'nave', 'office']) {
      expect(zones.has(id), id).toBe(true);
    }
    for (const id of ['chapel', 'storage', 'stair-annex', 'basement', 'shed']) {
      expect(zones.has(id), id).toBe(false);
    }
  });

  it('with the chapel key, reaches the chapel and the holy circle inside it', () => {
    const s = createInitialState('day1-start');
    s.flags.add('gate-unlocked');
    s.inventory.add('chapel-key');
    const zones = reachableZones(openableDoors(s));
    expect(zones.has('chapel')).toBe(true);
    expect(zones.has('storage')).toBe(false);
  });
});
