import {
  DOORS,
  LEVEL_BASE,
  PROPS,
  WALLS,
  WALL_THICKNESS,
  type Door,
  type Level,
  type Rect,
  type Wall,
} from '../data/layout';

export interface Collider {
  id: string;
  rect: Rect;
  level: Level;
}

export interface WallSegment {
  rect: Rect;
  level: Level;
  height: number;
  color?: string;
}

const EPS = 1e-6;

/** True when the door's centre lies on the wall's line, within its span. */
export function doorOnWall(door: Door, wall: Wall): boolean {
  if (door.level !== wall.level) return false;
  const [ax, ay] = wall.a;
  const [bx, by] = wall.b;
  if (door.axis === 'x' && Math.abs(ay - by) < EPS) {
    return Math.abs(door.y - ay) < EPS && door.x > Math.min(ax, bx) && door.x < Math.max(ax, bx);
  }
  if (door.axis === 'y' && Math.abs(ax - bx) < EPS) {
    return Math.abs(door.x - ax) < EPS && door.y > Math.min(ay, by) && door.y < Math.max(ay, by);
  }
  return false;
}

/** Split walls into solid segments, leaving a gap for every door on them. */
export function wallSegments(walls: Wall[] = WALLS, doors: Door[] = DOORS): WallSegment[] {
  const t = WALL_THICKNESS / 2;
  const out: WallSegment[] = [];
  for (const wall of walls) {
    const horizontal = Math.abs(wall.a[1] - wall.b[1]) < EPS;
    const start = horizontal ? Math.min(wall.a[0], wall.b[0]) : Math.min(wall.a[1], wall.b[1]);
    const end = horizontal ? Math.max(wall.a[0], wall.b[0]) : Math.max(wall.a[1], wall.b[1]);
    const line = horizontal ? wall.a[1] : wall.a[0];
    const gaps = doors
      .filter((d) => doorOnWall(d, wall))
      .map((d) => {
        const c = horizontal ? d.x : d.y;
        return [c - d.width / 2, c + d.width / 2] as const;
      })
      .sort((p, q) => p[0] - q[0]);

    let cursor = start;
    const pieces: [number, number][] = [];
    for (const [g1, g2] of gaps) {
      if (g1 > cursor) pieces.push([cursor, g1]);
      cursor = Math.max(cursor, g2);
    }
    if (cursor < end) pieces.push([cursor, end]);

    for (const [p1, p2] of pieces) {
      // Extend the wall's true ends by half the thickness so corners close
      // cleanly; ends at a door opening stay flush with it.
      const e1 = p1 === start ? p1 - t : p1;
      const e2 = p2 === end ? p2 + t : p2;
      const r: Rect = horizontal
        ? { x1: e1, y1: line - t, x2: e2, y2: line + t }
        : { x1: line - t, y1: e1, x2: line + t, y2: e2 };
      out.push({ rect: r, level: wall.level, height: wall.height, color: wall.color });
    }
  }
  return out;
}

/** The rectangle a closed door occupies. */
export function doorRect(door: Door): Rect {
  const t = WALL_THICKNESS / 2;
  const h = door.width / 2;
  return door.axis === 'x'
    ? { x1: door.x - h, y1: door.y - t, x2: door.x + h, y2: door.y + t }
    : { x1: door.x - t, y1: door.y - h, x2: door.x + t, y2: door.y + h };
}

/**
 * The area a door's leaves sweep through as it opens or shuts, on both sides
 * of the wall. A door that shuts itself waits while anyone stands in it.
 */
export function doorSweepRect(door: Door): Rect {
  const r = doorRect(door);
  const leaf = door.double ? door.width / 2 : door.width;
  return door.axis === 'x'
    ? { x1: r.x1, y1: r.y1 - leaf, x2: r.x2, y2: r.y2 + leaf }
    : { x1: r.x1 - leaf, y1: r.y1, x2: r.x2 + leaf, y2: r.y2 };
}

/** Everything that blocks movement, except doors (which come and go). */
export function staticColliders(): Collider[] {
  const walls = wallSegments().map((s, i) => ({ id: `wall-${i}`, rect: s.rect, level: s.level }));
  const props = PROPS.filter((p) => p.solid !== false && p.shape !== 'flat' && p.shape !== 'ring').map((p) => ({
    id: p.id,
    rect: p.rect,
    level: p.level,
  }));
  return [...walls, ...props];
}

export function closedDoorColliders(openDoors: ReadonlySet<string>): Collider[] {
  return DOORS.filter((d) => !openDoors.has(d.id)).map((d) => ({ id: `door-${d.id}`, rect: doorRect(d), level: d.level }));
}

/** True when a circle overlaps the rectangle. */
export function circleHitsRect(x: number, y: number, r: number, rc: Rect): boolean {
  const cx = Math.max(rc.x1, Math.min(x, rc.x2));
  const cy = Math.max(rc.y1, Math.min(y, rc.y2));
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy < r * r - EPS;
}

export function blocked(x: number, y: number, level: Level, r: number, colliders: Collider[]): boolean {
  return colliders.some((c) => c.level === level && circleHitsRect(x, y, r, c.rect));
}

/** Push a circle out of one rectangle. Returns the corrected position. */
function pushOut(x: number, y: number, r: number, rc: Rect): [number, number] {
  const cx = Math.max(rc.x1, Math.min(x, rc.x2));
  const cy = Math.max(rc.y1, Math.min(y, rc.y2));
  let dx = x - cx;
  let dy = y - cy;
  const d2 = dx * dx + dy * dy;
  if (d2 >= r * r) return [x, y];
  if (d2 > EPS) {
    const d = Math.sqrt(d2);
    return [cx + (dx / d) * r, cy + (dy / d) * r];
  }
  // Centre is inside the rectangle: leave by the nearest side.
  const exits: [number, number, number][] = [
    [x - rc.x1, rc.x1 - r, y],
    [rc.x2 - x, rc.x2 + r, y],
    [y - rc.y1, x, rc.y1 - r],
    [rc.y2 - y, x, rc.y2 + r],
  ];
  exits.sort((p, q) => p[0] - q[0]);
  dx = exits[0][1];
  dy = exits[0][2];
  return [dx, dy];
}

const MAX_STEP = 0.1;

/**
 * Move a circle by (dx, dy), sliding along anything it hits. The move is split
 * into short sub-steps so fast movement cannot tunnel through thin walls.
 */
export function moveCircle(
  x: number,
  y: number,
  dx: number,
  dy: number,
  level: Level,
  r: number,
  colliders: Collider[],
): [number, number] {
  const near = colliders.filter((c) => c.level === level);
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / MAX_STEP));
  for (let s = 0; s < steps; s++) {
    x += dx / steps;
    y += dy / steps;
    for (let pass = 0; pass < 3; pass++) {
      let moved = false;
      for (const c of near) {
        if (!circleHitsRect(x, y, r, c.rect)) continue;
        [x, y] = pushOut(x, y, r, c.rect);
        moved = true;
      }
      if (!moved) break;
    }
  }
  return [x, y];
}

export function floorHeight(level: Level): number {
  return LEVEL_BASE[level];
}
