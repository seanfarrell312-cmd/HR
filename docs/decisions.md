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

## 2026-11-08 — S1 gate

| Topic | Ruling |
|---|---|
| S1 sign-off | Designer playtested the deployed build (round 2: SMS alert, constant chime, folding chapel door, new ghost look, walk home with the tree peek) and approved it. **S2 is next.** |
| Day 1 shape | The doc's D1-07 to D1-10 stay in Day 1. The walk home and the tree peek belong to the very end of the day, after the relic is stored (D1-10). |

## 2026-11-09 — S2 setup

Designer rulings before building S2:

| Topic | Ruling |
|---|---|
| First delivered relic | A small wooden **music box**. While possessed its lid flaps and it plays a wonky tune, faintly audible from the drop box and clear close by. |
| Chalice | Starts the day on the **nave altar**. Carried like the clock (one large prop at a time). |
| Standard relic blessing | **Hold the crucifix** (the music box rattles hard, then settles), **E on the Bible stand** to read scripture, **hold again** (it releases a winking green ghost). |

### PROVISIONAL S2 defaults (not yet ruled on)

- **Order.** D1-07: take the chalice from the altar once the clock is on the
  desk, then one E at the ritual table sets out the chalice and the crucifix
  together (the crucifix leaves the pocket for its socket). D1-08: the
  supervisor's delivery text arrives 4 s later; read it, then take the music
  box out of the drop box from inside the gate. D1-09: place it on the ritual
  table, then the two-stage blessing. D1-10: put it on the cleaned-relic table
  outside the chapel, which brings dusk (doc 7.1 D1_EVENING); 5 s later "I
  guess I should head back to the bus stop.", the walk home with the tree
  peek, and the gate ends the shift.
- **Shift end.** Fade to black at the gate, then Day 2 begins at the arrival
  spot with its title card. Day 2 itself is S3, so it shows an end-of-build
  message.
- **Day 2 reset.** Tools back at their day-start places (key on its hooks,
  matches and crucifix on the shelf, chalice on the altar), candles out,
  doors shut and locked, daytime sky, the music box cleared from the table.
  The clock stays on the supervisor's desk; one-shot scares stay fired; the
  phone keeps its old texts, all read.
