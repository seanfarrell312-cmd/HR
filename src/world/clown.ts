import * as THREE from 'three';

// Day 2's second relic, the possessed clown doll (designer concept art,
// 2026-11-22): low-poly and flat-shaded, a white round head with black oval
// eyes, red nose, rosy cheeks and a red smile, a cone hat split blue and
// yellow with a red pompom, a yellow ruffled collar, a suit split blue (its
// right, the viewer's left) and red with two yellow buttons, white hands and
// dark shoes. It sits with its legs out in front; when the cross fails on it,
// it stands up and dances (D2-05).
//
// Built facing +z, origin on the surface it sits on, about 0.5 m to the hat's
// tip; the caller scales it.

const COLOURS = {
  blue: '#3d3f9c',
  red: '#b5322d',
  yellow: '#e2b33c',
  white: '#efe6da',
  shoe: '#3a2a22',
  rouge: '#c23a35',
  mouth: '#9c2a2a',
  eye: '#161212',
};

const flat = (color: string) => new THREE.MeshLambertMaterial({ color, flatShading: true });

export interface ClownView {
  group: THREE.Group;
  /** Torso, collar, head and arms, raised when it stands. */
  body: THREE.Group;
  head: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
}

const SKULL_R = 0.078;
/** The smile's half-width, and the heights of its corners and its lowest point, on the face. */
const SMILE = { half: 0.033, corner: -0.016, bottom: -0.034, radius: 0.0042 };

/**
 * The smile, drawn along the head itself (2026-11-22 playtest: a flat arc
 * floated off the round head). Each point of a U is found on the faceted
 * skull by casting out from its centre, so the line follows the facets and
 * sits half sunk into them, like paint.
 */
export function smileMesh(skull: THREE.BufferGeometry, material: THREE.Material): THREE.Group {
  const probe = new THREE.Mesh(skull, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  probe.updateMatrixWorld();
  const ray = new THREE.Raycaster();
  const origin = new THREE.Vector3();
  const N = 18;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= N; i++) {
    const u = (i / N) * 2 - 1;
    const x = u * SMILE.half;
    const y = SMILE.bottom + (SMILE.corner - SMILE.bottom) * u * u;
    const dir = new THREE.Vector3(x, y, Math.sqrt(SKULL_R ** 2 - x * x - y * y)).normalize();
    ray.set(origin, dir);
    const hit = ray.intersectObject(probe)[0];
    const r = hit ? hit.distance : SKULL_R;
    points.push(dir.multiplyScalar(r + SMILE.radius * 0.25));
  }
  const group = new THREE.Group();
  const curve = new THREE.CatmullRomCurve3(points);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, SMILE.radius, 6, false), material));
  // Rounded ends.
  for (const p of [points[0], points[N]]) {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(SMILE.radius, 6, 4), material);
    cap.position.copy(p);
    group.add(cap);
  }
  group.name = 'smile';
  return group;
}

/** Hip height when sitting, and how far the body rises when it stands. */
const HIP = 0.045;
const LEG = 0.125;

export function clownModel(): ClownView {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const m = {} as Record<keyof typeof COLOURS, THREE.Material>;
  for (const k of Object.keys(COLOURS) as (keyof typeof COLOURS)[]) m[k] = flat(COLOURS[k]);

  // Suit: a tapered barrel split down the middle, blue on its right (-x), red on its left.
  for (const [mat, start] of [[m.red, 0], [m.blue, Math.PI]] as const) {
    const half = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.084, 0.15, 8, 1, false, start, Math.PI), mat);
    half.position.y = HIP + 0.075;
    body.add(half);
  }
  for (const [y, z] of [[0.158, 0.073], [0.108, 0.08]]) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 4), m.yellow);
    button.scale.set(1, 1, 0.55);
    button.position.set(0, y, z);
    body.add(button);
  }
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.062, 0.035, 9), m.yellow);
  collar.position.y = 0.212;
  body.add(collar);

  // Head, pivoting at the neck.
  const head = new THREE.Group();
  head.position.y = 0.222;
  // A big head, as on the concept art; the hat scales with it.
  head.scale.setScalar(1.15);
  body.add(head);
  const skullGeometry = new THREE.IcosahedronGeometry(SKULL_R, 1);
  const skull = new THREE.Mesh(skullGeometry, m.white);
  skull.position.y = 0.068;
  head.add(skull);
  const face = new THREE.Group();
  face.position.y = 0.068;
  head.add(face);
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), m.eye);
    eye.scale.set(0.8, 1.35, 0.4);
    eye.position.set(side * 0.027, 0.016, 0.071);
    eye.rotation.y = side * 0.35;
    const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.0145, 8, 6), m.rouge);
    cheek.scale.set(1, 1, 0.35);
    cheek.position.set(side * 0.047, -0.013, 0.061);
    cheek.rotation.y = side * 0.65;
    face.add(eye, cheek);
  }
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), m.rouge);
  nose.position.set(0, -0.002, 0.079);
  face.add(nose, smileMesh(skullGeometry, m.mouth));

  // Cone hat, blue on its right and yellow on its left, leaning a touch, with a pompom.
  const hat = new THREE.Group();
  hat.position.set(0.012, 0.192, -0.004);
  hat.rotation.z = -0.22;
  for (const [mat, start] of [[m.yellow, 0], [m.blue, Math.PI]] as const) {
    hat.add(new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.13, 8, 1, false, start, Math.PI), mat));
  }
  const pompom = new THREE.Mesh(new THREE.IcosahedronGeometry(0.022, 0), m.rouge);
  pompom.position.y = 0.068;
  hat.add(pompom);
  head.add(hat);

  // Arms hang from the shoulders: blue on its right, red on its left.
  const arm = (side: number, mat: THREE.Material): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.077, 0.185, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.027, 0.1, 6), mat);
    sleeve.position.y = -0.05;
    const hand = new THREE.Mesh(new THREE.IcosahedronGeometry(0.027, 0), m.white);
    hand.position.y = -0.105;
    pivot.add(sleeve, hand);
    body.add(pivot);
    return pivot;
  };
  const armL = arm(-1, m.blue);
  const armR = arm(1, m.red);

  // Legs from the hips, out in front while it sits.
  const leg = (side: number, mat: THREE.Material): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.036, HIP, 0.02);
    const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.036, LEG - 0.01, 7), mat);
    trouser.position.y = -(LEG - 0.01) / 2;
    const shoe = new THREE.Mesh(new THREE.IcosahedronGeometry(0.036, 0), m.shoe);
    shoe.scale.set(1, 0.8, 1.25);
    shoe.position.set(0, -LEG, 0.012);
    pivot.add(trouser, shoe);
    body.add(pivot);
    return pivot;
  };
  const legL = leg(-1, m.blue);
  const legR = leg(1, m.red);

  const v: ClownView = { group, body, head, armL, armR, legL, legR };
  poseClown(v, { stand: 0, energy: 0, t: 0, fit: 0, slump: 0, limp: 0 });
  return v;
}

