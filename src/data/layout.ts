// Monastery grounds greybox layout (S0). PROVISIONAL scale — edit freely after
// walk-time testing. See docs/decisions.md.
//
// Plan coordinates are metres: x = east, y = north, origin at the centre of the
// front gate. Level 0 is ground; level -1 is the basement.

export type Level = 0 | -1;

export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Area {
  id: string;
  label: string;
  rect: Rect;
  level: Level;
  /** Interior rooms get a floor slab and a roof at this height. */
  roof?: number;
  floor?: string;
}

/** Axis-aligned wall from `a` to `b`. Door openings are cut automatically. */
export interface Wall {
  a: [number, number];
  b: [number, number];
  height: number;
  level: Level;
  color?: string;
}

export type LockState = 'unlocked' | 'locked' | 'jammed';

export interface Door {
  id: string;
  label: string;
  /** Centre of the opening, which must sit on a wall line. */
  x: number;
  y: number;
  /** Direction the wall runs: 'x' for an east-west wall, 'y' for north-south. */
  axis: 'x' | 'y';
  width: number;
  height: number;
  level: Level;
  /** Side of the wall the door swings into, as a unit offset along the normal. */
  swing: 1 | -1;
  /** Two leaves hinged at either side of the opening, meeting in the middle. */
  double?: boolean;
}

export interface Prop {
  id: string;
  label: string;
  rect: Rect;
  height: number;
  level: Level;
  color: string;
  shape?: 'box' | 'cylinder' | 'ring' | 'flat';
  /** Props block movement unless marked solid: false. */
  solid?: boolean;
  /** Height the prop starts at above the level floor. */
  base?: number;
}

export interface Transition {
  id: string;
  label: string;
  x: number;
  y: number;
  level: Level;
  to: Spawn;
}

export interface Spawn {
  x: number;
  y: number;
  level: Level;
  /** Radians, 0 = facing north, positive turns east. */
  yaw: number;
}

export interface Teleport extends Spawn {
  key: string;
  label: string;
}

export const LEVEL_BASE: Record<Level, number> = { 0: 0, [-1]: -6 };
export const WALL_THICKNESS = 0.3;
export const PLAYER_RADIUS = 0.3;
export const EYE_HEIGHT = 1.6;

/** Convert a plan point to a Three.js position (x, height, -y). */
export function toWorld(x: number, y: number, level: Level, height = 0): [number, number, number] {
  return [x, LEVEL_BASE[level] + height, -y];
}

const rect = (x1: number, y1: number, x2: number, y2: number): Rect => ({ x1, y1, x2, y2 });

// --- Key dimensions -------------------------------------------------------

const NAVE = rect(-8, 50, 8, 67.4);
const NAVE_H = 7;
const ROOM_H = 3.5;
const PERIMETER = rect(-42, 0, 42, 86);
const PERIMETER_H = 2.6;

// --- Areas (floors, roofs and zones) ---------------------------------------

export const AREAS: Area[] = [
  { id: 'outside', label: 'Outside the gate', rect: rect(-20, -10, 20, 0), level: 0 },
  { id: 'grounds', label: 'Grounds', rect: PERIMETER, level: 0 },
  { id: 'gate', label: 'Front gate', rect: rect(-6, 0, 6, 6), level: 0 },
  { id: 'path', label: 'Central path', rect: rect(-2, 6, 2, 50), level: 0 },
  { id: 'west-garden', label: 'West garden', rect: rect(-38, 42, -18, 68), level: 0 },
  { id: 'east-graves', label: 'East graveyard', rect: rect(17, 26, 39, 66), level: 0 },
  { id: 'west-graves', label: 'West graves', rect: rect(-38, 14, -17, 40), level: 0 },
  { id: 'nave', label: 'Nave', rect: NAVE, level: 0, roof: NAVE_H, floor: '#8a7f72' },
  { id: 'office', label: 'Office', rect: rect(-16.4, 50.6, -8, 56.2), level: 0, roof: ROOM_H, floor: '#6b5338' },
  { id: 'storage', label: 'Storage closet', rect: rect(-10.6, 60.5, -8, 62.9), level: 0, roof: ROOM_H, floor: '#6b5338' },
  { id: 'chapel', label: 'Chapel', rect: rect(8, 50.4, 14.4, 55.8), level: 0, roof: ROOM_H, floor: '#7a6f66' },
  { id: 'stair-annex', label: 'Basement stairs', rect: rect(5.2, 67.4, 14.4, 69.4), level: 0, roof: ROOM_H, floor: '#5d5853' },
  { id: 'shed', label: 'Shed', rect: rect(22, 72, 30, 78), level: 0, roof: 3, floor: '#5a4a36' },
  { id: 'basement', label: 'Basement', rect: rect(-8, 52, 8, 66), level: -1, roof: 3, floor: '#4d4a46' },
];

