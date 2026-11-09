# Happy Resting

First-person, PS1-inspired supernatural horror with ritual chores, scripted
environmental scares and a three-day story. Desktop browser game built with
TypeScript, Three.js and Vite.

**Status: S2 (complete Day 1) built, awaiting the S2 gate.** Day 1 runs
from the bus through preparing the ritual site (candles, then the chalice and
crucifix from the altar), the clock, the first delivered relic and the walk
home at dusk (D1-01 to D1-10), then resets into Day 2, which is S3.
Live build:
https://gentle-mud-09ee6761e.6.azurestaticapps.net (deploys on every push
to `main`).
See [docs/design/design-doc-v0.4.md](docs/design/design-doc-v0.4.md) for the
full plan and [docs/decisions.md](docs/decisions.md) for rulings since then.

## Run it

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests
npm run build      # type-check + production build into dist/
```

## Controls

| Input | Action |
|---|---|
| Click | Capture the mouse and start / resume |
| WASD + mouse | Move and look |
| E | Interact; also puts down a note, phone or keypad |
| Hold left click | Bless (fills the ring round the crosshair) |
| Q | Phone (re-read texts); "New SMS - Press Q" flashes top right when one arrives |
| O | Show the current objective again (it folds away after 5 s) |
| I | Inventory (pauses the game) |
| 0–9, Backspace | Gate keypad, while it's open |
| Esc | Pause (releases the mouse) |
| `` ` `` | Toggle the debug panel (on by default in dev) |

If the browser refuses to capture the mouse (embedded previews such as the
Claude app's browser pane, some iframes), the game starts anyway in
**drag-to-look** mode: hold the right mouse button and drag to look (the
left button stays free for blessing). A normal
Chrome or Edge tab captures the mouse as usual.

With the debug panel open:

| Key | Action |
|---|---|
| 1–9, 0, -, = | Teleport to a zone (listed in the panel) |
| R | Reset Day 1 to the arrival point |
| P | Cycle door presets (Day 1 start ↔ all unlocked) |
| Shift | Fast walk |

## Layout summary

Plan coordinates are metres, `x` east and `y` north, origin at the front gate.
All of it lives in [src/data/layout.ts](src/data/layout.ts).

- **South:** road and arrival strip outside the front gate; relic drop box
  set into the wall beside it.
- **Centre:** cobblestone path north to the church doors.
- **West:** garden with the holy water fountain, bench, flower beds and the
  old priest's grave; a second set of graves to the south of it.
- **East:** graveyard rows, with the tall demon-perch headstone at the south
  end, framed from the shed doorway about 40 m away.
- **North:** the church. Nave with six rows of pews each side and the altar;
  office and storage closet off the west wall; chapel off the east wall with
  the relic table just outside its door; basement door in the north-east
  corner leading to the stairs.
- **North-east:** the shed (jammed on the Day 1 preset).
- **Basement:** one storeroom under the nave with two shelf aisles.

The church layout follows
[docs/design/church-layout-draft.png](docs/design/church-layout-draft.png).

## Tests

- `tests/layout.test.ts`: church orientation (office west, chapel east),
  every door sits on a wall, the chapel has one entrance, teleports land in
  clear space in the right zone.
- `tests/collision.test.ts`: walls stop movement, no tunnelling, sliding,
  doors block when shut and clear when open.
- `tests/reachability.test.ts`: flood-fills the walkable map from the arrival
  point. Every zone is reachable with all doors open; the Day 1 preset reaches
  the nave and office but not the locked rooms.
- `tests/sightlines.test.ts`: the tall headstone is in clear view from the
  shed doorway and far away; the west garden is hidden behind the church.
- `tests/day1.test.ts`: the S1 stage tests. Gate opens only on the right
  code, the ritual needs its preconditions and the holy circle, the ghost and
  every objective fire once even when every event is spammed, and D1-01 to
  D1-10 complete in order.
- `tests/day1-s2.test.ts`: the S2 stage tests. The key objective waits for
  the note to be put down, the altar pieces stay put (and show only their
  names) until the objective asks, the table is set before the first
  blessing, the Bible comes off its stand only when wanted, the music box
  shudders again after the scripture before the second blessing, the Bible
  goes back before the music box comes away, no objective lands on top of its
  thought, the
  delivery and relic can't be taken early or two at a time, each music box
  thought fires once and in order, the two-stage blessing needs scripture
  between holds, the evening and the shift end happen once, and the Day 2
  reset puts the tools and altar pieces back while keeping the clock on the
  desk.
- `tests/controls.test.ts`: the mouse-glitch filter keeps real movement and
  drops one-off jumps; each day starts facing east with the church on the
  left.
- `tests/interact.test.ts`: lock feedback, open/close, never closing a door
  on the player.

## Known issues

- Scale is provisional and read off the drawing. Walk times are untested.
- The basement stairs are a teleport, not a modelled staircase.
- No lighting inside rooms yet; interiors use the same flat light as outside.
- Not yet checked in Edge, or at 1440p.