export interface ClownPose {
  /** 0 = sitting, 1 = standing up to dance. */
  stand: number;
  /** How hard it's dancing, 0..1. */
  energy: number;
  /** Seconds, for the dance and fidgets. */
  t: number;
  /** A possessed fidget while it sits (head wobble, arms flapping), 0..1. */
  fit: number;
  /** Fallen still once cleansed, 0..1. */
  slump: number;
  /**
   * Carried, 0..1 (2026-11-22 playtest): a lifeless doll held round the
   * middle, leaning back with its head lolled back, arms and legs hanging.
   */
  limp?: number;
}

/** How far the carried doll leans back, and its head on top of that. */
const LIMP_LEAN = 0.6;
const LIMP_HEAD = 1.0;

export function poseClown(v: ClownView, p: ClownPose): void {
  const { stand, energy, t, fit, slump } = p;
  const limp = p.limp ?? 0;
  // Standing lifts everything on the legs, which swing down under it; the
  // legs stay at the hips, so they rise with the body.
  v.body.position.y = stand * LEG + Math.abs(Math.sin(t * 11)) * 0.025 * energy;
  v.body.rotation.y = Math.sin(t * 2.6) * 0.5 * energy;
  // Leaning back (its back is -z) when carried limp.
  v.body.rotation.x = -LIMP_LEAN * limp;
  const kick = Math.sin(t * 11) * 0.6 * energy;
  // Carried, the legs hang down and a little forward, against the lean.
  const legs = -Math.PI / 2 * (1 - stand) * (1 - limp) + (LIMP_LEAN - 0.3) * limp;
  v.legL.rotation.x = legs + kick + 0.08 * limp;
  v.legR.rotation.x = legs - kick - 0.06 * limp;

  // Arms: out a little and forward when sitting, thrown up when dancing.
  // Carried, they hang straight down, out a touch, against the lean.
  const up = (0.35 + 1.9 * stand - 0.2 * slump) * (1 - limp) + 0.43 * limp;
  const flap = Math.sin(t * 16) * 0.35 * fit;
  const reach = -0.45 * (1 - stand) * (1 - limp) + LIMP_LEAN * limp;
  v.armL.rotation.set(reach + 0.1 * limp, 0, -up - Math.sin(t * 13) * 0.4 * energy - flap);
  v.armR.rotation.set(reach - 0.05 * limp, 0, up + 0.08 * limp + Math.sin(t * 13 + 1) * 0.4 * energy + flap);

  // Carried, the head lolls back and to one side.
  v.head.rotation.set(
    0.35 * slump - LIMP_HEAD * limp,
    0,
    Math.sin(t * 7) * 0.3 * energy + Math.sin(t * 8) * 0.2 * fit + 0.25 * slump + 0.55 * limp,
  );
}

/** Dance shape over its length: stand up, dance, sit back down. */
export function danceStand(t: number, length: number): number {
  if (t <= 0 || t >= length) return 0;
  const s = (a: number, b: number, x: number) => {
    const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return k * k * (3 - 2 * k);
  };
  return s(0, 0.35, t) * (1 - s(length - 0.5, length, t));
}
