// Day 1 story data (S1: D1-01 to D1-06; S2: D1-07 to D1-10 and the Day 2
// reset). Plain data: positions, texts and tuning. Dialogue is PROVISIONAL
// copy until the script is locked (doc N07).

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
  /** The hand cross for blessings, on the chapel shelf. */
  cross: { x: 8.55, y: 54.9, z: 1.2 },
  clockRitual: { x: 13.83, y: 53.3, z: 0.9 },
  clockDesk: { x: -14.1, y: 52.9, z: 0.8 },
  // S2 (decisions 2026-11-09). The chalice and the standing crucifix live
  // side by side on the nave altar, ready for each day's table setting.
  chaliceAltar: { x: -0.3, y: 65.1, z: 1.1 },
  crucifixAltar: { x: 0.3, y: 65.15, z: 1.1 },
  /** The ritual table's sockets: chalice and crucifix either side of the relic. */
  chaliceRitual: { x: 13.83, y: 52.65, z: 0.9 },
  crucifixRitual: { x: 13.83, y: 53.95, z: 0.9 },
  relicRitual: { x: 13.83, y: 53.3, z: 0.9 },
  /** The Bible, lying open on top of its stand, just outside the circle. */
  bible: { x: 12.05, y: 54.65, z: 1.1 },
  /** Cleaned-relic table outside the chapel door. */
  relicStored: { x: 7.4, y: 51.05, z: 0.85 },
  /** Inside the drop box at the gate, where the music box is heard from. */
  dropBox: { x: 3.7, y: 0.1, z: 0.9 },
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
    // Designer copy, 2026-11-10.
    text: `Afternoon! I forgot to mention, the gate code is ${GATE_CODE}. Your instructions should be in my office. Just hang a left once you get into the church.`,
  },
  // PROVISIONAL copy (decisions 2026-11-09).
  delivery1: {
    id: 'delivery1',
    from: 'Supervisor',
    text: "Heads up, someone just dropped off a new relic in the drop box by the front gate. The hatch is on the inside. Once it's dealt with, leave it on the table outside the chapel.",
  },
};

/** The front gate shuts itself this long after it opens (decisions 2026-11-10). */
export const GATE_OPEN_SECONDS = 10;
/** The sticker above the keypad screen (designer copy, 2026-11-10). */
export const GATE_CAUTION = `Caution: gate is automatic and closes after ${GATE_OPEN_SECONDS} seconds`;

/** Only the newest text shows on the phone; each new one replaces the last (decisions 2026-11-10). */
export function phoneMessages(inbox: string[]): Sms[] {
  const last = inbox[inbox.length - 1];
  return last && SMS[last] ? [SMS[last]] : [];
}

/** Seconds after the clock is on the desk before the delivery text arrives. */
export const DELIVERY_DELAY = 5;

/** The card shown as each day begins (designer copy, 2026-11-08). */
export const DAY_TITLES: Record<number, { title: string; time: string }> = {
  1: { title: 'First Day', time: '4PM' },
  // PROVISIONAL until the designer names it.
  2: { title: 'Second Day', time: '4PM' },
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
  // Designer copy, 2026-11-09 playtest round 4.
  /** As the chapel door opens on Day 1. */
  chapelOpen: 'That must be the clock.',
  /** Once the fourth candle is lit; then the altar pieces are asked for. */
  candlesLit: 'Hmm, maybe a little something extra to get the energies right.',
  /** Once the table is set and the clock starts chiming harder. */
  tableSet: "Now we're cooking.",
  ghost: '...Huh. Kinda cute.',
  clockPlaced: "That wasn't too bad.",
  // S2 lines (designer copy, 2026-11-09 playtest).
  /** Nearing the drop box once the music box is in it. */
  dropBox: 'Sounds like another noisy one.',
  relicPickup: 'An old music box. I think my mother had one of these.',
  /** Carrying the still-playing music box up towards the church. */
  relicAnnoying: "Man, this thing's annoying. I should hurry.",
  /** Once the first blessing's rattle has died away. */
  relicSettled: 'Well that shut it up at least, but it looks like this spirit is a stubborn one.',
  goodBook: "Let's see how it likes a little of the Good Book.",
  /** Trying the altar pieces before the objective asks for them. */
  chaliceEarly: 'Nice chalice, I guess the collections are doing well.',
  crucifixEarly: "It's well polished, but clearly cheap. I guess the money all went to the cup.",
  relicGhost: 'Did it just wink at me?',
  /** As soon as the music box is put away and dusk falls. */
  late: 'Woah, when did it get so late?',
  /** After a pause; then the walk back to the gate. */
  headHome: 'I guess I should head back to the bus stop.',
};

