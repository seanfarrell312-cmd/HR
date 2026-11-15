import { describe, expect, it } from 'vitest';
import { DOORS, EYE_HEIGHT, PROPS, type Rect } from '../src/data/layout';
import { SPOTS } from '../src/data/story';
import { wallSegments } from '../src/world/collision';

// Scripted scares rely on what the player can see from set spots (doc 4.3).
// Treat anything taller than eye height as blocking the view.

/** True when the segment from a to b passes through the rectangle. */
function segmentHitsRect(a: [number, number], b: [number, number], r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const d = [b[0] - a[0], b[1] - a[1]];
  const lo = [r.x1, r.y1];
  const hi = [r.x2, r.y2];
  for (let i = 0; i < 2; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (a[i] < lo[i] || a[i] > hi[i]) return false;
      continue;
    }
    let ta = (lo[i] - a[i]) / d[i];
    let tb = (hi[i] - a[i]) / d[i];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return false;
  }
  return true;
}

function viewBlockers(exclude: string): { id: string; rect: Rect }[] {
  const walls = wallSegments()
    .filter((s) => s.level === 0 && s.height > EYE_HEIGHT)
    .map((s, i) => ({ id: `wall-${i}`, rect: s.rect }));
  const props = PROPS.filter((p) => p.level === 0 && p.height > EYE_HEIGHT && p.id !== exclude).map((p) => ({
    id: p.id,
    rect: p.rect,
  }));
  return [...walls, ...props];
}

const centre = (r: Rect): [number, number] => [(r.x1 + r.x2) / 2, (r.y1 + r.y2) / 2];

describe('sightlines', () => {
  const shed = DOORS.find((d) => d.id === 'shed')!;
  const doorway: [number, number] = [shed.x, shed.y - 0.5];
  const tall = PROPS.find((p) => p.id === 'grave-tall')!;

  it('shows the tall headstone from the shed doorway, unobstructed', () => {
    const hits = viewBlockers(tall.id).filter((b) => segmentHitsRect(doorway, centre(tall.rect), b.rect));
    expect(hits.map((h) => h.id)).toEqual([]);
  });

  it('keeps the tall headstone far enough to read as distant', () => {
    const [x, y] = centre(tall.rect);
    expect(Math.hypot(x - doorway[0], y - doorway[1])).toBeGreaterThan(30);
  });

  it('hides the chalice on the garden bench from the main path and the church doors (D2-02)', () => {
    const chalice: [number, number] = [SPOTS.chaliceBench.x, SPOTS.chaliceBench.y];
    const blockers = viewBlockers('');
    for (let y = 0; y <= 50; y += 0.5) {
      for (const x of [-1.5, 0, 1.5]) {
        const hits = blockers.filter((b) => segmentHitsRect([x, y], chalice, b.rect));
        expect(hits.length, `from (${x}, ${y})`).toBeGreaterThan(0);
      }
    }
  });

  it('puts the chalice on the east garden bench, inside the hedges', () => {
    const bench = PROPS.find((p) => p.id === 'garden-bench-e')!;
    const { x, y } = SPOTS.chaliceBench;
    expect(x).toBeGreaterThan(bench.rect.x1);
    expect(x).toBeLessThan(bench.rect.x2);
    // The north end of the bench.
    expect(y).toBeGreaterThan((bench.rect.y1 + bench.rect.y2) / 2);
    expect(y).toBeLessThan(bench.rect.y2);
    expect(SPOTS.chaliceBench.z).toBeCloseTo(bench.height);
  });

  it('hides the west garden fountain from the shed doorway behind the church', () => {
    const fountain = PROPS.find((p) => p.id === 'fountain')!;
    const hits = viewBlockers(fountain.id).filter((b) => segmentHitsRect(doorway, centre(fountain.rect), b.rect));
    expect(hits.length).toBeGreaterThan(0);
  });
});
