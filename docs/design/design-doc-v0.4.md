<!-- Converted from Happy_Resting_Game_Design_Document_v0.4.docx. The .docx is the source of truth. -->

CANONICAL WORKING DESIGN

# HAPPY RESTING

Game Design Document  |  Version 0.4  |  2 November 2026

First-person, PS1-inspired supernatural horror with ritual chores, scripted environmental scares, and a three-day story.

Prepared from the original three-day narrative, monastery map sketch, and completed Design Decision Workbook v0.3. This is a planning document, not a claim that gameplay has been implemented or tested.

Original ground plan: south entrance and relic drop box, central path, west garden, east graves, northern church and chapel, northeast shed. Scale is conceptual.

| Document purpose Preserve the decisions already made, translate the story into a testable gameplay specification, clearly identify unresolved details, and define the S0-S7 build sequence. Publication to redguygreenguy.com remains outside the present development scope. |
|---|

### Status and authority

| Status | Meaning |
|---|---|
| LOCKED | Explicit answer or accepted suggestion in the completed workbook. Preserve unless changed by the designer. |
| PROVISIONAL | Implementation recommendation necessary for planning; requires confirmation or validation. |
| OPEN | User did not finalize the decision, or two answers require reconciliation. |
| NOT BUILT | No segment has yet passed an implementation or QA gate. |

## 1. Executive design baseline

| Dimension | Current direction |
|---|---|
| Genre | Single-player first-person chore/walking-simulator supernatural horror; no combat, death or chase AI. |
| Structure | Three consecutive shifts: Day 1 = two cleansings; Day 2 = three; Day 3 = one final cleansing. |
| World | One connected monastery grounds environment reused across all days and horror states. |
| Core action | Retrieve haunted items, stage ritual tools, stand in a holy circle, perform hold-to-bless actions, store cleansed items. |
| Tone | Friendly sheet ghosts establish safety; repetition gives way to dread, a dramatic demon encounter and a playful ending. |
| Player | Unnamed junior priest with brief subtitled thoughts; held props may appear without arms except when needed. |
| Supervisor | Absent for most of game, lightly comedic senior/head priest; appears as simple low-poly figure at ending. Father Pother is a possible, unconfirmed name. |
| Platform | Desktop mouse/keyboard browser prototype, TypeScript-based 3D approach; Chrome and Edge, 1080p/1440p, stable frame rate priority. |
| Delivery | Local end-to-end playable build first, website deployment later. |

## 2. Confirmed continuity and narrative rulings

| Workbook ID | Canonical ruling |
|---|---|
| C01 | Three days with 2 / 3 / 1 cleansings. The summary line calling three routine cleansings “Day three” is a typo. |
| C02 + C07 | Finale follows the detailed barricade-break, demon-lunge and white-light banishment. No roof destruction. The glowing bowl/dagger replaces the earlier “sigil of light” idea. |
| C03 | The demon and cute red horned ghost are the same entity. After banishment, the box is blessed normally, rattles and pops open, releasing the little red sheet ghost. This is intentional comic relief and could be reconsidered in playtests. |
| C04 | All friendly ghosts survive or are restored. At departure the player may look back to see the recognizable little ghosts smiling and perhaps holding a “Thank you” banner, then fade to credits. |
| C05 | The supernatural transformation is confined to the grounds within the gate. The supervisor sees apparently normal conditions outside and cannot enter until the entity is banished. |
| C06 | The shed is initially jammed. Day 3 allows a scripted force-open action, without a complicated explanation. |
| C08 | Destroyed church and chapel doors and the disturbed grave remain damaged after the environment returns to normal. Paranormal weather and vegetation revert. |
| C09 | Recurring ghosts: prankster (raspberry / fart noise), laughing clown ghost, angry ghost and serious/worried ghost. Other green-sheet spirits are generic smiling ghosts. |

## 3. Story, player and communication

### 3.1 Story premise

The player is a junior priest assigned to cleanse relics delivered to a small church. The ritual sequence is routine on the first day, more involved on the second, and violently ineffective on the third when a plain brown box arrives. The priest and supervisor must improvise an ancient rite to send away the demonic presence. The cleaned box is then filed away using the normal routine, and the exhausted priest resigns.

### 3.2 Daily framing

- At the beginning of every shift: short fade/day title, arrival near gate, gate interaction, office note and chapel preparation.

- The notes are on the supervisor/head priest’s desk and establish the assignment. They can also lightly foreshadow a supernatural disturbance.