/** Reminders when something is tried too early (doc 5.4). PROVISIONAL copy. */
export const REMINDERS = {
  handsFull: 'My hands are full.',
  hatchInside: "The hatch is on the inside of the gate.",
  dropBoxEmpty: "Nothing's been delivered yet.",
  tableNotReady: 'The chalice and crucifix need setting out on the table first.',
  needCross: 'I need the cross from the shelf.',
  scriptureFirst: 'I should read it some scripture first.',
  bibleFirst: 'I need the Bible from the stand.',
  bibleBack: 'I should put the Bible back on its stand first.',
  standInCircle: 'I should stand in the holy circle.',
};

/** The verse on the Bible stand: Numbers 6:24-26, King James Version (public domain). */
export const SCRIPTURE = {
  reference: 'Numbers 6:24-26',
  lines: [
    'The LORD bless thee, and keep thee:',
    'The LORD make his face shine upon thee, and be gracious unto thee:',
    'The LORD lift up his countenance upon thee, and give thee peace.',
  ],
};

/** Seconds the music box rattles against the first blessing before it is still. */
export const RATTLE_SECONDS = 1.6;

/**
 * Once the scripture has been read the music box shudders again, weaker and
 * shorter: the spirit is losing, so the next blessing will hold (S2 playtest,
 * round 3). The bless prompt waits until it has stopped.
 */
export const RATTLE_AGAIN = { seconds: 1.1, strength: 0.55 };
/** The first blessing's rattle, for the view. */
export const RATTLE_FIRST = { seconds: RATTLE_SECONDS, strength: 1 };

/** Seconds after the rattle stops before the "shut it up" thought. */
export const THOUGHT_BEAT = 0.4;

/**
 * Seconds a thought stays on screen. Story beats that follow a thought (the
 * next thought, or a new objective) wait this long plus THOUGHT_GAP, so the
 * player is never asked to read two things at once (S2 playtest, 2026-11-09).
 */
export function thoughtSeconds(text: string): number {
  return Math.max(3, text.length / 14);
}
export const THOUGHT_GAP = 0.6;
/** Seconds after a thought before what follows it. */
export const afterThought = (text: string): number => thoughtSeconds(text) + THOUGHT_GAP;

/**
 * Seconds from arrival to the supervisor's gate-code text and the first
 * objective: after the day card (3.2 s), the bus pulling away and the control
 * guide (from 3.2 s), so each lands on its own (S2 playtest round 4).
 */
export const GATE_TEXT_DELAY = 6.5;

/** Seconds after the table is set, as the clock chimes harder, before "Now we're cooking." */
export const COOKING_BEAT = 1.2;
/** Pause between "Now we're cooking." clearing and the cross objective. */
export const CROSS_PAUSE = 1.5;

/** Pause between the "so late" thought clearing and the head-home thought. */
export const LATE_PAUSE = 2;

/** The "sounds like another noisy one" thought: this close to the drop box. */
export const DROP_BOX_APPROACH = { x: SPOTS.dropBox.x, y: SPOTS.dropBox.y, r: 10 };

/**
 * The "this thing's annoying" thought: carrying the still-possessed music box
 * this close to the church doors (about two thirds of the way up the path).
 */
export const RELIC_ANNOY = { x: 0, y: 50, r: 17 };

/** Seconds between putting the music box away and the head-home thought (D1-10). */
export const HEAD_HOME_DELAY = afterThought(THOUGHTS.late) + LATE_PAUSE;

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

/** Shown as Day 2 begins, until S3 builds it. */
export const S2_END = 'End of the S2 build. Day 2 comes in S3.';

/**
 * First-day control guide (designer copy, 2026-11-09), shown once the day card
 * has faded. It fades after `seconds`, or as soon as the phone is opened.
 */
export const CONTROLS_GUIDE = { lines: ['Use the mouse to look around.', 'WASD to move'], seconds: 60 };
