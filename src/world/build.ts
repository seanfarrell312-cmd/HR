import * as THREE from 'three';
import {
  AREAS,
  DOORS,
  PROPS,
  TRANSITIONS,
  WALL_THICKNESS,
  toWorld,
  type Door,
  type Prop,
  type Rect,
} from '../data/layout';
import { wallSegments } from './collision';

export interface DoorView {
  door: Door;
  /** Pivot at the hinge; rotate around y to swing. */
  pivot: THREE.Group;
  /** Current swing, 0 = closed, 1 = fully open. */
  amount: number;
  target: number;
}

export interface WorldView {
  root: THREE.Group;
  doors: Map<string, DoorView>;
  /** Meshes the interaction ray can hit, including walls so they block it. */
  raycastTargets: THREE.Object3D[];
}

const materials = new Map<string, THREE.MeshLambertMaterial>();
function mat(color: string): THREE.MeshLambertMaterial {
  let m = materials.get(color);
  if (!m) {
    m = new THREE.MeshLambertMaterial({ color, flatShading: true });
    materials.set(color, m);
  }
  return m;
}

/** A box spanning a plan rect, from `base` to `base + height` above the level floor. */
function boxMesh(r: Rect, level: 0 | -1, base: number, height: number, color: string): THREE.Mesh {
  const w = r.x2 - r.x1;
  const d = r.y2 - r.y1;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat(color));
  mesh.position.set(...toWorld((r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2, level, base + height / 2));
  return mesh;
}

function propMesh(p: Prop): THREE.Object3D {
  const base = p.base ?? 0;
  const w = p.rect.x2 - p.rect.x1;
  const d = p.rect.y2 - p.rect.y1;
  const cx = (p.rect.x1 + p.rect.x2) / 2;
  const cy = (p.rect.y1 + p.rect.y2) / 2;
  switch (p.shape) {
    case 'cylinder': {
      const radius = Math.min(w, d) / 2;
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, p.height, 8), mat(p.color));
      mesh.position.set(...toWorld(cx, cy, p.level, base + p.height / 2));
      if (p.id.startsWith('tree')) {
        const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.2, 0), mat('#456b34'));
        crown.position.set(0, p.height / 2 + 1.2, 0);
        mesh.add(crown);
      }
      return mesh;
    }
    case 'ring': {
      const outer = Math.min(w, d) / 2;
      const mesh = new THREE.Mesh(
        new THREE.RingGeometry(outer * 0.85, outer, 24),
        new THREE.MeshBasicMaterial({ color: p.color, side: THREE.DoubleSide }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(...toWorld(cx, cy, p.level, base + 0.03));
      return mesh;
    }
    case 'flat': {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(p.color));
      mesh.rotation.x = -Math.PI / 2;
      // Lift clear of the floor slab (top at 0.01) so the two don't z-fight.
      mesh.position.set(...toWorld(cx, cy, p.level, base + p.height + 0.03));
      return mesh;
    }
    default:
      return boxMesh(p.rect, p.level, base, p.height, p.color);
  }
}

function doorView(door: Door): DoorView {
  const t = WALL_THICKNESS * 0.6;
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(door.width, door.height, t),
    mat(door.id === 'gate' ? '#2b2b2b' : door.id === 'church' ? '#5a3a20' : '#6e4a2c'),
  );
  // Hinge on the low end of the opening; the panel extends along the wall.
  const pivot = new THREE.Group();
  if (door.axis === 'x') {
    pivot.position.set(...toWorld(door.x - door.width / 2, door.y, door.level));
    panel.position.set(door.width / 2, door.height / 2, 0);
  } else {
    pivot.position.set(...toWorld(door.x, door.y - door.width / 2, door.level));
    pivot.rotation.y = Math.PI / 2;
    panel.position.set(door.width / 2, door.height / 2, 0);
  }
  panel.userData.interactId = `door:${door.id}`;
  pivot.add(panel);
  pivot.userData.baseRotation = pivot.rotation.y;
  return { door, pivot, amount: 0, target: 0 };
}