// --- Walls ---------------------------------------------------------------

/** Four walls around a rect. */
function box(r: Rect, height: number, level: Level = 0, color?: string): Wall[] {
  return [
    { a: [r.x1, r.y1], b: [r.x2, r.y1], height, level, color },
    { a: [r.x1, r.y2], b: [r.x2, r.y2], height, level, color },
    { a: [r.x1, r.y1], b: [r.x1, r.y2], height, level, color },
    { a: [r.x2, r.y1], b: [r.x2, r.y2], height, level, color },
  ];
}

const STONE = '#b8b0a4';
const HEDGE = '#3d5e35';

export const WALLS: Wall[] = [
  // Perimeter wall with the front gate in the south side.
  ...box(PERIMETER, PERIMETER_H, 0, '#8f8679'),
  // Hedge around the strip outside the gate.
  { a: [-20, -10], b: [20, -10], height: 1.2, level: 0, color: HEDGE },
  { a: [-20, -10], b: [-20, 0], height: 1.2, level: 0, color: HEDGE },
  { a: [20, -10], b: [20, 0], height: 1.2, level: 0, color: HEDGE },

  // Church nave.
  ...box(NAVE, NAVE_H, 0, STONE),
  // Office (shares the nave's west wall).
  { a: [-16.4, 50.6], b: [-8, 50.6], height: ROOM_H, level: 0, color: STONE },
  { a: [-16.4, 56.2], b: [-8, 56.2], height: ROOM_H, level: 0, color: STONE },
  { a: [-16.4, 50.6], b: [-16.4, 56.2], height: ROOM_H, level: 0, color: STONE },
  // Storage closet (shares the nave's west wall).
  { a: [-10.6, 60.5], b: [-8, 60.5], height: ROOM_H, level: 0, color: STONE },
  { a: [-10.6, 62.9], b: [-8, 62.9], height: ROOM_H, level: 0, color: STONE },
  { a: [-10.6, 60.5], b: [-10.6, 62.9], height: ROOM_H, level: 0, color: STONE },
  // Chapel (shares the nave's east wall). Windowless, single entrance.
  { a: [8, 50.4], b: [14.4, 50.4], height: ROOM_H, level: 0, color: STONE },
  { a: [8, 55.8], b: [14.4, 55.8], height: ROOM_H, level: 0, color: STONE },
  { a: [14.4, 50.4], b: [14.4, 55.8], height: ROOM_H, level: 0, color: STONE },
  // Stair annex outside the nave's north-east corner.
  { a: [8, 67.4], b: [14.4, 67.4], height: ROOM_H, level: 0, color: STONE },
  { a: [5.2, 69.4], b: [14.4, 69.4], height: ROOM_H, level: 0, color: STONE },
  { a: [5.2, 67.4], b: [5.2, 69.4], height: ROOM_H, level: 0, color: STONE },
  { a: [14.4, 67.4], b: [14.4, 69.4], height: ROOM_H, level: 0, color: STONE },
  // Shed.
  ...box(rect(22, 72, 30, 78), 3, 0, '#7a6248'),

  // Basement: one rectangular storeroom under the nave.
  ...box(rect(-8, 52, 8, 66), 3, -1, '#6e6862'),
];

