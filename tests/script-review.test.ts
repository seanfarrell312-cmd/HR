import { describe, expect, it } from 'vitest';
import doc from '../docs/script-review.md?raw';
import { LISTED, scriptReview, SMS_WHEN, type ThoughtKey } from '../scripts/script-review.ts';
import { SMS, THOUGHTS } from '../src/data/story';

// docs/script-review.md is the designer's list of every scripted line. It is
// generated from the game's data, so it must list every thought and match
// what the game says now.

describe('script review export', () => {
  it('lists every thought exactly once', () => {
    const keys = Object.keys(THOUGHTS) as ThoughtKey[];
    expect([...LISTED].sort()).toEqual([...keys].sort());
  });

  it('says when every text arrives', () => {
    for (const id of Object.keys(SMS)) expect(SMS_WHEN[id], id).toBeTruthy();
  });

  it('is up to date (run `npm run export-script` after changing copy)', () => {
    expect(doc.replace(/\r\n/g, '\n')).toBe(scriptReview());
  });
});
