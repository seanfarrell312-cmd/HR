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

## 2026-11-10 — Gate-code text, automatic gate, one text at a time

Designer rulings:

| Topic | Ruling |
|---|---|
| Gate-code text | "Afternoon! I forgot to mention, the gate code is 4173. Your instructions should be in my office. Just hang a left once you get into the church." |
| Front gate | Opens when the code is entered, then shuts itself after 10 seconds. |
| Keypad sticker | A label pasted above the keypad screen: "Caution: gate is automatic and closes after 10 seconds". |
| Phone | Only the newest text shows. Each new one replaces the one before. |

### PROVISIONAL (not yet ruled on)

- **Every opening.** The gate shuts itself 10 s after any opening, including
  when it's opened again by hand with E later in the day. That matches the
  sticker. Once the code is in, the gate stays unlocked for the rest of the
  day.
- **No closing on the player.** If the player is standing in the gateway
  when the 10 s are up, the gate waits and shuts as soon as they step clear.
- **Paused** (inventory open), the countdown stops, like the other timers.
- **No sound** for the gate closing yet. One can come with the audio pass.
- **Walk home.** The end-of-day check covers the area just inside the gate,
  so the shift still ends at the gate without opening it.

## 2026-11-13 — Thought subtitles easier to read

| Topic | Ruling |
|---|---|
| Thought text | The protagonist's thoughts must be clear enough that the player notices and reads them as they appear. The thin italic Courier was too hard to read. |

### PROVISIONAL (not yet ruled on)

- **Look.** Bold Verdana (Tahoma or Segoe UI as fallbacks), 30 px, warm
  white with a hard black outline on a translucent dark band, plus a short
  fade-and-grow as each thought appears. Other HUD text keeps the Courier
  look for now.

## 2026-11-13 — Delivery text, church doors shut themselves

| Topic | Ruling |
|---|---|
| Delivery text | "Heads up. I just got an alert that someone just dropped something off. It should be in the drop box out by the front gate. Head over there and grab it. Once you're done with it, leave it on the table outside the chapel." |
| Church doors | Shut themselves 10 seconds after opening, so the player can't see outside while in the church. |

### PROVISIONAL (not yet ruled on)

- **Copy fixes.** In the supplied text, "It should in the dropbox" became
  "It should be in the drop box", and "your done" became "you're done".
  "Chapel" is lower-case, as elsewhere.
- **Church doors** follow the gate's rules: 10 s after any opening, the
  countdown pauses with the inventory, and there's no closing sound yet.
- **Swing area.** Both auto-closing doors (gate and church) now wait while
  the player stands anywhere their leaves would sweep through, on either
  side of the wall, not just in the doorway itself. That way a leaf never
  passes through the player.
- **No sticker** on the church doors, and no warning.

## 2026-11-13 — Easter-egg note behind the church (appended to S2)

| Topic | Ruling |
|---|---|
| Stool | Outside, against the church's north wall, between the church and the perimeter wall. Brown like the church doors, with a square top on four legs, half the Bible stand's height (0.55 m). |
| Note | Lies on the stool and reads like the office note. It's available any time on Day 1 and Day 2, and the text is the designer's "Hey friend, My name is Seanologues…" message. |

### PROVISIONAL (not yet ruled on)

- **Which wall.** The stool is against the nave's north wall (y = 67.4),
  at x = −4, west of the stair annex. The annex juts a little further
  north on the east side, but it's the stair room, not the church proper.
- **Copy fixes.** "its" became "it's", "ive" became "I've", and the double
  space was dropped. The text is split into paragraphs: the greeting, the
  first part, "If you really want something extra, how's this:", then the
  last part. No signature was added.
- **No story effect.** Reading it changes nothing: no flag, objective,
  thought or sound. It works with full hands and on every day, not just
  Days 1–2, because nothing removes it.
- **Size.** The seat is 45 cm square and 5 cm thick, on 5 cm legs.