// --- Doors ---------------------------------------------------------------

export const DOORS: Door[] = [
  { id: 'gate', label: 'Front gate', x: 0, y: 0, axis: 'x', width: 4, height: 2.4, level: 0, swing: 1, double: true },
  { id: 'church', label: 'Church doors', x: 0, y: 50, axis: 'x', width: 3, height: 3.6, level: 0, swing: 1, double: true },
  { id: 'office', label: 'Office door', x: -8, y: 52.9, axis: 'y', width: 1.4, height: 2.3, level: 0, swing: -1 },
  { id: 'storage', label: 'Storage closet', x: -8, y: 61.7, axis: 'y', width: 1.2, height: 2.3, level: 0, swing: -1 },
  { id: 'chapel', label: 'Chapel door', x: 8, y: 52.7, axis: 'y', width: 1.4, height: 2.3, level: 0, swing: 1 },
  { id: 'basement', label: 'Basement door', x: 6.4, y: 67.4, axis: 'x', width: 1.4, height: 2.3, level: 0, swing: 1 },
  { id: 'shed', label: 'Shed door', x: 26, y: 72, axis: 'x', width: 1.6, height: 2.3, level: 0, swing: 1 },
];

// --- Transitions ---------------------------------------------------------

export const TRANSITIONS: Transition[] = [
  {
    id: 'stairs-down',
    label: 'Go down to the basement',
    x: 13.6,
    y: 68.4,
    level: 0,
    to: { x: 6.5, y: 64.5, level: -1, yaw: Math.PI },
  },
  {
    id: 'stairs-up',
    label: 'Go up the stairs',
    x: 7.3,
    y: 65.4,
    level: -1,
    to: { x: 12.6, y: 68.4, level: 0, yaw: -Math.PI / 2 },
  },
];

// --- Props ---------------------------------------------------------------

const WOOD = '#7b5a3a';
const DARK_WOOD = '#4f3824';

function pews(): Prop[] {
  const out: Prop[] = [];
  for (let i = 0; i < 6; i++) {
    const y = 56.4 + i * 1.35;
    out.push({ id: `pew-w${i + 1}`, label: 'Pew', rect: rect(-6.6, y, -1.3, y + 0.6), height: 0.9, level: 0, color: WOOD });
    out.push({ id: `pew-e${i + 1}`, label: 'Pew', rect: rect(1.3, y, 6.6, y + 0.6), height: 0.9, level: 0, color: WOOD });
  }
  return out;
}

/** A grid of headstones starting at (x0, y0), spaced 4 m apart east-west. */
function graveRows(prefix: string, x0: number, y0: number, rows: number, cols: number): Prop[] {
  const out: Prop[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = x0 + col * 4;
      const y = y0 + row * 4.4;
      out.push({ id: `grave-${prefix}${row}-${col}`, label: 'Headstone', rect: rect(x - 0.4, y - 0.12, x + 0.4, y + 0.12), height: 1, level: 0, color: '#9c9a96' });
    }
  }
  return out;
}

function headstones(): Prop[] {
  return [
    ...graveRows('e', 20, 34, 6, 5),
    // Tall headstone the demon perches on (D3-12). Moved to the south end of
    // the east graves so it reads as distant from the shed doorway; see
    // docs/decisions.md.
    { id: 'grave-tall', label: 'Tall headstone', rect: rect(27.4, 30.4, 28.6, 30.7), height: 1.8, level: 0, color: '#8a8884' },
    // West graves, south of the garden (doc 4.1 "West garden + graves").
    ...graveRows('w', -34, 18, 5, 4),
  ];
}