- A distinct SMS alert announces each delivered relic. Delivery is staged one at a time to create journeys between the chapel and drop box.

- When a landline conversation is required, the office phone rings and the player goes there. The initial Day 3 outbound call/dialing mechanics are still OPEN (see decision log).

- The protagonist’s reactions are primarily subtitled thoughts. Subtitle-only supervisor dialogue is the baseline until voice work is approved.

- At shift end the player exits the front gate; day transition resets staff-used supplies and removes finished relics from the completed-items table.

### 3.3 Lore and supernatural rules

- The brown box is visually unremarkable and its origin is unknown to all characters. Do not add a known delivery backstory without approval.

- Lesser ghosts are benevolent, expressive sheet spirits that can linger and play tricks after cleansing.

- Demons differ from ordinary spirits. The required OLD SCHOOL book explains why ordinary methods fail and introduces the blood-offering rite.

- The old priest’s grave holds the ornate bowl and silver dagger. The worrying ghost’s repeated attention to this grave is a visual clue, not a mandatory clue-reading puzzle.

- The demon’s localized influence corrupts lighting, plants, birdsong, sightlines and doors inside the gate, while the supervisor’s outside view remains normal.

- The final red horned ghost is the same demon, now presented in the familiar post-exorcism form; the emotional intent is relief and a humorous final beat, not a reveal of a separate captive spirit.

### 3.4 Dialogue and humor

Retain the warm-to-silly-to-dread tonal arc, the demon’s phone threat, the protagonist’s defiant “Back to Hell Bealza-bitch!” line, and the final “I quit” gag as reference dialogue. Exact subtitle copy, timing and final farewell framing remain to be polished. The supervisor’s optional name “Father Pother” is not yet canon.

## 4. Level blocking and map

### 4.1 Exterior layout

| Zone | Blocking and gameplay function |
|---|---|
| Front gate + drop box | Southern edge. Arrival and keypad tutorial. Outside deposit slot visible; inside retrieval access used once SMS arrives. Gate used for shift endings. |
| Central path | Straight cobblestone route north to church; primary orientation axis and a reliable return route in later atmospheric states. |
| West garden + graves | Peaceful planted feature and holy water fountain. Day 2 prank chalice, concerned ghost near old priest grave; Day 3 digging and red-flower changes. |
| East graveyard | Open headstones seen from shed; Day 2 lingering ghosts; Day 3 northern centered headstone carries distant crouched demon silhouette. |
| Northeast shed | Jammed early. Force-open during Day 3 to fetch axe and shovel. Shivering green ghost and later hostile ghost-snatching effect. |
| Church north end | Hub connecting nave, chapel, office, closet and basement. Large ornate front doors become axe-breached in Day 3. |

### 4.2 Church interior

- Main nave has an altar, three rows of pews and a central aisle from the front doors.

- Office/library and storage closet share one side of the nave; chapel is on the opposite side. The cleaned-relic table is immediately outside the chapel door.

- A basement access door sits behind the altar, described in the workbook as the nave’s northwest corner.

- The chapel is windowless, has a single entrance, a clear sightline from that door to the work table at its far end, and a small supply table by its entrance.

- The ritual work area includes fixed item placement sockets, a marked holy circle, candle positions and a Bible stand.

- Basement is one rectangular storeroom with alternative routes. Shelf swaps change traversal on Day 3 without requiring a separate level.

| OPEN: room-side contradiction L01 confirms the original sketch, which places office/closet to the LEFT/WEST and chapel to the RIGHT/EAST when approached from the southern gate. L02 describes office/closet on the “east” side and chapel on the “west” side. For planning, adjacency and the original sketch remain authoritative, but compass-facing labels must be confirmed before S0 room placement. |
|---|

### 4.3 Visibility and set-piece placement

From the northeast shed doorway the player can see east headstones and the northernmost, centrally framed headstone silhouette. The west grave/fountain is concealed behind the church mass. The old priest’s grave is near the west garden so it can be approached closely during water-fetch chores. Keep the church as the occluding body between the shed and west-side events.

### 4.4 Spatial rules

- Early shed and basement/closet access restrictions are narrative locks, not optional puzzle paths.

- The player is free to explore accessible spaces but cannot complete later objectives ahead of time.

- No required item is placed in a permanently inaccessible state by a scripted door or scare.

- Dramatic changes should exploit repeat travel on known routes rather than introduce a maze.

- All route distances and precise dimensions remain provisional until S0 walk-time testing.

