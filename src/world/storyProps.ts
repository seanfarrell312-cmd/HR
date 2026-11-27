import * as THREE from 'three';
import { AREAS, DOORS, PROPS, toWorld } from '../data/layout';
import {
  CANDLES,
  CLOWN_DANCE_SECONDS,
  CLOWN_WIGGLE_SECONDS,
  GRAVES_LOOP,
  HOLY_CIRCLE,
  ONLOOKERS,
  PRANK_SECONDS,
  PURIFY,
  RATTLE_SECONDS,
  RELIC_TABLE_SLOTS,
  SPLASH_STRIKE,
  SPOT_RANGE,
  SPOTS,
  STAND_IN_FRONT,
  TREE_PEEK,
  WORRIED_SPOT,
  type ItemSpot,
} from '../data/story';
import type { GameState, RelicKind } from '../state/store';
import { clownRoaming, ghostsChasing, worriedShown, type PurifiedRelic, type Spotted } from '../story/events';
import { zoneAt } from './zones';
import { siteReady } from '../story/table';
import { clownModel, danceStand, heldClownQuaternion, HELD_CLOWN, poseClown, type ClownView } from './clown';
import { ghostModel, type GhostModel } from './ghost';

// Story items whose look follows game state (S1 placeholders). `sync` is
// called every frame and derives everything from state, so a reset or a
// debug jump never leaves a stale prop behind. Only the purification (sparkles
// and ghost), the tree ghost ducking away and the bus are timed effects.

const lambert = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });
const basic = (color: string, opacity = 1) =>
  new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });

function at(obj: THREE.Object3D, s: ItemSpot): THREE.Object3D {
  obj.position.set(...toWorld(s.x, s.y, 0, s.z));
  return obj;
}

function tagged(obj: THREE.Object3D, id: string): THREE.Object3D {
  obj.userData.interactId = `item:${id}`;
  return obj;
}

function clockModel(): THREE.Group {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.34, 0.2), lambert('#4a2e1a'));
  body.position.y = 0.17;
  const top = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 8, 1, false, 0, Math.PI), lambert('#4a2e1a'));
  top.rotation.z = Math.PI / 2;
  top.rotation.y = Math.PI / 2;
  top.position.y = 0.34;
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.11, 12), basic('#efe6cf'));
  face.position.set(0, 0.19, 0.101);
  const hand = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.08, 0.005), basic('#222'));
  hand.position.set(0, 0.22, 0.104);
  g.add(body, top, face, hand);
  return g;
}

/** The small hand cross held up for blessings. */
function crossModel(): THREE.Group {
  const g = new THREE.Group();
  const m = lambert('#c9a43a');
  const upright = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.02), m);
  upright.position.y = 0.15;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), m);
  bar.position.y = 0.21;
  g.add(upright, bar);
  return g;
}

/** The larger standing crucifix: a stepped flat base, a taller cross and a small figure. */
function standingCrucifixModel(): THREE.Group {
  const g = new THREE.Group();
  const m = lambert('#d4af37');
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.11), m);
  base.position.y = 0.015;
  const step = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.03, 0.07), m);
  step.position.y = 0.045;
  const upright = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.42, 0.025), m);
  upright.position.y = 0.27;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.025), m);
  bar.position.y = 0.38;
  const figure = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.11, 0.012), lambert('#efe4c8'));
  figure.position.set(0, 0.33, 0.018);
  const arms = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.016, 0.012), lambert('#efe4c8'));
  arms.position.set(0, 0.375, 0.018);
  g.add(base, step, upright, bar, figure, arms);
  return g;
}

/**
 * A Bible lying open: a dark red cover with two pages rising in a shallow V.
 * Spine along local z; read from the +z edge.
 */
/** Turn of the Bible on its stand so its reading edge faces the circle centre. */
const BIBLE_FACING = Math.atan2(HOLY_CIRCLE.x - SPOTS.bible.x, -(HOLY_CIRCLE.y - SPOTS.bible.y));

function openBookModel(): THREE.Group {
  const g = new THREE.Group();
  const cover = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 0.22), lambert('#5a1e1e'));
  cover.position.y = 0.01;
  g.add(cover);
  for (const side of [-1, 1]) {
    const page = new THREE.Group();
    page.position.set(0, 0.02, 0);
    page.rotation.z = side * -0.12;
    const sheet = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.018, 0.2), lambert('#f2ead6'));
    sheet.position.set(side * 0.072, 0.009, 0);
    page.add(sheet);
    // A few lines of print.
    for (let i = 0; i < 5; i++) {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.1, 0.008), basic('#6b6257'));
      line.rotation.x = -Math.PI / 2;
      line.position.set(side * 0.072, 0.0185, -0.07 + i * 0.035);
      page.add(line);
    }
    g.add(page);
  }
  return g;
}

function chaliceModel(): THREE.Group {
  const pts = [
    [0.001, 0], [0.065, 0], [0.065, 0.012], [0.02, 0.03], [0.014, 0.1], [0.02, 0.12],
    [0.06, 0.16], [0.07, 0.23], [0.064, 0.232], [0.054, 0.165], [0.001, 0.135],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 12), lambert('#d4af37')));
  return g;
}

interface MusicBoxView {
  group: THREE.Group;
  /** Pivot at the lid's back edge; rotation.x = -angle opens it. */
  lid: THREE.Group;
}

/** A small wooden music box with a hinged lid and a gold comb inside. */
function musicBoxModel(): MusicBoxView {
  const g = new THREE.Group();
  const wood = lambert('#7a3b2e');
  const gold = lambert('#d4af37');
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.16), wood);
  body.position.y = 0.05;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.245, 0.015, 0.165), gold);
  band.position.y = 0.08;
  const comb = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8), gold);
  comb.rotation.z = Math.PI / 2;
  comb.position.set(0, 0.1, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.1, -0.08);
  const lidBoard = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.16), wood);
  lidBoard.position.set(0, 0.01, 0.08);
  const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.11), basic('#c9d6dc'));
  mirror.rotation.x = Math.PI / 2;
  mirror.position.set(0, -0.001, 0.08);
  lid.add(lidBoard, mirror);
  g.add(body, band, comb, lid);
  return { group: g, lid };
}

/**
 * An old brass hand bell, mouth down, with a turned wooden handle (Day 2's
 * third relic, a PLACEHOLDER). `userData.bell` is the part that shakes;
 * `userData.clapper` swings inside it.
 */
function bellModel(): THREE.Group {
  const g = new THREE.Group();
  const bell = new THREE.Group();
  const brass = new THREE.MeshLambertMaterial({ color: '#c59a3a', emissive: '#3a2a08', flatShading: true, side: THREE.DoubleSide });
  const pts = [[0.001, 0.095], [0.022, 0.095], [0.03, 0.085], [0.036, 0.06], [0.042, 0.03], [0.055, 0.008], [0.062, 0], [0.058, 0]].map(
    ([x, y]) => new THREE.Vector2(x, y),
  );
  bell.add(new THREE.Mesh(new THREE.LatheGeometry(pts, 12), brass));
  const lip = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.005, 4, 14), brass);
  lip.rotation.x = Math.PI / 2;
  lip.position.y = 0.003;
  const wood = lambert('#5a3a22');
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.016, 8), wood);
  collar.position.y = 0.103;
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.014, 0.09, 8), wood);
  handle.position.y = 0.155;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), wood);
  knob.position.y = 0.205;
  const clapper = new THREE.Group();
  clapper.position.y = 0.085;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.06, 4), lambert('#3b3b3b'));
  rod.position.y = -0.03;
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.011, 6, 5), lambert('#3b3b3b'));
  ball.position.y = -0.062;
  clapper.add(rod, ball);
  bell.add(lip, collar, handle, knob, clapper);
  g.add(bell);
  g.userData.bell = bell;
  g.userData.clapper = clapper;
  return g;
}

/** The Bible stand as a story prop, so it can move in front of the ritual table (D2-11). */
const STAND_PROP = PROPS.find((p) => p.id === 'bible-stand')!;
/** Where the stand is, on the plan, and its footprint there. */
export function bibleStandRect(s: GameState): { x1: number; y1: number; x2: number; y2: number } {
  const r = STAND_PROP.rect;
  if (!s.flags.has('bible-stand-moved')) return r;
  const hw = (r.x2 - r.x1) / 2;
  const hd = (r.y2 - r.y1) / 2;
  return { x1: STAND_IN_FRONT.x - hw, y1: STAND_IN_FRONT.y - hd, x2: STAND_IN_FRONT.x + hw, y2: STAND_IN_FRONT.y + hd };
}
/** The Bible, open on top of the stand, turned to face the middle of the holy circle. */
const bibleFacing = (x: number, y: number): number => Math.atan2(HOLY_CIRCLE.x - x, -(HOLY_CIRCLE.y - y));
/** How far the lectern's top, and the Bible on it, slopes down towards the reader. */
export const LECTERN_TILT = 0.3;

/**
 * A placeholder lectern (2026-12-01): a base, a post and a top that slopes
 * down towards the reader at LECTERN_TILT, so the open Bible lies flat on
 * it instead of cutting into a flat-topped block. It faces along +z; the
 * caller turns it towards the circle.
 */