- **Copy, all placeholder for the designer to rewrite:** the delivery text,
  the rattle thought ("Stubborn little thing. Maybe some scripture will
  settle it."), the ghost thought ("Did it just wink at me?"), the reminders
  for things tried early, the Day 2 card ("Second Day", "4PM"). The verse on
  the Bible stand is Numbers 6:24-26, King James Version (public domain).
- **Dusk colours** and the music box tune are first passes.

## 2026-11-09 — S2 playtest changes

Designer rulings after playing S2:

| Topic | Ruling |
|---|---|
| Start of each day | The player starts facing east along the road, the way the bus drives off, with the church on the left. Day 2 starts the same way. |
| Control guide | After the Day 1 card: "Use the mouse to look around." / "WASD to move". It fades after a minute, or as soon as the player opens the phone with Q. First day only. |
| Ritual table | Setting out the chalice and crucifix is part of preparing the ritual site, **before the first blessing**, and is repeated each day. |
| Cross and crucifix | Two different things. The **cross** is the small hand cross from the chapel shelf, held up for blessings. The **crucifix** is larger, with a flat base it stands on; it sits on the **altar next to the chalice** and is set out on the ritual table. |
| Clock chime | Only speeds up once the candles are lit **and** the table is set. |
| Delivery text | Rewritten to send the player to the drop box (provisional copy below). The music box and its tune stay. |
| Music box thoughts | Nearing the drop box: "Sounds like another noisy one." Picking it up: "An old music box. I think my mother had one of these." Carrying it up to the church: "Man, this thing's annoying. I should hurry." After the first blessing, once it has rattled and gone still: "Well that shut it up at least, but it looks like this spirit is a stubborn one." |
| Storing the music box | Its objective only appears after "Did it just wink at me?" |
| Camera | Must never turn on its own, near the tree ghost, in the holy circle or anywhere else. |

This reorders the doc's Day 1 table (doc 6.1). Objective ids now run:

| Id | Objective |
|---|---|
| D1-01 | Read the code, open the gate (unchanged) |
| D1-02 | Into the church (unchanged) |
| D1-03 | Office note and chapel key (unchanged) |
| D1-04 | Matches from the shelf, light the four candles |
| D1-05 | Chalice and crucifix from the altar, set out on the ritual table (was D1-07) |
| D1-06 | Cross from the shelf, bless the clock (was D1-05) |
| D1-07 | Clock to the supervisor's desk (was D1-06) |
| D1-08 to D1-10 | Delivery, two-stage blessing, store and leave (unchanged) |

D1-04 and D1-05 can be done in either order: the objective box asks for the
candles first, and a table already set completes the moment the last candle
is lit. The chalice and crucifix can be fetched at any time, before the note
too. They stay on the ritual table for the music box blessing, then go back
to the altar overnight.

The camera jumps were not caused by the game: nothing in the code turns the
view. The likely cause is a Chrome/Edge bug on Windows where one mouse event
under pointer lock reports a huge movement. The game now asks for raw mouse
input (`unadjustedMovement`, which also skips Windows mouse acceleration, so
looking may feel slightly different) and drops any single movement far
bigger than the movement just before it.

### PROVISIONAL (not yet ruled on)

- **Delivery text:** "Nice work on the clock! Another one just came through
  the drop box at the front gate. You can open it from the hatch on the
  inside. Bring it in and give it the usual treatment, then leave it on the
  table outside the chapel." It now arrives 5 s after the clock is put on the
  desk, so "That wasn't too bad." has finished first.
- **Office note.** The designer's letter still says "There should be matches
  and a crucifix on the shelf" and doesn't mention the altar or setting the
  table. It is left as written for the designer to revise.
- **Trigger distances.** "Another noisy one" fires within 10 m of the drop
  box. "This thing's annoying" fires within 17 m of the church doors, about
  two thirds of the way up the path. The "shut it up" thought comes 0.4 s
  after the rattle stops. The store objective comes 3 s after the wink
  thought.
- **Reminders:** "The chalice and crucifix need setting out on the table
  first." and "I need the cross from the shelf."
- **Standing crucifix look:** gold, stepped base, pale figure.
- **Chime:** calm and steady until the site is ready, then fast and shaking
  at once (no gradual build).
- **Control guide position:** upper centre, under the day card.

## 2026-11-09 — S2 playtest changes, round 2

Designer rulings:

| Topic | Ruling |
|---|---|
| Altar pieces | The chalice and crucifix can't be taken until the objective asks for them (D1-05). Trying earlier gives a thought and leaves them where they are: "Nice chalice, I guess the collections are doing well." / "It's well polished, but clearly cheap. I guess the money all went to the cup." |
| Carrying them | Both show in the hands: the crucifix in the left, the chalice in the right, a first taste of carrying one thing in each hand. |
| After the chapel key | "Unlock the chapel", then once the door is open "Pick up the matches from the shelf". |
| Delivery text | The supervisor doesn't know what's happened at the church; the text only says a new relic is in the drop box (provisional copy below). |
| Ritual table | Moved further back from the circle so the released ghost can be seen. |
| Scripture | After the rattle: "Well that shut it up at least..." then "Let's see how it likes a little of the Good Book." Then "Pick up the Bible from the stand" (it shows open in the left hand), then "Read the music box some scripture": hold on the music box to open the scripture. "Bless the music box again" only appears once the scripture is closed. |
| Bible stand | Stays put, in a fixed spot between the two eastern candles, between the player in the circle and the table (designer's choice, 2026-11-09). |
| Dusk | As soon as the music box is put away and the sky changes: "Woah, when did it get so late?" A pause, then "I guess I should head back to the bus stop.", then the "Head back to the front gate" objective. |
| Pacing | An objective never appears while the thought before it is still on screen. |

Because of the altar rule, D1-04 (candles) and D1-05 (table) are now in a
fixed order; the table can no longer be set first.

Every timed beat after a thought waits for that thought's time on screen
(at least 3 s, longer for long lines, matching the subtitle) plus 0.6 s.

### PROVISIONAL (not yet ruled on)

- **Delivery text:** "Heads up, someone just dropped off a new relic in the
  drop box by the front gate. The hatch is on the inside. Once it's dealt
  with, leave it on the table outside the chapel."
- **Layout.** The ritual table now runs x 13.45 to 14.2 against the east
  wall; it was 12.9 to 14.0. Its sockets moved with it. The interaction reach
  is 2.9 m (it was 2.6) so the table can still be reached from the circle.
  The Bible stand is a slim wooden stand at x 12.22 to 12.52, centred between
  the eastern candles.
- **Scripture hold.** It lasts as long as a blessing hold (2 s). Only the
  Bible is in view during it; the hand cross rises only for blessings.
- **The Bible afterwards.** It stays in the left hand after the blessing. You
  can put it back on the stand (E) once the music box is cleansed. Either
  way it is back on the stand on Day 2.
- **The pause** between "so late" clearing and the head-home thought is 2 s.
- **Copy fixes.** I corrected spelling and capitals in the designer lines
  ("chalice", "I", "Let's", "likes"). "Woah" is kept as written.

## 2026-11-09 — S2 playtest changes, round 3

Designer rulings:

| Topic | Ruling |
|---|---|
| Altar pieces, too early | Their prompt is just "Chalice" / "Crucifix" (no "Take") until D1-05 asks for them. E still gives the thought. |
| Chapel key objective | Appears only once the office note has been put down, not while it is being read. |
| Clock to the desk | "Put the clock on the supervisor's desk" appears after "...Huh. Kinda cute." has played. |
| Bible stand | Back in its original spot just outside the circle's north-east corner. It moves into the circle on later days. Replaces round 2's spot between the eastern candles. |
| Music box pickup | "Put the music box on the ritual table" waits until "An old music box..." has played. |
| After the scripture | Closing the scripture makes the music box shudder again, to show the next blessing will work. "Bless the music box again" waits until it stops. |
| After the blessing | New step before storing it: "Put the Bible back on the stand and pick up the music box", then "Put the music box on the table outside the chapel". |

### PROVISIONAL (not yet ruled on)

- **The second shudder** is weaker and shorter than the first: 55% strength
  for 1.1 s, against 100% for 1.6 s. It uses the same rattle sound. The bless
  prompt returns 0.4 s after it stops. No thought goes with it.
- **The Bible must go back first.** Picking up the music box with the Bible
  still in hand gives "I should put the Bible back on its stand first." This
  replaces round 2's optional put-back.
- **The new step is part of D1-10**, not a new objective number, so the doc's
  D1-01 to D1-10 numbering is unchanged.
- **Copy.** "Put the Bible back on the stand and pick up the music box": the
  designer's "bible" and "Music Box" are written to match the other lines.
- **The Bible stand** is the slim wooden one from round 2, at the original
  footprint (x 11.8 to 12.3, y 54.4 to 54.9), 1.1 m tall. The open Bible on
  it turns to face the centre of the circle.

## 2026-11-09 — S2 playtest changes, round 4

Designer rulings:

| Topic | Ruling |
|---|---|
| Arrival | Day card, bus pulling away, control guide, then the gate-code text's alert and the "Check your phone (Q)" objective. No objective shows before the text arrives. |
| Chapel door | Opening it on Day 1: "That must be the clock." |
| Candles | Lighting the fourth: "Hmm, maybe a little something extra to get the energies right." Then the chalice and crucifix objective. |
| Table set | Once both pieces are down and the clock chimes harder: "Now we're cooking." A pause, then the cross objective. |

As before, each objective after one of these thoughts waits until the
thought has cleared, plus 0.6 s. That includes the matches line after the
chapel door, which the designer didn't mention.

### PROVISIONAL (not yet ruled on)

- **Text timing.** The gate-code text arrives 6.5 s into the day. The day
  card fades at 3.2 s, when the guide appears, and the bus is out of sight by
  then. Day 2 uses the same delay, with no guide.
- **"Now we're cooking."** It comes 1.2 s after the table is set, so a couple
  of the faster chimes are heard first. The pause after it is 1.5 s, on top
  of the usual gap.
- **The altar pieces** open only once the candles thought has played: they
  show "Chalice" / "Crucifix" until the objective appears.
- **Day 1 only.** The three new thoughts are tied to Day 1 for now. Later
  days get their own lines in S3.