## 5. Player inputs, items and rituals

### 5.1 Input and feedback contract

| Input | Rule |
|---|---|
| WASD + mouse | Movement and look for desktop browser; no controller requirement in the initial build. |
| E | Contextual interaction with doors, props, ritual sockets, phone and notes. |
| Primary click / hold | Perform a contextually available ritual action; use a short visible circular progress meter while held. |
| Escape | Pause / menu. |
| Center reticle | Show short actionable verbs and feedback when the target is locked, out of reach or not ready. |
| Holy circle | Ritual actions require the player within the marked circle so scripted camera framing and target visibility are predictable. |

### 5.2 Item handling

- One large physical prop held at a time. On pickup, show it near the bottom edge of the screen; the scripted hand/side depends on the action.

- Relics, bucket and other chore objects are placed at specific sockets. Place action removes the handheld item and activates its staged world prop.

- Keys, bowl, dagger and some other quest items are acquired as invisible inventory flags when convenient. Do not require free-form inventory management.

- The bulky OLD SCHOOL book may receive an authored carry animation or can be abstracted for convenience; no final art/animation requirement yet.

- Tools return to authored day-specific positions at the start of each day. Completed relics are removed between shifts to imply that staff have cleared them.

- Resources, matches and holy water are theatrical requirements, not scarce currencies. Never softlock the player by exhausting them.

### 5.3 Ritual mechanics

| Ritual | Prerequisites and visible result |
|---|---|
| Clock blessing | Day 1 candles lit, crucifix in hand, player standing in the holy circle. Hold action stops clock, triggers cheerful green ghost once. |
| Standard relic blessing | Relic in chapel socket, chalice and crucifix staged, player in ritual position. Crucifix hold causes rattle; scripture/cross follow-up releases spirit. |
| Holy-water blessing | Filled bucket placed at assigned chapel socket; holy-water rod activated by contextual ritual action with Bible implied. |
| Two-handed blessing | Bible on stand between player and table; crucifix shown in right hand, holy-water rod as other prop (specific visual arrangement provisional). Hold action with fixed trigger duration; angry spirit released. |
| Failed brown-box attempts | Known actions show no successful animation or sound; they progress intended “failed attempt” flags and lead to lights/phone failure. |
| Final blood rite | Dagger, bowl, book, box and other required props staged. Interacting with offering area plays short non-graphic slice/splash cue, changes bowl and one visible hand to glowing/bandaged blood-rite state. |
| Demon banishment | After barrier disruption, one clear EXORCISE prompt. No timed failure and no death. Scripted lunge, line delivery, light and restoration. |
| Final ordinary blessing | Place/revisit brown box, hold crucifix action, box rattles, opens and releases cute red horned ghost; store the empty box to complete standard shift routine. |

### 5.4 Safeguards against softlocks

- Every objective completes on a specific validated interaction, not just on approaching the general area.

- The same ritual completion can fire once even under spam clicks, hold release, menu pause or repeated entry to the zone.

- If the player attempts a later tool or placement prematurely, display a short, non-blocking reminder rather than consuming it.

- No cinematic scare traps the player behind a door unless the script guarantees a corresponding exit or rescue.

- If interaction sequences must run through animation, advance to the next event only after the animation’s completion callback; retain retry/recovery behavior.

## 6. Objectives and scripted narrative flow

The IDs below are stable planning identifiers. During implementation each should map to explicit state flags plus scene triggers. Dialogue is described by intent unless exact wording was already supplied. “One-shot” means the outcome never duplicates within that run.

### 6.1 Day 1 | Routine and reassurance

| ID | Required action | Outcome / reveal |
|---|---|---|
| D1-01 | Arrive by bus; read code; operate gate keypad | Tutorial for movement, looking and interacting. Drop box shown but not collectable. |
| D1-02 | Cross peaceful grounds; open ornate church doors | Introduce route, garden, eastern graves, shed and nave. |
| D1-03 | Read office note; take chapel key | Supervisor instructs first easy clock cleansing. Other utility rooms remain inaccessible. |
| D1-04 | Enter chapel; use matches to light candles | Chiming mantel clock becomes agitated as candles light. |
| D1-05 | Use crucifix in holy circle on clock | Chime cuts out; friendly green ghost rises, smiles and vanishes. |
| D1-06 | Carry clock to office desk socket | Clock becomes set dressing, reinforcing that routine work improves the site. |
| D1-07 | Retrieve altar chalice; stage chalice and crucifix | Ritual table becomes ready. |
| D1-08 | Respond to SMS; retrieve first delivered relic | Return trip to gate/drop-box interior. |
| D1-09 | Place relic; perform cross, then scripture/cross | Rattle, settle, winking green ghost. |
| D1-10 | Store relic outside chapel; leave grounds | Sky has changed to evening when the player emerges; fade to Day 2. |