function trees(): Prop[] {
  const spots: [number, number][] = [
    [-34, 46], [-35, 63], [-20, 45], [-38, 28], [-12, 20], [12, 18], [34, 22], [38, 70], [-38, 80], [-10, 80], [10, 80],
  ];
  return spots.map(([x, y], i) => ({
    id: `tree-${i + 1}`,
    label: 'Tree',
    rect: rect(x - 0.35, y - 0.35, x + 0.35, y + 0.35),
    height: 5,
    level: 0 as Level,
    color: '#4a3a2a',
    shape: 'cylinder' as const,
  }));
}

export const PROPS: Prop[] = [
  // Ground features.
  { id: 'path', label: 'Cobblestone path', rect: rect(-1.5, 0, 1.5, 50), height: 0.02, level: 0, color: '#9b958b', shape: 'flat', solid: false },
  { id: 'road', label: 'Road', rect: rect(-20, -10, 20, -6), height: 0.02, level: 0, color: '#4b4b4f', shape: 'flat', solid: false },
  { id: 'drop-box', label: 'Relic drop box', rect: rect(3.2, -0.6, 4.2, 0.6), height: 1.3, level: 0, color: '#3b4a5a' },
  { id: 'gate-keypad', label: 'Gate keypad', rect: rect(-2.7, -0.35, -2.3, -0.15), height: 1.4, level: 0, color: '#2d2d2d' },

  // West garden.
  { id: 'fountain', label: 'Holy water fountain', rect: rect(-28.2, 53.8, -25.8, 56.2), height: 0.9, level: 0, color: '#a7b4bb', shape: 'cylinder' },
  { id: 'garden-bench', label: 'Garden bench', rect: rect(-28.5, 50.2, -25.5, 50.8), height: 0.5, level: 0, color: WOOD },
  { id: 'bed-1', label: 'Flower bed', rect: rect(-35, 52, -31, 58), height: 0.3, level: 0, color: '#5c7a3c' },
  { id: 'bed-2', label: 'Flower bed', rect: rect(-23, 52, -20, 58), height: 0.3, level: 0, color: '#5c7a3c' },
  { id: 'old-priest-grave', label: "Old priest's grave", rect: rect(-21.6, 62.6, -20.4, 62.9), height: 1.2, level: 0, color: '#8d8a83' },
  { id: 'old-priest-plot', label: "Old priest's plot", rect: rect(-21.5, 60.4, -20.5, 62.5), height: 0.05, level: 0, color: '#5a4632', shape: 'flat', solid: false },

  ...headstones(),
  ...trees(),

  // Nave.
  ...pews(),
  { id: 'aisle', label: 'Aisle carpet', rect: rect(-0.8, 50.2, 0.8, 64.6), height: 0.02, level: 0, color: '#a11d22', shape: 'flat', solid: false },
  { id: 'altar', label: 'Altar', rect: rect(-2.8, 64.8, 2.8, 66.3), height: 1.1, level: 0, color: '#c8c3ba' },
  { id: 'relic-table', label: 'Cleaned-relic table', rect: rect(6.9, 50.3, 7.85, 51.8), height: 0.85, level: 0, color: WOOD },
  { id: 'keys', label: 'Key hooks', rect: rect(-7.85, 51.1, -7.75, 51.6), height: 0.3, level: 0, color: '#e08a1e', base: 1.4, solid: false },

  // Office.
  { id: 'office-desk', label: 'Desk', rect: rect(-14.6, 51.2, -13.6, 54.2), height: 0.8, level: 0, color: DARK_WOOD },
  { id: 'office-phone', label: 'Landline phone', rect: rect(-14.35, 53.3, -13.9, 53.7), height: 0.12, level: 0, color: '#1e1e1e', base: 0.8, solid: false },
  { id: 'office-shelf', label: 'Bookshelf', rect: rect(-16.1, 55.3, -8.4, 55.9), height: 2.2, level: 0, color: DARK_WOOD },

  // Chapel.
  { id: 'chapel-supply', label: 'Supply shelf', rect: rect(8.3, 53.4, 8.8, 55.5), height: 1.2, level: 0, color: WOOD },
  { id: 'ritual-table', label: 'Ritual table', rect: rect(12.9, 52.3, 14.0, 54.3), height: 0.9, level: 0, color: DARK_WOOD },
  { id: 'holy-circle', label: 'Holy circle', rect: rect(10.5, 52.2, 12.3, 54.0), height: 0.03, level: 0, color: '#3aa0e0', shape: 'ring', solid: false },
  { id: 'bible-stand', label: 'Bible stand', rect: rect(11.8, 54.4, 12.3, 54.9), height: 1.1, level: 0, color: '#3540a8' },

  // Shed.
  { id: 'shed-bench', label: 'Workbench', rect: rect(22.4, 76.6, 26, 77.6), height: 0.9, level: 0, color: WOOD },

  // Basement shelving: two aisles so there are alternative routes (Day 3 swaps).
  { id: 'shelf-b1', label: 'Shelf', rect: rect(-6, 55.5, -1, 56.1), height: 2.4, level: -1, color: '#6d5a44' },
  { id: 'shelf-b2', label: 'Shelf', rect: rect(1, 55.5, 6, 56.1), height: 2.4, level: -1, color: '#6d5a44' },
  { id: 'shelf-b3', label: 'Shelf', rect: rect(-6, 59.5, -1, 60.1), height: 2.4, level: -1, color: '#6d5a44' },
  { id: 'shelf-b4', label: 'Shelf', rect: rect(1, 59.5, 6, 60.1), height: 2.4, level: -1, color: '#6d5a44' },
  { id: 'shelf-far', label: 'Far shelf', rect: rect(-7.6, 52.6, -5, 53.2), height: 2.4, level: -1, color: '#6d5a44' },
  { id: 'basement-table', label: 'Reading table', rect: rect(-6, 63, -4, 64.2), height: 0.8, level: -1, color: DARK_WOOD },
  { id: 'stairs-foot', label: 'Stairs', rect: rect(7, 64.6, 7.9, 66), height: 0.4, level: -1, color: '#5d5853', solid: false },
  { id: 'stairs-head', label: 'Stairs down', rect: rect(13.2, 67.6, 14.2, 69.2), height: 0.05, level: 0, color: '#2a2724', shape: 'flat', solid: false },
];

