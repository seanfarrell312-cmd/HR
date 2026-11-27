import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { DOOR_PRESETS } from '../src/data/doorPresets';
import { AREAS, DOORS, PLAYER_RADIUS, PROPS, roofRect, TELEPORTS, TRANSITIONS, WALL_THICKNESS, WALLS, type Rect } from '../src/data/layout';
import { CANDLES, SPOTS, TREE_PEEK } from '../src/data/story';
import { buildWorld, poseDoor } from '../src/world/build';
import { blocked, doorOnWall, doorSweepRect, staticColliders, wallSegments } from '../src/world/collision';
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

  it('centres the ritual table on the holy circle, against the east wall (2026-11-27)', () => {
    const table = PROPS.find((p) => p.id === 'ritual-table')!.rect;
    const circle = PROPS.find((p) => p.id === 'holy-circle')!.rect;
    const chapel = area('chapel').rect;
    // Straight ahead from the middle of the circle, facing east.
    expect((table.y1 + table.y2) / 2).toBeCloseTo((circle.y1 + circle.y2) / 2, 5);
    expect(chapel.x2 - WALL_THICKNESS / 2 - table.x2).toBeLessThan(0.15);
    // The relic, clock, chalice and crucifix spots sit on it, centred the same way.
    for (const s of [SPOTS.relicRitual, SPOTS.clockRitual, SPOTS.chaliceRitual, SPOTS.crucifixRitual]) {
      expect(s.y).toBeGreaterThan(table.y1);
      expect(s.y).toBeLessThan(table.y2);
    }
    expect(SPOTS.relicRitual.y).toBeCloseTo((circle.y1 + circle.y2) / 2, 5);
    expect((SPOTS.chaliceRitual.y + SPOTS.crucifixRitual.y) / 2).toBeCloseTo(SPOTS.relicRitual.y, 5);
  });

  it('furnishes the storage closet clear of its door (2026-11-28)', () => {
    const closet = area('storage').rect;
    const sweep = doorSweepRect(DOORS.find((d) => d.id === 'storage')!);
    const inner = { x1: closet.x1 + WALL_THICKNESS / 2, y1: closet.y1 + WALL_THICKNESS / 2, x2: closet.x2 - WALL_THICKNESS / 2, y2: closet.y2 - WALL_THICKNESS / 2 };
    const overlaps = (a: Rect, b: Rect) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
    const inside = PROPS.filter((p) => p.id.startsWith('closet-'));
    expect(inside.filter((p) => p.label === 'Shelf')).toHaveLength(6);
    expect(inside.filter((p) => p.label === 'Placeholder').length).toBeGreaterThan(5);
    for (const p of inside) {
      expect(p.rect.x1, p.id).toBeGreaterThanOrEqual(inner.x1 - 1e-9);
      expect(p.rect.x2, p.id).toBeLessThanOrEqual(inner.x2 + 1e-9);
      expect(p.rect.y1, p.id).toBeGreaterThanOrEqual(inner.y1 - 1e-9);
      expect(p.rect.y2, p.id).toBeLessThanOrEqual(inner.y2 + 1e-9);
      expect(overlaps(p.rect, sweep), p.id).toBe(false);
    }
    // The bucket stands on the floor in front of the shelves, out of the door's way.
    const b = SPOTS.bucketCloset;
    const bucket = { x1: b.x - 0.15, y1: b.y - 0.15, x2: b.x + 0.15, y2: b.y + 0.15 };
    expect(overlaps(bucket, sweep)).toBe(false);
    for (const p of inside.filter((p) => p.solid !== false)) expect(overlaps(bucket, p.rect), p.id).toBe(false);
    // Just above the floor slab (top at 0.01), not sunk into it.
    expect(b.z).toBeGreaterThan(0.01);
    expect(SPOTS.bucketChapel.z).toBeGreaterThan(0.01);
    // The rod lies on the bottom shelf, its head over the bucket.
    const shelf = PROPS.find((p) => p.id === 'closet-shelves-west-0')!;
    const r = SPOTS.rodCloset;
    expect(r.x).toBeGreaterThan(shelf.rect.x1);
    expect(r.x).toBeLessThan(shelf.rect.x2);
    expect(r.z).toBeGreaterThanOrEqual((shelf.base ?? 0) + shelf.height);
    expect(r.z).toBeLessThan((shelf.base ?? 0) + 0.15);
    expect(Math.abs(r.y - 0.37 - b.y)).toBeLessThan(0.2);
    // The debug teleport into the closet lands in open floor.
    const spawn = TELEPORTS.find((s) => s.label === 'Storage closet')!;
    expect(blocked(spawn.x, spawn.y, 0, PLAYER_RADIUS, staticColliders())).toBe(false);
  });

  it("puts the old priest's grave south of the garden, headstone at the south end (2026-12-01)", () => {
    const stone = PROPS.find((p) => p.id === 'old-priest-grave')!.rect;
    const plot = PROPS.find((p) => p.id === 'old-priest-plot')!.rect;
    const fence = PROPS.find((p) => p.id === 'garden-fence-e')!.rect;
    // South of the garden's fence line, east of its gateway, so the walk
    // from the church to the gateway passes just north of it.
    expect(plot.y2).toBeLessThan(fence.y1);
    expect(stone.y2).toBeLessThanOrEqual(plot.y1);
    expect(plot.x1).toBeGreaterThan(PROPS.find((p) => p.id === 'garden-gatepost-e')!.rect.x2);
    // Nothing solid on it or crowding the headstone.
    const solid = staticColliders().filter((c) => c.level === 0 && c.id !== 'old-priest-grave');
    for (const c of solid) {
      const r = c.rect;
      const overlaps = r.x1 < plot.x2 + 0.3 && r.x2 > plot.x1 - 0.3 && r.y1 < plot.y2 && r.y2 > stone.y1;
      expect(overlaps, c.id).toBe(false);
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

describe('room roofs', () => {
  // A roof edge lying exactly on a taller wall's face z-fights with it: the
  // side-room ceilings showed as flickering brown bars inside the nave.
  it('never end flush with the face of a taller wall', () => {
    const t = WALL_THICKNESS / 2;
    for (const a of AREAS) {
      if (a.roof === undefined) continue;
      const r = roofRect(a.rect);
      for (const w of WALLS) {
        if (w.level !== a.level || w.height <= a.roof) continue;
        const ew = w.a[1] === w.b[1];
        const lo = Math.min(ew ? w.a[0] : w.a[1], ew ? w.b[0] : w.b[1]);
        const hi = Math.max(ew ? w.a[0] : w.a[1], ew ? w.b[0] : w.b[1]);
        const line = ew ? w.a[1] : w.a[0];
        // Only walls alongside the roof matter.
        const [r1, r2] = ew ? [r.x1, r.x2] : [r.y1, r.y2];
        if (r2 <= lo || r1 >= hi) continue;
        for (const edge of ew ? [r.y1, r.y2] : [r.x1, r.x2]) {
          for (const face of [line - t, line + t]) {
            expect(Math.abs(edge - face), `${a.id} roof vs wall at ${line}`).toBeGreaterThan(0.01);
          }
        }
      }
    }
  });

  it('still cover their own walls', () => {
    for (const a of AREAS) {
      if (a.roof === undefined) continue;
      const r = roofRect(a.rect);
      expect(r.x1).toBeLessThan(a.rect.x1);
      expect(r.y2).toBeGreaterThan(a.rect.y2);
    }
  });
});

describe('west garden (concept layout, decisions 2026-11-14)', () => {
  const prop = (id: string) => {
    const p = PROPS.find((x) => x.id === id);
    if (!p) throw new Error(`no prop ${id}`);
    return p;
  };
  const garden = area('west-garden').rect;

  it('is hedged on the north, west and east, taller than eye height', () => {
    expect(prop('hedge-n').rect.y2).toBeCloseTo(garden.y2);
    expect(prop('hedge-w').rect.x1).toBeCloseTo(garden.x1);
    expect(prop('hedge-e').rect.x2).toBeCloseTo(garden.x2);
    for (const id of ['hedge-n', 'hedge-w', 'hedge-e']) expect(prop(id).height).toBeGreaterThan(1.6);
  });

  it('has a low fence on the south with a walk-through gateway lined up with the fountain', () => {
    const w = prop('garden-fence-w');
    const e = prop('garden-fence-e');
    for (const f of [w, e]) {
      expect(f.rect.y1).toBeLessThan(garden.y1 + 0.1);
      expect(f.height).toBeLessThan(1.6);
    }
    const cs = staticColliders();
    const gx = (prop('garden-gatepost-w').rect.x2 + prop('garden-gatepost-e').rect.x1) / 2;
    expect(blocked(gx, garden.y1, 0, PLAYER_RADIUS, cs)).toBe(false);
    const f = prop('fountain').rect;
    expect((f.x1 + f.x2) / 2).toBeCloseTo(gx);
  });

  it('puts a bench down each side of the fountain', () => {
    const f = prop('fountain').rect;
    expect(prop('garden-bench-w').rect.x2).toBeLessThan(f.x1);
    expect(prop('garden-bench-e').rect.x1).toBeGreaterThan(f.x2);
  });

  it("keeps the old priest's lone grave outside the east hedge, clear of the office", () => {
    const grave = prop('old-priest-grave').rect;
    expect(grave.x1).toBeGreaterThan(prop('hedge-e').rect.x2);
    expect(grave.x2).toBeLessThan(area('office').rect.x1);
  });
});

describe('wall faces', () => {
  // Two walls of different colours with a face in the same plane z-fight:
  // the road hedge flickered through the perimeter wall's north face where
  // its end met the wall (S3 playtest, 2026-11-15).
  it('never put faces of different-coloured walls in the same plane', () => {
    const segs = wallSegments().filter((s) => s.color);
    const overlap = (a1: number, a2: number, b1: number, b2: number) => Math.min(a2, b2) - Math.max(a1, b1) > 1e-6;
    const same = (p: number, q: number) => Math.abs(p - q) < 1e-6;
    const clashes: string[] = [];
    for (const a of segs) {
      for (const b of segs) {
        if (a === b || a.level !== b.level || a.color === b.color) continue;
        const r = a.rect;
        const q = b.rect;
        const spanY = overlap(r.y1, r.y2, q.y1, q.y2);
        const spanX = overlap(r.x1, r.x2, q.x1, q.x2);
        if (spanY && ((same(r.x1, q.x1) && r.x1 < q.x2) || (same(r.x2, q.x2) && r.x2 > q.x1))) clashes.push(`${a.color}/${b.color} at x ${r.x1}..${r.x2}`);
        if (spanX && ((same(r.y1, q.y1) && r.y1 < q.y2) || (same(r.y2, q.y2) && r.y2 > q.y1))) clashes.push(`${a.color}/${b.color} at y ${r.y1}..${r.y2}`);
      }
    }
    expect(clashes).toEqual([]);
  });
});