### 6.2 Day 2 | The friendly things begin behaving oddly

| ID | Required action | Outcome / reveal |
|---|---|---|
| D2-01 | Read note; recover key; prepare chapel | The supervisor says released ghosts may linger, prank and wait to pass on. |
| D2-02 | Find chalice on west garden bench | Prank ghost appears with a raspberry/fart sound and floats away. |
| D2-03 | Stage chalice, cross and candles; collect relic 1 | Establish familiar routine. |
| D2-04 | Scripture and cross on relic 1; store it | Simple successful cleansing. |
| D2-05 | Collect clown doll and try ordinary ritual | Doll laughs and dances; standard method insufficient. |
| D2-06 | Collect storage key; open closet; take bucket and rod | New chore/tool combination introduced. |
| D2-07 | Fill bucket at garden fountain; use water ritual | Clown falls still; laughing ghost departs. Store doll. |
| D2-08 | Respond to third SMS; approach drop box | Laughing clown ghost reappears drifting among graves. |
| D2-09 | Bring relic 3; refill bucket in west garden | Serious/worried ghost stares at old priest’s grave and disappears on return look. |
| D2-10 | Attempt cross and holy water on relic 3 | More violent rattling and upset squeaks. |
| D2-11 | Put Bible on stand; perform two-handed blessing | Little angry/frowning spirit emerges. Store relic. |
| D2-12 | Return through gate at end of shift | Player sees laughing ghost playfully chase angry ghost among graves. |

### 6.3 Day 3 | The exception becomes the entire job

| ID | Required action | Outcome / reveal |
|---|---|---|
| D3-01 | Read final supervisor note | Only one expected relic; warning about recent activity; basement key available. |
| D3-02 | Descend basement; find chalice at far shelf | Lights fail; distant thunder begins after pickup. |
| D3-03 | Fill holy water at west garden fountain | Sky shifts from pleasant blue to grey but birds continue. |
| D3-04 | Collect plain brown box after SMS | Birdsong stops. Serious ghost near graves watches player silently. |
| D3-05 | Stage box and try known cleansing actions | Cross, water, two-handed sequence produce no recognizable reaction. |
| D3-06 | Attempt to contact supervisor | Thunder blows candles out; cell signal fails. Player needs office landline/light. |
| D3-07 | Reach office landline and contact supervisor | Supervisor reports normal weather and says he is on his way. |
| D3-08 | Return toward chapel | Chapel door slams shut just before player enters; deep laugh heard. |
| D3-09 | Call supervisor again | He is outside the gate but cannot enter; directs player to retrieve axe. |
| D3-10 | Turn from office phone; go outside | Clawed hand slips from doorway. Graveyard fills with crows; sky darkens. |
| D3-11 | Force open shed; retrieve axe | Friendly green ghost hides trembling in a corner. |
| D3-12 | Return toward church | Long-limbed silhouette on northern east-grave headstone evaporates; church doors slam. |
| D3-13 | Break church doors and chapel door with axe | Box has disappeared from ritual table. |
| D3-14 | Call supervisor from office | Directed to ancient OLD SCHOOL book; call cuts off before demon identity is said. |
| D3-15 | Find book in altered basement | Fallen shelves change path; door slams and traps player. |
| D3-16 | Read OLD SCHOOL book at basement table | Demons are different from ghosts; blood offering required. |
| D3-17 | Investigate basement-door knock | Green ghost opens door, winks and departs; phone rings. |
| D3-18 | Answer office phone | Supervisor names old priest grave containing bowl/dagger; gate still blocked. |
| D3-19 | Hear demon override phone connection | Threat establishes direct antagonist. |
| D3-20 | Travel to shed for shovel | Outside is blood-red with withered trees. Friendly ghost dragged into black smoke. |
| D3-21 | Go to old priest’s west-side grave; dig | Blooming red, blood-like flowers and lightning; obtain bowl and silver dagger. |
| D3-22 | Follow prankster ghost’s sound in graveyard | Demon hand snatches prankster; missing box left at that location. |
| D3-23 | Collect box and return through black fog | Visibility reduced but route remains traversable and church air clears. |
| D3-24 | Barricade chapel breach with overturned table | Demon pounds against protection. Prepare final ritual components. |
| D3-25 | Stage book, box, bowl, chalice, cross and dagger | All required props present; player learns offering instruction. |
| D3-26 | Interact with dagger/offering area | Short slice/splatter; bowl and player’s ritual hand glow. |
| D3-27 | Turn to barricade and choose EXORCISE | Demon lunges, player delivers line, entity dissolves in white light. |
| D3-28 | Bless now-still brown box with cross | Box rattles, opens and releases little red horned ghost that winks. |
| D3-29 | Store cleansed box in ruined church | Door damage and dug-up earth remain; weather and garden recover. |
| D3-30 | Walk across grounds to supervisor at gate | Supervisor asks what happened; player tells him they quit. |
| D3-31 | Push gate and look back | Recurring green ghosts are happy and safe, possibly with thank-you banner; fade and credits. |

