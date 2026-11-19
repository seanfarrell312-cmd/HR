import * as THREE from 'three';

// The friendly sheet ghost (doc 7.3; look per the designer's reference,
// 2026-11-08): a lime-green rounded dome that flares slightly to a wavy hem,
// two tall oval eyes and a small smile, with a soft glow shell and a wisp of
// green mist at its base. About 0.9 m tall, origin at the bottom of the hem.

const RADIUS = 0.3;
const SHOULDER = 0.56;
const HEM_RADIUS = 0.35;
const HEM_WAVES = 6;
const HEM_DEPTH = 0.04;

export interface GhostModel {
  group: THREE.Group;
  /** 0 = invisible, 1 = fully there; scales every material and the light. */
  setFade(f: number): void;
  /** 0 = both eyes open, 1 = its right eye shut in a wink. */
  setWink(k: number): void;
  /** 0 = mouth closed, 1 = tongue right out, blowing a raspberry (Day 2 prankster). */
  setTongue(k: number): void;
  /**
   * The teacup's ghost (designer reference, 2026-11-15): a big black
   * handlebar mustache in place of the smile, and a gold monocle on a chain
   * over its left eye (the player's right).
   */
  setDapper(on: boolean): void;
}

let bodyGeometry: THREE.BufferGeometry | null = null;
let mistTexture: THREE.Texture | null = null;

/** Lathe profile from the hem up over the dome, with a wavy bottom edge. */
function body(): THREE.BufferGeometry {
  if (bodyGeometry) return bodyGeometry;
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 6; i++) {
    const k = i / 6;
    // Slight flare towards the hem, like a sheet settling.
    pts.push(new THREE.Vector2(HEM_RADIUS + (RADIUS - HEM_RADIUS) * Math.sqrt(k), k * SHOULDER));
  }
  for (let i = 1; i <= 8; i++) {
    const a = (i / 8) * (Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(0.001, RADIUS * Math.cos(a)), SHOULDER + RADIUS * Math.sin(a)));
  }
  const g = new THREE.LatheGeometry(pts, 24);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0.14) continue;
    const angle = Math.atan2(pos.getX(i), pos.getZ(i));
    pos.setY(i, y + HEM_DEPTH * Math.sin(angle * HEM_WAVES) * (1 - y / 0.14));
  }
  g.computeVertexNormals();
  bodyGeometry = g;
  return g;
}

