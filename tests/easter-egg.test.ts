import { describe, expect, it } from 'vitest';
import { CHURCH_DOOR_COLOR, PROPS, STOOL_H, WALLS } from '../src/data/layout';
import { STOOL_NOTE } from '../src/data/story';
import { createInitialState } from '../src/state/store';
import { startDay } from '../src/story/day';
import { resolve } from '../src/world/interact';

// The Easter-egg stool and note behind the church (designer request, 2026-11-13).

const stool = PROPS.find((p) => p.id === 'egg-stool')!;
const note = PROPS.find((p) => p.id === 'egg-note')!;
const bibleStand = PROPS.find((p) => p.id === 'bible-stand')!;
const player = { x: -4, y: 69, level: 0 as const };

describe('Easter-egg stool', () => {
  it('is a short brown stool, half as tall as the Bible stand', () => {
    expect(stool.shape).toBe('stool');
    expect(stool.color).toBe(CHURCH_DOOR_COLOR);
    expect(stool.height).toBe(STOOL_H);
    expect(stool.height).toBeCloseTo(bibleStand.height / 2);
    // Square top.
    expect(stool.rect.x2 - stool.rect.x1).toBeCloseTo(stool.rect.y2 - stool.rect.y1);
  });

  it('stands outside, against the nave north wall, between it and the perimeter', () => {
    const north = WALLS.find((w) => w.a[1] === 67.4 && w.b[1] === 67.4 && w.a[0] === -8 && w.b[0] === 8)!;
    expect(north).toBeDefined();
    const face = 67.4 + 0.15;
    expect(stool.rect.y1).toBeGreaterThanOrEqual(face);
    expect(stool.rect.y1 - face).toBeLessThan(0.1);
    expect(stool.rect.x1).toBeGreaterThan(-8);
    // West of the stair annex, so it's open ground.
    expect(stool.rect.x2).toBeLessThan(5.2);
    expect(stool.rect.y2).toBeLessThan(86);
  });

  it('has the note lying on its seat', () => {
    expect(note.interact).toBe('stool-note');
    expect(note.solid).toBe(false);
    expect(note.rect.x1).toBeGreaterThan(stool.rect.x1);
    expect(note.rect.x2).toBeLessThan(stool.rect.x2);
    expect(note.rect.y1).toBeGreaterThan(stool.rect.y1);
    expect(note.rect.y2).toBeLessThan(stool.rect.y2);
  });
});

describe('Easter-egg note', () => {
  it('is readable at any point on Day 1 and Day 2, and changes nothing', () => {
    const day1 = createInitialState();
    const day2 = startDay(createInitialState(), 2);
    for (const s of [day1, day2]) {
      const before = JSON.stringify([...s.flags, s.objective_id]);
      s.held_prop_id = 'clock';
      expect(resolve('item:stool-note', s, player)).toEqual({ prompt: 'E  Read note', action: { kind: 'read-note', note: 'stool' } });
      expect(JSON.stringify([...s.flags, s.objective_id])).toBe(before);
    }
  });

  it('carries the designer copy', () => {
    expect(STOOL_NOTE.startsWith('Hey friend,')).toBe(true);
    expect(STOOL_NOTE).toContain('My name is Seanologues and this is my game.');
    expect(STOOL_NOTE).toContain('Sometimes empty spaces are just that.');
    expect(STOOL_NOTE).toContain("I bet you're a pretty cool person.");
    expect(STOOL_NOTE.endsWith('hope you play through to the end.')).toBe(true);
  });
});
