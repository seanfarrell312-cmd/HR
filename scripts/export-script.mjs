// Writes docs/script-review.md: every scripted thought, text and note, for the
// designer to review. Run with `npm run export-script` after changing copy.
import { writeFileSync } from 'node:fs';
import { scriptReview } from './script-review.ts';

const out = new URL('../docs/script-review.md', import.meta.url);
writeFileSync(out, scriptReview());
console.log(`Wrote ${out.pathname}`);
