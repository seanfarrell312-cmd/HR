import { AREAS, type Area, type Level } from '../data/layout';

const area = (a: Area) => (a.rect.x2 - a.rect.x1) * (a.rect.y2 - a.rect.y1);

/** The most specific (smallest) area containing the point, or null. */
export function zoneAt(x: number, y: number, level: Level, areas: Area[] = AREAS): Area | null {
  let best: Area | null = null;
  for (const a of areas) {
    if (a.level !== level) continue;
    const r = a.rect;
    if (x < r.x1 || x > r.x2 || y < r.y1 || y > r.y2) continue;
    if (!best || area(a) < area(best)) best = a;
  }
  return best;
}