function mist(): THREE.Texture | null {
  if (mistTexture) return mistTexture;
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(150, 255, 110, 0.75)');
  grad.addColorStop(1, 'rgba(150, 255, 110, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  mistTexture = new THREE.CanvasTexture(c);
  return mistTexture;
}

/** `withLight` adds a green point light (indoors, where the glow should show). */
export function ghostModel(withLight: boolean): GhostModel {
  const group = new THREE.Group();
  const fades: { mat: THREE.Material & { opacity: number }; full: number }[] = [];
  const track = <M extends THREE.Material & { opacity: number }>(mat: M): M => {
    mat.transparent = true;
    fades.push({ mat, full: mat.opacity });
    return mat;
  };

  const sheet = new THREE.Mesh(
    body(),
    track(new THREE.MeshLambertMaterial({ color: '#b4ff86', emissive: '#5fcf3c', side: THREE.DoubleSide, opacity: 0.94 })),
  );
  const glow = new THREE.Mesh(
    body(),
    track(new THREE.MeshBasicMaterial({ color: '#8dff5a', side: THREE.BackSide, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending })),
  );
  glow.scale.set(1.14, 1.06, 1.14);
  glow.position.y = -0.02;

  const dark = track(new THREE.MeshBasicMaterial({ color: '#0d140b', opacity: 1 }));
  const eyeGeo = new THREE.SphereGeometry(0.05, 10, 8);
  const eyeY = SHOULDER + 0.08;
  const faceR = Math.sqrt(RADIUS * RADIUS - 0.08 * 0.08);
  const eyes: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, dark);
    eyes.push(eye);
    const x = side * 0.095;
    eye.scale.set(0.85, 1.25, 0.35);
    eye.position.set(x, eyeY, Math.sqrt(faceR * faceR - x * x) - 0.004);
    eye.rotation.y = Math.asin(x / faceR);
    group.add(eye);
  }
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.009, 4, 12, Math.PI), dark);
  smile.rotation.z = Math.PI;
  smile.position.set(0, SHOULDER - 0.04, RADIUS + 0.005);
  // A pink tongue that pokes out from under the smile.
  const tongue = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
    track(new THREE.MeshLambertMaterial({ color: '#ff7aa8', emissive: '#a83a62', opacity: 1 })),
  );
  tongue.rotation.x = Math.PI / 2 + 0.35;
  tongue.position.set(0, SHOULDER - 0.075, RADIUS - 0.02);
  tongue.visible = false;
  group.add(sheet, glow, smile, tongue);

  // Handlebar mustache and monocle, shown only on the teacup's ghost.
  const dapper = new THREE.Group();
  dapper.visible = false;
  // Each half of the mustache is one tapered tube along a path drawn on the
  // face, from the middle out to an upturned curl at the tip. The path is
  // wrapped onto the body and every ring of the tube is pushed out along the
  // surface normal by its own thickness, so the whole shape, curls included,
  // lies on the outside of the sheet (designer reference, 2026-11-15).
  const lipY = SHOULDER - 0.035;
  /** Radius of the body's cross-section at height y. */
  const bodyR = (y: number): number =>
    y >= SHOULDER
      ? Math.sqrt(Math.max(0, RADIUS * RADIUS - (y - SHOULDER) ** 2))
      : HEM_RADIUS + (RADIUS - HEM_RADIUS) * Math.sqrt(Math.max(0, y / SHOULDER));
  /** The face point at (x, y) and the outward normal there. */
  const onFace = (x: number, y: number): [THREE.Vector3, THREE.Vector3] => {
    const z = Math.sqrt(Math.max(0, bodyR(y) ** 2 - x * x));
    return [new THREE.Vector3(x, y, z), new THREE.Vector3(x, 0, z).normalize()];
  };
  // The right half's path (x out from the middle, y up from the lip); the
  // left is its mirror. Down into a plump lobe, up the outside, then curling
  // back in over the top.
  const PATH: [number, number][] = [
    [-0.006, 0.004], [0.03, -0.004], [0.07, -0.015], [0.108, -0.016], [0.138, -0.004],
    [0.157, 0.017], [0.155, 0.037], [0.139, 0.046], [0.123, 0.037], [0.124, 0.024], [0.134, 0.02],
  ];
  /** Half-thickness along the path (0 = middle, 1 = the curl's end). */
  const THICK: [number, number][] = [[0, 0.011], [0.22, 0.021], [0.42, 0.016], [0.58, 0.009], [0.8, 0.006], [1, 0.0035]];
  const thick = (t: number): number => {
    for (let i = 1; i < THICK.length; i++) {
      const [t1, r1] = THICK[i];
      const [t0, r0] = THICK[i - 1];
      if (t <= t1) return r0 + ((r1 - r0) * (t - t0)) / (t1 - t0);
    }
    return THICK[THICK.length - 1][1];
  };
  /** How flat the tube is front to back, as a share of its width. */
  const DEPTH = 0.55;
  /** Clearance between the back of the mustache and the sheet. */
  const GAP = 0.003;
  const SEGMENTS = 48;
  const RADIAL = 8;
  for (const side of [-1, 1]) {
    const curve = new THREE.CatmullRomCurve3(PATH.map(([x, dy]) => onFace(side * x, lipY + dy)[0]));
    const tube = new THREE.TubeGeometry(curve, SEGMENTS, 1, RADIAL, false);
    const pos = tube.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i <= SEGMENTS; i++) {
      const centre = curve.getPointAt(i / SEGMENTS);
      const [, n] = onFace(centre.x, centre.y);
      const r = thick(i / SEGMENTS);
      for (let j = 0; j <= RADIAL; j++) {
        const k = i * (RADIAL + 1) + j;
        v.fromBufferAttribute(pos, k).sub(centre);
        // Split the unit offset into its out-of-face part and the rest,
        // flatten the first, scale both, and lift the ring clear of the face.
        const out = v.dot(n);
        v.addScaledVector(n, -out).multiplyScalar(r).addScaledVector(n, out * r * DEPTH + r * DEPTH + GAP).add(centre);
        pos.setXYZ(k, v.x, v.y, v.z);
      }
    }
    tube.computeVertexNormals();
    dapper.add(new THREE.Mesh(tube, dark));
  }
  // A knot in the middle where the halves meet.
  const [knotAt, knotN] = onFace(0, lipY + 0.004);
  const knot = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), dark);
  knot.scale.set(0.014, 0.012, 0.012 * DEPTH);
  knot.position.copy(knotAt).addScaledVector(knotN, 0.012 * DEPTH + GAP);
  dapper.add(knot);
  /** Where the face is at height y, x along. */
  const faceZ = (x: number, y: number): number => onFace(x, y)[0].z;
  const gold = track(new THREE.MeshLambertMaterial({ color: '#c9a24a', emissive: '#4a3712', opacity: 1 }));
  const mx = 0.095;
  const monocle = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.007, 6, 20), gold);
  // Clear of the sheet, which bulges out a little below the eye.
  monocle.position.set(mx, eyeY, faceZ(mx, eyeY) + 0.02);
  monocle.rotation.y = Math.asin(mx / faceR);
  dapper.add(monocle);
  // A chain of little links hanging from the rim's outer edge.
  const link = new THREE.SphereGeometry(0.008, 6, 4);
  const chainX = mx + 0.066;
  for (let i = 1; i <= 9; i++) {
    const y = eyeY - 0.02 - i * 0.022;
    const bead = new THREE.Mesh(link, gold);
    bead.position.set(chainX, y, faceZ(chainX, y) + 0.012);
    dapper.add(bead);
  }
  group.add(dapper);

  const tex = mist();
  if (tex) {
    const wisp = new THREE.Mesh(
      new THREE.PlaneGeometry(1.3, 1.3),
      track(new THREE.MeshBasicMaterial({ map: tex, opacity: 0.6, depthWrite: false })),
    );
    wisp.rotation.x = -Math.PI / 2;
    wisp.position.y = -0.08;
    group.add(wisp);
  }

  let light: THREE.PointLight | null = null;
  if (withLight) {
    light = new THREE.PointLight('#7dff6a', 0, 4, 2);
    light.position.y = 0.6;
    group.add(light);
  }

  return {
    group,
    setFade(f: number) {
      for (const { mat, full } of fades) mat.opacity = full * f;
      if (light) light.intensity = 1.5 * f;
    },
    setWink(k: number) {
      // Squash the eye on the ghost's left as seen by the player (its right).
      eyes[0].scale.y = 1.25 * (1 - 0.88 * k);
    },
    setDapper(on: boolean) {
      dapper.visible = on;
      smile.visible = !on;
    },
    setTongue(k: number) {
      tongue.visible = k > 0.01;
      tongue.scale.set(1, 0.4 + 1.1 * k, 0.6 + 0.6 * k);
      // Screwed-up eyes while blowing it.
      for (const eye of eyes) eye.scale.y = 1.25 * (1 - 0.55 * k);
    },
  };
}