function lecternModel(height: number, color: string): THREE.Group {
  const g = new THREE.Group();
  const wood = lambert(color);
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.42), wood);
  base.position.y = 0.025;
  const postH = height - 0.1;
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, postH, 0.12), wood);
  post.position.y = postH / 2;
  const top = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.34), wood);
  top.rotation.x = LECTERN_TILT;
  top.position.y = height - 0.02;
  // A lip along the low edge the book rests against.
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.02), wood);
  lip.rotation.x = LECTERN_TILT;
  lip.position.set(0, height - 0.02 - 0.17 * Math.sin(LECTERN_TILT) + 0.02, 0.17 * Math.cos(LECTERN_TILT));
  g.add(base, post, top, lip);
  return g;
}

/** A china teacup on its saucer (Day 2's first relic, a PLACEHOLDER). */
function teacupModel(): THREE.Group {
  const g = new THREE.Group();
  const china = lambert('#f3efe6');
  const blue = lambert('#3d62a8');
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.06, 0.015, 14), china);
  saucer.position.y = 0.0075;
  const cupPts = [[0.001, 0], [0.03, 0], [0.034, 0.006], [0.055, 0.06], [0.05, 0.06], [0.03, 0.012], [0.001, 0.012]].map(
    ([x, y]) => new THREE.Vector2(x, y),
  );
  const cup = new THREE.Group();
  cup.position.y = 0.015;
  cup.add(new THREE.Mesh(new THREE.LatheGeometry(cupPts, 14), china));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.053, 0.05, 0.008, 14, 1, true), blue);
  band.position.y = 0.05;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.018, 0.005, 5, 10), china);
  handle.position.set(0.058, 0.035, 0);
  cup.add(band, handle);
  g.add(saucer, cup);
  g.userData.cup = cup;
  return g;
}

/** A metal pail with a wire handle; `userData.water` shows when it's filled (D2-06). */
function bucketModel(): THREE.Group {
  const g = new THREE.Group();
  const metal = new THREE.MeshLambertMaterial({ color: '#8f989e', flatShading: true, side: THREE.DoubleSide });
  const pail = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.12, 0.27, 10, 1, true), metal);
  pail.position.y = 0.135;
  const base = new THREE.Mesh(new THREE.CircleGeometry(0.12, 10), metal);
  base.rotation.x = -Math.PI / 2;
  base.position.y = 0.005;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.008, 4, 14), lambert('#a9b1b6'));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.27;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.006, 4, 12, Math.PI), lambert('#5d6266'));
  handle.position.y = 0.27;
  const water = new THREE.Mesh(new THREE.CircleGeometry(0.142, 12), basic('#5aa7d8', 0.9));
  water.rotation.x = -Math.PI / 2;
  water.position.y = 0.23;
  g.add(pail, base, rim, handle, water);
  g.userData.water = water;
  return g;
}

/** The holy-water rod (aspergillum): a wooden handle with a pierced silver ball. */
export function rodModel(): THREE.Group {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.32, 6), lambert('#6b4a2b'));
  handle.position.y = 0.16;
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 8), lambert('#c9cdd0'));
  collar.position.y = 0.33;
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.038, 1), lambert('#d4d8db'));
  ball.position.y = 0.37;
  g.add(handle, collar, ball);
  return g;
}

interface CandleView {
  flame: THREE.Mesh;
  light: THREE.PointLight;
}


interface Sparkle {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  delay: number;
  angle: number;
  speed: number;
}

/** A blessed relic settling down: wind-down, silence, sparkles, ghost. */
interface Purification {
  relic: PurifiedRelic;
  t: number;
  origin: THREE.Vector3;
  sparkles: Sparkle[];
  fired: Set<PurifyCue>;
}

/** 'ghost' as it appears; 'ghost-gone' once it has risen and vanished. */
export type PurifyCue = 'wind-down' | 'sparkle' | 'ghost' | 'ghost-gone';

/** Where a relic sits on the cleaned-relic table: the slot it went into today. */
function storedSpot(s: GameState, kind: RelicKind): ItemSpot | null {
  const i = s.relics_stored.indexOf(kind);
  return i < 0 ? null : RELIC_TABLE_SLOTS[Math.min(i, RELIC_TABLE_SLOTS.length - 1)];
}

/** The splash (D2-07): the rod strikes three times, then the doll stops at SPLASH_STILL. */
const SPLASH_STRIKES = 3;
const SPLASH_STILL = SPLASH_STRIKES * SPLASH_STRIKE;
/** Seconds for the rod to drop out of view after the last strike. */
const ROD_LOWER = 0.35;
/** Fraction of each strike spent swinging forward; the rest draws back. */
const STRIKE_HIT = 0.35;
const DROPLETS = 36;
const DROPLET_LIFE = 0.6;

/**
 * The holy-water rod in the splash, `t` seconds in: `swing` 0..1 for each
 * hammering strike towards the doll, then `lower` 0..1 as it drops away.
 */
export function rodStrike(t: number): { swing: number; lower: number; strike: number } {
  const ease = (x: number) => x * x * (3 - 2 * x);
  if (t >= SPLASH_STILL) return { swing: 0, lower: Math.min(1, (t - SPLASH_STILL) / ROD_LOWER), strike: -1 };
  const strike = Math.floor(t / SPLASH_STRIKE);
  const u = t / SPLASH_STRIKE - strike;
  const swing = u < STRIKE_HIT ? ease(u / STRIKE_HIT) : 1 - ease((u - STRIKE_HIT) / (1 - STRIKE_HIT));
  return { swing, lower: 0, strike };
}

/**
 * The rod in camera space: `raise` 0..1 brings it up and draws it back while
 * the splash is held; `swing` 0..1 brings its head down and forward at the
 * doll (the crosshair) like a hammer; `lower` 0..1 drops it out of view.
 */
export function poseHeldRod(rod: THREE.Object3D, raise: number, swing: number, lower: number, side: 1 | -1 = 1): void {
  // Raised, its head leans back towards the player and in towards the
  // middle; struck, it points forward at the doll. In the left hand (the
  // two-handed blessing, D2-11) it's the mirror image.
  rod.position.set(side * (0.26 - 0.08 * swing), -0.78 + 0.33 * raise + 0.08 * swing - 0.35 * lower, -0.5 - 0.14 * swing);
  rod.rotation.set(-0.2 + 0.5 * raise - 1.4 * swing + 0.5 * lower, 0, side * (0.3 * raise - 0.15 * swing));
}

/** A lingering ghost on its loop among the east graves, `t` seconds in (plan x, y). */
export function gravesLoop(t: number): { x: number; y: number } {
  const L = GRAVES_LOOP;
  return { x: L.x + L.rx * Math.sin(t * 0.5), y: L.y + L.ry * Math.sin(t * 0.25) };
}

/**
 * Dipping the rod in the bucket by the ritual table (2026-11-29): it comes
 * down head first into the water, stays under a moment, lifts out dripping,
 * then rises and fades away. Seconds for each stage, in order.
 */
export const DIP = { down: 0.3, under: 0.45, up: 0.3, fade: 0.35 };
export const DIP_SECONDS = DIP.down + DIP.under + DIP.up + DIP.fade;
/** Height of the water's surface in a bucket standing at `z`. */
export const bucketWater = (z: number): number => z + 0.23;

/**
 * The rod's head during the dip, `t` seconds in: its height above or below
 * the water's surface (metres) and how solid it is (0..1).
 */
export function dipPose(t: number): { head: number; opacity: number } {
  const ease = (x: number) => x * x * (3 - 2 * x);
  const k = (from: number, len: number) => ease(Math.min(1, Math.max(0, (t - from) / len)));
  const above = 0.4;
  const under = -0.05;
  const t1 = DIP.down;
  const t2 = t1 + DIP.under;
  const t3 = t2 + DIP.up;
  if (t < t1) return { head: above + (under - above) * k(0, t1), opacity: 1 };
  if (t < t2) return { head: under, opacity: 1 };
  if (t < t3) return { head: under + (0.2 - under) * k(t2, DIP.up), opacity: 1 };
  return { head: 0.2 + 0.15 * k(t3, DIP.fade), opacity: 1 - k(t3, DIP.fade) };
}

interface Droplet {
  mesh: THREE.Mesh;
  mat: THREE.MeshBasicMaterial;
  v: THREE.Vector3;
  age: number;
}

/** Seconds the clock ghost is on screen: rise, smile, fade. */
const GHOST_LIFE = 3.4;
/** Seconds for the tree ghost to giggle, duck behind the trunk and fade. */
const PEEK_HIDE = 1.3;
/** How far the music box lid opens (radians). */
const LID_OPEN = 1.25;

/**
 * How loud the possessed music box is from `d` metres away: close by it
 * plays clearly; across the grounds it's a faint tinkle.
 */
export function tuneVolume(d: number): number {
  return 0.7 / (1 + (d / 5) ** 2);
}

