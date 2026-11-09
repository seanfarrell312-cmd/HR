import { describe, expect, it } from 'vitest';
import { ARRIVAL } from '../src/data/layout';
import { isMouseSpike } from '../src/player/controller';

// S2 playtest (2026-11-09): the view must never whip round on its own, and
// each day starts facing the departing bus with the church on the left.

describe('mouse glitch filter', () => {
  it('keeps ordinary and fast movements', () => {
    expect(isMouseSpike(4, 1, 0)).toBe(false);
    expect(isMouseSpike(60, 10, 5)).toBe(false);
    // A fast flick builds up: big events right after other big events.
    expect(isMouseSpike(240, 0, 120)).toBe(false);
  });

  it('drops a single huge jump out of nowhere', () => {
    expect(isMouseSpike(900, 0, 3)).toBe(true);
    expect(isMouseSpike(-400, 250, 12)).toBe(true);
  });
});

describe('arrival', () => {
  it('faces east along the road, so the church (north) is on the left', () => {
    // Plan forward is (sin yaw, cos yaw); left is (-cos yaw, sin yaw).
    const forward = { x: Math.sin(ARRIVAL.yaw), y: Math.cos(ARRIVAL.yaw) };
    const left = { x: -Math.cos(ARRIVAL.yaw), y: Math.sin(ARRIVAL.yaw) };
    expect(forward.x).toBeCloseTo(1);
    expect(left.y).toBeCloseTo(1);
  });
});