/** Apply a door's current swing amount to its pivot. */
export function poseDoor(v: DoorView): void {
  // Local -z is plan north for an x-axis door and plan west (after the base
  // rotation) for a y-axis door; the sign picks which side it swings into.
  const dir = v.door.axis === 'x' ? v.door.swing : -v.door.swing;
  v.pivot.rotation.y = v.pivot.userData.baseRotation + dir * v.amount * (Math.PI / 2) * 0.95;
}

export function buildWorld(): WorldView {
  const root = new THREE.Group();
  const raycastTargets: THREE.Object3D[] = [];

  // Ground.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), mat('#5f7f45'));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, -40);
  root.add(ground);

  // Interior floors and roofs.
  for (const a of AREAS) {
    if (a.roof === undefined) continue;
    const floor = boxMesh(a.rect, a.level, -0.1, 0.11, a.floor ?? '#777');
    root.add(floor);
    const roof = boxMesh(
      { x1: a.rect.x1 - 0.15, y1: a.rect.y1 - 0.15, x2: a.rect.x2 + 0.15, y2: a.rect.y2 + 0.15 },
      a.level,
      a.roof,
      0.25,
      a.level === 0 ? '#9a8478' : '#6a6560',
    );
    root.add(roof);
  }
  // Walls, with lintels above every door opening.
  for (const s of wallSegments()) {
    const mesh = boxMesh(s.rect, s.level, 0, s.height, s.color ?? '#aaa');
    root.add(mesh);
    raycastTargets.push(mesh);
  }
  for (const d of DOORS) {
    const host = wallHeightAt(d);
    if (host > d.height) {
      const t = WALL_THICKNESS / 2;
      const r: Rect =
        d.axis === 'x'
          ? { x1: d.x - d.width / 2, y1: d.y - t, x2: d.x + d.width / 2, y2: d.y + t }
          : { x1: d.x - t, y1: d.y - d.width / 2, x2: d.x + t, y2: d.y + d.width / 2 };
      const lintel = boxMesh(r, d.level, d.height, host - d.height, '#a59d92');
      root.add(lintel);
      raycastTargets.push(lintel);
    }
  }

  for (const p of PROPS) {
    const mesh = propMesh(p);
    root.add(mesh);
    raycastTargets.push(mesh);
  }

  const doors = new Map<string, DoorView>();
  for (const d of DOORS) {
    const v = doorView(d);
    doors.set(d.id, v);
    root.add(v.pivot);
    raycastTargets.push(v.pivot);
  }

  // Transitions get an invisible-ish marker the player can aim at.
  for (const t of TRANSITIONS) {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 2, 0.9),
      new THREE.MeshBasicMaterial({ color: '#ffd36a', transparent: true, opacity: 0.18, depthWrite: false }),
    );
    marker.position.set(...toWorld(t.x, t.y, t.level, 1));
    marker.userData.interactId = `transition:${t.id}`;
    root.add(marker);
    raycastTargets.push(marker);
  }

  return { root, doors, raycastTargets };
}

function wallHeightAt(d: Door): number {
  let best = 0;
  for (const s of wallSegments()) {
    if (s.level !== d.level) continue;
    const r = s.rect;
    const touches =
      d.axis === 'x'
        ? d.y >= r.y1 && d.y <= r.y2 && (Math.abs(r.x2 - (d.x - d.width / 2)) < 0.2 || Math.abs(r.x1 - (d.x + d.width / 2)) < 0.2)
        : d.x >= r.x1 && d.x <= r.x2 && (Math.abs(r.y2 - (d.y - d.width / 2)) < 0.2 || Math.abs(r.y1 - (d.y + d.width / 2)) < 0.2);
    if (touches) best = Math.max(best, s.height);
  }
  return best;
}
