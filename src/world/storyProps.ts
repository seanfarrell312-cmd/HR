import * as THREE from 'three';
import { toWorld } from '../data/layout';
import { CANDLES, SPOTS, type ItemSpot } from '../data/story';
import type { GameState } from '../state/store';

// Story items whose look follows game state (S1 placeholders). `sync` is
// called every frame and derives everything from state, so a reset or a
// debug jump never leaves a stale prop behind. Only the ghost and the bus are
// timed effects, started by events.

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

interface Ghost {
  group: THREE.Group;
  mats: THREE.MeshBasicMaterial[];
  light: THREE.PointLight;
  t: number;
  baseY: number;
  startX: number;
  startZ: number;
}

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
  private ghosts: Ghost[] = [];
  private bus: THREE.Group | null = null;
  private busT = 0;
  private chimeTimer = 2;

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

    this.root.add(this.note, this.key, this.matches, this.crucifix, this.clock, this.deskMarker);
    this.raycastTargets.push(this.note, this.key, this.matches, this.crucifix, this.clock);
  }

  /** Remove timed effects, e.g. on reset. */
  clearEffects(): void {
    for (const g of this.ghosts) this.root.remove(g.group);
    this.ghosts = [];
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

  spawnGhost(): void {
    const group = new THREE.Group();
    const mats = [basic('#8dff6e', 0.85), basic('#101810', 0.9)];
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.34, 0.7, 7, 1, true), mats[0]);
    body.position.y = 0.35;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mats[0]);
    head.position.y = 0.72;
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.02), mats[1]);
    eyeL.position.set(-0.08, 0.76, 0.2);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.08;
    const smile = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.013, 4, 10, Math.PI), mats[1]);
    smile.rotation.z = Math.PI;
    smile.position.set(0, 0.67, 0.2);
    const light = new THREE.PointLight('#7dff6a', 1.5, 4, 2);
    light.position.y = 0.6;
    group.add(body, head, eyeL, eyeR, smile, light);
    const [x, y, z] = toWorld(SPOTS.clockRitual.x, SPOTS.clockRitual.y, 0, SPOTS.clockRitual.z);
    group.position.set(x, y, z);
    this.root.add(group);
    this.ghosts.push({ group, mats, light, t: 0, baseY: y, startX: x, startZ: z });
  }

  sync(s: GameState, dt: number, hold: { active: boolean; progress: number }, listener: THREE.Vector3): void {
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
    if (agitation > 0) {
      this.clock.position.x += (Math.random() - 0.5) * 0.03 * agitation;
      this.clock.position.z += (Math.random() - 0.5) * 0.03 * agitation;
      this.clock.rotation.z = (Math.random() - 0.5) * 0.12 * agitation;
    }
    if (restless) {
      this.chimeTimer -= dt;
      if (this.chimeTimer <= 0) {
        this.chimeTimer = 6 - 4.8 * agitation;
        const d = this.clock.position.distanceTo(listener);
        this.onChime(Math.max(0, 1 - d / 14), agitation);
      }
    }

    // Crucifix rises into view while a blessing is held.
    this.heldCrucifix.visible = hold.active && hold.progress > 0;
    this.heldCrucifix.position.y = -0.45 + hold.progress * 0.2;

    this.updateGhosts(dt);
    this.updateBus(dt);
  }

  private updateGhosts(dt: number): void {
    const LIFE = 3.4;
    for (const g of [...this.ghosts]) {
      g.t += dt;
      // Rise to about eye level and drift a little towards the player so the
      // smile is in view from the holy circle.
      const cam = this.camera.getWorldPosition(new THREE.Vector3());
      const rise = Math.min(g.t / 1.2, 1);
      g.group.position.y = g.baseY + rise * 0.35 + Math.sin(g.t * 3) * 0.04;
      g.group.position.x = g.startX + (cam.x - g.startX) * 0.2 * rise;
      g.group.position.z = g.startZ + (cam.z - g.startZ) * 0.2 * rise;
      g.group.rotation.y = Math.atan2(cam.x - g.group.position.x, cam.z - g.group.position.z);
      const fade = g.t < LIFE - 0.9 ? 1 : Math.max(0, (LIFE - g.t) / 0.9);
      g.mats[0].opacity = 0.85 * fade;
      g.mats[1].opacity = 0.9 * fade;
      g.light.intensity = 1.5 * fade;
      if (g.t >= LIFE) {
        this.root.remove(g.group);
        this.ghosts.splice(this.ghosts.indexOf(g), 1);
      }
    }
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
