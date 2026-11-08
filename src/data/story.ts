// Day 1 story data for S1 (D1-01 to D1-06). Plain data: positions, texts and
// tuning. Dialogue is PROVISIONAL copy until the script is locked (doc N07).

/** PLACEHOLDER gate code until the designer picks one (docs/decisions.md). */
export const GATE_CODE = '4173';

/** Seconds the primary button must be held to complete a blessing (PROVISIONAL). */
export const BLESS_SECONDS = 2;

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
  chapelKey: { x: -7.82, y: 51.35, z: 1.45 },
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
    text: `Morning! Running late, sorry. Gate code is ${GATE_CODE}. Your instructions are on my desk in the office.`,
  },
};

export const OFFICE_NOTE = [
  'Welcome aboard!',
  '',
  "An easy one to start. The mantel clock on the chapel table has been chiming at all hours since it came in.",
  '',
  'Chapel key is on the hooks by the office door. Matches and crucifix are on the chapel shelf. Light the four candles, stand in the circle and bless it.',
  '',
  "Once it's quiet, pop it on my desk.",
  '',
  "P.S. If anything floats out of it, don't worry. They're friendly.",
  '— Supervisor',
].join('\n');

/** Subtitled thoughts (doc 3.2). Keyed so they can be traced to dialogue IDs later. */
export const THOUGHTS = {
  gateOpen: 'Right. First day.',
  keyBeforeNote: 'I should read the instructions first.',
  ghost: "...Huh. So that's what they meant.",
  clockPlaced: 'One down.',
};

/** Message shown once S1's last objective is done. */
export const S1_END = 'End of the S1 build. Day 1 continues in S2.';
