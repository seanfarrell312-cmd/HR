import * as THREE from 'three';
import { AREAS, DOORS, toWorld } from '../data/layout';
import { CANDLES, PURIFY, SPOTS, TREE_PEEK, type ItemSpot } from '../data/story';
import type { GameState } from '../state/store';
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

function crucifixModel(): THREE.Group {
  const g = new THREE.Group();
  const m = lambert('#c9a43a');
  const upright = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.3, 0.02), m);
  upright.position.y = 0.15;
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.02), m);
  bar.position.y = 0.21;
  g.add(upright, bar);
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

/** A blessed clock settling down: wind-down, silence, sparkles, ghost. */
interface Purification {
  t: number;
  origin: THREE.Vector3;
  sparkles: Sparkle[];
  fired: Set<PurifyCue>;
}

/** 'ghost' as it appears; 'ghost-gone' once it has risen and vanished. */
export type PurifyCue = 'wind-down' | 'sparkle' | 'ghost' | 'ghost-gone';

/** Seconds the clock ghost is on screen: rise, smile, fade. */
const GHOST_LIFE = 3.4;
/** Seconds for the tree ghost to giggle, duck behind the trunk and fade. */
const PEEK_HIDE = 1.3;

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
  private crucifix: THREE.Object3D;
  private clock: THREE.Group;
  private candles: CandleView[] = [];
  private deskMarker: THREE.Mesh;
  private heldClock: THREE.Group;
  private heldCrucifix: THREE.Group;
  /** The clock's ghost; one model, reused, with its light always in the scene. */
  private clockGhost: GhostModel;
  private clockGhostT = -1;
  private clockGhostFrom = new THREE.Vector3();
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
  onCue: (cue: PurifyCue) => void = () => {};

  /** Called when the clock chimes, with volume 0..1 and agitation 0..1. */
  onChime: (volume: number, agitation: number) => void = () => {};

  constructor(private readonly camera: THREE.Camera) {
    this.note = tagged(at(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.005, 0.28), basic('#f4f1e6')), SPOTS.officeNote), 'office-note');
    this.key = tagged(at(new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.12, 0.04), lambert('#d8b440')), SPOTS.chapelKey), 'chapel-key');
    this.matches = tagged(at(new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), lambert('#b8321f')), SPOTS.matches), 'matches');
    this.crucifix = tagged(at(crucifixModel(), SPOTS.crucifix), 'crucifix');
    this.clock = tagged(clockModel(), 'clock') as THREE.Group;

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
    this.heldCrucifix = crucifixModel();
    this.heldCrucifix.position.set(0.22, -0.45, -0.5);
    camera.add(this.heldClock, this.heldCrucifix);

    // Lights stay in the scene at zero intensity: adding one later would make
    // Three.js recompile every shader and hitch.
    this.clockGhost = ghostModel(true);
    this.clockGhost.group.visible = false;
    this.peeker = ghostModel(false);
    this.peeker.group.visible = false;
    this.root.add(this.clockGhost.group, this.peeker.group);

    this.root.add(this.note, this.key, this.matches, this.crucifix, this.clock, this.deskMarker);
    this.raycastTargets.push(this.note, this.key, this.matches, this.crucifix, this.clock);
  }

  /** Remove timed effects, e.g. on reset. */
  clearEffects(): void {
    this.endPurification();
    this.clockGhostT = -1;
    this.clockGhost.group.visible = false;
    this.clockGhost.setFade(0);
    this.peekHideT = 0;
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

  startPurification(): void {
    this.endPurification();
    const origin = new THREE.Vector3(...toWorld(SPOTS.clockRitual.x, SPOTS.clockRitual.y, 0, SPOTS.clockRitual.z + 0.22));
    const sparkles: Sparkle[] = [];
    for (let i = 0; i < SPARKLE_COUNT; i++) {
      const mat = basic(i % 3 === 0 ? '#ffffff' : '#fff1a8', 0.95);
      const mesh = new THREE.Mesh(sparkleGeometry, mat);
      mesh.visible = false;
      this.root.add(mesh);
      sparkles.push({ mesh, mat, delay: (i / SPARKLE_COUNT) * SPARKLE_SPREAD, angle: Math.random() * Math.PI * 2, speed: 0.6 + Math.random() * 0.5 });
    }
    this.purification = { t: 0, origin, sparkles, fired: new Set(['wind-down']) };
    this.onCue('wind-down');
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
      if (name === 'ghost') this.startClockGhost();
      this.onCue(name);
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

  private startClockGhost(): void {
    this.clockGhostFrom.set(...toWorld(SPOTS.clockRitual.x, SPOTS.clockRitual.y, 0, SPOTS.clockRitual.z));
    this.clockGhostT = 0;
    this.clockGhost.group.visible = true;
  }

  /**
   * `paused` freezes timed effects (purification, ghost, bus) while the
   * inventory is open; the clock keeps chiming so the world still sounds alive.
   */
  sync(s: GameState, dt: number, hold: { active: boolean; progress: number }, listener: THREE.Vector3, paused = false): void {
    const fxDt = paused ? 0 : dt;
    this.note.visible = true;
    this.key.visible = !s.inventory.has('chapel-key');
    this.matches.visible = !s.inventory.has('matches');
    this.crucifix.visible = !s.inventory.has('crucifix');

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

    // Agitation rises with each lit candle until the blessing (D1-04).
    const restless = s.clock === 'ritual-table' && !s.flags.has('clock-blessed');
    const agitation = restless ? s.candles_lit.size / 4 : 0;
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

    // Crucifix rises into view while a blessing is held.
    this.heldCrucifix.visible = hold.active && hold.progress > 0;
    this.heldCrucifix.position.y = -0.45 + hold.progress * 0.2;

    const cam = this.camera.getWorldPosition(new THREE.Vector3());
    this.updatePurification(fxDt);
    this.updateClockGhost(fxDt, cam);
    this.updatePeeker(s, fxDt, cam);
    this.updateBus(fxDt);
  }

  private updateClockGhost(dt: number, cam: THREE.Vector3): void {
    if (this.clockGhostT < 0) return;
    const g = this.clockGhost;
    this.clockGhostT += dt;
    const t = this.clockGhostT;
    // Rise to about eye level and drift a little towards the player so the
    // smile is in view from the holy circle, then fade away.
    const rise = Math.min(t / 1.2, 1);
    const from = this.clockGhostFrom;
    g.group.position.set(
      from.x + (cam.x - from.x) * 0.2 * rise,
      from.y + rise * 0.35 + Math.sin(t * 3) * 0.04,
      from.z + (cam.z - from.z) * 0.2 * rise,
    );
    g.group.rotation.set(0, Math.atan2(cam.x - g.group.position.x, cam.z - g.group.position.z), 0);
    g.setFade(t < GHOST_LIFE - 0.9 ? 1 : Math.max(0, (GHOST_LIFE - t) / 0.9));
    if (t >= GHOST_LIFE) {
      this.clockGhostT = -1;
      g.group.visible = false;
      this.onCue('ghost-gone');
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
