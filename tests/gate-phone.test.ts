import { describe, expect, it } from 'vitest';
import { GATE_CAUTION, GATE_CODE, GATE_OPEN_SECONDS, phoneMessages, SMS } from '../src/data/story';
import { AutoClose } from '../src/world/autoClose';

// Designer changes, 2026-11-10: the gate-code text, a gate that shuts itself
// and a phone that shows only the newest text.

describe('gate-code text', () => {
  it('uses the designer copy with the current code', () => {
    expect(SMS.gateCode.text).toBe(
      `Afternoon! I forgot to mention, the gate code is ${GATE_CODE}. Your instructions should be in my office. Just hang a left once you get into the church.`,
    );
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
