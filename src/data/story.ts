// Story data. Day 1: S1 (D1-01 to D1-06) and S2 (D1-07 to D1-10 and the Day
// 2 reset). Day 2: S3. Plain data: positions, texts and tuning. Dialogue is
// PROVISIONAL copy until the script is locked (doc N07).

import type { RelicKind } from '../state/store';

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
  /** Cleaned-relic table outside the chapel door (the first relic's place). */
  relicStored: { x: 7.4, y: 51.05, z: 0.85 },
  /**
   * Day 2 (D2-02): where the prankster ghost left the chalice, at the north
   * end of the east garden bench, out of sight of the main path.
   */
  chaliceBench: { x: -24.0, y: 56.0, z: 0.5 },
  /** Day 2 (D2-06): the bucket and holy-water rod in the storage closet, on the floor. */
  bucketCloset: { x: -10.05, y: 62.3, z: 0 },
  rodCloset: { x: -10.35, y: 60.8, z: 0 },
  /** Where the bucket of holy water is set down, by the ritual table's south end. */
  bucketChapel: { x: 13.05, y: 51.35, z: 0 },
  /** Inside the drop box at the gate, where the music box is heard from. */
  dropBox: { x: 3.7, y: 0.1, z: 0.9 },
} satisfies Record<string, ItemSpot>;

/**
 * Places on the cleaned-relic table, in the order relics are put there: the
 * middle first (where Day 1's music box sits), then either end.
 */
export const RELIC_TABLE_SLOTS: ItemSpot[] = [
  SPOTS.relicStored,
  { ...SPOTS.relicStored, y: 50.6 },
  { ...SPOTS.relicStored, y: 51.5 },
];

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
  // Designer copy, 2026-11-13.
  delivery1: {
    id: 'delivery1',
    from: 'Supervisor',
    text: "Heads up. I just got an alert that someone just dropped something off. It should be in the drop box out by the front gate. Head over there and grab it. Once you're done with it, leave it on the table outside the chapel.",
  },
  // Day 2 (designer copy, 2026-11-15): the supervisor forwards the alert.
  // The second uses the same alert (S3 part 2, PROVISIONAL).
  d2delivery1: {
    id: 'd2delivery1',
    from: 'Supervisor',
    text: 'FWD: A package has been delivered to your drop box. Thank you for using Christ-LERTS.',
  },
  d2delivery2: {
    id: 'd2delivery2',
    from: 'Supervisor',
    text: 'FWD: A package has been delivered to your drop box. Thank you for using Christ-LERTS.',
  },
};

/** Which relic each delivery text brings to the drop box. */
export const DELIVERIES: Record<string, RelicKind> = {
  delivery1: 'music-box',
  d2delivery1: 'teacup',
  d2delivery2: 'clown',
};

/** What each relic is called in prompts and objectives. */
export const RELIC_NAMES: Record<RelicKind, string> = {
  'music-box': 'music box',
  teacup: 'teacup',
  clown: 'clown doll',
};

/** The front gate shuts itself this long after it opens (decisions 2026-11-10). */
export const GATE_OPEN_SECONDS = 10;
/**
 * The church doors shut themselves this long after they open, so the player
 * can't see out while inside (decisions 2026-11-13).
 */