## 2026-11-13 — S2 approved; S3 begins

The designer approved the S2 gate (complete Day 1). Work moves to S3,
complete Day 2 (doc 6.2, 9.1). Deferred to the texture pass: the blocks
above each door opening should take their wall's colour or material
instead of the fixed darker grey.

## 2026-11-13 — S3 part 1: Day 2 start, the garden chalice, relic 1

The designer chose (2026-11-13): placeholder relics picked by Claude, draft
copy for Claude to write and the designer to revise, Day 2 delivered in three
playable parts with a playtest after each, and the doc's recommendation for
the two-handed blessing (M05: crucifix in the right hand, holy-water rod in
the left, Bible on its stand in front).

Part 1 covers D2-01 to D2-04. After the first relic is put away the
objective reads "End of S3 part 1. The clown doll comes next."

### PROVISIONAL (not yet ruled on)

- **Relic 1 is a china teacup on its saucer.** It's a placeholder until the
  designer names it. While possessed the cup hops and clinks on its saucer
  in short fits. It's drawn 1.7× life size so it reads on the tables.
  Relic 3 will be a placeholder too, chosen in part 3.
- **All Day 2 copy is draft.** That covers the office note, the delivery
  text ("First one of the day just came in. Drop box by the front gate, same
  as yesterday.") and these thoughts:
  - Altar: "The chalice is gone. One of those lingering ghosts, I bet."
  - After the prank: "Very funny."
  - Drop box: "Is that... rattling china?"
  - Pickup: "A teacup that won't sit still. Somebody's nan is going to miss
    this."
  - Its ghost: "Another happy customer."
- **Shift start.** Day 2 has no gate-code text. The first objective ("Enter
  the code on the gate keypad") shows at the same moment the Day 1 text
  would, 6.5 s in. The gate code is unchanged.
- **Day 1-only beats.** The church-approach thought, the chapel-door thought,
  the candles thought and "Now we're cooking." don't repeat on Day 2.
- **D2-01 runs straight through:** gate, note, key, chapel, matches,
  candles.
- **The missing chalice (D2-02).** Only the crucifix is on the altar. Coming
  within 4 m of the altar once the candles are lit gives the missing-chalice
  thought, then "Find the missing chalice", with no hint of where. Taking
  the chalice from the west garden bench makes the prankster pop up behind
  the bench, tongue out, with a raspberry. It floats off west and fades
  over 2.8 s, then "Very funny.". (Superseded 2026-11-14: the chalice now
  stays hidden until "Find the missing chalice" shows.)
- **The prankster** is the same green sheet ghost with a pink tongue for the
  raspberry. Its expression art is for the S3 gate review (doc 9.1).
- **First delivery (D2-03).** The text arrives 5 s after the table is set.
  The crucifix comes off the altar once the candles are lit.
- **Teacup ritual (D2-04).** Put it on the table, take the Bible from its
  stand and read it scripture (hold, in the circle), then take the cross and
  bless it (hold). There's no rattle, as befits a "simple successful
  cleansing". After the ghost and its thought: Bible back, pick up the cup,
  put it on the cleaned-relic table.
- **The cleaned-relic table** has three places, one per Day 2 delivery: the
  middle first, then either end.
- **Holds on small relics.** With a relic on the ritual table, aiming at the
  table counts as aiming at the relic, so a small or rattling relic can't
  slip out from under the crosshair mid-hold. This applies on Day 1 too.
- **Clock.** From Day 2 on, the clock is always on the supervisor's desk.
- **Debug key N** (debug panel open) skips to the start of Day 2, for
  playtesting S3.

## 2026-11-14 — S3 part 1 playtest: garden layout, two thoughts, hidden chalice

Designer rulings after playtesting part 1. The prankster jump scare works
well and stays as it is.

- **Gate-code thought (Day 2).** Once the first objective ("Enter the code on
  the gate keypad") folds away, the thought "Good thing I remembered the
  gate code: 4173." plays. (Designer copy; spelling tidied.)
- **Office clock thought (Day 2).** The first time the office door opens on
  Day 2: "Huh, the clock does look nice in here."
- **West garden** follows the designer's concept layout: hedges on the
  north, west and east sides, a small ornate fence along the south with a
  gateway in the middle, a gravel path from the gateway to a gravel circle
  around a hexagonal fountain, a long bench down each side, and the old
  priest's lone grave outside the east hedge. The chalice is at the north end
  of the east bench, where the east hedge hides it from the main path.
- **The chalice stays hidden** (not drawn, and it can't be taken) until
  "Find the missing chalice" shows.

### PROVISIONAL (not yet ruled on)

- **Sizes.** The garden is 17 m × 10.5 m outside the hedges (x −38 to −21,
  y 49 to 59.5). Hedges are 1.2 m thick and 2.2 m tall, so they block the
  view at eye height. The fence is 0.9 m, with 1.2 m posts either side of a
  2 m gateway. The fountain basin is 3 m across and 0.8 m high, with a
  spout; the gravel circle around it is 4.8 m. The benches are 6 m long.
- **The gateway is an open gap**, with no gate to open, so the bucket trips
  in parts 2 and 3 have no extra door.
- **The flower beds are gone**; the concept didn't have them.
- **The lone grave** sits about 2 m east of the east hedge, with its
  headstone at the north end of the plot and the office's blank west wall
  about 3 m beyond.
- **The prankster** now pops up between the east bench and the hedge and
  drifts north, up and over the north hedge, instead of west.
- **Gate-code timing.** The thought plays 5.5 s after the objective shows,
  just after its 5 s on screen. It's skipped if the gate is already open.
- **The office clock thought is Day 2 only.**
- **Debug teleport 0** now lands just inside the garden gateway, facing the
  fountain.

## 2026-11-15 — S3 part 1 playtest 2: searching the church for the chalice

Designer rulings (all copy is the designer's; spelling and apostrophes
tidied):

- **Walk up to the church (Day 2):** "Definitely getting my steps in.",
  using the same trigger as Day 1's first-impression line.
- **Day 2 office note** replaced with the designer's text, from "Great job
  yesterday!" to "Good Luck!". The three lines about lingering spirits are
  run together as one paragraph.
- **At the altar:** "Here's the crucifix, but no chalice." Then "Put the
  crucifix on the ritual table".
- **Search the church (D2-02).** Once the crucifix is on the table:
  "Search the church for the chalice (0/3)". The three checks can be done
  in any order:
  - Step behind the office desk: "I don't think the chalice would fit in
    these drawers."
  - Try the storage closet door: "Locked tight. I hope it's not in there."
  - Try the basement door: the same line.

  Both doors stay locked. After the third, "I guess it's outside
  somewhere?", and only then is the chalice on the garden bench.
- **The scare.** "JESUS!" plays with the scare, not after it. Then "Harmless,
  huh? I almost had a heart attack.", then "Gotta stay focused, back to the
  chapel.", then "Place the chalice on the ritual table". "Very funny." is
  gone.
- **Table set:** "There. All set.", then the delivery text, which now reads
  "FWD: A package has been delivered to your drop box. Thank you for using
  Christ-LERTS."
- **The teacup's ghost** wears a big black handlebar mustache (in place of
  the smile) and a gold monocle on a chain over its left eye, per the
  designer's reference. Its thought: "I guess he must have really liked
  tea."
- **Road hedge fix.** The hedges beside the road ended on the perimeter
  wall's centre line, so their end faces sat flush with the wall's north
  face and flickered through it from inside the grounds. They now stop
  inside the wall. A test checks that no two different-coloured walls share
  a face plane.

### PROVISIONAL (not yet ruled on)

- **"Behind the desk"** means anywhere in the strip between the office desk
  and the office's west wall.
- **The locked doors count only during the search**, and only the first try
  of each. Before the search, or once a door has been checked, it just says
  "It's locked."
- **After the "outside" thought** the objective reads "Search the grounds for
  the chalice".
- **No sign-off.** The Day 2 note has no "— Supervisor" line, as the
  designer's text had none.

## 2026-11-16 — S3 part 1 playtest 3: nudges, crucifix and teacup lines

Designer rulings (designer copy; spelling and apostrophes tidied):

- **Dawdling outside (Day 2).** Timed from the gate opening, when "Read the
  note on the office desk" shows. If the player still hasn't been inside the
  church:
  - at 60 s: "These grounds are really pristine."
  - at 120 s: "Maybe I'll just hang out here all day."
  - at 180 s: "I should head inside."

  Stepping into the nave stops them.
- **Day 2 note:** "move onto the other side" is now "move on to the other
  side".
- **At the altar:** "Here's the crucifix, but no chalice..."
- **Picking up the crucifix (Day 2):** "I guess I'll drop this off first,
  then look for the cup." Then "Put the crucifix on the ritual table".
- **Basement door during the search:** "Locked. I'm kinda glad I don't have
  to go down there." The closet keeps "Locked tight. I hope it's not in
  there."
- **Search nudge.** After 30 s with no new place checked: "I should check
  all the rooms. Maybe the other doors are opened?" It repeats after each
  further 30 s with no progress, three times at most.
- **Closing the Christ-LERTS text:** "Christ-LERTS? Nice.", then the
  drop-box objective.
- **Teacup lines:**
  - At the drop box: "Sounds like... rattling china?"
  - On pickup: "A bouncing teacup? It's a wonder it hasn't shattered."
  - Nearing the church doors with it: "I should hurry, this thing's about to
    bounce outta my hands." This uses the same trigger as the music box's
    "Man, this thing's annoying" line, 17 m from the doors.
- **Mustache:** the curled tips sit further forward of the face, so they no
  longer sink into the body.

### PROVISIONAL (not yet ruled on)

- **Between the altar thought and picking up the crucifix**, the objective
  reads "Fetch the crucifix from the altar".
- **Search nudge timing.** The 30 s starts when the crucifix goes down and
  restarts with each place checked. The three nudges are counted over the
  whole search, and they stop once all three places are checked.
- **"Inside the church"** for the dawdling thoughts means anywhere in the
  nave past the doors.

## 2026-11-18 — S3 part 1 playtest 4: search checklist, sealed church

Designer rulings:

- **Office clock thought (Day 2):** "That clock really does look nice in
  here."
- **The church is sealed during the search.** From the crucifix going down
  until "Search the grounds for the chalice" shows, the church doors won't
  open from inside. Trying them gives "I need to find the chalice. Maybe the
  other doors are unlocked?" (designer copy, with "chalice" in lower case as
  elsewhere).
- **Search checklist.** The objective now reads "Search the church for the
  chalice", with no 0/3 count. A checklist stays on screen under it: "Check
  the office", "Check the storage closet", "Check the basement". Each item is
  crossed off as it's done. It stays up, all crossed off, through "I guess
  it's outside somewhere?", and goes when the grounds objective shows.
- **The mustache** is rebuilt as one tapered shape per side, from the middle
  out to the curl. It's wrapped onto the ghost's face and lifted clear of it
  along the surface, so the curls run on from the rest and sit outside the
  body from every angle.
- **Script review export.** `docs/script-review.md` lists every thought (in
  play order, with when it plays), text, note, the Bible page and the short
  reminders, each with an ID and a Proposed column. It's generated from the
  game's data with `npm run export-script`, and a test keeps it current.

### PROVISIONAL (not yet ruled on)

- **"Check the office"** is still crossed off by stepping behind the desk,
  as ruled on 2026-11-15, not just by entering the office.
- **Getting back in.** The doors still open from outside, so a player
  dropped outside (a debug teleport) can get back in.
- **The checklist's look.** It uses the objective's dark box with a gold
  edge, and done items go grey with a tick and a line through them.
