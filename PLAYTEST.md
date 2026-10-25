# Playtest and verification — Bank Shot

What was checked, how, and what wasn't. Automation can show that the game works and that the math is consistent; it cannot show that the game is fun or that students learn. Neither has been tested with students.

## Automated (repeatable)

- **Unit tests: `npm test`, 105 passing.** They cover:
  - the bounce rule (equal angles);
  - angle sums;
  - each authored table's handoff number;
  - that only the deduced angle (± the drain's computed width) sinks each table;
  - that constant strategies (45°, 90°, any single value across the run) miss;
  - that every listed misconception misses with a text;
  - soft strikes;
  - that carved angles sit where the true line meets the cushion, and drawn arcs match their labels;
  - the non-parallel trap (55° misses, 51° sinks, 88°/92° marks, a real 4° lean);
  - the regular hexagon's 120° corners;
  - the exterior angle (115° sinks, 65° goes in the bath);
  - the transfer pentagon (corners 100/110/120/95/115, no hint, no "?", no 115° label);
  - no carved ray longer than its arc, and no "worn" answer stubs;
  - generated tables: fair, readable geometry, numbers that vary;
  - game state: stars, hints, worked explanation, the run-long room history (restarting doesn't reset misses or hints), the `corrected` and `replay` log flags, dial snapping and locking;
  - miss explanations that only quote the measured angle on the carved cushion and never say "almost".
- **Real-browser playthrough: `npm run capture`** (Playwright driving Chrome with the GPU on, against the dev server). Input is real keyboard, mouse and pointer events; time is stepped with `window.advanceTime`. Captures go to `docs/captures/` and the log to `docs/captures/capture-log.txt`. Covered:
  - title → play;
  - room 1 at 130° (bath, explanation, stroke spent), then retry at 50° (slow-motion drop, win card, 2 stars);
  - the hexagon mid-roll in slow motion;
  - the hint in 3א;
  - the 3ב trap at 55°;
  - the curling vane at 115°;
  - a full run of all 8 tables by keyboard (all sink, 3 stars each, end screen);
  - mouse-drag aiming (lands on the aimed 35°);
  - Esc pause and room restart;
  - mobile portrait 390×844 with touch: tapping + and holding the strike button sinks room 1;
  - real-time FPS;
  - console errors.
- **Independent math review:** [`docs/MATH_REVIEW.md`](docs/MATH_REVIEW.md). Every answer was re-derived by hand from what is drawn, and the drawings were checked against the geometry. Its eight MUST FIX items were applied:
  - protractor texture alignment;
  - the wrong-cushion explanation;
  - per-room rule text instead of "find the equal angle";
  - the 3א hint wording;
  - ≫ on the 3ב bottom cushion;
  - restart farming;
  - "regular" shown in room 5;
  - room 5 and 7 numbers, so "always 35°" no longer wins three tables.

  SHOULD FIX items applied:
  - answer stubs removed and rays clipped;
  - no "almost" cue;
  - the vane blade direction;
  - fairness filters for generated tables;
  - at most 2 guard basins, kept off the near-miss lines;
  - `corrected` logging;
  - room 4 texts for 110° and 115°;
  - Hebrew H1–H16.

## Measured

- **FPS:** 60 (the vsync cap) at 1280×720, 1920×1080 and 390×844 in headless Chrome on an Apple M2 Max (ANGLE Metal) in one run; a later run of `npm run capture` read 43 fps at 1280×720 while other crews were building on the same machine. Not measured on a phone.
- **Build:** `dist/` is 3.3 MB; the JS bundle is 770 kB (204 kB gzipped); models total about 1.6 MB.
- **Startup room generation:** about 35 ms per table on this Mac, measured with a script outside the browser. The reviewer's 4.8 s was measured under a load average of about 165.

## Played by hand in the built-in browser

- Room 1: aimed with the keyboard and sank at 50°. Missed on purpose at 130°: the ghost path, a ring on "130°", Decimus's facepalm, and the explanation card.
- Hint lamp in 3א.
- Every table's layout and labels at 1280×720 and 375×812. Portrait uses the camera along the table's long side.
- RTL check: in the explanation card, the degree sign renders to the right of the number (measured with DOM ranges).

## Known limits and open risks

- **Eyeballing is reduced but not removed.**
  - In room 1, the 130° arc's ray lies on the answer line from the ball, which is inherent to adjacent angles; it is now clipped to the arc.
  - In rooms 3א, 3ב, 4, 5 and 7, the carved mark sits where the true line first meets a cushion, so aiming the short stub at it is a possible strategy. It needs ±1.6–4 cm precision 1.5–2 m away.
  - In room 6, the house is visible by necessity.
  - Only first-stroke logs from real players can show how often this happens.
- **Correction by difference.** After a miss, the card and the cushion labels show the measured angle, so a player can adjust by the difference without the rule. Such sinks are logged as `corrected`, not `unaided`.
- **Pattern guessing.** "Try the carved number, then 180 − sum, then the sum" can win some tables within three strokes. Distractor carvings were not added.
- **Visuals.** See [`docs/VISUAL_REVIEW.md`](docs/VISUAL_REVIEW.md): the lighting is flatter than the mockups, Decimus leaves the frame during the push-in, and the failure splash happens in in-table basins.
- **Untested:**
  - real phones and tablets;
  - Safari and Firefox;
  - screen readers (the HUD has labels; the 3D table has no text alternative beyond `render_game_to_text`);
  - the 6–10 minute length (estimated, not timed with players).