## 7. Atmosphere, scares and visual states

### 7.1 Environment state sequence

| State | Trigger | Required changes |
|---|---|---|
| BASE_DAY | Days 1, 2, and start of Day 3 | Bright sky, birdsong, thriving garden, quiet cemetery and ordinary lamps. |
| D1_EVENING | Day 1 second relic completed | Visible dusk/evening on leaving chapel; preserve peaceful mood. |
| D3_OVERCAST | Day 3 basement chalice acquired | Grey sky and thunder approaching; no rain required. Birds still chirp. |
| D3_SILENCE | Day 3 brown box collected | Birdsong stops. Serious ghost tracks player’s movement. |
| D3_CROWS_DARK | After chapel shutdown and office calls | Darkened interior, grave crows, ominous laughter, door and hand effects. |
| D3_RED_SKY | After demon threat / retrieval instructions | Blood-red sky, altered thorny vegetation, crows, red spill light. |
| D3_BLACK_FOG | After obtaining ritual items and box | Smoke/fog occludes long views but never makes required interactions unreachable. |
| RESTORED | After demon banished | Daytime, birds, gardens and trees return; physical damage and dug grave remain. |

No rain particles are currently approved. The L07 answer contains one stray mention of “same rain” for Days 1 and 2 despite explicitly saying no rain is planned. Treat this as an editorial ambiguity only, not a direction to add rain. See open register.

### 7.2 Scare sequencing rules

- The emotional curve rises from humorous surprise on Day 2 to quieter unease, then to clearly supernatural threat on Day 3.

- Major events are triggered once by progression and collision/interaction thresholds, not by random AI.

- A peeking shape may be missed by an inattentive player, but mandatory story events cannot be skipped or stranded.

- The antagonist can be shown as distant dark silhouette before its fully scripted final appearance; use one claw asset with different animations for wall reach and ground grab.

- Ghosts may be simple billboards when popping from relics but should support low-poly model movement and expression during environmental scenes.

- Avoid static-image scream stingers. The Day 2 prank can be primarily sound with a small ghost appearance. Horror should emerge from changed expectations and locations.

- There is no player death, combat, persistent stalking AI, timed ritual fail condition or loss-based retry in the baseline.

### 7.3 Creature and ghost presentation

Recurring ghosts are lime-green, gently glowing, low-poly sheet-like characters with green mist and simple dark eyes/mouth. The prankster, clown-laughing, angry and worried individuals need readable expressions or sound signatures. The demon is long-limbed, clawed and mostly obscured until the final lunge. Its claws recur in distinct grab/retract effects. The cute final ghost is RED with devil horns, visually matching earlier sheet-ghost grammar.

### 7.4 Audio and access

Audio inventory must include clock chimes, rattle, cheerful release cues, raspberry/fart noise, clown laughter, angry squeaks, bird loops, crows, thunder, phone SMS, landline ring, door impacts, claw movement, demon laughter/threat, axe hits, book handling, digging, ritual effects and final chime.

| OPEN: detailed audio state map (H05) The workbook marks H05 checked, but the answer field still contains the default “Select this text...” prompt. Exact ducking, music/silence transitions and stinger placement have not been decided. Create a cue-by-state chart during S1/S3/S4 and approve it before final audio polish. |
|---|

Mandatory subtitles. Include sound volume options; reduced-flash option if dramatic flashes are used; optional movement sway/head-bob adjustment if sway is implemented. A low camera-shake approach is preferred.

## 8. Implementation architecture (proposed, not engine code)

