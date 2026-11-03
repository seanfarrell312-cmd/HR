import { describe, expect, it } from 'vitest';
import { DOOR_PRESETS } from '../src/data/doorPresets';
import { AREAS, DOORS, PLAYER_RADIUS, TELEPORTS, TRANSITIONS, WALLS } from '../src/data/layout';
import { blocked, doorOnWall, staticColliders } from '../src/world/collision';
import { zoneAt } from '../src/world/zones';

const area = (id: string) => {
  const a = AREAS.find((x) => x.id === id);
  if (!a) throw new Error(`no area ${id}`);
  return a;
};
const centreX = (id: string) => (area(id).rect.x1 + area(id).rect.x2) / 2;

describe('church orientation (L01/L02, docs/decisions.md)', () => {
  it('puts the office and storage west of the nave and the chapel east', () => {
    expect(centreX('office')).toBeLessThan(area('nave').rect.x1 + 0.01);
    expect(centreX('storage')).toBeLessThan(area('nave').rect.x1 + 0.01);
    expect(centreX('chapel')).toBeGreaterThan(area('nave').rect.x2 - 0.01);
  });

  it('has the church north of the gate and the basement stairs in the north-east', () => {
    const nave = area('nave').rect;
    expect(nave.y1).toBeGreaterThan(0);
    const basementDoor = DOORS.find((d) => d.id === 'basement')!;
    expect(basementDoor.y).toBeCloseTo(nave.y2);
    expect(basementDoor.x).toBeGreaterThan(0);
  });
});

describe('layout data', () => {
  it('places every door on exactly one wall', () => {
    for (const d of DOORS) {
      const hosts = WALLS.filter((w) => doorOnWall(d, w));
      expect(hosts.length, d.id).toBe(1);
    }
  });

  it('gives the chapel a single entrance', () => {
    const chapel = area('chapel').rect;
    const entrances = DOORS.filter(
      (d) => d.x >= chapel.x1 - 0.01 && d.x <= chapel.x2 + 0.01 && d.y >= chapel.y1 - 0.01 && d.y <= chapel.y2 + 0.01,
    );
    expect(entrances.map((d) => d.id)).toEqual(['chapel']);
  });

  it('only locks doors that exist', () => {
    const ids = new Set(DOORS.map((d) => d.id));
    for (const p of DOOR_PRESETS) for (const id of Object.keys(p.locks)) expect(ids.has(id), `${p.id}:${id}`).toBe(true);
  });

  it('keeps teleports and transition landings clear of obstacles', () => {
    const cs = staticColliders();
    for (const t of TELEPORTS) expect(blocked(t.x, t.y, t.level, PLAYER_RADIUS, cs), t.label).toBe(false);
    for (const t of TRANSITIONS) expect(blocked(t.to.x, t.to.y, t.to.level, PLAYER_RADIUS, cs), t.id).toBe(false);
  });

  it('names the zone each teleport lands in', () => {
    const expected: Record<string, string> = {
      '1': 'outside',
      '4': 'nave',
      '5': 'office',
      '6': 'chapel',
      '7': 'storage',
      '8': 'basement',
      '0': 'west-garden',
      '-': 'east-graves',
      '=': 'west-graves',
    };
    for (const [key, zone] of Object.entries(expected)) {
      const t = TELEPORTS.find((x) => x.key === key)!;
      expect(zoneAt(t.x, t.y, t.level)?.id, t.label).toBe(zone);
    }
  });
});
