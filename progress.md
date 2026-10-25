# Progress

## 2026-10-25/26 — build crew (lead + visual/Chrome builder + math reviewer)

- Repo created locally with the handoff in `docs/handoff/` and Workbook snapshots in `docs/curriculum/`. **Creating the public GitHub repo `AceDZN/bank-shot` was blocked by the session's permission check** ("create public surface"); everything is committed on local `main` and waits for the user's go-ahead to publish.
- `GAME_IDENTITY.md` written; ChatGPT gameplay mockups (4) generated in the user's Chrome → `docs/visual-targets/`.
- Pure bounce engine and 8 authored tables with builders; an automatic guard puts small basins on long detours so only the deduced angle sinks each table. 93 unit tests.
- Tripo: rigged Decimus (Mixamo; idle, cheer, clap, AI facepalm, frustrated), curling stone, lion fountain, column, oil lamp. 220 credits, nothing bought. No cue model.
- 3D scene, HUD per the mockups, hold-to-strike, ghost paths with measured cushion angles, focus ring + explanation on misses, hint lamp, worked explanation after three misses, slow-motion last bounce, synthesized sound.
- Portrait camera along the table's long side; labels kept clear of cushions and the protractor.
- Fresh solver-verified tables for replay.
- Real-browser playthrough script (`npm run capture`): all 8 tables sink at the deduced angles by keyboard; mistakes, hint, trap, mouse-drag aiming, pause/restart, mobile touch.
- `docs/VISUAL_REVIEW.md`, `CURRICULUM.md`, `README.md`.

## Next

- Apply the math reviewer's findings (`docs/MATH_REVIEW.md`).
- Publish to GitHub once the user approves; Vercel deploy only on request.
- Student playtests.
