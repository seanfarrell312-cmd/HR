# Decisions log

Designer rulings made after design doc v0.4. Each entry cites the doc ID it
resolves. Newest last. The design doc stays the source of truth for anything
not listed here.

## 2026-11-02 — Church interior layout (resolves L01/L02)

Reference: [church-layout-draft.png](design/church-layout-draft.png).

| Topic | Ruling |
|---|---|
| L01/L02 orientation | Walking north from the gate through the church doors: **office and storage closet on the west (left)**, **chapel on the east (right)**. L02's compass labels were the error. |
| Basement access | Basement door is in the nave's **north-east** corner, opening onto a stair annex outside the north wall. Supersedes the doc's "north-west corner behind the altar". |
| Pews | **Six rows** each side of the central aisle (doc said three). |
| Relic table | In the **nave**, against the east wall just south of the chapel door — i.e. immediately outside the chapel, as the doc says. |
| Chapel shelf | The shelf just inside the chapel door **is** the doc's "small supply table by its entrance". |
| Storage door | Opens from the nave's west wall. |
| Keys | Hang on the nave's west wall beside the office door. |

## 2026-11-02 — S0 implementation choices (PROVISIONAL)

These are greybox choices to be confirmed at the S0 gate, not designer rulings.

- Scale is read off the church drawing at roughly 33 px per metre (nave about
  16 × 17 m). All coordinates live in `src/data/layout.ts` and are meant to be
  edited after walk-time testing.
- The basement is reached by an interaction at the foot of the stair annex
  ("Go down"), which moves the player to a separate basement space rather than
  a physically modelled stairwell. Easy to replace once the basement is final.
- Exterior placement (garden, graves, shed, perimeter) follows section 4.1 of
  the doc; the church is the occluding mass between the shed and the west
  garden (section 4.3).

## 2026-11-02 — S0 review: graves

| Topic | Ruling |
|---|---|
| Demon-perch headstone (D3-12) | Moved from the north end of the east graves to the **south end**, about 40 m from the shed doorway, so the silhouette reads as distant. Supersedes the doc's "northernmost" wording in 4.1/4.3; the "centrally framed from the shed doorway" intent stands. |
| West graves | A second set of graves sits **south of the west garden** (doc 4.1 "West garden + graves"). The old priest's grave stays by the garden. |

## 2026-11-08 — S0 gate

| Topic | Ruling |
|---|---|
| Gate and church doors | Both are **double doors** that open **inward** (the gate into the grounds, the church doors into the nave). Other doors stay single. |
| Website deployment | Brought forward from "after S7": every push to `main` runs the tests, builds and deploys to Azure Static Web Apps. `main` must stay playable. |
| S0 sign-off | Designer playtested the deployed greybox and approved the layout and scale, with the double-door change above. Edge and 1440p checks remain open for S7 browser QA. **S1 is next.** |

## 2026-11-08 — S1 setup

| Topic | Ruling |
|---|---|
| Gate code (D1-01) | Arrives as an **SMS from the supervisor** as the player steps off the bus, and can be re-read on the phone. Introduces the SMS alert used for relic deliveries. |
| Bus arrival | **Simple drive-off:** "Day 1" title fades in at the road while a low-poly bus pulls away with an engine sound, about 3 s, skippable. |
| Matches and crucifix | Start on the **chapel supply shelf** and reset there each morning. |
| Candles (D1-04) | **Four candle stands** at the corners of the holy circle, each lit separately with E. |

### PROVISIONAL S1 defaults (not yet ruled on)

- The mantel clock starts on the ritual table; after the blessing it is carried to a socket on the office desk (D1-06).
- Hold-to-bless takes 2 s, shown by the circular progress meter (doc 5.1).
- The gate code value is a placeholder until the designer picks one.
- Q opens the phone to re-read texts. The doc's input list (5.1) has no
  phone key, so this is a PROVISIONAL addition.
- In drag-to-look mode (browsers that refuse mouse capture) the view now
  drags with the **right** button so the left stays free for hold-to-bless.
- The chapel key can only be taken after reading the office note; trying
  earlier gives a short reminder thought (doc 5.4 "non-blocking reminder").

## 2026-11-08 — Title screen

