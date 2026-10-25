# Visual review — mockups vs the real game

Targets: [`docs/visual-targets/`](visual-targets/) (ChatGPT gpt-image, 1672×941, 25 Oct 2026; prompts in [`PROMPTS.md`](visual-targets/PROMPTS.md)). They are design targets, not evidence.
Actual: [`docs/captures/`](captures/), captured by `tests/browser-capture.mjs` in Chrome (Playwright, GPU) at the same 1672×941 viewport, driven by real keyboard / mouse / pointer input and stepped with `window.advanceTime` so each capture is a reproducible game state. Mobile captures are 390×844.

## 01 — first 30 seconds (room 1) · [target](visual-targets/01-first-30s.png) · [actual](captures/01-first-30s.jpg)

| Aspect | Target | Actual | Verdict |
|---|---|---|---|
| Camera | 3/4 view from the player's side, ~45°, table fills ~75% of width | Same view, pitch 47°, table framed between x −0.6…0.9 NDC so Decimus has the left edge | Match |
| Table | Raised peach marble cushions, teal mosaic, gold border bands, amphora + laurels in the centre, drain grate at a corner | All present, procedural; drain on the right cushion (where the true path ends) instead of a corner | Match (drain placement follows the math) |
| Protractor + aim | Big brass half-disc on the ball, short glowing aim stub | Brass half-disc (r 0.42 m), 1° ticks, numbers every 10°, short stub | Match |
| Carved angles | 130° arc on the left of the cue line, "?" arc on the right | Same; arcs drawn outside the protractor so they aren't covered | Match |
| HUD | Pause/sound + stroke balls + 3 stars top-left; laurel plaque "חדר 1 · הגדה הישרה" + fact chip top-right; lamp hint button right edge; bottom panel −/50°/+ and round "הכה (לחיצה והחזקה)" with ring meter | All present in the same places. Extra: the table-rule chip under the fact chip, and a goal banner for the first seconds | Match + additions the brief required |
| Character | Decimus leaning on a column at the left | Rigged Tripo Decimus standing at the left edge, idle loop | Close: no lean-on-column pose (no such preset); he stands |
| Set pieces | Plunge pool + lion fountain right, columns and candles behind | Plunge pool with glow, Tripo lion fountain, Tripo columns, Tripo oil lamps on the cushions, steam sprites | Partial: at this camera the pool sits at the right edge and the colonnade mostly falls outside the frame |
| Lighting | Warm, saturated candlelight, deep shadows, bloom on flames | Warm key + hemisphere, point lights at two lamps and the pool; no bloom pass | Weaker: our image is flatter and less saturated than the painting-like target |

## 02 — mid-play on the hexagon · [target](visual-targets/02-mid-play.png) · [actual](captures/02-mid-play.jpg)

| Aspect | Target | Actual | Verdict |
|---|---|---|---|
| Moment | Ball mid-flight near the drain, glowing path with arrows, angle labels at the cushion hits, "הילוך איטי" badge | Captured during the slow-motion last bounce: glowing run line, the measured angle (25°) pops at the cushion hit, "הילוך איטי" badge, camera pushed toward the drain | Match |
| Numbers | Target shows 50° / 10° | Game uses 35° / 25° (see CURRICULUM.md deviations) | Intended difference |
| Character | Decimus cheering at the left | Decimus out of frame during the push-in (he is placed for the resting camera) | Gap |
| Motion blur / speed lines | Strong radial blur | None (would hurt readability and reduced-motion) | Intentional |

## 03 — failure moment · [target](visual-targets/03-failure.png) · [actual](captures/03-failure.jpg)

| Aspect | Target | Actual | Verdict |
|---|---|---|---|
| Consequence | Ball splashes into the big plunge pool beside the table | Ball drops into a round bath basin set into the table (the baths are part of the table so the bounce engine owns them), splash particles and a *plop* | Different staging, same beat |
| Ghost path | Dotted white path with arrows | Dashed white ghost with arrowheads, stays until the next strike | Match |
| Explanation card | Top-centre card with a mini diagram and "שוב" | Top-centre card: title "פלופ! לתוך האמבט", one-line explanation naming the adjacent angle and the protractor's 0° side, "↻ שוב" | Match, minus the mini diagram. We deliberately did **not** copy the target's "you chose the wrong angle!" headline |
| Highlight | Gold glow on the 130° arc | Pulsing gold ring around the 130° label (the mark the explanation names) | Match |
| Character | Facepalm | Tripo AI "facepalm" clip plays on a splash; the "frustrated" preset on a plain miss | Match |
| Stroke tokens | One ball greyed | One ball greyed, stars drop to 2 | Match |

## 04 — curling room · [target](visual-targets/04-curling.png) · [actual](captures/04-curling.jpg)

| Aspect | Target | Actual | Verdict |
|---|---|---|---|
| Camera | Low, along the lane | Standard 3/4 view rotated 12°. The lane view made the triangle (40°, 75°, the vane) unreadable at phone size, so readability won | Intentional deviation |
| Stone | Granite stone with bronze handle | Tripo curling stone | Match |
| Vane | Bronze post with a blade and a 115° arc | Bronze post + blade that rotates to the bisector of the turn, protractor at the vane, "?" arc measured from the continuation of the lane (dashed) | Match |
| Triangle | 40° and 75° carved at the far end | 40° at the hack, 75° at the house, gold sight line between them | Match (layout follows the real geometry) |
| House | Drain-like ring at the far end | Terracotta/cream/teal rings around a small drain; ring size matches the real capture radius so it doesn't promise a bigger target than it is | Match |
| HUD | "סיבוב הפלטה"-style caption, curling-stone tokens | Caption "סיבוב הפלטה", stone-coloured tokens | Match |

## Mobile (390×844 portrait) · [aim](captures/08-mobile-aim.jpg)

Portrait screens look along the table's long side (camera yaw −90°), so the table is about twice as large as a straight landscape framing would give. Labels turn with the camera. The HUD collapses: smaller plaque, rule chip hidden, lamp moved above the panel.

## Remaining honest gaps

1. Lighting is flatter than the targets (no bloom / colour grade); the hall behind the table is mostly out of frame at the gameplay camera.
2. Decimus doesn't lean on a column and leaves the frame during the slow-motion push-in.
3. The failure splash happens in an in-table basin, not the big side pool.
4. No mini diagram in the explanation card; the worked explanation after three misses is text plus the equation.
