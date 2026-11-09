// Day 1 story data for S1 (D1-01 to D1-06). Plain data: positions, texts and
// tuning. Dialogue is PROVISIONAL copy until the script is locked (doc N07).

/** PLACEHOLDER gate code until the designer picks one (docs/decisions.md). */
export const GATE_CODE = '4173';

/** Seconds the primary button must be held to complete a blessing (PROVISIONAL). */
export const BLESS_SECONDS = 2;

/**
 * After a blessing (decisions 2026-11-08): the clock shakes itself still and
 * gives a last, falling chime; a beat of silence; sparkles drift out of it;
 * then the ghost rises. Seconds from the moment the blessing completes.
 */
export const PURIFY = {
  /** The clock's shaking dies away over this long. */
  windDown: 1.2,
  /** Sparkles start here, after the silence. */
  sparkleAt: 2.5,
  /** The ghost rises here. */
  ghostAt: 3.9,
};

/** Holy circle centre and radius (matches the 'holy-circle' prop). */
export const HOLY_CIRCLE = { x: 11.4, y: 53.1, r: 0.9 };

export interface ItemSpot {
  x: number;
  y: number;
  /** Height above the floor the item rests at. */
  z: number;
}

export const SPOTS = {
  officeNote: { x: -14.1, y: 52.0, z: 0.8 },
  // Inside the office, on the wall beside its door (decisions 2026-11-08).
  chapelKey: { x: -8.27, y: 51.35, z: 1.45 },
  matches: { x: 8.55, y: 54.0, z: 1.2 },
  crucifix: { x: 8.55, y: 54.9, z: 1.2 },
  clockRitual: { x: 13.45, y: 53.3, z: 0.9 },
  clockDesk: { x: -14.1, y: 52.9, z: 0.8 },
} satisfies Record<string, ItemSpot>;

/** Four candle stands at the corners of the holy circle (decisions 2026-11-08). */
export const CANDLES: ItemSpot[] = [
  { x: HOLY_CIRCLE.x - 0.95, y: HOLY_CIRCLE.y - 0.95, z: 0 },
  { x: HOLY_CIRCLE.x + 0.95, y: HOLY_CIRCLE.y - 0.95, z: 0 },
  { x: HOLY_CIRCLE.x - 0.95, y: HOLY_CIRCLE.y + 0.95, z: 0 },
  { x: HOLY_CIRCLE.x + 0.95, y: HOLY_CIRCLE.y + 0.95, z: 0 },
];

export interface Sms {
  id: string;
  from: string;
  text: string;
}

export const SMS: Record<string, Sms> = {
  gateCode: {
    id: 'gateCode',
    from: 'Supervisor',
    text: `Afternoon! Should have sent this earlier but I forgot. Gate code is ${GATE_CODE}. Your instructions should be in my office. Just hang a left once you get into the church.`,
  },
};

/** The card shown as each day begins (designer copy, 2026-11-08). */
export const DAY_TITLES: Record<number, { title: string; time: string }> = {
  1: { title: 'First Day', time: '4PM' },
};

/** The supervisor's letter (designer copy, 2026-11-08), one entry per paragraph. */
export const OFFICE_NOTE = [
  'Welcome, Monsignor,',
  "On behalf of everyone at St. Mary's, thank you for answering our request for assistance from the Vatican.",
  "As you're probably aware, we've been dealing with an increasing number of restless spirits and strange possessions. It's gotten so bad that we've had to install a drop box by the front gate just to keep up with all the possessed items turning up around the countryside.",
  "I'm sure a man of your experience is accustomed to this sort of thing, but we're just a small congregation with little training in these matters.",
  "I've taken the liberty of preparing your first case.",
  "Mrs. Kettle brought in an antique mantel clock that's been chiming nonstop for four days. We tried everything short of smashing it, but it only got louder. At one point, it even started giggling at us.",
  'Clearly possessed.',
  "I've left it on the table in the chapel, on the other side of the building. The door is locked to keep it contained, so be sure to grab the chapel key behind you. You may already be able to hear it.",
  "Once inside, prepare the ritual site. Light the four candles, stand in the circle, and give it a blessing. There should be matches and a crucifix on the shelf. I'm sure you know the rest.",
  "If all goes well (and I'm sure it will), leave the clock on my desk when you're finished. Mrs. Kettle doesn't want it back, and it seems a shame to throw away such a nice antique.",
  '— Supervisor',
].join('\n\n');

/** Subtitled thoughts (doc 3.2). Keyed so they can be traced to dialogue IDs later. */
export const THOUGHTS = {
  gateOpen: 'Nice, it worked.',
  churchApproach: "This place feels so peaceful. Hard to believe they'd need someone like me.",
  keyBeforeNote: 'Huh, a key. I should really read the note they left me first.',
  ghost: '...Huh. Kinda cute.',
  clockPlaced: "That wasn't too bad.",
  /** A few seconds after the clock is on the desk; then the walk back to the gate. */
  headHome: 'I guess I should head back to the bus stop.',
};

/**
 * Seconds between "That wasn't too bad." and the head-home thought. In the S1
 * build the walk home follows the clock; in S2 it moves to the end of the day,
 * after D1-07 to D1-09 (decisions 2026-11-08).
 */
export const HEAD_HOME_DELAY = 5;

/**
 * Reaching this stretch around the front gate (either side of it) completes
 * the walk back. Plan rect, level 0.
 */
export const GATE_RETURN = { x1: -6, y1: -6, x2: 6, y2: 4 };

/**
 * The smiling ghost peeking out from behind the tree nearest the gate
 * (decisions 2026-11-08). It shows on the walk home at the end of the day,
 * leaning out past the west edge of the trunk as seen from wherever the
 * player stands. Coming within `trigger` metres makes it giggle and duck away
 * for good.
 */
export const TREE_PEEK = { x: 12, y: 18, trunk: 0.35, trigger: 9 };

/** Feedback lines that aren't thoughts. */
export const WRONG_CODE = 'Wrong code. I should check my messages.';

/**
 * The church-approach thought fires the first time the player comes within
 * this distance of the church doors, about halfway up the path from the gate
 * (decisions 2026-11-08). A radius rather than a spot on the path, so it still
 * fires for a player who wanders the grounds first.
 */
export const CHURCH_APPROACH = { x: 0, y: 50, r: 25 };

/** Message shown once S1's last objective is done. */
export const S1_END = 'End of the S1 build. The rest of Day 1 comes in S2.';