export const CHURCH_DOOR_SECONDS = 10;
/** Doors that shut themselves, and after how many seconds. */
export const AUTO_CLOSE_DOORS: Readonly<Record<string, number>> = {
  gate: GATE_OPEN_SECONDS,
  church: CHURCH_DOOR_SECONDS,
};
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
export const OFFICE_NOTE_DAY1 = [
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

/**
 * Day 2's note (doc 6.2 D2-01): released ghosts may linger, play pranks and
 * wait before they pass on. Designer copy, 2026-11-15.
 */
export const OFFICE_NOTE_DAY2 = [
  "Great job yesterday! Mrs. Kettle's clock has been ticking normally all day, and the owner of the music box came by earlier to retrieve it.",
  "Word has gotten out about your exorcism skills so I expect a few more drop-offs today. I'll forward you the alerts once they arrive.",
  "By the way, if you see or hear anything weird today, just ignore it. It's not anything too bad mind you, but it seems that a number of the exorcised spirits are lingering a bit. They may try an odd prank or to startle you, but they appear to be harmless so don't let them distract you. I suspect they're just bored and are waiting for their turn to move on to the other side.",
  'The key to the chapel is behind you on the ring again.',
  'Good Luck!',
].join('\n\n');

/** The office note for each day. */
export const OFFICE_NOTES: Record<number, string> = { 1: OFFICE_NOTE_DAY1, 2: OFFICE_NOTE_DAY2 };
/** Day 1's note, as before. */
export const OFFICE_NOTE = OFFICE_NOTE_DAY1;

/**
 * The Easter-egg note on the stool behind the church (designer copy,
 * 2026-11-13). Not part of the story: readable any time, changes nothing.
 */
export const STOOL_NOTE = [
  'Hey friend,',
  "My name is Seanologues and this is my game. I know it's fun to explore, but you should really get back to the game. Sometimes empty spaces are just that. There aren't any secrets or lore back here, just this note.",
  "If you really want something extra, how's this:",
  "Even though I've never met you and probably never will, even though I don't know what you look like or how old you are, and even though it may be kind of lame to say this, I bet you're a pretty cool person. I'm eternally grateful that you gave this game a chance and hope you play through to the end.",
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
  // Day 2, designer copy (2026-11-14 and 2026-11-15).
  /** Walking up to the church on Day 2, in place of Day 1's first impression. */
  churchApproachDay2: "I'm definitely getting my steps in today.",
  /** At the altar, where the chalice should be (D2-02). */
  chaliceMissing: "Here's the crucifix, but no chalice...",
  /** Picking the crucifix up off the altar (Day 2); then it's for the ritual table. */
  crucifixFirst: "I guess I'll drop this off first, then look for the cup.",
  /** Searching the church: behind the office desk. */
  searchDesk: "I don't think the chalice would fit in these drawers.",
  /** Searching the church: trying the locked storage closet and basement doors. */
  searchLocked: "Locked tight. I hope it's not in the closet.",
  /** Searching the church: trying the locked basement door. */
  searchBasement: "Still locked. I'm kinda glad I don't have to go down there.",
  /** No search progress for a while: up to three nudges (SEARCH_NUDGES). */
  searchNudge: 'I should check all the rooms. Maybe the other doors are unlocked?',
  /** Closing the first Day 2 delivery text; then the drop-box objective. */
  alertRead: 'Christ-LERTS? Nice.',
  /** Once all three places have been checked. */
  searchOutside: "I guess it's outside somewhere?",
  /** As the prankster pops up, while it's still on screen. */
  prankScare: 'JESUS!',
  /** Then, one after another, before the next objective. */
  prankHarmless: 'Harmless, huh? I almost had a heart attack!',
  prankFocus: 'Gotta stay focused, back to the chapel.',
  /** The chalice is on the ritual table with the crucifix; then the delivery text. */
  tableSetDay2: 'There. All set.',
  /** Day 2 shift start, once the first objective has folded away. */
  gateCodeRecall: `Good thing I remembered the gate code: ${GATE_CODE}.`,
  /** Opening the office door for the first time on Day 2; the clock is on the desk. */
  officeClock: 'That clock really does look nice in here.',
  // Day 2, the clown doll. PROVISIONAL copy (S3 part 2, decisions 2026-11-22).
  /** Once the second cross (after scripture) has made the clown doll dance instead of settling. */
  clownDance: "It's... dancing? Okay, that definitely didn't work.",
  /** Straight after; then the storage key is wanted. */
  clownWater: 'Time for some holy water. There should be a bucket in the storage closet.',
  /** Finding the storage closet key in the office desk drawers. */
  storageKey: 'There it is. I knew these drawers were good for something.',
  /** Trying the church doors from inside while searching it for the chalice. */
  searchStayInside: 'I need to find the chalice. Maybe the other doors are unlocked?',
  // Designer copy, 2026-11-22 (part 2 playtest).
  /** The teacup is on the cleaned-relic table; then the second delivery text. */
  homeEarly: "If they're all like this today, I might get to go home early.",
  /** Leaving the church for the drop box once the second delivery text is in. */
  longWalk: 'I should have brought a bike or something. This walk is ridiculous.',
  // Designer copy, 2026-11-26.
  /** The holy water has stilled the clown doll; then the cross again. */
  cooledOff: 'Looks like that cooled him off.',
};

/**
 * Day 2 on: seconds after the first objective shows before the gate-code
 * thought. The objective is up for 5 s (OBJECTIVE_SECONDS in the HUD), so the
 * thought follows once it has folded away.
 */
export const GATE_RECALL_DELAY = 5.5;

/**
 * Day 2 (designer copy, 2026-11-16): lines while dawdling outside after the
 * gate opens, at these many seconds, until the player goes into the church.
 */
export const LOITER_LINES: readonly { seconds: number; text: string }[] = [
  { seconds: 60, text: 'These grounds are really pristine.' },
  { seconds: 120, text: "Maybe I'll just hang out here all day." },
  { seconds: 180, text: 'I should head inside.' },
];
/** Inside the church: the nave, just past the doors. */
export const CHURCH_INSIDE = { x1: -8, y1: 50.2, x2: 8, y2: 67.4 };

/** Searching the church: seconds without progress before a nudge, and how many nudges at most. */
export const SEARCH_NUDGE_SECONDS = 30;
export const SEARCH_NUDGES = 3;

/**
 * Per-relic lines (S3): nearing the drop box once it's in there, picking it
 * up, carrying it up towards the church doors, and once its ghost has gone.
 * The optional second lines play straight after the first.
 */
export interface RelicLines {
  approach: string;
  pickup: string;
  pickup2?: string;
  carry: string;
  carry2?: string;
  ghost: string;
  ghost2?: string;
}
export const RELIC_LINES: Record<RelicKind, RelicLines> = {
  'music-box': { approach: THOUGHTS.dropBox, pickup: THOUGHTS.relicPickup, carry: THOUGHTS.relicAnnoying, ghost: THOUGHTS.relicGhost },
  // Designer copy, 2026-11-15 and 2026-11-16.
  teacup: {
    approach: 'Sounds like... rattling china?',
    pickup: "A bouncing teacup? It's a wonder it hasn't shattered.",
    carry: "I should hurry, this thing's about to bounce outta my hands.",
    ghost: 'I guess he must have really liked tea.',
  },
  // Designer copy, 2026-11-26, except the approach line (PROVISIONAL,
  // 2026-11-22).
  clown: {
    approach: 'Quiet one this time. That makes a nice change.',
    pickup: 'A doll?',
    pickup2: "I'm not exactly sure what's haunted about it, but I guess a little blessing couldn't hurt.",
    carry: "I wonder if it's just a clown thing. A lot of people think they're creepy nowadays.",
    carry2: 'Poor little guy.',
    ghost: 'I suppose a toy makes more sense than a teacup.',
    ghost2: 'The things these spirits will get into these days.',
  },
};

/**
 * Day 2 (2026-11-22): south of the church doors, outside. Leaving the church
 * for the drop box once the second delivery text is in brings the long-walk
 * thought.
 */
export const CHURCH_LEFT_Y = 49;
/** Seconds the clown doll dances and laughs when the second cross fails on it (D2-05). */
export const CLOWN_DANCE_SECONDS = 3.2;
/** Seconds of the small giggle and wiggle at the first cross (D2-05). */
export const CLOWN_WIGGLE_SECONDS = 1.4;
/**
 * The splash (D2-07): the rod strikes three times, `SPLASH_STRIKE` seconds
 * apart, then the doll stops and slumps; the thought follows at
 * `SPLASH_SECONDS`.
 */
export const SPLASH_STRIKE = 0.3;
export const SPLASH_SECONDS = 2.6;

/**
 * Seconds the prankster ghost is on screen (D2-02): pops up behind the bench,
 * blows a raspberry, floats off and fades. Its thought follows.
 */
export const PRANK_SECONDS = 2.8;

/** The chalice-is-missing thought: this close to the altar on Day 2. */
export const ALTAR_APPROACH = { x: 0, y: 64, r: 4 };

/**
 * Searching the church for the chalice (D2-02): behind the office desk (the
 * strip between the desk and the office's west wall), and the two locked
 * doors.
 */
export const BEHIND_DESK = { x1: -16.4, y1: 50.6, x2: -14.6, y2: 56.2 };
export const SEARCH_DOORS = ['storage', 'basement'] as const;
export const SEARCH_SPOTS = 3;
/** The search checklist shown while the church is searched, in order. */
export const SEARCH_CHECKLIST = ['Check the office', 'Check the storage closet', 'Check the basement'] as const;

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
  // S3 part 2, PROVISIONAL.
  holyWaterFirst: 'I need the bucket of holy water by the table first.',
  needRod: 'I need the holy-water rod.',
  rodDry: 'I should dip the rod in the holy water first.',
  bucketEmpty: "It's empty. I should fill it at the fountain first.",
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
/** What comes to mind on the walk up to the church, by day. */
export const CHURCH_APPROACH_LINES: Record<number, string> = {
  1: THOUGHTS.churchApproach,
  2: THOUGHTS.churchApproachDay2,
};

/** Shown once Day 2's second relic is put away, until the rest of S3 is built. */
export const S3_PART2_END = 'End of S3 part 2. The third delivery comes next.';

/**
 * First-day control guide (designer copy, 2026-11-09), shown once the day card
 * has faded. It fades after `seconds`, or as soon as the phone is opened.
 */
export const CONTROLS_GUIDE = { lines: ['Use the mouse to look around.', 'WASD to move'], seconds: 60 };
