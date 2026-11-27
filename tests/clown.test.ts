import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { clownModel, heldClownQuaternion, HELD_CLOWN, poseClown } from '../src/world/clown';
import { ghostModel, onWig, WIG_COLOURS, wigBand } from '../src/world/ghost';
import { DIP, DIP_SECONDS, dipPose, exorcisePose, gravesLoop, rodStrike } from '../src/world/storyProps';
import { EXORCISE, EXORCISE_SECONDS, GRAVES_LOOP, ONLOOKERS, SPLASH_STRIKE, WORRIED_SPOT } from '../src/data/story';
import { AREAS, PROPS } from '../src/data/layout';

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

  it('hangs limp when carried: legs down along its body, arms at its sides, head rolled over', () => {
    const v = clownModel();
    poseClown(v, { stand: 0, energy: 0, t: 0, fit: 0, slump: 0, limp: 1 });
    // Legs run down along the body, not out in front as when it sits.
    for (const leg of [v.legL, v.legR]) expect(Math.abs(leg.rotation.x)).toBeLessThan(0.4);
    expect(Math.abs(v.armL.rotation.z)).toBeLessThan(0.6);
    expect(Math.abs(v.armR.rotation.z)).toBeLessThan(0.6);
    // Head rolled towards its left, the player's right.
    expect(v.head.rotation.z).toBeLessThan(-0.2);
  });

  it('lies back in the lower right of the view, face up at the player (reference images)', () => {
    const q = heldClownQuaternion();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    const face = new THREE.Vector3(0, 0, 1).applyQuaternion(q);
    // Head away from the player, up and to the right; feet towards them.
    expect(up.z).toBeLessThan(-0.1);
    expect(up.x).toBeGreaterThan(0.3);
    expect(up.y).toBeGreaterThan(0.5);
    // The camera looks down -z, so a face towards the player points +z.
    expect(face.z).toBeGreaterThan(0.7);
    expect(HELD_CLOWN.position.x).toBeGreaterThan(0);
    expect(HELD_CLOWN.position.y).toBeLessThan(0);
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

describe("the clown doll's ghost", () => {
  it('keeps the ordinary eyes and smile and adds only a rainbow wig (designer, 2026-11-24)', () => {
    const plain = ghostModel(false);
    const clown = ghostModel(false);
    clown.setClown(true);
    const wig = clown.group.getObjectByName('clown-wig')!;
    expect(wig.visible).toBe(true);
    expect(plain.group.getObjectByName('clown-wig')!.visible).toBe(false);
    // Apart from the wig, the same parts are showing, at the same sizes.
    const shown = (g: THREE.Object3D) =>
      g.children.filter((c) => c.visible && c.name !== 'clown-wig').map((c) => [c.type, c.scale.toArray()]);
    expect(shown(clown.group)).toEqual(shown(plain.group));
    // Every colour of the rainbow is in it.
    const colours = new Set(
      wig.children.map((c) => ((c as THREE.Mesh).material as THREE.MeshLambertMaterial).color.getHexString()),
    );
    expect(colours.size).toBe(WIG_COLOURS.length);
    clown.setClown(false);
    expect(wig.visible).toBe(false);
  });

  it('keeps the hairline above the eyes at the front', () => {
    // Straight ahead at eye height and a little above: bare.
    expect(onWig(new THREE.Vector3(0, 0.27, 0.96).normalize())).toBe(false);
    expect(onWig(new THREE.Vector3(0, 0.6, 0.8).normalize())).toBe(false);
    // The crown, the sides and the back: covered.
    expect(onWig(new THREE.Vector3(0, 1, 0))).toBe(true);
    expect(onWig(new THREE.Vector3(1, 0.3, 0).normalize())).toBe(true);
    expect(onWig(new THREE.Vector3(0, 0.3, -1).normalize())).toBe(true);
    expect(wigBand(-1)).toBe(0);
    expect(wigBand(1)).toBe(WIG_COLOURS.length - 1);
  });
});

describe('the holy-water rod splash (2026-11-26)', () => {
  it('strikes at the doll three times, then drops away', () => {
    expect(rodStrike(0).swing).toBe(0);
    for (const i of [0, 1, 2]) {
      const peak = rodStrike((i + 0.35) * SPLASH_STRIKE);
      expect(peak.strike).toBe(i);
      expect(peak.swing).toBeCloseTo(1);
    }
    expect(rodStrike(3 * SPLASH_STRIKE).lower).toBe(0);
    expect(rodStrike(3 * SPLASH_STRIKE + 1).lower).toBe(1);
  });
});

describe('dipping the rod in the bucket (2026-11-29)', () => {
  it('goes in head first, stays under, comes out and fades away', () => {
    expect(dipPose(0).head).toBeGreaterThan(0.3);
    // Under the surface for the whole middle stage.
    for (const t of [DIP.down, DIP.down + DIP.under / 2, DIP.down + DIP.under - 0.01]) expect(dipPose(t).head).toBeLessThan(-0.03);
    // Out again, still solid, then gone by the end.
    expect(dipPose(DIP.down + DIP.under + DIP.up).head).toBeGreaterThan(0.15);
    expect(dipPose(DIP.down + DIP.under + DIP.up).opacity).toBe(1);
    expect(dipPose(DIP_SECONDS).opacity).toBe(0);
    expect(DIP_SECONDS).toBeLessThan(2);
  });
});

describe("Day 2's lingering ghosts (S3 part 3)", () => {
  const visibleMeshes = (g: ReturnType<typeof ghostModel>) =>
    g.group.children.filter((c) => c.visible && c.type === 'Mesh') as THREE.Mesh[];
  const smileOf = (g: ReturnType<typeof ghostModel>) =>
    visibleMeshes(g).filter((m) => m.geometry.type === 'TorusGeometry' && m.rotation.z !== 0);
  const frownOf = (g: ReturnType<typeof ghostModel>) =>
    visibleMeshes(g).filter((m) => m.geometry.type === 'TorusGeometry' && m.rotation.z === 0 && m.position.y < 0.6);
  const boxes = (g: ReturnType<typeof ghostModel>) => visibleMeshes(g).filter((m) => m.geometry.type === 'BoxGeometry');

  it('gives the angry ghost brows in a V and a frown in place of the smile', () => {
    const angry = ghostModel(false);
    angry.setMood('angry');
    expect(smileOf(angry)).toHaveLength(0);
    expect(frownOf(angry)).toHaveLength(1);
    const [l, r] = boxes(angry).sort((a, b) => a.position.x - b.position.x);
    // Inner ends pulled down.
    expect(l.rotation.z).toBeLessThan(0);
    expect(r.rotation.z).toBeGreaterThan(0);
    angry.setMood('happy');
    expect(smileOf(angry)).toHaveLength(1);
    expect(boxes(angry)).toHaveLength(0);
  });

  it("gives the concerned ghost the usual eyes and a small straight mouth (2026-12-01)", () => {
    const happy = ghostModel(false);
    const neutral = ghostModel(false);
    neutral.setMood('neutral');
    expect(smileOf(neutral)).toHaveLength(0);
    expect(frownOf(neutral)).toHaveLength(0);
    // One small flat bar for a mouth, and no brows.
    const mouth = boxes(neutral);
    expect(mouth).toHaveLength(1);
    expect(mouth[0].position.x).toBe(0);
    const eyes = (g: ReturnType<typeof ghostModel>) => visibleMeshes(g).filter((m) => m.geometry.type === 'SphereGeometry').map((m) => m.scale.toArray());
    expect(eyes(neutral)).toEqual(eyes(happy));
  });

  it("keeps the teacup ghost's mouth under its mustache, whatever the mood is set to", () => {
    // The relic ghost is reused: the mustache goes on, then the mood is set.
    const g = ghostModel(true);
    g.setDapper(true);
    g.setClown(false);
    g.setMood('happy');
    expect(smileOf(g)).toHaveLength(0);
    expect(frownOf(g)).toHaveLength(0);
    expect(boxes(g)).toHaveLength(0);
    // And it comes back for the next ghost.
    g.setDapper(false);
    expect(smileOf(g)).toHaveLength(1);
  });

  it('keeps the clown ghost among the east graves, in sight of the path', () => {
    const graves = AREAS.find((a) => a.id === 'east-graves')!.rect;
    for (let t = 0; t < 60; t += 0.25) {
      const p = gravesLoop(t);
      expect(p.x).toBeGreaterThan(graves.x1);
      expect(p.x).toBeLessThan(graves.x2);
      expect(p.y).toBeGreaterThan(graves.y1);
      expect(p.y).toBeLessThan(graves.y2);
    }
    expect(GRAVES_LOOP.x - GRAVES_LOOP.rx).toBeLessThan(25);
  });

  it("floats the concerned ghost over the old priest's plot, bent towards the headstone", () => {
    const plot = PROPS.find((p) => p.id === 'old-priest-plot')!.rect;
    const stone = PROPS.find((p) => p.id === 'old-priest-grave')!.rect;
    expect(WORRIED_SPOT.x).toBeGreaterThan(plot.x1);
    expect(WORRIED_SPOT.x).toBeLessThan(plot.x2);
    expect(WORRIED_SPOT.y).toBeGreaterThan(plot.y1);
    expect(WORRIED_SPOT.y).toBeLessThan(plot.y2);
    expect(WORRIED_SPOT.lookX).toBeGreaterThanOrEqual(stone.x1);
    expect(WORRIED_SPOT.lookX).toBeLessThanOrEqual(stone.x2);
    expect(WORRIED_SPOT.lookY).toBeGreaterThanOrEqual(stone.y1);
    expect(WORRIED_SPOT.lookY).toBeLessThanOrEqual(stone.y2);
    expect(WORRIED_SPOT.lean).toBeGreaterThan(0);
    // A little way back from the headstone, eyes level with its upper part,
    // leaning only slightly (designer, 2026-11-27).
    expect(WORRIED_SPOT.y - stone.y2).toBeGreaterThan(1.2);
    const eyes = WORRIED_SPOT.height + 0.64;
    expect(eyes).toBeGreaterThan(0.9);
    expect(eyes).toBeLessThan(1.35);
    expect(WORRIED_SPOT.lean).toBeLessThan(0.2);
  });

  it('places the teacup and music box ghosts side by side north of the graves loop', () => {
    expect(ONLOOKERS.map((o) => o.relic)).toEqual(['teacup', 'music-box']);
    const [a, b] = ONLOOKERS;
    expect(a.y).toBe(b.y);
    expect(Math.abs(a.x - b.x)).toBeLessThan(2.5);
    for (const o of ONLOOKERS) expect(o.y).toBeGreaterThan(GRAVES_LOOP.y + GRAVES_LOOP.ry);
  });
});

describe("the hand bell's two-handed blessing (2026-11-27)", () => {
  it('swings the rod, then the cross, four times, then both drop away', () => {
    let rodStrikes = 0;
    let crossStrikes = 0;
    let lastRod = 0;
    let lastCross = 0;
    for (let t = 0; t < EXORCISE_SECONDS; t += 0.01) {
      const p = exorcisePose(t);
      // Never both forward at once.
      expect(p.rod > 0.05 && p.cross > 0.05).toBe(false);
      if (p.rod > 0.9 && lastRod <= 0.9) rodStrikes++;
      if (p.cross > 0.9 && lastCross <= 0.9) crossStrikes++;
      lastRod = p.rod;
      lastCross = p.cross;
    }
    expect(rodStrikes).toBe(EXORCISE.cycles);
    expect(crossStrikes).toBe(EXORCISE.cycles);
    expect(exorcisePose(EXORCISE_SECONDS + 1).lower).toBe(1);
  });
});

