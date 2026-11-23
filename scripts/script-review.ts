// The game's scripted words, gathered for the designer to review: every
// thought (in play order, with when it plays), the texts, the notes and the
// short reminders. `npm run export-script` writes it to
// docs/script-review.md, and a test fails if that file falls out of date or a
// thought is missing from the list below.

import {
  DAY_TITLES,
  LOITER_LINES,
  OFFICE_NOTE_DAY1,
  OFFICE_NOTE_DAY2,
  RELIC_LINES,
  REMINDERS,
  SCRIPTURE,
  SEARCH_CHECKLIST,
  SMS,
  STOOL_NOTE,
  THOUGHTS,
  WRONG_CODE,
  GATE_CAUTION,
} from '../src/data/story.ts';

export type ThoughtKey = keyof typeof THOUGHTS;

interface Cue {
  key: ThoughtKey;
  when: string;
}

/** Thoughts that can play on any day. */
export const ANY_DAY: Cue[] = [
  { key: 'gateOpen', when: 'The gate code is accepted at the keypad.' },
  { key: 'keyBeforeNote', when: 'Trying to take the chapel key before reading the office note.' },
  { key: 'crucifixEarly', when: 'Trying the crucifix on the altar before the objective asks for it.' },
];

/** Day 1 thoughts, in play order. */
export const DAY1: Cue[] = [
  { key: 'churchApproach', when: 'First time within 25 m of the church doors after the gate opens.' },
  { key: 'chapelOpen', when: 'The chapel door opens for the first time.' },
  { key: 'candlesLit', when: 'The fourth candle is lit; then the altar pieces are asked for.' },
  { key: 'chaliceEarly', when: 'Trying the chalice on the altar before the objective asks for it.' },
  { key: 'tableSet', when: 'The chalice and crucifix are both set out on the ritual table and the clock chimes harder.' },
  { key: 'ghost', when: "The clock's ghost, once it has gone." },
  { key: 'clockPlaced', when: "The cleansed clock is put down on the supervisor's desk." },
  { key: 'relicSettled', when: "The music box's first blessing: once its rattle has died away." },
  { key: 'goodBook', when: 'After the "stubborn one" thought; then the Bible is asked for.' },
  { key: 'late', when: 'The music box is put away and dusk falls.' },
  { key: 'headHome', when: 'A pause after "so late"; then the walk back to the gate.' },
];

/** Day 2 thoughts, in play order. */
export const DAY2: Cue[] = [
  { key: 'gateCodeRecall', when: 'Shift start, once the first objective (the keypad) has folded away. Skipped if the gate is already open.' },
  { key: 'churchApproachDay2', when: 'First time within 25 m of the church doors after the gate opens.' },
  { key: 'officeClock', when: 'The office door opens for the first time.' },
  { key: 'chaliceMissing', when: 'Within 4 m of the altar once the candles are lit.' },
  { key: 'crucifixFirst', when: 'Picking up the crucifix; then "Put the crucifix on the ritual table".' },
  { key: 'searchDesk', when: 'Searching the church: stepping behind the office desk ("Check the office").' },
  { key: 'searchLocked', when: 'Searching the church: trying the locked storage closet door.' },
  { key: 'searchBasement', when: 'Searching the church: trying the locked basement door.' },
  { key: 'searchStayInside', when: 'Searching the church: trying the church doors from inside. They stay shut until the grounds objective shows.' },
  { key: 'searchNudge', when: 'Searching the church: 30 s with nothing new checked. Repeats after each further 30 s, three times at most.' },
  { key: 'searchOutside', when: 'All three places checked; then "Search the grounds for the chalice".' },
  { key: 'prankScare', when: 'Taking the chalice from the garden bench, as the prankster pops up.' },
  { key: 'prankHarmless', when: 'Straight after "JESUS!".' },
  { key: 'prankFocus', when: 'Straight after "Harmless, huh?"; then "Place the chalice on the ritual table".' },
  { key: 'tableSetDay2', when: 'The chalice goes on the ritual table with the crucifix; then the delivery text.' },
  { key: 'alertRead', when: 'Closing the phone after the first delivery text; then the drop-box objective.' },
  { key: 'clownDance', when: 'Blessing the clown doll with the cross: once it has finished laughing and dancing.' },
  { key: 'clownWater', when: 'Straight after; then "Find the storage closet key in the office".' },
  { key: 'storageKey', when: 'Searching the office desk drawers for the storage closet key.' },
];

/** Thoughts that sit with the relics instead (RELIC_LINES), so they're listed by relic. */
const IN_RELIC_LINES: ThoughtKey[] = ['dropBox', 'relicPickup', 'relicAnnoying', 'relicGhost'];

/** Every thought key the review lists, for the coverage test. */
export const LISTED: ThoughtKey[] = [...ANY_DAY, ...DAY1, ...DAY2].map((c) => c.key).concat(IN_RELIC_LINES);

const RELIC_CUES: { kind: keyof typeof RELIC_LINES; day: string; title: string }[] = [
  { kind: 'music-box', day: 'Day 1', title: 'Music box (Day 1, second delivery)' },
  { kind: 'teacup', day: 'Day 2', title: 'Teacup (Day 2, first delivery)' },
  { kind: 'clown', day: 'Day 2', title: 'Clown doll (Day 2, second delivery)' },
];
const RELIC_WHEN: Record<'approach' | 'pickup' | 'carry' | 'ghost', string> = {
  approach: 'Nearing the drop box once it has been delivered.',
  pickup: 'Taking it out of the drop box.',
  carry: 'Carrying it up the path, 17 m from the church doors.',
  ghost: 'Its ghost, once it has gone.',
};