const CHAPEL = AREAS.find((a) => a.id === 'chapel')!.rect;
const CHAPEL_DOOR = DOORS.find((d) => d.id === 'chapel')!;

/**
 * How loud the clock is from a plan position: full inside the chapel, then
 * fading with distance from the chapel door; muffled from the basement.
 */
export function chimeVolume(x: number, y: number, level: number): number {
  if (level === 0 && x >= CHAPEL.x1 && x <= CHAPEL.x2 && y >= CHAPEL.y1 && y <= CHAPEL.y2) return 1;
  const d = Math.hypot(x - CHAPEL_DOOR.x, y - CHAPEL_DOOR.y);
  return (level === 0 ? 1 : 0.3) / (1 + (d / 7) ** 2);
}

const SPARKLE_COUNT = 22;
const SPARKLE_LIFE = 1.6;
const SPARKLE_SPREAD = 0.9;
const sparkleGeometry = new THREE.OctahedronGeometry(0.028);

export class StoryProps {
  readonly root = new THREE.Group();
  readonly raycastTargets: THREE.Object3D[] = [];

  private note: THREE.Object3D;
  private key: THREE.Object3D;
  private matches: THREE.Object3D;
  private cross: THREE.Object3D;
  private clock: THREE.Group;
  private chalice: THREE.Object3D;
  /** The standing crucifix: on the altar, or set out on the ritual table. */
  private crucifix: THREE.Object3D;
  /** The Bible, open on its stand until it's picked up. */
  private bible: THREE.Object3D;
  private heldCrucifix: THREE.Group;
  private heldBible: THREE.Group;
  private musicBox: MusicBoxView;
  private heldChalice: THREE.Group;
  private heldMusicBox: MusicBoxView;
  private teacup: THREE.Group;
  private heldTeacup: THREE.Group;
  private clown: ClownView;
  private heldClown: ClownView;
  /** Seconds into the clown's dance; -1 when it isn't dancing. */
  private danceT = -1;
  /** Seconds into its giggle and wiggle at the first cross; -1 when not. */
  private wiggleT = -1;
  private wiggleGiggle = false;
  /** Seconds into the splash (rod strikes, then the doll stops); -1 when not. */
  private splashT = -1;
  /** How possessed and how slumped the doll looks, eased so it settles rather than snaps. */
  private clownAgitation = 0;
  private clownSlump = 0;
  private droplets: Droplet[] = [];
  /** The rod going into the bucket by the ritual table; seconds in, or -1. */
  private dipT = -1;
  private dipRod: THREE.Group;
  private dipMaterials: THREE.Material[] = [];
  private ripple: THREE.Mesh;
  private rippleMat: THREE.MeshBasicMaterial;
  private giggleTimer = 2;
  /** Day 2's third relic, the hand bell (D2-08 to D2-11). */
  private bell: THREE.Group;
  private heldBell: THREE.Group;
  private bellTimer = 1.5;
  /** The Bible stand, drawn here so it can move in front of the ritual table (D2-11). */
  private bibleStand: THREE.Group;
  /** The teacup's and music box's ghosts, watching the chase at the end of Day 2. */
  private onlookers: GhostModel[] = [];
  /** Day 2's lingering ghosts: the clown's among the graves, the angry one it chases, the worried one. */
  private roamer: GhostModel;
  private grump: GhostModel;
  private worrier: GhostModel;
  private roamT = 0;
  private ghostSoundTimer = 3;
  /** Seconds each lingering ghost (or the empty grave) has been in view, and out of view. */
  private seenFor: Record<Spotted, number> = { 'clown-roaming': 0, worried: 0, 'worried-gone': 0, chase: 0 };
  private worriedAwayFor = 0;
  private bucket: THREE.Group;
  private heldBucket: THREE.Group;
  private rod: THREE.Group;
  private heldRod: THREE.Group;
  private clinkTimer = 1;
  /** The Day 2 prankster ghost behind the garden bench (D2-02). */
  private prankster: GhostModel;
  private prankT = -1;
  private candles: CandleView[] = [];
  private deskMarker: THREE.Mesh;
  private heldClock: THREE.Group;
  private heldCross: THREE.Group;
  /** The released ghost; one model, reused, with its light always in the scene. */
  private relicGhost: GhostModel;
  private relicGhostT = -1;
  private relicGhostFrom = new THREE.Vector3();
  /** Which relic the current ghost came from (the music box ghost winks). */
  private relicGhostOf: PurifiedRelic = 'clock';
  private rattleT = -1;
  private rattle = { seconds: RATTLE_SECONDS, strength: 1 };
  private tuneTimer = 1;
  /** The ghost peeking from behind the tree near the gate. */
  private peeker: GhostModel;
  private peekHideT = 0;
  /** +1 or -1: which side of the trunk (across the line of sight) it leans out of. */
  private peekSide = 1;
  private bus: THREE.Group | null = null;
  private busT = 0;
  private chimeTimer = 2;
  private purification: Purification | null = null;

  /** Fired as the purification reaches each beat, for sound and subtitles. */
  onCue: (cue: PurifyCue, relic: PurifiedRelic) => void = () => {};

  /** Called when the possessed music box plays its tune, with volume 0..1. */
  onTune: (volume: number) => void = () => {};

  /** Called when the possessed teacup rattles on its saucer, with volume 0..1. */
  onClink: (volume: number) => void = () => {};

  /** Called when the possessed clown doll giggles, with volume 0..1. */
  onGiggle: (volume: number) => void = () => {};

  /** Called as the rod's head goes into the bucket's water. */
  onDipSplash: () => void = () => {};

  /** Called when the possessed hand bell rings, with volume 0..1. */
  onBell: (volume: number) => void = () => {};

  /** Called when the angry ghost squeaks, with volume 0..1. */
  onSqueak: (volume: number) => void = () => {};

  /** A lingering ghost, or the grave where the worried one stood, has been in view for a moment. */
  onSpotted: (who: Spotted) => void = () => {};

  /** The worried ghost has been out of view long enough to vanish. */
  onWorriedVanished: () => void = () => {};

  /** Called when the clock chimes, with volume 0..1 and agitation 0..1. */
  onChime: (volume: number, agitation: number) => void = () => {};

