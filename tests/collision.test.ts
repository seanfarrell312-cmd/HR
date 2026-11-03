import { describe, expect, it } from 'vitest';
import { DOORS, PLAYER_RADIUS, type Rect } from '../src/data/layout';
import { closedDoorColliders, doorRect, moveCircle, staticColliders, wallSegments } from '../src/world/collision';

const R = PLAYER_RADIUS;
const wall = (rect: Rect) => [{ id: 'w', rect, level: 0 as const }];

describe('moveCircle', () => {
  it('stops at a wall instead of passing through', () => {
    const [x] = moveCircle(0, 0, 5, 0, 0, R, wall({ x1: 1, y1: -5, x2: 1.3, y2: 5 }));
    expect(x).toBeCloseTo(1 - R, 3);
  });

  it('cannot tunnel through a thin wall in one large step', () => {
    const [x] = moveCircle(0, 0, 50, 0, 0, R, wall({ x1: 1, y1: -5, x2: 1.05, y2: 5 }));
    expect(x).toBeLessThan(1);
  });

  it('slides along a wall when moving diagonally into it', () => {
    const [x, y] = moveCircle(0, 0, 2, 2, 0, R, wall({ x1: 1, y1: -5, x2: 1.3, y2: 5 }));
    expect(x).toBeLessThanOrEqual(1 - R + 1e-6);
    expect(y).toBeCloseTo(2, 3);
  });

  it('ignores colliders on another level', () => {
    const [x] = moveCircle(0, 0, 5, 0, -1, R, wall({ x1: 1, y1: -5, x2: 1.3, y2: 5 }));
    expect(x).toBeCloseTo(5);
  });
});

describe('doors', () => {
  it('leave an opening exactly as wide as the door in their wall', () => {
    const segs = wallSegments();
    for (const d of DOORS) {
      const gap = doorRect(d);
      const overlap = segs.some(
        (s) =>
          s.level === d.level &&
          s.rect.x1 < gap.x2 - 1e-6 &&
          s.rect.x2 > gap.x1 + 1e-6 &&
          s.rect.y1 < gap.y2 - 1e-6 &&
          s.rect.y2 > gap.y1 + 1e-6,
      );
      expect(overlap, d.id).toBe(false);
    }
  });

  it('block the opening when closed and clear it when open', () => {
    const church = DOORS.find((d) => d.id === 'church')!;
    const cs = staticColliders();
    const closed = [...cs, ...closedDoorColliders(new Set())];
    const open = [...cs, ...closedDoorColliders(new Set(['church']))];
    // Walk north through the church doors from the path.
    const [, yClosed] = moveCircle(church.x, church.y - 2, 0, 4, 0, R, closed);
    const [, yOpen] = moveCircle(church.x, church.y - 2, 0, 4, 0, R, open);
    expect(yClosed).toBeLessThan(church.y);
    expect(yOpen).toBeCloseTo(church.y + 2, 3);
  });
});
