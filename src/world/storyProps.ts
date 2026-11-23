import * as THREE from 'three';
import { AREAS, DOORS, toWorld } from '../data/layout';
import {
  CANDLES,
  CLOWN_DANCE_SECONDS,
  HOLY_CIRCLE,
  PRANK_SECONDS,
  PURIFY,
  RATTLE_SECONDS,
  RELIC_TABLE_SLOTS,
  SPOTS,
  TREE_PEEK,
  type ItemSpot,
} from '../data/story';
import type { GameState, RelicKind } from '../state/store';
import type { PurifiedRelic } from '../story/events';
import { siteReady } from '../story/table';
import { clownModel, danceStand, poseClown, type ClownView } from './clown';
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
function rodModel(): THREE.Group {
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
  private giggleTimer = 2;
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
    this.bucket = tagged(bucketModel(), 'bucket') as THREE.Group;
    this.rod = tagged(at(rodModel(), SPOTS.rodCloset), 'rod') as THREE.Group;
    // The handle is thin: an invisible sleeve round it makes it easy to aim at.
    const sleeve = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.44, 0.16),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }),
    );
    sleeve.position.y = 0.21;
    this.rod.add(sleeve);
    // Leaning in the closet's corner.
    this.rod.rotation.set(0.25, 0, -0.2);

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
    // Limp in the hand, flopped to one side with its head thrown back
    // (2026-11-22 playtest); the pose itself is poseClown's limp.
    this.heldClown.group.position.set(0.17, -0.38, -0.62);
    this.heldClown.group.rotation.set(0.15, -0.3, 0.35);
    this.heldClown.group.scale.setScalar(0.62);
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

    this.root.add(this.note, this.key, this.matches, this.cross, this.clock, this.deskMarker);
    this.root.add(this.chalice, this.crucifix, this.bible, this.musicBox.group, this.teacup, this.clown.group, this.bucket, this.rod);
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

  startPurification(relic: PurifiedRelic): void {
    this.endPurification();
    const spot = relic === 'clock' ? SPOTS.clockRitual : SPOTS.relicRitual;
    const lift = relic === 'clock' ? 0.22 : relic === 'teacup' ? 0.08 : relic === 'clown' ? 0.22 : 0.12;
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
    this.onCue('wind-down', relic);
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
    // The clown's is the laughing ghost, in its hat and nose.
    this.relicGhost.setClown(relic === 'clown');
    this.relicGhost.group.visible = true;
  }

  /**
   * `paused` freezes timed effects (purification, ghost, bus) while the
   * inventory is open; the clock keeps chiming so the world still sounds alive.
   */
  sync(
    s: GameState,
    dt: number,
    hold: { active: boolean; progress: number; cross: boolean; rod: boolean },
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
    this.syncBucket(s);

    // The hand cross rises into view while a blessing is held; the rod for
    // the water ritual.
    this.heldCross.visible = hold.cross && hold.active && hold.progress > 0;
    this.heldCross.position.y = -0.45 + hold.progress * 0.2;
    this.heldRod.visible = hold.rod && hold.active && hold.progress > 0;
    this.heldRod.position.y = -0.6 + hold.progress * 0.25;
    this.heldRod.rotation.z = -0.3 - hold.progress * 0.5;

    const cam = this.camera.getWorldPosition(new THREE.Vector3());
    this.updatePurification(fxDt);
    this.updateRelicGhost(fxDt, cam);
    this.updatePeeker(s, fxDt, cam);
    this.updatePrank(fxDt, cam);
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
   * cross makes it stand up and dance; then it giggles and fidgets now and
   * then until the water ritual winds it down and it slumps, still.
   */
  private syncClown(s: GameState, dt: number, fxDt: number, listener: THREE.Vector3): void {
    const current = s.relic_kind === 'clown';
    const stored = storedSpot(s, 'clown');
    this.clown.group.visible = (current && s.relic === 'ritual-table') || !!stored;
    this.heldClown.group.visible = current && s.relic === 'held';
    at(this.clown.group, stored ?? SPOTS.relicRitual);
    this.clown.group.rotation.set(0, -Math.PI / 2, 0);

    // Still and silent in the box, in hand and on the table until the cross
    // wakes it (2026-11-22 playtest); from then it fidgets and giggles while
    // the player fetches holy water.
    const awake = current && s.relic === 'ritual-table' && s.flags.has('clown-danced') && !s.flags.has('relic-blessed');
    let agitation = awake ? 1 : 0;
    const p = this.purification;
    if (p && p.relic === 'clown') agitation = Math.max(0, 1 - p.t / PURIFY.windDown);
    const slump = s.flags.has('relic-blessed') && current ? 1 - agitation : stored ? 1 : 0;

    const now = performance.now() / 1000;
    if (this.danceT >= 0) {
      this.danceT += fxDt;
      if (this.danceT > CLOWN_DANCE_SECONDS) this.danceT = -1;
    }
    const stand = this.danceT >= 0 ? danceStand(this.danceT, CLOWN_DANCE_SECONDS) : 0;
    // Fits of fidgeting every few seconds while it sits possessed.
    const fit = agitation * Math.max(0, Math.sin(now * 1.3)) ** 4;
    poseClown(this.clown, { stand, energy: stand, t: this.danceT >= 0 ? this.danceT : now, fit, slump });
    poseClown(this.heldClown, { stand: 0, energy: 0, t: 0, fit: 0, slump: 0, limp: 1 });

    if (awake && this.danceT < 0) {
      this.giggleTimer -= dt;
      if (this.giggleTimer <= 0 && fit > 0.5) {
        this.giggleTimer = 2.6;
        const d = Math.hypot(listener.x - SPOTS.relicRitual.x, -listener.z - SPOTS.relicRitual.y);
        this.onGiggle(listener.y < -3 ? 0 : tuneVolume(d));
      }
    }
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
    g.group.visible = s.flags.has('heading-home') && (!fired || this.peekHideT < PEEK_HIDE);
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