// --- Spawns and debug teleports -------------------------------------------

export const ARRIVAL: Spawn = { x: 0, y: -5, level: 0, yaw: 0 };

export const TELEPORTS: Teleport[] = [
  { key: '1', label: 'Arrival (outside gate)', ...ARRIVAL },
  { key: '2', label: 'Inside gate', x: 0, y: 3, level: 0, yaw: 0 },
  { key: '3', label: 'Church doors', x: 0, y: 47, level: 0, yaw: 0 },
  { key: '4', label: 'Nave', x: 0, y: 54, level: 0, yaw: 0 },
  { key: '5', label: 'Office', x: -11, y: 53.4, level: 0, yaw: -Math.PI / 2 },
  { key: '6', label: 'Chapel', x: 9.6, y: 52.7, level: 0, yaw: Math.PI / 2 },
  { key: '7', label: 'Storage closet', x: -9.3, y: 61.7, level: 0, yaw: -Math.PI / 2 },
  { key: '8', label: 'Basement', x: 6.5, y: 64.5, level: -1, yaw: Math.PI },
  { key: '9', label: 'Shed doorway', x: 26, y: 70.5, level: 0, yaw: Math.PI },
  { key: '0', label: 'West garden', x: -24, y: 52, level: 0, yaw: -Math.PI / 2 },
  { key: '-', label: 'East graveyard', x: 22, y: 28, level: 0, yaw: 0 },
  { key: '=', label: 'West graves', x: -20, y: 16, level: 0, yaw: -Math.PI / 4 },
];