### 8.1 Single deterministic objective runner

Implement one shared scene with immutable objective definitions, explicit event IDs, and a predictable transition function. Scenic objects bind to active objective states rather than independently advancing the whole story. This is a proposed architecture for Codex/Claude Code, consistent with accepted T06.

| System | Contract |
|---|---|
| State store | Tracks current day, objective ID, completed objectives, once-fired scares, environment state, held prop and quest inventory flags. |
| Interaction resolver | Center raycast selects eligible target; validates zone, stage, distance and prerequisite flags; returns readable failure reason. |
| Objective sequencer | Completes objective once and activates next only after required event/animation confirms success. |
| Ritual driver | Checks circle placement, staged tools and hold progress; emits predictable one-shot ghost or failure effects. |
| Prop/socket manager | Stages source item in inventory/hand, removes source copy, places target copy into a defined anchor. |
| Scare director | Spawns and despawns scripted models/sounds based on objective flags and spatial thresholds. |
| Environment controller | Applies a state preset for lighting, sky, birds, crows, fog and flora without duplicating scenes. |
| Conversation/UI | Shows notes, SMS, telephone subtitles, journal/task text, gate keypad and pause overlays. |
| QA/debug tools | Shows current state; can restart or jump to developer states; logs event IDs, prerequisites, and duplication errors. |

### 8.2 Event lifecycle

Use a consistent objective lifecycle: LOCKED -> AVAILABLE -> ACTIVE -> COMPLETING -> COMPLETE. One-shot scare lifecycle: ARMED -> FIRED -> CLEARED. A specific item is either AT_SOURCE, HELD, QUEST_STORED, AT_SOCKET, or CONSUMED/REMOVED; no item may exist in two active places at once.

### 8.3 Illustrative state keys

day_index; objective_id; chapel_key_owned; chapel_access_unlocked; candles_lit; chalice_staged; crucifix_staged; ritual_circle_inside; held_prop_id; bucket_filled; box_ritual_attempts; chapel_sealed; axe_owned; church_door_breached; chapel_door_breached; old_school_book_read; dagger_owned; bowl_owned; demon_banished; red_ghost_released; supervisor_gate_scene_complete; fired_scares[]; environment_preset.

These identifiers are suggested implementation names, not additional gameplay requirements. Names can change as long as the behaviors and tests remain traceable.

### 8.4 Checkpoints / chapters

LOCKED intent: checkpoints at every day start, with interest in up to three chapter entry points within Day 3. OPEN implementation detail: whether progress is persisted in browser storage or only offered as a chapter-select menu. A browser game can have local-only state without a back-end, but the design must still define what a mid-day resume restores. See T05 in the register.

## 9. Segment-based creation and testing plan

Each segment is an additive implementation in one repository. No stage is recorded as ready, implemented, or tested solely because the narrative questions were answered. Stop at each gate for user approval and regression. Website deployment is a future separate work package.

| Stage | Slice | Key test / approval focus |
|---|---|---|
| S0 | Walkable monastery greybox | Walk gate -> church -> all accessible rooms; door blocking works; no fall-through; debug reset and zone/objective display. Confirm L01/L02 compass mismatch, rough map scale and basic travel comfort. |
| S1 | Arrival and first clock exorcism | Gate only opens on correct code; ritual only after required preconditions; ghost/objective completes once; UI spam does not duplicate state. Approve movement and interaction feel, clock animation/audio and first ghost response. |
| S2 | Complete Day 1 | Run Day 1 start to end with no debug commands; out-of-order retrieval safe; ghost and evening swap happen once; correct Day 2 reset. First formal vertical-slice sign-off; approve chore pacing. |
| S3 | Complete Day 2 | Three ordered deliveries; refills never strand; clown ritual completes; worried ghost scene in right place; next-day reset stable. Evaluate whether repeated walks are interesting vs tedious; approve ghost expression art. |
| S4 | Day 3: routine breaks | Preset transitions correct even after backtrack; failed ritual feedback unambiguous; light and phone reachable; player stays outside chapel after slam. Approve tonal switch and landline sequence. |
| S5 | Day 3: failed containment | Axe exists when needed; ruined doors remain traversable; altered basement navigable; rescue always opens door; scares one-shot. Approve peeking scare visibility and basement blocking. |
| S6 | Day 3: climax and closure | Quest items each unique; fog route clear enough; final prereqs checked; restoration and damaged doors consistent; ghosts survive in farewell scene. Approve cutscene pacing, effects, finale humor and ending. |
| S7 | Polish and release QA | All stages replay from start and supported chapter points; no input loss; subtitles/visuals match; Chrome/Edge 1080p/1440p performance acceptable. Release readiness in local build only; explicitly approve separate website publishing later. |

