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
