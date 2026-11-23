import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { clownModel, poseClown } from '../src/world/clown';

// The clown doll's model (S3 part 2, 2026-11-22 playtest fixes).

describe('the clown doll model', () => {
  it('has its smile on the head, not floating off it', () => {
    const v = clownModel();
    const smile = v.head.getObjectByName('smile')!;
    expect(smile).toBeTruthy();
    const skull = smile.parent!.parent!.children.find(
      (c) => c instanceof THREE.Mesh && c.geometry instanceof THREE.IcosahedronGeometry,
    ) as THREE.Mesh;
    const tube = smile.children[0] as THREE.Mesh;
    const pos = tube.geometry.getAttribute('position');
    // Every vertex of the smile is within a few millimetres of the skull's
    // surface, measured along the ray from its centre.
    const probe = new THREE.Mesh(skull.geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
    probe.updateMatrixWorld();
    const ray = new THREE.Raycaster();
    const p = new THREE.Vector3();
    let worst = 0;
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i);
      ray.set(new THREE.Vector3(), p.clone().normalize());
      const surface = ray.intersectObject(probe)[0].distance;
      worst = Math.max(worst, Math.abs(p.length() - surface));
    }
    expect(worst).toBeLessThan(0.0065);
    // And it's below the nose, on the front of the face.
    tube.geometry.computeBoundingBox();
    const box = tube.geometry.boundingBox!;
    expect(box.max.y).toBeLessThan(-0.01);
    expect(box.min.z).toBeGreaterThan(0.05);
  });

  it('hangs limp when carried: leaning back, head lolled, legs down', () => {
    const v = clownModel();
    poseClown(v, { stand: 0, energy: 0, t: 0, fit: 0, slump: 0, limp: 1 });
    // Its back is -z: leaning back is a negative turn about x.
    expect(v.body.rotation.x).toBeLessThan(-0.3);
    expect(v.head.rotation.x).toBeLessThan(-0.3);
    // The legs hang roughly straight down in the world, not out in front.
    for (const leg of [v.legL, v.legR]) expect(Math.abs(v.body.rotation.x + leg.rotation.x)).toBeLessThan(0.45);
    // Arms down too, rather than raised.
    expect(Math.abs(v.armL.rotation.z)).toBeLessThan(0.6);
    expect(Math.abs(v.armR.rotation.z)).toBeLessThan(0.6);
  });

  it("doesn't move when carried, whatever the time", () => {
    const a = clownModel();
    const b = clownModel();
    poseClown(a, { stand: 0, energy: 0, t: 0, fit: 0, slump: 0, limp: 1 });
    poseClown(b, { stand: 0, energy: 0, t: 7.3, fit: 0, slump: 0, limp: 1 });
    for (const k of ['body', 'head', 'armL', 'armR', 'legL', 'legR'] as const) {
      expect(b[k].rotation.toArray()).toEqual(a[k].rotation.toArray());
    }
  });
});