### 9.1 Segment scope and expected deliverables

#### S0 | Walkable monastery greybox

Build: S0 core layout, all connections, collision, placeholder doors, debug movement/state panel.

Tests: Walk gate -> church -> all accessible rooms; door blocking works; no fall-through; debug reset and zone/objective display.

Stage gate / decisions: Confirm L01/L02 compass mismatch, rough map scale and basic travel comfort.

#### S1 | Arrival and first clock exorcism

Build: Gate keypad, office note/key, chapel, candle interactions, holy circle, clock blessing, first green ghost, clock placement.

Tests: Gate only opens on correct code; ritual only after required preconditions; ghost/objective completes once; UI spam does not duplicate state.

Stage gate / decisions: Approve movement and interaction feel, clock animation/audio and first ghost response.

#### S2 | Complete Day 1

Build: Chalice staging, drop-box SMS and retrieval, second blessing, finished-items table and shift ending.

Tests: Run Day 1 start to end with no debug commands; out-of-order retrieval safe; ghost and evening swap happen once; correct Day 2 reset.

Stage gate / decisions: First formal vertical-slice sign-off; approve chore pacing.

#### S3 | Complete Day 2

Build: Garden chalice, prank, storage key, bucket/rod/fountain, clown, third relic, worried/angry ghosts, shift ending.

Tests: Three ordered deliveries; refills never strand; clown ritual completes; worried ghost scene in right place; next-day reset stable.

Stage gate / decisions: Evaluate whether repeated walks are interesting vs tedious; approve ghost expression art.

#### S4 | Day 3: routine breaks

Build: Basement chalice, altered sky/birds, brown box, failed rituals, candle blowout, cellphone loss, office phone, chapel seal.

Tests: Preset transitions correct even after backtrack; failed ritual feedback unambiguous; light and phone reachable; player stays outside chapel after slam.

Stage gate / decisions: Approve tonal switch and landline sequence.

#### S5 | Day 3: failed containment

Build: Claw hand, shed, axe, silhouette, breached doors, missing box, altered basement, OLD SCHOOL book, friendly ghost rescue.

Tests: Axe exists when needed; ruined doors remain traversable; altered basement navigable; rescue always opens door; scares one-shot.

Stage gate / decisions: Approve peeking scare visibility and basement blocking.

#### S6 | Day 3: climax and closure

Build: Demon phone threat, red sky, ghost snatches, grave/shovel, ritual items, black fog, barricade, blood rite, demon, red ghost, supervisor, credits.

Tests: Quest items each unique; fog route clear enough; final prereqs checked; restoration and damaged doors consistent; ghosts survive in farewell scene.

Stage gate / decisions: Approve cutscene pacing, effects, finale humor and ending.

#### S7 | Polish and release QA

Build: Replace placeholder assets, tighten dialogue/audio/lighting, options, chapter/checkpoint support, browser performance and regression.

Tests: All stages replay from start and supported chapter points; no input loss; subtitles/visuals match; Chrome/Edge 1080p/1440p performance acceptable.

Stage gate / decisions: Release readiness in local build only; explicitly approve separate website publishing later.

### 9.2 Standard regression routine

- Run from a clean start and every implemented checkpoint/chapter boundary.

- Spam interactions, look away mid-animation, open pause/menu, retry holds, and attempt locked tools in the wrong order.

- Backtrack after each major scare and verify every one-shot effect stays completed.

- Check that there is only one instance of each carryable quest prop, with defined source and socket states.

- Compare task UI, dialogue/subtitles, sound and target positions for consistency.

- Run lower-performance desktop settings and confirm keyboard/mouse focus, camera and loading behave.

- Log defect with segment ID, objective ID, build/commit, reproduction steps, expected vs actual result and screenshot.

- No scope expansion until a failed previous-stage regression is fixed or explicitly waived.

## 10. S0 initial coding-agent handoff (draft)

| S0 is preparable, not yet signed off The remaining compass-label conflict and room scale are small but real blocking questions for final geometry. Codex/Claude Code may still start a clearly provisional blockout using the original sketch as the sole visual reference, provided code and scene coordinates stay editable. |
|---|

### 10.1 Allowed tasks