export const SMS_WHEN: Record<string, string> = {
  gateCode: 'Day 1, 6.5 s into the shift.',
  delivery1: "Day 1, 5 s after the clock is put on the supervisor's desk.",
  d2delivery1: 'Day 2, after "There. All set."',
  d2delivery2: 'Day 2, 6 s after the teacup is put away.',
};

/** Escape a table cell. */
const cell = (s: string): string => s.replace(/\|/g, '\\|').replace(/\n/g, '<br>');

function thoughtTable(prefix: string, cues: Cue[]): string[] {
  const rows = cues.map((c, i) => `| ${prefix}-${String(i + 1).padStart(2, '0')} | ${cell(c.when)} | ${cell(THOUGHTS[c.key])} | |`);
  return ['| ID | When it plays | Text | Proposed |', '|---|---|---|---|', ...rows, ''];
}

function note(prefix: string, title: string, text: string): string[] {
  const paras = text.split('\n\n');
  return [
    `### ${title}`,
    '',
    ...paras.flatMap((p, i) => [`**${prefix}-${i + 1}.** ${p}`, '']),
    `Proposed changes to ${prefix}:`,
    '',
  ];
}

export function scriptReview(): string {
  const out: string[] = [
    '# Happy Resting: script review',
    '',
    "Every scripted thought, text and note in the game as it stands, generated from the game's data with `npm run export-script`. Write proposed wording in the Proposed column or under each note, and refer to lines by their IDs.",
    '',
    'Thoughts are the subtitled lines in the protagonist\'s head. Reminders are the short messages shown when something is tried too early.',
    '',
    '## Thoughts',
    '',
    '### Every day',
    '',
    ...thoughtTable('A', ANY_DAY),
    `### Day 1: ${DAY_TITLES[1].title}`,
    '',
    ...thoughtTable('D1', DAY1),
    `### Day 2: ${DAY_TITLES[2].title}`,
    '',
    ...thoughtTable('D2', DAY2),
    '### Day 2: dawdling outside',
    '',
    'Timed from the gate opening, if the player still hasn\'t been inside the church.',
    '',
    '| ID | When it plays | Text | Proposed |',
    '|---|---|---|---|',
    ...LOITER_LINES.map((l, i) => `| L-0${i + 1} | ${l.seconds} s after the gate opens. | ${cell(l.text)} | |`),
    '',
    '### Relics',
    '',
  ];
  for (const r of RELIC_CUES) {
    const lines = RELIC_LINES[r.kind];
    const id = r.kind === 'music-box' ? 'MB' : r.kind === 'teacup' ? 'TC' : 'CD';
    out.push(`#### ${r.title}`, '', '| ID | When it plays | Text | Proposed |', '|---|---|---|---|');
    (['approach', 'pickup', 'carry', 'ghost'] as const).forEach((k, i) => {
      out.push(`| ${id}-0${i + 1} | ${RELIC_WHEN[k]} | ${cell(lines[k])} | |`);
    });
    out.push('');
  }

  out.push('## Texts', '', '| ID | When it arrives | From | Text | Proposed |', '|---|---|---|---|---|');
  Object.values(SMS).forEach((m, i) => {
    out.push(`| S-0${i + 1} | ${cell(SMS_WHEN[m.id] ?? '')} | ${cell(m.from)} | ${cell(m.text)} | |`);
  });
  out.push('');

  out.push('## Notes', '');
  out.push(...note('N1', 'Office note, Day 1', OFFICE_NOTE_DAY1));
  out.push(...note('N2', 'Office note, Day 2', OFFICE_NOTE_DAY2));
  out.push(...note('N3', 'Easter-egg note on the stool behind the church (any day)', STOOL_NOTE));
  out.push(
    '### Bible page (reading scripture to a relic)',
    '',
    ...SCRIPTURE.lines.flatMap((l, i) => [`**B-${i + 1}.** ${l}`, '']),
    `**B-4.** ${SCRIPTURE.reference}`,
    '',
    'Proposed changes to B:',
    '',
  );

  out.push('## Short messages', '', '| ID | When it shows | Text | Proposed |', '|---|---|---|---|');
  const short: [string, string][] = [
    ['Entering the wrong gate code.', WRONG_CODE],
    ['The sticker above the gate keypad.', GATE_CAUTION],
    ['Day 2 church search: the checklist under the objective.', SEARCH_CHECKLIST.join(' / ')],
    ...Object.entries(REMINDERS).map(([k, v]): [string, string] => [REMINDER_WHEN[k as keyof typeof REMINDERS], v]),
  ];
  short.forEach(([when, text], i) => out.push(`| R-${String(i + 1).padStart(2, '0')} | ${cell(when)} | ${cell(text)} | |`));
  out.push('');
  return out.join('\n');
}

const REMINDER_WHEN: Record<keyof typeof REMINDERS, string> = {
  handsFull: 'Trying to pick something up while carrying something else.',
  hatchInside: 'Trying the drop box from the road side of the gate.',
  dropBoxEmpty: 'Trying the drop box before anything has been delivered.',
  tableNotReady: 'Putting a relic on the ritual table before the chalice and crucifix are set out.',
  needCross: 'Trying to bless a relic without the cross.',
  scriptureFirst: 'Trying to bless a relic that needs scripture before it has been read some.',
  bibleFirst: 'Trying to read scripture without the Bible.',
  bibleBack: 'Picking up a cleansed relic while still holding the Bible.',
  standInCircle: 'Trying to bless or read from outside the holy circle.',
  holyWaterFirst: 'Trying the water ritual before the bucket of holy water is by the ritual table.',
  needRod: 'Trying the water ritual without the holy-water rod.',
  bucketEmpty: 'Putting the bucket down by the ritual table before filling it.',
};