  constructor(private readonly camera: THREE.Camera) {
    this.note = tagged(at(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.005, 0.28), basic('#f4f1e6')), SPOTS.officeNote), 'office-note');
    this.key = tagged(at(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.04), lambert('#d8b440')), SPOTS.chapelKey), 'chapel-key');
    this.matches = tagged(at(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), lambert('#b8321f')), SPOTS.matches), 'matches');
    this.cross = tagged(at(crossModel(), SPOTS.cross), 'cross');
    this.clock = tagged(clockModel(), 'clock') as THREE.Group;
    this.chalice = tagged(chaliceModel(), 'chalice');
    this.crucifix = tagged(standingCrucifixModel(), 'crucifix');
    this.bible = tagged(at(openBookModel(), SPOTS.bible), 'bible');
    // Facing the reader in the circle, tilted up towards them.
    this.bible.rotation.order = 'YXZ';
    this.bible.rotation.set(0.3, BIBLE_FACING, 0);
    this.musicBox = musicBoxModel();
    tagged(this.musicBox.group, 'music-box');
    this.teacup = tagged(teacupModel(), 'teacup') as THREE.Group;
    // Larger than life so it reads on the tables from a few steps away.
    this.teacup.scale.setScalar(1.7);
    this.clown = clownModel();
    tagged(this.clown.group, 'clown');
    // A little larger than life, like the teacup, so it reads on the tables.
    this.clown.group.scale.setScalar(1.15);
    this.bell = tagged(bellModel(), 'bell') as THREE.Group;
    // Larger than life, like the teacup, so it reads on the tables.
    this.bell.scale.setScalar(1.4);
    this.bibleStand = tagged(lecternModel(STAND_PROP.height, STAND_PROP.color), 'bible') as THREE.Group;
    this.bucket = tagged(bucketModel(), 'bucket') as THREE.Group;
    this.rod = tagged(at(rodModel(), SPOTS.rodCloset), 'rod') as THREE.Group;
    // The handle is thin: an invisible sleeve round it makes it easy to aim at.
    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.44, 0.16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    sleeve.position.y = 0.21;
    this.rod.add(sleeve);
    // Lying along the bottom shelf, its head over the bucket (2026-11-28).
    this.rod.rotation.set(Math.PI / 2, 0, 0);

    for (const [i, c] of CANDLES.entries()) {
      const stand = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.08, 1, 6), lambert('#2a2a2a'));
      pole.position.y = 0.5;
      const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.16, 8), lambert('#efe4c8'));
      candle.position.y = 1.08;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.08, 6), basic('#ffb347'));
      flame.position.y = 1.2;
      const light = new THREE.PointLight('#ffb460', 2.2, 5, 2);
      light.position.y = 1.25;
      stand.add(pole, candle, flame, light);
      tagged(at(stand, c), `candle-${i}`);
      this.candles.push({ flame, light });
      this.root.add(stand);
      this.raycastTargets.push(stand);
    }

    this.deskMarker = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.24, 20), basic('#ffe08a', 0.8));
    this.deskMarker.rotation.x = -Math.PI / 2;
    at(this.deskMarker, { ...SPOTS.clockDesk, z: SPOTS.clockDesk.z + 0.01 });

    // Held items ride on the camera, low in view (doc 5.2).
    this.heldClock = clockModel();
    // Low and slightly right, clear of the crosshair.
    this.heldClock.position.set(0.16, -0.52, -0.8);
    this.heldClock.scale.setScalar(0.7);
    this.heldCross = crossModel();
    this.heldCross.position.set(0.22, -0.45, -0.5);
    // Right hand: the chalice. Left hand: the standing crucifix or the open
    // Bible, so the player carries one thing in each (S2 playtest).
    this.heldChalice = chaliceModel();
    this.heldChalice.position.set(0.19, -0.4, -0.62);
    this.heldCrucifix = standingCrucifixModel();
    this.heldCrucifix.position.set(-0.24, -0.52, -0.62);
    this.heldCrucifix.rotation.set(0.15, 0.25, 0.12);
    this.heldCrucifix.scale.setScalar(0.85);
    this.heldBible = openBookModel();
    this.heldBible.position.set(-0.22, -0.3, -0.52);
    this.heldBible.rotation.set(0.95, 0.3, 0.15);
    this.heldBible.scale.setScalar(0.85);
    this.heldMusicBox = musicBoxModel();
    this.heldMusicBox.group.position.set(0.15, -0.38, -0.62);
    this.heldMusicBox.group.rotation.set(0.35, 0, 0);
    this.heldTeacup = teacupModel();
    this.heldTeacup.position.set(0.15, -0.36, -0.55);
    this.heldTeacup.rotation.set(0.35, 0, 0);
    this.heldTeacup.scale.setScalar(1.3);
    this.heldClown = clownModel();
    // Lying back limp in the hand (designer reference images, 2026-11-22).
    this.heldClown.group.position.copy(HELD_CLOWN.position);
    this.heldClown.group.quaternion.copy(heldClownQuaternion());
    this.heldClown.group.scale.setScalar(HELD_CLOWN.scale);
    this.heldBell = bellModel();
    this.heldBell.position.set(0.12, -0.27, -0.5);
    this.heldBell.rotation.set(0.35, 0, 0);
    this.heldBell.scale.setScalar(1.1);
    this.heldBucket = bucketModel();
    this.heldBucket.position.set(0.2, -0.62, -0.62);
    this.heldBucket.rotation.set(0.3, 0, 0);
    // The rod rises into view while the water ritual is held, like the cross.
    this.heldRod = rodModel();
    this.heldRod.position.set(0.24, -0.6, -0.55);
    this.heldRod.rotation.set(-0.5, 0, -0.3);
    camera.add(
      this.heldClock,
      this.heldCross,
      this.heldChalice,
      this.heldCrucifix,
      this.heldBible,
      this.heldMusicBox.group,
      this.heldTeacup,
      this.heldClown.group,
      this.heldBucket,
      this.heldRod,
      this.heldBell,
    );

    // Lights stay in the scene at zero intensity: adding one later would make
    // Three.js recompile every shader and hitch.
    this.relicGhost = ghostModel(true);
    this.relicGhost.group.visible = false;
    this.peeker = ghostModel(false);
    this.peeker.group.visible = false;
    this.prankster = ghostModel(false);
    this.prankster.group.visible = false;
    this.root.add(this.relicGhost.group, this.peeker.group, this.prankster.group);
    this.roamer = ghostModel(false);
    this.roamer.setClown(true);
    this.grump = ghostModel(false);
    this.grump.setMood('angry');
    this.worrier = ghostModel(false);
    this.worrier.setMood('neutral');
    this.worrier.group.rotation.order = 'YXZ';
    for (const o of ONLOOKERS) {
      const g = ghostModel(false);
      g.setDapper(o.relic === 'teacup');
      this.onlookers.push(g);
    }
    for (const g of [this.roamer, this.grump, this.worrier, ...this.onlookers]) {
      g.group.visible = false;
      this.root.add(g.group);
    }

    // The rod dipping into the bucket by the ritual table: a pivot at its
    // head, the handle pointing up and leaning a little towards the circle.
    this.dipRod = new THREE.Group();
    const dipModel = rodModel();
    dipModel.position.y = -0.37;
    dipModel.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) {
        m.transparent = true;
        this.dipMaterials.push(m);
      }
    });
    this.dipRod.add(dipModel);
    this.dipRod.rotation.set(Math.PI, 0, 0.3);
    this.dipRod.visible = false;
    this.rippleMat = basic('#e8f6ff', 0.8);
    this.ripple = new THREE.Mesh(new THREE.RingGeometry(0.03, 0.042, 18), this.rippleMat);
    this.ripple.rotation.x = -Math.PI / 2;
    this.ripple.visible = false;
    this.root.add(this.dipRod, this.ripple);

    // Holy water flying off the doll as the rod strikes (D2-07).
    const dropGeometry = new THREE.IcosahedronGeometry(0.02, 0);
    for (let i = 0; i < DROPLETS; i++) {
      const mat = basic('#5fb8ff', 0.95);
      const mesh = new THREE.Mesh(dropGeometry, mat);
      mesh.visible = false;
      this.root.add(mesh);
      this.droplets.push({ mesh, mat, v: new THREE.Vector3(), age: DROPLET_LIFE });
    }

    this.root.add(this.note, this.key, this.matches, this.cross, this.clock, this.deskMarker);
    this.root.add(this.chalice, this.crucifix, this.bible, this.musicBox.group, this.teacup, this.clown.group, this.bucket, this.rod);
    this.root.add(this.bell, this.bibleStand);
    this.raycastTargets.push(
      this.note,
      this.key,
      this.matches,
      this.cross,
      this.clock,
      this.chalice,
      this.crucifix,
      this.bible,
      this.musicBox.group,
      this.teacup,
      this.clown.group,
      this.bucket,
      this.rod,
      this.bell,
      this.bibleStand,
    );
  }

  /** Remove timed effects, e.g. on reset. */
  clearEffects(): void {
    this.endPurification();
    this.relicGhostT = -1;
    this.relicGhost.group.visible = false;
    this.relicGhost.setFade(0);
    this.relicGhost.setWink(0);
    this.peekHideT = 0;
    this.rattleT = -1;
    this.prankT = -1;
    this.prankster.group.visible = false;
    this.prankster.setTongue(0);
    this.danceT = -1;
    this.wiggleT = -1;
    this.splashT = -1;
    this.dipT = -1;
    this.dipRod.visible = false;
    this.ripple.visible = false;
    for (const d of this.droplets) {
      d.age = DROPLET_LIFE;
      d.mesh.visible = false;
    }
    if (this.bus) this.root.remove(this.bus);
    this.bus = null;
  }

  startIntro(): void {
    if (this.bus) this.root.remove(this.bus);
    const bus = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(10, 2.8, 2.5), lambert('#c9a227'));
    body.position.y = 1.7;
    const windows = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.7, 2.55), basic('#2c3a46'));
    windows.position.y = 2.3;
    bus.add(body, windows);
    for (const x of [-3.5, 3.5]) {
      for (const z of [-1.2, 1.2]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 10), lambert('#1b1b1b'));
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, 0.45, z);
        bus.add(wheel);
      }
    }
    bus.position.set(...toWorld(-1, -8, 0));
    this.bus = bus;
    this.busT = 0;
    this.root.add(bus);
  }

  /** True from the blessing until the ghost has appeared and the sparkles are gone. */
  get purifying(): boolean {
    return this.purification !== null;
  }

  /** The music box fights back: a rattle that dies away (strength 1 = the first blessing's). */
  startRattle(seconds = RATTLE_SECONDS, strength = 1): void {
    this.rattleT = 0;
    this.rattle = { seconds, strength };
  }

  /** The prankster ghost pops up behind the garden bench, blows a raspberry and floats off (D2-02). */
  startPrank(): void {
    this.prankT = 0;
    this.prankster.group.visible = true;
  }

  /** The clown doll stands up on the table, laughs and dances (D2-05). */
  startDance(): void {
    this.danceT = 0;
  }

  /** The clown doll giggles and wiggles where it sits (the first cross, D2-05). */
  startWiggle(): void {
    this.wiggleT = 0;
    this.wiggleGiggle = true;
  }

  /** The rod strikes at the clown doll, splashing it, and it goes still (D2-07). */
  startSplash(): void {
    this.splashT = 0;
  }

  /** The rod dips into the bucket of holy water by the ritual table (D2-07). */
  startDip(): void {
    this.dipT = 0;
  }

  /** True while the rod is going into the bucket and back out. */
  get dipping(): boolean {
    return this.dipT >= 0;
  }

  startPurification(relic: PurifiedRelic): void {
    this.endPurification();
    const spot = relic === 'clock' ? SPOTS.clockRitual : SPOTS.relicRitual;
    const lift = relic === 'clock' ? 0.22 : relic === 'teacup' ? 0.08 : relic === 'clown' ? 0.22 : relic === 'bell' ? 0.16 : 0.12;
    const origin = new THREE.Vector3(...toWorld(spot.x, spot.y, 0, spot.z + lift));
    const sparkles: Sparkle[] = [];
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const mat = basic(i % 3 === 0 ? '#ffffff' : '#fff1a8', 0.95);
      const mesh = new THREE.Mesh(sparkleGeometry, mat);
      mesh.visible = false;
      this.root.add(mesh);
      sparkles.push({ mesh, mat, delay: (i / SPARKLE_COUNT) * SPARKLE_SPREAD, angle: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.5 });
    }
    this.purification = { relic, t: 0, origin, sparkles, fired: new Set(['wind-down']) };
    // The clown doll wound down when the holy water stilled it.
    if (relic !== 'clown') this.onCue('wind-down', relic);
  }

  private endPurification(): void {
    if (!this.purification) return;
    for (const s of this.purification.sparkles) {
      this.root.remove(s.mesh);
      s.mat.dispose();
    }
    this.purification = null;
  }

  private updatePurification(dt: number): void {
    const p = this.purification;
    if (!p) return;
    p.t += dt;
    const cue = (name: PurifyCue, at: number) => {
      if (p.t < at || p.fired.has(name)) return;
      p.fired.add(name);
      if (name === 'ghost') this.startRelicGhost(p.relic);
      this.onCue(name, p.relic);
    };
    cue('sparkle', PURIFY.sparkleAt);
    cue('ghost', PURIFY.ghostAt);

    // Sparkles spiral up and out of the clock and fade.
    for (const s of p.sparkles) {
      const age = p.t - PURIFY.sparkleAt - s.delay;
      s.mesh.visible = age > 0 && age < SPARKLE_LIFE;
      if (!s.mesh.visible) continue;
      const k = age / SPARKLE_LIFE;
      const r = 0.06 + age * s.speed * 0.35;
      const a = s.angle + age * 2.4;
      s.mesh.position.set(p.origin.x + Math.cos(a) * r, p.origin.y + age * s.speed * 0.8, p.origin.z + Math.sin(a) * r);
      s.mesh.rotation.y = age * 7;
      s.mesh.scale.setScalar(1 - 0.6 * k);
      s.mat.opacity = 0.95 * (1 - k * k);
    }
    if (p.t > Math.max(PURIFY.ghostAt, PURIFY.sparkleAt + SPARKLE_SPREAD + SPARKLE_LIFE)) this.endPurification();
  }

  private startRelicGhost(relic: PurifiedRelic): void {
    const spot = relic === 'clock' ? SPOTS.clockRitual : SPOTS.relicRitual;
    this.relicGhostFrom.set(...toWorld(spot.x, spot.y, 0, spot.z));
    this.relicGhostOf = relic;
    this.relicGhostT = 0;
    this.relicGhost.setWink(0);
    // The teacup's ghost is a dapper old gent: mustache and monocle.
    this.relicGhost.setDapper(relic === 'teacup');
    // The clown's wears a rainbow wig.
    this.relicGhost.setClown(relic === 'clown');
    // The hand bell's is cross: a frown and furrowed brows (D2-11).
    this.relicGhost.setMood(relic === 'bell' ? 'angry' : 'happy');
    this.relicGhost.group.visible = true;
  }

  /**
   * `paused` freezes timed effects (purification, ghost, bus) while the
   * inventory is open; the clock keeps chiming so the world still sounds alive.
   */
  sync(
    s: GameState,
    dt: number,
    hold: { active: boolean; progress: number; cross: boolean; rod: boolean; twoHanded?: boolean },
    listener: THREE.Vector3,
    paused = false,
  ): void {
    const fxDt = paused ? 0 : dt;
    this.note.visible = true;
    this.key.visible = !s.inventory.has('chapel-key');
    this.matches.visible = !s.inventory.has('matches');
    this.cross.visible = !s.inventory.has('cross');
    this.bible.visible = !s.inventory.has('bible');
    this.heldBible.visible = s.inventory.has('bible');

    for (const [i, c] of this.candles.entries()) {
      const lit = s.candles_lit.has(i);
      c.flame.visible = lit;
      // Dim rather than hide unlit candle lights: changing the number of
      // visible lights makes Three.js recompile shaders, which hitches.
      c.light.intensity = lit ? 2 + Math.sin(performance.now() / 90 + i * 2) * 0.3 : 0;
    }

    // Clock: on the ritual table, in hand, or on the desk.
    this.clock.visible = s.clock !== 'held';
    this.heldClock.visible = s.clock === 'held';
    this.deskMarker.visible = s.clock === 'held';
    const spot = s.clock === 'office-desk' ? SPOTS.clockDesk : SPOTS.clockRitual;
    at(this.clock, spot);
    // Face the player's approach: west on the ritual table, east on the desk.
    this.clock.rotation.set(0, s.clock === 'office-desk' ? Math.PI / 2 : -Math.PI / 2, 0);

    // The clock only gets agitated once the whole ritual site is prepared:
    // candles lit and the table set (decisions 2026-11-09, S2 playtest).
    const restless = s.clock === 'ritual-table' && !s.flags.has('clock-blessed');
    const agitation = restless && siteReady(s) ? 1 : 0;
    // Once blessed, the shaking dies away instead of stopping dead.
    const settling = this.purification && s.clock === 'ritual-table' ? Math.max(0, 1 - this.purification.t / PURIFY.windDown) : 0;
    const shake = Math.max(agitation, settling);
    if (shake > 0) {
      this.clock.position.x += (Math.random() - 0.5) * 0.03 * shake;
      this.clock.position.z += (Math.random() - 0.5) * 0.03 * shake;
      this.clock.rotation.z = (Math.random() - 0.5) * 0.12 * shake;
    }
    // Once the church doors have opened the clock chimes without a break,
    // faster as it gets agitated, heard faintly anywhere in the church.
    if (restless && s.completed_objectives.includes('D1-02')) {
      this.chimeTimer -= dt;
      if (this.chimeTimer <= 0) {
        this.chimeTimer = 2.4 - 1.5 * agitation;
        const level = listener.y < -3 ? -1 : 0;
        this.onChime(chimeVolume(listener.x, -listener.z, level), agitation);
      }
    }

    this.syncChalice(s);
    this.syncMusicBox(s, dt, fxDt, listener);
    this.syncTeacup(s, dt, listener);
    this.syncClown(s, dt, fxDt, listener);
    this.syncBell(s, dt, listener);
    this.syncBibleStand(s);
    this.syncBucket(s);
    this.updateDip(fxDt);

    // The hand cross rises into view while a blessing is held; the rod for
    // the water ritual.
    this.heldCross.visible = hold.cross && hold.active && hold.progress > 0;
    this.heldCross.position.y = -0.45 + hold.progress * 0.2;
    // Held, the rod rises and draws back; the splash brings it down on the
    // doll like a hammer, away from the player, three times.
    if (this.splashT >= 0 && this.splashT < SPLASH_STILL + ROD_LOWER) {
      const { swing, lower } = rodStrike(this.splashT);
      this.heldRod.visible = true;
      poseHeldRod(this.heldRod, 1, swing, lower);
    } else if (hold.twoHanded) {
      // The two-handed blessing (D2-11, M05): cross in the right hand, rod
      // in the left, rising together.
      this.heldRod.visible = hold.active && hold.progress > 0;
      poseHeldRod(this.heldRod, hold.progress, 0, 0, -1);
    } else {
      this.heldRod.visible = hold.rod && hold.active && hold.progress > 0;
      poseHeldRod(this.heldRod, hold.progress, 0, 0);
    }

    const cam = this.camera.getWorldPosition(new THREE.Vector3());
    this.updatePurification(fxDt);
    this.updateRelicGhost(fxDt, cam);
    this.updatePeeker(s, fxDt, cam);
    this.updatePrank(fxDt, cam);
    this.updateLingering(s, fxDt, cam);
    this.updateBus(fxDt);
  }

  /** The chalice and standing crucifix: side by side on the altar, carried, or on the ritual table. */
  private syncChalice(s: GameState): void {
    // On Day 2 it only turns up on the bench once the church has been searched.
    this.chalice.visible = s.chalice !== 'held' && (s.chalice !== 'garden-bench' || s.flags.has('church-searched-thought-done'));
    this.heldChalice.visible = s.chalice === 'held';
    at(
      this.chalice,
      s.chalice === 'ritual-table' ? SPOTS.chaliceRitual : s.chalice === 'garden-bench' ? SPOTS.chaliceBench : SPOTS.chaliceAltar,
    );
    const staged = s.flags.has('crucifix-staged');
    const carried = s.inventory.has('crucifix') && !staged;
    this.crucifix.visible = !carried;
    this.heldCrucifix.visible = carried;
    at(this.crucifix, staged ? SPOTS.crucifixRitual : SPOTS.crucifixAltar);
    // Face whoever stands before it: south down the nave, west from the circle.
    this.crucifix.rotation.y = staged ? -Math.PI / 2 : 0;
  }

  /**
   * The music box: hidden in the drop box until carried, then on the ritual
   * table and finally on the cleaned-relic table. While possessed its lid
   * flaps and it plays a wonky tune; the first blessing makes it rattle and
   * settle; once cleansed the lid closes.
   */
  private syncMusicBox(s: GameState, dt: number, fxDt: number, listener: THREE.Vector3): void {
    const box = this.musicBox;
    const current = s.relic_kind === 'music-box';
    const stored = storedSpot(s, 'music-box');
    box.group.visible = (current && s.relic === 'ritual-table') || !!stored;
    this.heldMusicBox.group.visible = current && s.relic === 'held';
    at(box.group, stored ?? SPOTS.relicRitual);
    box.group.rotation.set(0, -Math.PI / 2, 0);

    const possessed = current && (s.relic === 'drop-box' || s.relic === 'held' || s.relic === 'ritual-table') && !s.flags.has('relic-rattled');
    const now = performance.now() / 1000;
    let lid = !current || s.flags.has('relic-blessed') ? 0 : LID_OPEN;
    let shake = possessed ? 0.35 : 0;
    if (possessed) lid = LID_OPEN - 0.35 + Math.abs(Math.sin(now * 5)) * 0.35;

    if (this.rattleT >= 0) {
      this.rattleT += fxDt;
      const k = Math.max(0, 1 - this.rattleT / this.rattle.seconds) * this.rattle.strength;
      shake = Math.max(shake, 1.6 * k);
      lid = Math.min(lid, LID_OPEN) - Math.abs(Math.sin(now * 31)) * 0.9 * k;
      if (this.rattleT >= this.rattle.seconds) this.rattleT = -1;
    }
    // Blessed: the last of the shaking dies away and the lid eases shut.
    const p = this.purification;
    if (p && p.relic === 'music-box') {
      const settling = Math.max(0, 1 - p.t / PURIFY.windDown);
      shake = Math.max(shake, settling);
      lid = LID_OPEN * settling;
    }
    box.lid.rotation.x = -lid;
    this.heldMusicBox.lid.rotation.x = -lid;
    if (shake > 0 && current && s.relic === 'ritual-table') {
      box.group.position.x += (Math.random() - 0.5) * 0.03 * shake;
      box.group.position.z += (Math.random() - 0.5) * 0.03 * shake;
      box.group.rotation.z = (Math.random() - 0.5) * 0.12 * shake;
    }

    if (possessed) {
      this.tuneTimer -= dt;
      if (this.tuneTimer <= 0) {
        this.tuneTimer = 3.6;
        const src = s.relic === 'drop-box' ? SPOTS.dropBox : SPOTS.relicRitual;
        const d = s.relic === 'held' ? 0 : Math.hypot(listener.x - src.x, -listener.z - src.y);
        this.onTune(listener.y < -3 ? 0 : tuneVolume(d));
      }
    }
  }

  /**
   * Day 2's teacup: in the drop box, carried, on the ritual table, then on
   * the cleaned-relic table. While possessed the cup hops and rattles on its
   * saucer every so often; once blessed it settles and sits still.
   */
  private syncTeacup(s: GameState, dt: number, listener: THREE.Vector3): void {
    const current = s.relic_kind === 'teacup';
    const stored = storedSpot(s, 'teacup');
    this.teacup.visible = (current && s.relic === 'ritual-table') || !!stored;
    this.heldTeacup.visible = current && s.relic === 'held';
    at(this.teacup, stored ?? SPOTS.relicRitual);
    this.teacup.rotation.set(0, -Math.PI / 2, 0);

    const possessed = current && (s.relic === 'drop-box' || s.relic === 'held' || s.relic === 'ritual-table') && !s.flags.has('relic-blessed');
    // Quieter once it has heard some scripture.
    let agitation = possessed ? (s.flags.has('scripture-read') ? 0.35 : 1) : 0;
    const p = this.purification;
    if (p && p.relic === 'teacup') agitation = Math.max(0, 1 - p.t / PURIFY.windDown) * 0.6;
    const now = performance.now() / 1000;
    // Bursts of hopping: the cup jumps on its saucer in short fits.
    const fit = Math.max(0, Math.sin(now * 1.7)) ** 3;
    const hop = agitation * fit * Math.abs(Math.sin(now * 28)) * 0.025;
    for (const g of [this.teacup, this.heldTeacup]) {
      const cup = g.userData.cup as THREE.Group;
      cup.position.y = 0.015 + hop;
      cup.rotation.z = agitation * fit * Math.sin(now * 23) * 0.15;
    }

    if (possessed) {
      this.clinkTimer -= dt;
      if (this.clinkTimer <= 0 && fit > 0.4) {
        this.clinkTimer = 1.2;
        const src = s.relic === 'drop-box' ? SPOTS.dropBox : SPOTS.relicRitual;
        const d = s.relic === 'held' ? 0 : Math.hypot(listener.x - src.x, -listener.z - src.y);
        this.onClink(listener.y < -3 ? 0 : tuneVolume(d) * agitation);
      }
    }
  }

  /**
   * Day 2's clown doll: in the drop box, carried, on the ritual table, then on
   * the cleaned-relic table. It lies still and silent (limp in hand) until the
   * first cross gets a small giggle and wiggle out of it. The second, after
   * scripture, makes it stand up and dance; then it giggles and fidgets now
   * and then until the holy water splashed from the rod stills it, and it
   * slumps (designer, 2026-11-26).
   */
  private syncClown(s: GameState, dt: number, fxDt: number, listener: THREE.Vector3): void {
    const current = s.relic_kind === 'clown';
    const stored = storedSpot(s, 'clown');
    this.clown.group.visible = (current && s.relic === 'ritual-table') || !!stored;
    this.heldClown.group.visible = current && s.relic === 'held';
    at(this.clown.group, stored ?? SPOTS.relicRitual);
    this.clown.group.rotation.set(0, -Math.PI / 2, 0);

    // The splash: the strikes land, then it stops and winds down.
    if (this.splashT >= 0) {
      const before = this.splashT;
      this.splashT += fxDt;
      const hit = (t: number) => (t < SPLASH_STILL ? Math.floor(t / SPLASH_STRIKE - STRIKE_HIT) : SPLASH_STRIKES - 1);
      if (hit(this.splashT) > hit(before)) this.splashDroplets();
      if (before < SPLASH_STILL && this.splashT >= SPLASH_STILL && s.relic_kind === 'clown') this.onCue('wind-down', 'clown');
      if (this.splashT > SPLASH_STILL + ROD_LOWER) this.splashT = -1;
    }
    this.updateDroplets(fxDt);
    const striking = this.splashT >= 0 && this.splashT < SPLASH_STILL;

    // Still and silent in the box, in hand and on the table until the second
    // cross; from then it fidgets and giggles while the player fetches holy
    // water, until the splash.
    const onTable = current && s.relic === 'ritual-table';
    const doused = s.flags.has('clown-doused');
    const awake = onTable && s.flags.has('clown-danced') && (!doused || striking);
    const still = (current && doused && !striking) || !!stored;
    const k = Math.min(1, fxDt * 3);
    this.clownAgitation += ((awake ? 1 : 0) - this.clownAgitation) * k;
    this.clownSlump += ((still ? 1 : 0) - this.clownSlump) * k;
    if (!current) {
      this.clownAgitation = 0;
      this.clownSlump = stored ? 1 : 0;
    }

    const now = performance.now() / 1000;
    if (this.danceT >= 0) {
      this.danceT += fxDt;
      if (this.danceT > CLOWN_DANCE_SECONDS) this.danceT = -1;
    }
    // The first cross: a giggle and a little wiggle, then still again.
    let wiggle = 0;
    if (this.wiggleT >= 0) {
      if (this.wiggleGiggle) this.onGiggle(this.giggleVolume(listener));
      this.wiggleGiggle = false;
      this.wiggleT += fxDt;
      if (this.wiggleT > CLOWN_WIGGLE_SECONDS) this.wiggleT = -1;
      else wiggle = Math.sin((Math.PI * this.wiggleT) / CLOWN_WIGGLE_SECONDS);
    }
    const stand = this.danceT >= 0 ? danceStand(this.danceT, CLOWN_DANCE_SECONDS) : 0;
    // Fits of fidgeting every few seconds while it sits possessed.
    const fit = Math.max(wiggle, this.clownAgitation * Math.max(0, Math.sin(now * 1.3)) ** 4);
    const energy = Math.max(stand, 0.3 * wiggle);
    const t = this.danceT >= 0 ? this.danceT : this.wiggleT >= 0 ? this.wiggleT : now;
    poseClown(this.clown, { stand, energy, t, fit, slump: this.clownSlump });
    poseClown(this.heldClown, { stand: 0, energy: 0, t: 0, fit: 0, slump: 0, limp: 1 });

    if (awake && this.danceT < 0) {
      this.giggleTimer -= dt;
      if (this.giggleTimer <= 0 && fit > 0.5) {
        this.giggleTimer = 2.6;
        this.onGiggle(this.giggleVolume(listener));
      }
    }
  }

  /** The doll's giggle, by how far the listener is from the ritual table. */
  private giggleVolume(listener: THREE.Vector3): number {
    const d = Math.hypot(listener.x - SPOTS.relicRitual.x, -listener.z - SPOTS.relicRitual.y);
    return listener.y < -3 ? 0 : tuneVolume(d);
  }

  /** A burst of holy water off the doll as a strike lands. */
  private splashDroplets(): void {
    const spot = SPOTS.relicRitual;
    this.throwDroplets(new THREE.Vector3(...toWorld(spot.x, spot.y, 0, spot.z + 0.16)), 12, 0.06, 0.4, 0.5, 0.9, 0.7);
  }

  /**
   * `n` droplets from around `origin` (within `spread`), each thrown out
   * sideways at `out`..`out + outVar` and up at `up`..`up + upVar` m/s.
   */
  private throwDroplets(origin: THREE.Vector3, n: number, spread: number, out: number, outVar: number, up: number, upVar: number): void {
    for (const d of this.droplets) {
      if (n === 0) break;
      if (d.age < DROPLET_LIFE) continue;
      n--;
      d.age = 0;
      d.mesh.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 2 * spread, Math.random() * spread, (Math.random() - 0.5) * 2 * spread));
      const a = Math.random() * Math.PI * 2;
      const o = out + Math.random() * outVar;
      d.v.set(Math.cos(a) * o, up + Math.random() * upVar, Math.sin(a) * o);
      d.mesh.visible = true;
    }
  }

  /**
   * The rod in the bucket: down into the water with a slosh, a ripple and a
   * few splashes; out again dripping; then up and fading away, ready to use.
   */
  private updateDip(dt: number): void {
    if (this.dipT < 0) return;
    const before = this.dipT;
    this.dipT += dt;
    const b = SPOTS.bucketChapel;
    const water = bucketWater(b.z);
    const [x, , z] = toWorld(b.x, b.y, 0, 0);
    const { head, opacity } = dipPose(this.dipT);
    this.dipRod.visible = this.dipT < DIP_SECONDS;
    this.dipRod.position.set(x, water + head, z);
    for (const m of this.dipMaterials) m.opacity = opacity;
    const crossed = (at: number) => before < at && this.dipT >= at;
    const surface = new THREE.Vector3(x, water, z);
    // In: the slosh, a ring on the water and a few splashes.
    const hit = DIP.down * 0.8;
    if (crossed(hit)) {
      this.onDipSplash();
      this.throwDroplets(surface, 7, 0.04, 0.15, 0.25, 0.5, 0.5);
    }
    const ripple = this.dipT - hit;
    this.ripple.visible = ripple > 0 && ripple < 0.7;
    if (this.ripple.visible) {
      this.ripple.position.set(x, water + 0.004, z);
      this.ripple.scale.setScalar(1 + ripple * 3.5);
      this.rippleMat.opacity = 0.8 * (1 - ripple / 0.7);
    }
    // Out: drips falling off the head.
    const out = DIP.down + DIP.under + DIP.up * 0.6;
    for (const at of [out, out + 0.18, out + 0.36]) {
      if (crossed(at)) this.throwDroplets(new THREE.Vector3(x, water + dipPose(at).head - 0.04, z), 1, 0.01, 0, 0.05, -0.2, 0);
    }
    if (this.dipT >= DIP_SECONDS) {
      this.dipT = -1;
      this.dipRod.visible = false;
      this.ripple.visible = false;
    }
  }

  private updateDroplets(dt: number): void {
    for (const d of this.droplets) {
      if (d.age >= DROPLET_LIFE) continue;
      d.age += dt;
      d.v.y -= 5 * dt;
      d.mesh.position.addScaledVector(d.v, dt);
      d.mat.opacity = 0.95 * (1 - (d.age / DROPLET_LIFE) ** 2);
      d.mesh.visible = d.age < DROPLET_LIFE;
    }
  }

  /**
   * Day 2's hand bell: in the drop box, carried, on the ritual table, then on
   * the cleaned-relic table. While possessed it jitters and rings in short
   * fits; the cross and the splash set it rattling hard (D2-10); once
   * blessed it settles and sits still.
   */
  private syncBell(s: GameState, dt: number, listener: THREE.Vector3): void {
    const current = s.relic_kind === 'bell';
    const stored = storedSpot(s, 'bell');
    this.bell.visible = (current && s.relic === 'ritual-table') || !!stored;
    this.heldBell.visible = current && s.relic === 'held';
    at(this.bell, stored ?? SPOTS.relicRitual);
    this.bell.rotation.set(0, -Math.PI / 2, 0);

    const possessed = current && (s.relic === 'drop-box' || s.relic === 'held' || s.relic === 'ritual-table') && !s.flags.has('relic-blessed');
    const now = performance.now() / 1000;
    const fit = possessed ? Math.max(0, Math.sin(now * 1.4)) ** 3 : 0;
    let shake = fit * 0.5;
    // The cross and the splash: a hard rattle that dies away (the shared
    // rattle timer, which the music box's sync advances).
    if (current && s.relic === 'ritual-table' && this.rattleT >= 0) {
      shake = Math.max(shake, Math.max(0, 1 - this.rattleT / this.rattle.seconds) * this.rattle.strength);
    }
    const p = this.purification;
    if (p && p.relic === 'bell') shake = Math.max(shake, Math.max(0, 1 - p.t / PURIFY.windDown) * 0.5);
    for (const g of [this.bell, this.heldBell]) {
      const bell = g.userData.bell as THREE.Group;
      const clapper = g.userData.clapper as THREE.Group;
      bell.position.set(Math.sin(now * 41) * 0.006 * shake, Math.abs(Math.sin(now * 29)) * 0.012 * shake, Math.sin(now * 37) * 0.006 * shake);
      bell.rotation.set(Math.sin(now * 23) * 0.18 * shake, 0, Math.sin(now * 19) * 0.22 * shake);
      clapper.rotation.z = Math.sin(now * 31) * 0.5 * Math.min(1, shake);
    }

    if (possessed) {
      this.bellTimer -= dt;
      if (this.bellTimer <= 0 && fit > 0.5) {
        this.bellTimer = 1.6;
        const src = s.relic === 'drop-box' ? SPOTS.dropBox : SPOTS.relicRitual;
        const d = s.relic === 'held' ? 0 : Math.hypot(listener.x - src.x, -listener.z - src.y);
        this.onBell(listener.y < -3 ? 0 : tuneVolume(d));
      }
    }
  }

  /** The Bible stand and the Bible on it: by the circle's corner, or in front of the ritual table (D2-11). */
  private syncBibleStand(s: GameState): void {
    const r = bibleStandRect(s);
    const x = (r.x1 + r.x2) / 2;
    const y = (r.y1 + r.y2) / 2;
    const facing = bibleFacing(x, y);
    this.bibleStand.position.set(...toWorld(x, y, 0));
    this.bibleStand.rotation.set(0, facing, 0);
    // Lying on the sloping top, at the same slope.
    this.bible.position.set(...toWorld(x, y, 0, STAND_PROP.height + 0.004));
    this.bible.rotation.set(LECTERN_TILT, facing, 0);
  }

  /**
   * Day 2's lingering ghosts. From the third text the clown's ghost drifts
   * on a loop among the nearest east graves, giggling (D2-08); at the end of
   * the shift it chases the angry ghost round the same loop (D2-12). On the
   * hand bell's refill trip a worried ghost stares at the old priest's grave,
   * and vanishes once the player has seen it and looked away (D2-09).
   */
  private updateLingering(s: GameState, dt: number, cam: THREE.Vector3): void {
    this.roamT += dt;
    const roaming = clownRoaming(s);
    const chasing = ghostsChasing(s);
    this.roamer.group.visible = roaming || chasing;
    this.grump.group.visible = chasing;
    // Faster round the loop while chasing.
    const speed = chasing ? 2.2 : 1;
    const t = this.roamT * speed;
    const place = (g: GhostModel, at: number, bob: number) => {
      const a = gravesLoop(at);
      const b = gravesLoop(at + 0.05);
      g.group.position.set(...toWorld(a.x, a.y, 0, GRAVES_LOOP.height + Math.sin(this.roamT * 3 + bob) * 0.08));
      g.group.rotation.set(0, Math.atan2(b.x - a.x, -(b.y - a.y)), 0);
    };
    if (this.roamer.group.visible) place(this.roamer, chasing ? t - 1.1 : t, 0);
    if (this.grump.group.visible) place(this.grump, t, 1.7);

    // Giggles from the clown, squeaks from the angry one, by distance: the
    // clown's ghost until the hand bell is out of the drop box, and the chase
    // once the player has seen it (designer, 2026-12-01).
    const heard = chasing ? s.flags.has('chase-spotted') : s.relic_kind === 'bell' && s.relic === 'drop-box';
    if (this.roamer.group.visible && heard) {
      this.ghostSoundTimer -= dt;
      if (this.ghostSoundTimer <= 0) {
        this.ghostSoundTimer = chasing ? 1.3 : 3.2;
        const d = cam.distanceTo(this.roamer.group.position);
        const v = cam.y < -3 ? 0 : 0.5 / (1 + (d / 12) ** 2);
        if (chasing && Math.random() < 0.5) this.onSqueak(v);
        else this.onGiggle(v);
      }
    }

    // The teacup's and music box's ghosts watch from north of the loop.
    for (const [i, g] of this.onlookers.entries()) {
      const o = ONLOOKERS[i];
      g.group.visible = chasing;
      if (!chasing) continue;
      g.group.position.set(...toWorld(o.x, o.y, 0, GRAVES_LOOP.height + 0.1 + Math.sin(this.roamT * 1.2 + i * 2) * 0.05));
      g.group.rotation.set(0, Math.atan2(GRAVES_LOOP.x - o.x, -(GRAVES_LOOP.y - o.y)), 0);
    }

    // The concerned ghost, over the plot, bent to read the headstone.
    const w = WORRIED_SPOT;
    this.worrier.group.visible = worriedShown(s);
    if (this.worrier.group.visible) {
      this.worrier.group.position.set(...toWorld(w.x, w.y, 0, 0.3 + Math.sin(this.roamT * 1.5) * 0.03));
      this.worrier.group.rotation.set(w.lean, Math.atan2(w.lookX - w.x, -(w.lookY - w.y)), 0);
    }

    // What has been seen. Not from indoors, where walls are in the way.
    const indoors = !!zoneAt(cam.x, -cam.z, 0)?.roof || cam.y < -3;
    const watch = (who: Spotted, shown: boolean, pos: THREE.Vector3, range: number) => {
      const seen = shown && !indoors && this.inView(pos, cam, range);
      this.seenFor[who] = seen ? this.seenFor[who] + dt : 0;
      if (this.seenFor[who] >= 0.7) this.onSpotted(who);
      return seen;
    };
    watch(chasing ? 'chase' : 'clown-roaming', this.roamer.group.visible, this.roamer.group.position, SPOT_RANGE.clown);
    const worriedPos = new THREE.Vector3(...toWorld(w.x, w.y, 0, 0.6));
    const sees = watch('worried', this.worrier.group.visible, worriedPos, SPOT_RANGE.worried);
    // Once seen, looking away long enough makes it vanish.
    if (this.worrier.group.visible && s.flags.has('worried-spotted')) {
      this.worriedAwayFor = sees ? 0 : this.worriedAwayFor + dt;
      if (this.worriedAwayFor >= 1) this.onWorriedVanished();
    } else {
      this.worriedAwayFor = 0;
    }
    watch('worried-gone', s.flags.has('worried-vanished') && !s.flags.has('worried-looked-back'), worriedPos, SPOT_RANGE.worried);
  }

  /** True when `pos` is on screen (with a margin) and within `range` metres. */
  private inView(pos: THREE.Vector3, cam: THREE.Vector3, range: number): boolean {
    if (cam.distanceTo(pos) > range) return false;
    const p = pos.clone().project(this.camera);
    return p.z < 1 && Math.abs(p.x) < 0.8 && Math.abs(p.y) < 0.8;
  }

  /** The bucket: in the closet, carried, or by the ritual table; and the rod until it's taken. */
  private syncBucket(s: GameState): void {
    this.bucket.visible = s.bucket !== 'held';
    this.heldBucket.visible = s.bucket === 'held';
    at(this.bucket, s.bucket === 'chapel' ? SPOTS.bucketChapel : SPOTS.bucketCloset);
    (this.bucket.userData.water as THREE.Object3D).visible = s.bucket_filled;
    (this.heldBucket.userData.water as THREE.Object3D).visible = s.bucket_filled;
    this.rod.visible = !s.inventory.has('rod');
  }

  /**
   * The prankster rises from behind the bench (between it and the east
   * hedge), tongue out, wobbles, then drifts up and away north over the
   * hedge and fades.
   */
  private updatePrank(dt: number, cam: THREE.Vector3): void {
    if (this.prankT < 0) return;
    this.prankT += dt;
    const t = this.prankT;
    const g = this.prankster;
    const [bx, , bz] = toWorld(SPOTS.chaliceBench.x + 0.9, SPOTS.chaliceBench.y, 0);
    const pop = Math.min(1, t / 0.3);
    const away = Math.max(0, t - 1.4);
    g.group.position.set(bx + away * 0.3, -0.3 + pop * 0.75 + away * 0.9 + Math.sin(t * 9) * 0.03, bz - away * 1.6);
    g.group.rotation.set(0, Math.atan2(cam.x - g.group.position.x, cam.z - g.group.position.z), Math.sin(t * 14) * 0.08 * (1 - Math.min(1, away)));
    g.setTongue(t > 0.25 && t < 1.3 ? 1 : 0);
    g.setFade(t < PRANK_SECONDS - 0.8 ? 1 : Math.max(0, (PRANK_SECONDS - t) / 0.8));
    if (t >= PRANK_SECONDS) {
      this.prankT = -1;
      g.group.visible = false;
      g.setTongue(0);
    }
  }

  private updateRelicGhost(dt: number, cam: THREE.Vector3): void {
    if (this.relicGhostT < 0) return;
    const g = this.relicGhost;
    this.relicGhostT += dt;
    const t = this.relicGhostT;
    // The music box's ghost gives the player a wink once it's up.
    if (this.relicGhostOf === 'music-box') g.setWink(t > 1.3 && t < 1.9 ? 1 : 0);
    // Rise to about eye level and drift a little towards the player so the
    // smile is in view from the holy circle, then fade away.
    const rise = Math.min(t / 1.2, 1);
    const from = this.relicGhostFrom;
    g.group.position.set(
      from.x + (cam.x - from.x) * 0.2 * rise,
      from.y + rise * 0.35 + Math.sin(t * 3) * 0.04,
      from.z + (cam.z - from.z) * 0.2 * rise,
    );
    g.group.rotation.set(0, Math.atan2(cam.x - g.group.position.x, cam.z - g.group.position.z), 0);
    g.setFade(t < GHOST_LIFE - 0.9 ? 1 : Math.max(0, (GHOST_LIFE - t) / 0.9));
    if (t >= GHOST_LIFE) {
      this.relicGhostT = -1;
      g.group.visible = false;
      this.onCue('ghost-gone', this.relicGhostOf);
    }
  }

  /**
   * The tree ghost stays on the far side of the trunk from the player and
   * leans out past its west edge, so it is peeking from any angle. Once the
   * scare has fired it giggles, slides fully behind the trunk and fades.
   */
  private updatePeeker(s: GameState, dt: number, cam: THREE.Vector3): void {
    const g = this.peeker;
    const fired = s.fired_scares.includes('d1-tree-peek');
    if (fired) this.peekHideT += dt;
    // Only on the walk home at the end of the day.
    g.group.visible = s.day_index === 1 && s.flags.has('heading-home') && (!fired || this.peekHideT < PEEK_HIDE);
    if (!g.group.visible) return;

    const [tx, , tz] = toWorld(TREE_PEEK.x, TREE_PEEK.y, 0);
    // Unit vector from the player to the tree, along the ground.
    let dx = tx - cam.x;
    let dz = tz - cam.z;
    const len = Math.hypot(dx, dz) || 1;
    dx /= len;
    dz /= len;
    // Across the line of sight, pick the side whose edge is further west
    // (smaller x), with a little hysteresis so it doesn't flicker when the
    // player stands due east or west of the tree.
    const acrossX = -dz * this.peekSide;
    if (acrossX > 0.15) this.peekSide = -this.peekSide;
    const sx = -dz * this.peekSide;
    const sz = dx * this.peekSide;

    const t = this.peekHideT;
    const giggle = fired ? Math.max(0, 1 - t / 0.6) : 0;
    const duck = fired ? Math.min(1, Math.max(0, (t - 0.45) / 0.5)) : 0;
    const out = (TREE_PEEK.trunk + 0.02) * (1 - duck);
    const behind = TREE_PEEK.trunk + 0.25;
    const now = performance.now() / 1000;
    g.group.position.set(
      tx + dx * behind + sx * out,
      0.55 + Math.sin(now * 2) * 0.04 + giggle * Math.abs(Math.sin(now * 26)) * 0.06,
      tz + dz * behind + sz * out,
    );
    const face = Math.atan2(cam.x - g.group.position.x, cam.z - g.group.position.z);
    // The ghost's local +x, facing the player, is (cos face, -sin face) in
    // world x/z; lean the head towards the open side of the trunk.
    const leanSide = Math.sign(Math.cos(face) * sx - Math.sin(face) * sz) || 1;
    const lean = 0.32 * (1 - duck) + giggle * Math.sin(now * 30) * 0.08;
    g.group.rotation.set(0, face, -leanSide * lean);
    g.setFade(fired ? Math.min(1, Math.max(0, (PEEK_HIDE - t) / 0.4)) : 1);
  }

  private updateBus(dt: number): void {
    if (!this.bus) return;
    this.busT += dt;
    // Pull away east, gathering speed.
    const x = -1 + 1.6 * this.busT * this.busT;
    this.bus.position.x = x;
    if (x > 60) {
      this.root.remove(this.bus);
      this.bus = null;
    }
  }
}
