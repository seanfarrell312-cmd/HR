import { describe, expect, it } from 'vitest';
import { DOORS } from '../src/data/layout';
import { AUTO_CLOSE_DOORS, GATE_CAUTION, GATE_CODE, GATE_OPEN_SECONDS, phoneMessages, SMS } from '../src/data/story';
import { AutoClose } from '../src/world/autoClose';
import { circleHitsRect, doorSweepRect } from '../src/world/collision';

// Designer changes, 2026-11-10: the gate-code text, a gate that shuts itself
// and a phone that shows only the newest text.

describe('gate-code text', () => {
  it('uses the designer copy with the current code', () => {
    expect(SMS.gateCode.text).toBe(
      `Afternoon! I forgot to mention, the gate code is ${GATE_CODE}. Your instructions should be in my office. Just hang a left once you get into the church.`,
    );
  });
});

describe('delivery text', () => {
  it('uses the designer copy', () => {
    expect(SMS.delivery1.text).toBe(
      "Heads up. I just got an alert that someone just dropped something off. It should be in the drop box out by the front gate. Head over there and grab it. Once you're done with it, leave it on the table outside the chapel.",
    );
  });
});

describe('church doors auto-close', () => {
  it('shut themselves ten seconds after opening, like the gate', () => {
    expect(AUTO_CLOSE_DOORS).toEqual({ gate: 10, church: 10 });
    for (const id of Object.keys(AUTO_CLOSE_DOORS)) expect(DOORS.some((d) => d.id === id)).toBe(true);
  });

  it('wait while the player stands where the leaves swing', () => {
    const church = DOORS.find((d) => d.id === 'church')!;
    const sweep = doorSweepRect(church);
    // Just inside and just outside the doorway, within a leaf's length.
    expect(circleHitsRect(church.x, church.y + 1.2, 0.3, sweep)).toBe(true);
    expect(circleHitsRect(church.x, church.y - 1.2, 0.3, sweep)).toBe(true);
    // Well into the nave: clear.
    expect(circleHitsRect(church.x, church.y + 4, 0.3, sweep)).toBe(false);
  });
});

describe('phone', () => {
  it('shows only the newest text', () => {
    expect(phoneMessages([])).toEqual([]);
    expect(phoneMessages(['gateCode'])).toEqual([SMS.gateCode]);
    expect(phoneMessages(['gateCode', 'delivery1'])).toEqual([SMS.delivery1]);
  });
});

describe('front gate auto-close', () => {
  it('warns on the keypad how long it stays open', () => {
    expect(GATE_OPEN_SECONDS).toBe(10);
    expect(GATE_CAUTION).toBe('Caution: gate is automatic and closes after 10 seconds');
  });

  it('closes once, ten seconds after opening', () => {
    const g = new AutoClose(GATE_OPEN_SECONDS);
    expect(g.update(1, false)).toBe(false); // not open yet
    g.opened();
    let closedAt = -1;
    for (let t = 0.1; t < 15; t += 0.1) {
      if (g.update(0.1, false)) {
        expect(closedAt).toBe(-1);
        closedAt = t;
      }
    }
    // Within one 0.1 s frame of ten seconds.
    expect(Math.abs(closedAt - 10)).toBeLessThanOrEqual(0.11);
    expect(g.running).toBe(false);
  });

  it('waits for the player to step out of the gateway', () => {
    const g = new AutoClose(10);
    g.opened();
    expect(g.update(10, true)).toBe(false);
    expect(g.update(3, true)).toBe(false);
    expect(g.update(0.1, false)).toBe(true);
  });

  it('starts over when reopened, and stops when shut by hand', () => {
    const g = new AutoClose(10);
    g.opened();
    g.update(8, false);
    g.opened();
    expect(g.update(8, false)).toBe(false);
    expect(g.update(2, false)).toBe(true);
    g.opened();
    g.cancel();
    expect(g.update(20, false)).toBe(false);
  });
});