- Create a new TypeScript desktop-browser 3D prototype in a source-controlled repository, with one navigable monastery scene and basic HUD/debug display.

- Implement WASD walk, pointer-lock mouse look, simple collision, crosshair, E interaction, Escape pause and reliable release/reacquisition of mouse capture.

- Construct low-poly primitives for gate, central path, garden, east graves, shed, church/nav, chapel, office, closet and basement.

- Block door access according to a test config, and provide developer-mode teleport/start presets to inspect each zone.

- Use a data file for room anchors, interactable IDs and story state without scripting Day 1 scenes yet.

- Provide a README with run commands, controls, layout summary, tests and a short known-issues list.

### 10.2 Explicit exclusions

- No detailed textures, models or ghost/demon animation.

- No ritual progression, story dialogue or scare scripting beyond door feedback stubs.

- No persistent saves, backend, login or website deployment.

- No refactoring into a different engine without approval or a demonstrated blocker.

### 10.3 S0 pass/fail checklist

- [ ] Load locally in Chrome and Edge without compile errors or missing assets.

- [ ] Walk from gate to church and each intended interior/exterior zone with correct collisions.

- [ ] Confirm a single coherent south-to-north orientation; no wrong-side office/chapel doors.

- [ ] Show lock feedback; closed doors physically block and opened doors do not trap camera.

- [ ] Debug HUD shows current zone and state; developer reset returns to the arrival point.

- [ ] Performance is visibly stable at common desktop resolutions; collect measurements later in QA.

- [ ] No regression on controls after tab switching, pause/unpause and pointer-lock loss.

## 11. Open decisions and contradictions

This register is deliberately short and does not reopen already answered questions. Items tagged OPEN must not be quietly converted into locked behavior by a coding assistant.

| Priority / ID | Remaining question | Recommendation (not accepted) |
|---|---|---|
| S0 BLOCKER \| L01/L02 | The sketch puts office/closet west and chapel east; text calls office/closet east and chapel west. Which orientation is correct? | Use visual sketch for first blockout and confirm compass terms before layout sign-off. |
| S1 \| N05 | How does Day 3 initial outgoing landline call work alongside the “ringing before calls” rule? Is the emergency number dialed via keypad? | Make first call player-initiated, later callbacks ring. Re-readable number in office note. |
| S1/S3 \| M05 | Exactly how are right-hand crucifix, left-hand water rod and Bible stand represented during two-handed ritual? | Render right crucifix, left rod and Bible on stand; test clarity in first-person view. |
| S3/S4 \| H05 | Sound/music state table is not filled despite checked box. When do birds, crows, silence, phone, musical drones and stingers start/stop? | Create cue matrix per environment preset. Keep loud stingers rare. |
| S4 \| L07 | One mention of “same rain” conflicts with the explicit no-rain-particles ruling. Were Days 1/2 intended to have any rain? | Interpret Days 1/2 as fair-weather only unless corrected. |
| S6/S7 \| T05 | Day-start and up to 3 Day-3 chapters desired; whether progress auto-persists locally or chapter select alone is undecided. | Prototype deterministic chapter start snapshots, then decide localStorage persistence after playtest. |
| S6 \| C03 | The final red ghost is the same demon and the normal blessing is deliberate; remains eligible to cut if playtests find it redundant. | Keep in first complete story cut and evaluate only after playable finale. |
| POLISH \| N04 | “Father Pother” is suggested, not confirmed as canonical supervisor name. | Use generic SUPERVISOR speaker label until script lock. |
| POLISH \| C04 | Final thank-you sign/banner staging is flexible: ghosts at gate vs end-card. | Use gate look-back with group as first staging; decide title card at credits pass. |
| POLISH \| N07 | Exact final line/subtitle wording and performance timing are not finalized. | Use provisional supplied wording and record dialogue IDs. |

## 12. Document change control

Locked decisions come from the completed workbook; narrative flow comes from the original story notes. This document is an organizing interpretation of those sources, not a replacement for the originals. Corrections should cite the relevant question or objective ID (for example, L02 or D3-22). When a source is ambiguous, keep its decision OPEN and do not infer new lore or mechanics.

Proposed next approval gate: review the five highest-leverage implementation decisions (L01/L02 orientation, N05 outgoing phone behavior, M05 two-handed prop view, H05 audio states and T05 checkpoints) and explicitly approve S0 scale/room placement. At that point S0 can be handed to an AI coding assistant as an independent bounded task.