At the designer's request the page now opens on a title screen modelled on
their earlier game's: "Happy Resting" in a heavy outlined face, "a game by
seanologues", and START and OPTIONS buttons, on a blue background. The title
is green (the reverse of the reference's blue-on-green); START enters the
game. OPTIONS is shown greyed out until there are settings to offer.

## 2026-11-08 — S1 playtest changes

| Topic | Ruling |
|---|---|
| Chapel door | Opens out into the nave, hinged on the north side. *Superseded the same day; see "S1 playtest changes, round 2".* |
| Chapel key | Hangs on hooks **inside the office**, on the wall beside its door, so the player passes the desk and note to reach it. |
| After the blessing | The clock gives a last falling chime and its shaking dies away; a beat of silence; sparkles drift out of it; then the ghost rises. Timings are in `PURIFY` in `src/data/story.ts` (ghost at 3.9 s). The clock can't be picked up until this finishes. |
| Text size | All HUD and panel text is larger. |
| Objectives | Shown large in the top-right corner for 5 s whenever the objective changes, then replaced by "(O) View Objectives". O shows it again for 5 s. The game keeps running. |
| Inventory | The bottom-corner item list is replaced by "(I) View Inventory". I pauses the game (sound keeps playing) and opens a centred "Inventory" panel; I or E closes it. |

## 2026-11-08 — Day 1 script pass

The designer's updated Day 1 text (spreadsheet "D1 messages and text") is now
in `src/data/story.ts`: the day card ("First Day", "4PM"), the supervisor's
text, the wrong-code line, the gate, key and ghost thoughts, and the office
letter (now addressed to "Monsignor" from St. Mary's, naming Mrs. Kettle's
clock and the gate drop box). Spelling was tidied without rewording.

New: a one-time thought, "The grounds are really nice. Hard to believe they'd
need someone like me.", the first time the player comes within 25 m of the
church doors after the gate opens (about halfway up the path). A radius
rather than a fixed spot, so a player who explores first still hears it.

The letter is long enough to scroll on short screens (mouse wheel or W/S).
Thoughts now stay up longer the longer they are (at least 3 s).

## 2026-11-08 — S1 playtest changes, round 2

| Topic | Ruling |
|---|---|
| SMS alert | "New SMS - Press Q" in flashing red, directly under the objective (or its "(O) View Objectives" hint) in the top-right corner, until the text is read. |
| Bottom-right hints | "(E) Interact" above "(I) View Inventory". |
| Gate-code objective | "Enter the code on the gate keypad" appears when the player puts the phone away after reading the text, not as it opens. |
| Church-approach thought | Now "This place feels so peaceful. Hard to believe they'd need someone like me." |
| Clock chime | Silent until the church doors first open, then chimes without a break (every 2.4 s, down to 0.9 s with all candles lit). Full volume in the chapel, fading with distance from the chapel door, and muffled in the basement. `chimeVolume` in `src/world/storyProps.ts`. |
| Chapel door | Opens **into the chapel** again, hinged on the south side, and folds back almost flat against the chapel's west wall into its empty south-west corner. It blocks no item, candle or the circle (tested against the real door mesh). |
| Ghost thought | "...Huh. Kinda cute." plays once the ghost has risen and faded (about 7.3 s after the blessing), not as it appears. |
| After the clock | "That wasn't too bad." on placing it. |
| End of the day | The day ends with the walk out (D1-10, "leave grounds"): the thought "I guess I should head back to the bus stop.", then the objective "Head back to the front gate", completed on reaching the gate (either side of it). **Day 1 keeps D1-07 to D1-09** (chalice, first delivered relic, relic blessing) between the clock and this walk; they arrive in S2. Until then the S1 build plays the walk 5 s after the clock and shows the end-of-build message at the gate. |
| Tree peek | On the walk home at the end of the day, a smiling ghost peeks out from behind the tree nearest the gate (plan 12, 18). It isn't there on the way in. It stays on the far side of the trunk from the player and leans out past the trunk's west edge, so it's peeking from any angle. Coming within 9 m makes it giggle, duck fully behind the trunk and vanish. One-shot (`d1-tree-peek`); optional. `TREE_PEEK` in `src/data/story.ts`. |
| Ghost look | Ghosts follow the designer's reference image: lime-green rounded dome, slightly flared wavy hem, tall oval eyes, small smile, soft glow and a wisp of green mist. About the old size (0.9 m). `src/world/ghost.ts`. |
| Office letter | Replaced with the designer's new text (11 short paragraphs), verbatim. |

### PROVISIONAL (not yet ruled on)

- The walk-out objective has the id `D1-RETURN` for now. In S2 it becomes
  the "leave grounds" part of D1-10, after the relic is stored, under the
  evening sky.
- The peek trigger distance (9 m) and the ghost's hover height are first
  guesses.
