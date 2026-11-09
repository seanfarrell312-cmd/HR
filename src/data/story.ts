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

export const OFFICE_NOTE = [
  'Welcome Monsignor,',
  '',
  "On behalf of St. Mary's, myself, and the parishioners and staff, I would like to thank you for accepting our request for assistance from the Vatican. As you probably already know, the increasing number of restless spirits and strange possessions has put a real strain on our ministry. There's now so many possessed items popping up around the countryside we had to install a drop box by the gate just to handle them all. I'm sure a man of your expertise isn't too fazed by all this, but we're just a small town congregation with little to no formal training on how to handle restless spirits. I've already taken the liberty of bringing in your first case. I left it on the chapel table on the other side of the building. I locked the door to keep it contained in there, so be sure to grab the chapel key behind you. You may already be able to hear it. It's an antique mantel clock that Mrs. Kettle brought in. Apparently it's been chiming non-stop for 4 days. We tried everything short of smashing it to make it stop, but it just got louder. It even started giggling at us at one point. Clearly a possession.",
  '',
  "Once you're in the chapel, set up the ritual site and do your thing. I know it's not much but it's the best we've got. Light the four candles, stand in the circle and hit it with a blessing. You can find matches and a crucifix on the shelf once you're in there.",
  '',
  "If it works (I'm sure it will), pop it on my desk. Mrs. Kettle doesn't want it back and it's too nice to throw away.",
  '',
  '— Supervisor',
].join('\n');

/** Subtitled thoughts (doc 3.2). Keyed so they can be traced to dialogue IDs later. */
export const THOUGHTS = {
  gateOpen: 'Nice, it worked.',
  churchApproach: "The grounds are really nice. Hard to believe they'd need someone like me.",
  keyBeforeNote: 'Huh, a key. I should really read the note they left me first.',
  ghost: '...Huh. Kinda cute.',
  clockPlaced: 'One down.',
};

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
export const S1_END = 'End of the S1 build. Day 1 continues in S2.';
