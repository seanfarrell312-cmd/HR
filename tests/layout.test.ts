import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DOOR_PRESETS } from '../src/data/doorPresets';
import { AREAS, DOORS, PLAYER_RADIUS, PROPS, TELEPORTS, TRANSITIONS, WALLS } from '../src/data/layout';
import { CANDLES, SPOTS, TREE_PEEK } from '../src/data/story';
import { buildWorld, poseDoor } from '../src/world/build';
import { blocked, doorOnWall, staticColliders } from '../src/world/collision';
import { zoneAt } from '../src/world/zones';

const area = (id: string) => {
  const a = AREAS.find((x) => x.id === id);
  if (!a) throw new Error(`no area ${id}`);
  return a;
};
const centreX = (id: string) => (area(id).rect.x1 + area(id).rect.x2) / 2;

describe('church orientation (L01/L02, docs/decisions.md)', () => {
  it('puts the office and storage west of the nave and the chapel east', () => {
    expect(centreX('office')).toBeLessThan(area('nave').rect.x1 + 0.01);
    expect(centreX('storage')).toBeLessThan(area('nave').rect.x1 + 0.01);
    expect(centreX('chapel')).toBeGreaterThan(area('nave').rect.x2 - 0.01);
  });

  it('has the church north of the gate and the basement stairs in the north-east', () => {
    const nave = area('nave').rect;
    expect(nave.y1).toBeGreaterThan(0);
    const basementDoor = DOORS.find((d) => d.id === 'basement')!;
    expect(basementDoor.y).toBeCloseTo(nave.y2);
    expect(basementDoor.x).toBeGreaterThan(0);
  });
});

describe('layout data', () => {
  it('places every door on exactly one wall', () => {
    for (const d of DOORS) {
      const hosts = WALLS.filter((w) => doorOnWall(d, w));
      expect(hosts.length, d.id).toBe(1);
    }
  });

  it('gives the chapel a single entrance', () => {
    const chapel = area('chapel').rect;
    const entrances = DOORS.filter(
      (d) => d.x >= chapel.x1 - 0.01 && d.x <= chapel.x2 + 0.01 && d.y >= chapel.y1 - 0.01 && d.y <= chapel.y2 + 0.01,
    );
    expect(entrances.map((d) => d.id)).toEqual(['chapel']);
  });

  it('folds the chapel door back into the empty south-west corner of the chapel', () => {
    // Pose the real door mesh fully open and look at where the leaf ends up.
    const view = buildWorld().doors.get('chapel')!;
    view.amount = 1;
    poseDoor(view);
    const box = new THREE.Box3();
    for (const { pivot } of view.leaves) {
      pivot.updateMatrixWorld(true);
      box.expandByObject(pivot);
    }
    // Plan rect: x = world x, y = -world z.
    const leaf = { x1: box.min.x, x2: box.max.x, y1: -box.max.z, y2: -box.min.z };
    const chapel = area('chapel').rect;
    const door = DOORS.find((d) => d.id === 'chapel')!;
    // Inside the chapel, flat against its west wall, south of the doorway.
    expect(leaf.x1).toBeGreaterThan(chapel.x1);
    expect(leaf.x2).toBeLessThan(chapel.x1 + 0.55);
    expect(leaf.y1).toBeGreaterThan(chapel.y1);
    expect(leaf.y2).toBeLessThanOrEqual(door.y - door.width / 2 + 0.01);
    // Nothing in the chapel sits in that corner.
    const clear = (r: { x1: number; y1: number; x2: number; y2: number }) =>
      !(leaf.x1 < r.x2 && leaf.x2 > r.x1 && leaf.y1 < r.y2 && leaf.y2 > r.y1);
    for (const p of PROPS.filter((p) => p.level === 0)) expect(clear(p.rect), p.id).toBe(true);
    for (const c of [...CANDLES, SPOTS.matches, SPOTS.cross, SPOTS.clockRitual]) {
      expect(clear({ x1: c.x - 0.15, y1: c.y - 0.15, x2: c.x + 0.15, y2: c.y + 0.15 })).toBe(true);
    }
  });

  it('puts the peeking ghost behind the tree nearest the gate', () => {
    const trees = PROPS.filter((p) => p.id.startsWith('tree'));
    const centre = (p: (typeof trees)[number]) => ({ x: (p.rect.x1 + p.rect.x2) / 2, y: (p.rect.y1 + p.rect.y2) / 2 });
    const nearest = trees.reduce((best, t) => (Math.hypot(centre(t).x, centre(t).y) < Math.hypot(centre(best).x, centre(best).y) ? t : best));
    expect(centre(nearest)).toEqual({ x: TREE_PEEK.x, y: TREE_PEEK.y });
    expect((nearest.rect.x2 - nearest.rect.x1) / 2).toBeCloseTo(TREE_PEEK.trunk);
    // Seen from the path long before it ducks away.
    expect(Math.hypot(TREE_PEEK.x, TREE_PEEK.y - 10)).toBeGreaterThan(TREE_PEEK.trigger);
  });

  it('keeps the chapel key inside the office, by its door', () => {
    expect(zoneAt(SPOTS.chapelKey.x, SPOTS.chapelKey.y, 0)?.id).toBe('office');
    const hooks = PROPS.find((p) => p.id === 'keys')!.rect;
    expect(zoneAt((hooks.x1 + hooks.x2) / 2, (hooks.y1 + hooks.y2) / 2, 0)?.id).toBe('office');
  });

  it('only locks doors that exist', () => {
    const ids = new Set(DOORS.map((d) => d.id));
    for (const p of DOOR_PRESETS) for (const id of Object.keys(p.locks)) expect(ids.has(id), `${p.id}:${id}`).toBe(true);
  });

  it('keeps teleports and transition landings clear of obstacles', () => {
    const cs = staticColliders();
    for (const t of TELEPORTS) expect(blocked(t.x, t.y, t.level, PLAYER_RADIUS, cs), t.label).toBe(false);
    for (const t of TRANSITIONS) expect(blocked(t.to.x, t.to.y, t.to.level, PLAYER_RADIUS, cs), t.id).toBe(false);
  });

  it('names the zone each teleport lands in', () => {
    const expected: Record<string, string> = {
      '1': 'outside',
      '4': 'nave',
      '5': 'office',
      '6': 'chapel',
      '7': 'storage',
      '8': 'basement',
      '0': 'west-garden',
      '-': 'east-graves',
      '=': 'west-graves',
    };
    for (const [key, zone] of Object.entries(expected)) {
      const t = TELEPORTS.find((x) => x.key === key)!;
      expect(zoneAt(t.x, t.y, t.level)?.id, t.label).toBe(zone);
    }
  });
});
