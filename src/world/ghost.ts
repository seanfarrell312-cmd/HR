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
  group.add(sheet, glow, smile);

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
  };
}
