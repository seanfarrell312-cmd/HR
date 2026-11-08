# Happy Resting — working rules

First-person, PS1-inspired supernatural horror chore game. Browser prototype in
TypeScript + Three.js, built with Vite, tested with Vitest.

## Sources of truth

- `docs/design/Happy_Resting_Game_Design_Document_v0.4.docx` is canonical.
  `docs/design/design-doc-v0.4.md` is a readable conversion of it.
- `docs/decisions.md` records rulings made since the doc. It overrides the doc
  where they conflict.
- Items the doc marks **OPEN** must not be quietly turned into locked
  behaviour. Pick the doc's recommendation as a provisional default, say so,
  and log it in `docs/decisions.md`.

## Build sequence

Work proceeds in segments S0–S7 (doc section 9). Each segment stops at a gate
for the designer's approval. Do not start the next segment's features until
the current gate passes.

Current segment: **S1 — arrival and first clock exorcism.** S0 approved
2026-11-08.

## Deployment

Every push to `main` runs `npm test` and `npm run build` in GitHub Actions and
deploys `dist/` to Azure Static Web Apps (workflow in `.github/workflows/`).
The live site is what the designer playtests, so `main` must always be
playable. Push only when the designer asks.

## Code layout

- `src/data/` — plain data: layout (rooms, walls, doors, props, zones,
  teleports), door presets, story state keys. No Three.js imports.
- `src/world/` — `collision.ts` and `zones.ts` are pure logic (tested);
  `build.ts` turns layout data into Three.js meshes.
- `src/player/` — first-person controller (pointer lock, WASD, interaction ray).
- `src/state/` — game state store.
- `src/ui/` — HUD, crosshair prompt, pause overlay, debug panel.
- `tests/` — Vitest. Logic that can be tested without a browser should be.

Plan coordinates: metres, `x` = east, `y` = north, origin at the centre of the
front gate. Three.js position is `(x, height, -y)`; use `toWorld()` in
`src/data/layout.ts` rather than converting by hand.

## Commands

- `npm run dev` — local dev server
- `npm test` — unit tests
- `npm run build` — type-check and production build

Run `npm test` and `npm run build` before committing.
