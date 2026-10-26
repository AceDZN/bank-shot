# Bank Shot — מכת גדה

A web 3D trick-shot game for Hebrew-speaking grade-7 students. Billiards and curling in a candle-lit Roman bathhouse: the aim line is short, so you read the angles carved into the mosaic, deduce the one you need (adjacent, vertical, alternate angles, triangle and polygon sums, the grade-9 exterior angle), set the brass protractor and watch the bank shot drop in slow motion. Curriculum: Workbook grade 7 chapter 9 (angles), extension grade 9 chapter 7 (exterior angle). See [`CURRICULUM.md`](CURRICULUM.md).

Stack: TypeScript, Vite, Three.js. No backend, no accounts, no analytics, nothing fetched at runtime (fonts and models are bundled).

## Run

```bash
npm install
npm run dev        # http://localhost:5213
npm test           # rules, rooms, game state, fresh rooms
npm run build      # static build in dist/ (relative base, works offline)
npm run preview    # http://localhost:4213
npm run capture    # real-browser playthrough + screenshots (needs npm run dev)
```

Deep link: `?level=N` opens table N (1–8).

## Controls

| | Desktop | Touch |
|---|---|---|
| Set the angle | ← / → move the needle (Shift: 10°), ↑ / ↓ ±1°, or drag on the table | − / + (hold to repeat), or drag on the table |
| Strike | Hold Space, release (longer = harder) | Hold "הכה", release |
| Hint | H, or the lamp | the lamp |
| Again / next | R / Enter | card buttons |
| Pause | Esc / P | ⏸ (sound, reduced motion, restart, rooms) |

## What's implemented

- 8 authored tables (rooms 1–7, room 3 has a parallel twin and a non-parallel trap), all solvable, each with exactly one sinking angle ± what the drain's width allows (computed). Transfer room 7 has no hints and no "?" marker.
- Pure rules in `src/rules.ts` (bounce engine), `src/levels.ts` (room builders, authored numbers, Hebrew texts), `src/game.ts` (strokes, stars, hints, explanations, learning log), `src/variants.ts` (fresh solver-verified tables). The scene (`src/scene.ts`) only renders what these compute.
- Misses leave the full path as a ghost, the measured angle at every cushion, a gold ring on the mark where the reasoning split, and a one-line explanation; three misses open a worked explanation. Wrong answers produce consequences (the bath, a near miss), never a "wrong!" card.
- Rigged Tripo Decimus (idle, cheer, facepalm, frustrated), Tripo curling stone, lion fountain, columns and oil lamps; procedural table, mosaic, arcs, protractor and drains.
- Slow-motion last bounce, sparkles, splash, camera push-in, synthesized sound (no audio files), ambience.
- Replay: "שולחנות חדשים" after the last room generates fresh numbers for every room type; each table is kept only if the solver proves it fair.
- Hebrew RTL HUD with numbers in LTR spans, Rubik bundled. Mute, pause, reduced motion. Portrait phones get a camera along the table's long side.
- Test hooks: `window.render_game_to_text()` and a deterministic `window.advanceTime(ms)`.
- Local-only learning log in `localStorage` (`bank-shot-log-v1`).

## Planned / not done

- Picking the cue position along the rail (the spot is fixed per table so the angle is unique).
- A cue model (the Tripo budget went to redoing the oil lamp).
- Bloom / colour grading to match the mockups' painterly light.
- Playtests with students (fun and learning are unverified).

## Deploy to Vercel

The build is a plain static site.

1. Import [`AceDZN/bank-shot`](https://github.com/AceDZN/bank-shot) in Vercel (framework preset: **Vite**).
2. Build command `npm run build`, output directory `dist`.
3. No environment variables.

Or from the CLI: `npx vercel --prod` in the repo root (after `vercel login`). Not deployed yet.

## Docs

[`GAME_IDENTITY.md`](GAME_IDENTITY.md) · [`CURRICULUM.md`](CURRICULUM.md) · [`ASSETS.md`](ASSETS.md) · [`PLAYTEST.md`](PLAYTEST.md) · [`progress.md`](progress.md) · [`docs/VISUAL_REVIEW.md`](docs/VISUAL_REVIEW.md) · [`docs/MATH_REVIEW.md`](docs/MATH_REVIEW.md) · [`docs/handoff/`](docs/handoff/)
