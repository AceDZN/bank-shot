# Bank Shot — independent math review and playtest

Reviewer: independent math reviewer / playtester (automation only).
Reviewed: commit `d4ca0f6` plus the working tree of 26 Oct 2026, 00:45–01:00 (the lead was still editing `scene.ts` / `main.ts`; line numbers refer to that state).
Sources: `docs/handoff/BUILD_HANDOFF.md`, `docs/handoff/COMMON.md`, `GAME_IDENTITY.md`, Workbook snapshots in `docs/curriculum/`, `src/rules.ts`, `src/levels.ts`, `src/game.ts`, `src/variants.ts`, `src/main.ts`, `index.html`, `tests/*.test.ts`, and the lead's real-input captures in `docs/captures/`.
Method: hand derivation, plus throwaway scripts that drive the pure modules (`shoot`, `trace`, `Game`, `explainMiss`, `freshRoom`). `npm test`: 93/93 pass.
Scope note: nothing here says anything about fun or learning gains. Automation can't show either.

---

## 1. Authored rooms: hand derivation from what is shown

All eight `solution` values match a hand derivation. Each arc's sweep, side and label matches the true geometry (checked numerically against the winning path and the polygon).

| Room | What the player sees | Hand derivation | `solution` | Verdict |
|---|---|---|---|---|
| 1 | Ball on the bottom cushion. A carved ray from the ball at heading 50°. The 130° arc runs from that ray to the cushion on the left. "?" runs from the cushion on the right to the ray. | Adjacent angles on a straight line: 180 − 130 = **50** | 50 | Correct. The intended fact (זוויות צמודות). |
| 2 | Two gold tile lines cross at the ball (0°/180° and 35°/215°). 35° sits between the 180° ray and the 215° ray. "?" sits between 0° and 35°. | Vertical angles: **35** | 35 | Correct. The intended fact. Line extension solves it without the fact (see §3). |
| 3א | ≫ on both cushions. 55° at the first top contact T, between the top cushion (toward −x) and the ray back down the path. "?" at the ball between the bottom cushion (+x) and the path. | Alternate interior angles between parallel lines: **55** | 55 | Correct. Every contact on the winning line is 55°, and the drain sits at the 4th contact. |
| 3ב | 88° at P (bottom, right of the transversal, interior) and 92° at Q (top, left of the transversal, interior). At T: 55° between the top cushion and the path, 4° between the top cushion and a horizontal ≫ tile line through T. | Alternate interior angles differ (88 ≠ 92), so the cushions are not parallel. At T, 55 − 4 = 51 lies between the helper line and the path. Helper ∥ bottom, so by alternate angles ? = **51**. (92 − 88 = 4 also gives the lean.) | 51 | The math is correct and the lead's helper-line design is sound. Deducibility is incomplete: the bottom cushion carries no ≫, so the screen never shows that the helper is parallel to the bottom (MUST 5). |
| 4 | 70° corner at C. 45° exit at Q (between the slanted cushion toward D and the outgoing path). The helper arrival arc stays invisible until the hint. | Table rule: arrival = exit = 45. Triangle ball–C–Q: 180 − 70 − 45 = **65** | 65 | Correct. The intended fact. |
| 5 | Hexagon with equal-side ticks. Unlabelled corner arc at V1. 25° exit at Q. | Regular, so the interior angle is (6−2)·180/6 = 120. Arrival 25. Triangle: 180 − 120 − 25 = **35** | 35 | Correct, but only if the player is told the hexagon is regular (MUST 7). |
| 6 | 40° at the hack (lane vs. sight line). 75° at the house (sight line vs. the 0.45 stub toward the vane). Dashed lane continuation at the vane. "?" from the continuation to the exit. | Exterior angle = sum of the two remote interior angles: 40 + 75 = **115** | 115 | Correct. `trace` turns by `heading + turn` (`rules.ts:228`), so the turn is measured from the continuation of the lane, as the "?" arc shows. |
| 7 | Corners 100°, 110°, 120°, 95° (they match `interiorAngle` exactly). The fifth corner E is unmarked. 30° exit on wall D–E. The dial's 0° ray points at E and opens clockwise. | 540 − 425 = 115. Arrival 30. Triangle ball–E–Q: 180 − 115 − 30 = **35** | 35 | Correct. No "?" and no hint, as required. |

**Deviations from the handoff**

- **Room 5: 35°/25° instead of 50°/10°.** Mathematically identical: the same chain of polygon sum, then the table rule, then the triangle. The 10° graze would be unreadable and skims corners. In the authored 35/25 room the bounce is 0.51 from the nearest vertex and the drain 0.38 from it. The change is sound and suits grade 7.
- **Room 3ב: helper ≫ line through T with a 4° arc.** Sound, and it nests well: the 4° arc sits inside the 55° wedge, so "55 − 4" is visible. It is a two-step deduction (subtract, then alternate angles), which is fine as the twin room's challenge. It needs ≫ on the bottom cushion as well. The 88/92 pair is the handoff's, but note that 88 + 92 = 180. A student who mistakes the alternate pair for co-interior angles would conclude "parallel". The arcs are on opposite sides of the transversal, so this is about the drawing, not the numbers (NICE).
- **Room 7: arrival 30° gives the answer 35°.** Correct. But 35° is also the answer to rooms 2 and 5. "Dial the number that worked before" wins the transfer room (MUST 8).

---

## 2. Geometry truth (drawings vs. physics)

- **Bounce rule.** `reflect` is a true mirror about the cushion line. Every bounce on every winning line leaves at its arrival angle (also covered by the tests).
- **Arcs.** `RingGeometry(from, sweep)` runs counter-clockwise in table coordinates. The plane group is rotated −90° about x, so there is no mirroring. Every arc above was checked ray by ray against the cushion, the path segments and the tile lines.
- **Room 7 dial.** Since 261af95 the reversed texture puts the engraved 0 at heading 180° (toward E), and the needle at local `180 − dial` reads its own value. This is correct.
- **BUG: the protractor's engraved scale doesn't match its needle (all rooms).** `scene.ts:358` maps the disc with `py = 512/2 + 20 − …`, but the canvas centre row is `1024/2 + 20 = 532` (`textures.ts:246-248`). The texture is shifted 0.512·R downward. Only a lens of brass shows, its centre sits below the ball, and only labels from about 41° to 139° are visible.
  - Simulated: `review/protractor_as_coded.svg.png` vs `protractor_intended.svg.png`. At dial 50° the needle crosses the engraving at about "74".
  - Confirmed in the lead's capture `docs/captures/01-first-30s.jpg`: the readout says 50°, and the aim stub crosses the brass between "80" and "70". The 0° mark that the room 1 miss text points to ("מודד מהצד שמסומן 0°") is not visible.
  - Fix: `const py = 1024 / 2 + 20 - (y / R) * (512 - 12);`
- **BUG (visual): the room 6 vane blade is mirrored.** `scene.ts:807` sets `vaneBlade.rotation.y = -(h/2)`. In three.js a positive `rotation.y` turns local +x counter-clockwise in table coordinates, because table y = −world z. A mirror that turns a stone from 0° to 115° must lie along 57.5° ("/"). The code draws it along −57.5° ("\"), which would send the stone to 245°. `docs/captures/04-curling.jpg` shows "\" while the aim stub goes up-left. Use `+(h/2)`. Physics is unaffected; only the bronze device contradicts it.

---

## 3. Bypasses

### 3.1 Constant and formula strategies (all integer dials, 8 authored rooms + 200 seeds × 8 fresh rooms)

| Strategy | Authored rooms won | Fresh rooms won |
|---|---|---|
| Always 45° / always 90° | 0 / 0 | 0% / 0% (the solver enforces this) |
| **Always 35°** | **3/8: rooms 2, 5 and 7 (the transfer room)** | 5.4% |
| Best constant overall (33°) | 0 | 6.4% |
| Dial the carved number | 2, 3א | 25.7% |
| 180 − carved | 1 | 12.5% |
| 90 − carved | none | 0% |
| Try carved, then 180 − sum of carved, then sum of carved (one per stroke) | **1, 2, 3א, 4, 6 (5/8 within 3 strokes)** | not combined; the single strategies give 25–37% |

Rooms 3ב, 5 and 7 resist pattern guessing; the others yield to "try the three obvious combinations". This is inherent to one-fact rooms. Adding a distractor carving (an angle that is true but not needed) to rooms 1, 4 and 6 would break "180 − sum" and "sum".

### 3.2 Feedback correction (no math needed)

Every run shows a bounce label with the measured angle at each cushion (`main.ts:309`). In the key rooms the miss card says "hit the cushion at X°, the carved line needs Y°". A player can dial g₁, read m₁, dial g₁ + (Y − m₁), and on a second miss use the observed slope (it is always ±1).

- From 45°: 3א won on stroke 2 (45→55), 3ב on stroke 2 (45→51, beating the non-parallel trap without parallel reasoning), 4 on stroke 3 (45→25→65).
- Fresh key rooms won within 3 strokes: 45.6% starting from 45°, 57.4% starting from 60°.

Stars already reward only first strokes. A purely visual correction from the ghost's landing point (simulated with a secant on the miss distance along the drain's cushion) mostly fails within 3 strokes.

### 3.3 Restart and replay farming — MUST FIX

`Game.enter()` (`game.ts:66`) resets `strokesUsed`, `hintUsed` and `workedShown`. The pause menu's "התחלת החדר מחדש" (`main.ts:511`) and the win card's "שוב" call it. Played through the `Game` class:

- Room 3ב: 45 (miss: "hit at 49°, needs 55°"), then 55 (miss), then restart room, then 51. Result: **3 stars, logged `unaided: true`**.
- Room 6: three misses, the worked card shows 40 + 75 = 115, 115 wins 1 star, then replay with 115. Result: **3 stars, `unaided: true`**.

So the stroke limit is unlimited. Stars, `save.stars` and the "מכות ראשונות בלי רמז" count all accept post-answer replays (the count can exceed the number of rooms). This breaks COMMON.md's requirement to tell first unaided decisions from repeated successes. Fix: keep per-room attempt history for the whole run (first-visit flag, total strokes, worked seen, hint seen). Only a first-visit, first-stroke, unhinted sink counts as unaided or earns 3 stars.

### 3.4 Eyeballing

Continuous winning windows: ±1.05° (room 1), ±1.00° (2), ±0.54° (3א), ±0.66° (3ב), ±1.08° (4), ±1.42° (5), ±1.65° (6), ±0.82° (7). The aim stub is 0.42 long, so its tip moves only 4–12 mm at a window edge. Pure stub judgment is therefore unreliable. The drawings, however, hand over the line:

- **Room 1.** The 130° mark's second ray (`levels.ts:237`, now 0.75 long) and the worn line (`:240`, 0.5) lie exactly on the answer from the ball. The ray is longer than the stub, so "cover the gold ray" wins, and the readout then shows 50. The ray is unavoidable for adjacent angles, but it need not extend past the arc.
- **Room 2.** The gold crossing line ends at the ball from behind (`:287`), and the worn stub (`:288`) continues it ahead along the answer. The goal says "המשיכו את קו האריחים השבור — הוא מוביל לחור". The room as worded teaches line extension, not vertical angles.
- **Rooms 3א, 3ב, 4, 5, 7.** The carved mark's vertex is the exact first contact of the winning line, 1.45–2.09 from the ball. In 3א and 3ב, a 0.5 ray plus a 0.5 worn line at that vertex point straight back at the ball, so the target is two collinear segments. Required precision at the vertex: ±1.6 cm (3א), ±2.2 (3ב), ±3.8 (4), ±4.1 (5), ±2.1 (7). That is hard but not impossible. A human aim test (first-stroke dial error) is the only way to know. Log it.
- **Room 6.** The worn line from the house (`:606`) points exactly at the vane. Pointing the stub at the house hole (drawn radius about 7 cm at 1.73 m, about ±2.3°) is wider than the ±1.65° window. **Eyeballing is the easiest way to win this room.**

Recommendation: remove the worn "answer stubs" (`levels.ts:240, 288, 339, 406, 606`). Clip carved rays to the arc radius. Reword room 2's goal.

### 3.5 Auto-placed guard basins (`guardUnique`)

They work: without them, rooms 1, 2, 3א, 3ב, 4 and 7 have far-away integer wins. Room 1 would win at 17–19 and 170; 3א at 7, 8, 33, 42, 59 and 174; 7 at 14, 15, 70, 71 and 79–81. Side effects:

- Clutter. 3א now has 5 baths in a 4.2 × 1.4 corridor and 3ב has 4. In fresh rooms 3א has up to 6.
- Some basins sit 0.45 m from the ball and catch near-miss dials (3א: 58–60). The informative near-miss at the drain becomes a splash mid-table.
- Many baths cut into the marble cushion face. Authored: room 1's main bath reaches 0.122 past the ball-centre line, which is beyond `BALL_R`; 3ב's reaches 0.112. Fresh: room 1 in 89/200 seeds, 3א in 108/200, 3ב in 76/200.

Prefer changing ball or drain parameters, cap the number of baths at 2, and reject fresh rooms that need more.

---

## 4. Misconceptions from the handoff

| Misconception | Where it is caught | Visible consequence | Explanation |
|---|---|---|---|
| Alternate angles are equal for any two lines | 3ב, dial 55 | Pool (splash) | Circles 92° and says 88° ≠ 92°: good. But "55° עבד במסדרון הקודם" is false in fresh rooms (the previous corridor had another number) and when the room is entered directly. |
| Measuring on the wrong side of the cushion | 1 (130), 2 (145), 3א (125) | Pool | Good, specific texts. In rooms 4 (115) and 7 (145) only generic or **wrong** text appears (see below). |
| Triangle sum > 180° | 4, dial 110 (110 + 70 + 45 = 225) | Pool | "חסרה עוד זווית במשולש" is correct. It would be stronger stated as the sum (110° + 70° + 45° = 225° > 180°). Dial 115 (70 + 45, also the wrong side) gets the misleading generic text. |
| Regular hexagon interior angle is 60° | 5, dial 95 | Pool | Good: "not 60°, try (6 − 2)·180° ÷ 6". |

`explainMiss` problems:

- **Wrong cushion (MUST).** The "hit at X°, needs Y°" text uses `path.bounces[key.bounce]` whatever cushion it hit (`game.ts:172`). It quotes the angle at a **different** cushion than the carved one for 36 dials in 3א, 29 in 3ב, 63 in 4, 90 in 5 and 104 in 7. Example: room 7 dial 145 hits wall A–B at 45°, and the text reports "45°, needs 30°" while circling the 30° on wall D–E. Fix: store `key.edge` and only use the measurement when `bounce.edge === key.edge`.
- **Generic pool text teaches the wrong relation (MUST).** "בדקו שוב איזו זווית שווה לזווית החצובה" (`game.ts:184`) appears in room 1 (88 dials), 4 (37), 5 (43), 6 (35) and 7 (47). None of these relations is an equality (supplementary, triangle sum, exterior sum, polygon sum). Use the room's own rule: `factName` or a per-room line.
- **Proximity leak.** "כמעט! … עין לא מספיקה כאן" (`game.ts:190`) fires for |dial − solution| ≤ 3 (rooms 1 and 2). It tells the player they are within 3° and turns the remaining strokes into a guided search. Drop the proximity cue or make it non-directional.
- **Hints never contain the solution.** Checked for all 7 hint texts. Miss texts reveal the solution only by coincidence, when the measured arrival equals it (3ב dial 47 gives "51°"; 7 dial 30 gives "35°"). Harmless.

---

## 5. Hebrew (terms checked against Workbook)

The terms are right: זוויות צמודות, זוויות קודקודיות, זוויות מתחלפות, סכום זוויות במשולש / במצולע, זווית חיצונית, מצולע / משושה משוכלל, ישרים מקבילים, חותך. Numbers inside explanations are in `<bdi dir="ltr">`, and the captured "88° ≠ 92°" renders in the right order. Corrections, old → new:

| # | Where | Old | New | Why |
|---|---|---|---|---|
| H1 (MUST) | 3א hint | בין שני ישרים מקבילים, הזוויות בצדדים מנוגדים של החותך שוות. | בין שני ישרים מקבילים, זוויות מתחלפות שוות: שתיהן בין הישרים, בצדדים נגדיים של החותך. | As written it claims any two angles on opposite sides are equal, which is false. Workbook says "בצדדים נגדיים של החותך". |
| H2 (MUST) | game.ts:184 | ‎N° שלח את הכדור לאמבט. בדקו שוב איזו זווית שווה לזווית החצובה. | ב־N° הכדור נפל לאמבט. חזרו לכלל של החדר: {factName}. | Wrong relation outside rooms 2, 3א and 3ב (see §4). |
| H3 (MUST) | 3ב worked, both lines | הקו המנוקד (≫) | קו האריחים המסומן ≫ | The helper line is drawn solid (`kind: 'parallel'`), not dotted. |
| H4 | 2 hint | הזוויות שמול זו את זו שוות | הזוויות שנמצאות זו מול זו שוות | "מול" doesn't take "את"; Workbook: "זו מול זו". |
| H5 | 6 hint | שתי הזוויות הפנימיות שלא צמודות לה | שתי הזוויות הפנימיות שאינן סמוכות לה | Workbook's term is "הזוויות הפנימיות הלא-סמוכות". |
| H6 | 3ב misconception (55) | ‎55° עבד במסדרון הקודם, כי שם הגדות היו מקבילות. | הזווית 55° הייתה נכונה אילו הגדות היו מקבילות. | False in fresh rooms or on direct entry; also fixes number agreement. |
| H7 | 3ב hint | אז הגדה העליונה לא מקבילה. | אז הגדה העליונה לא מקבילה לגדה התחתונה. | Says what it isn't parallel to. |
| H8 | 7 misconception | הרצפה הזו לא משוכללת — לא כל הפינות 108°. | המחומש הזה לא משוכלל — לא כל הפינות 108°. | "משוכלל" describes the polygon (Workbook: מצולע משוכלל). |
| H9 | 1 misconception (90) | הקו החצוב לא עומד בניצב לגדה. | הקו החצוב לא מאונך לגדה. | Standard term. |
| H10 | game.ts:179 | הכדור פגע בגדה ב־X, והקו החצוב דורש Y. | הכדור פגע בגדה הזו ב־X, והזווית החצובה כאן היא Y. (stone rooms: האבן פגעה בקיר…) | It is an angle, not a line. Rooms 6 and 7 use a stone and walls. |
| H11 | game.ts:190, levels 3א | ‎N° לא מוביל לחור / ‎125° שולח את הכדור אחורה | ב־N° הכדור לא מגיע לחור / ב־125° הכדור נוסע אחורה | Subject–verb agreement with "N מעלות". |
| H12 | game.ts:171, main.ts title | …ונפל לאמבט / נעצר באמצע | stone rooms: …ונפלה לאמבט / נעצרה באמצע | Gender of "אבן". |
| H13 | main.ts:543 | כל אחד נבדק במחשב שיש לו בדיוק זווית אחת שנכנסת | כל אחד נבדק במחשב: רק הזווית הנכונה (בסטייה של עד 1°) נכנסת | Up to 3 integer values sink (±1°). |
| H14 | main.ts:542 | דקימוס מוריד בפניכם את הכתר | דקימוס מסיר בפניכם את הכובע | Idiom. |
| H15 | levels 5 name / goal | השולחן המשושה | השולחן המשושה המשוכלל | "Regular" must be shown (MUST 7). |
| H16 | rule chip in room 7 (stone) | הכדור יוצא מהגדה… | האבן יוצאת מהקיר באותה זווית שבה פגעה בו | Matches the room. Also "הזוויות בגדות" → "בקירות" on the room 7 win card. |
| H17 | 6 factName | זווית חיצונית במשולש | זווית חיצונית במשולש (הרחבה, כיתה ט׳) | The handoff marks it as a grade-9 extension. |
| H18 | index.html keys | זווית ±1° (Shift: ±10°) | wrap `±1°` and `(Shift: ±10°)` in `<bdi dir="ltr">` | COMMON.md LTR rule. |
| H19 | angle caption, room 2 | זווית לגדה | זווית לקו האריחים | The 0° ray is a tile line; the ball is mid-table. |

---

## 6. Fresh rooms (`variants.ts`, seeds 1–200 for each of the 8 types = 1,600 rooms)

No fallback to the authored room. Every room passes `isFair`. Labels always equal the drawn sweep, and pentagon corners are exact integers. Distinct solutions per type: 35, 33, 19, 18, 36, 10, 33 and 33. Room 5 has only 10 variants (27–37) and a 3-wide window, so replays converge on about 28–35.

| Type | Problem | Count / 200 | Worst case |
|---|---|---|---|
| 7 | c4 corner label and the arrival label overlap (< 0.22 apart) | 28 | seed 7 |
| 7 | c4 and given arcs overlap | 67 | seed 3 |
| 7 | Winning bounce within 0.25 of a vertex | 37 | 0.22 (seed 8) |
| 7 | Bath touching the house | 16 | seed 8 |
| 3ב | Lean of **2°**: a 2° sliver at r = 0.75 is 2.6 cm of arc | 70 | — |
| 3א | Winning bounce within 0.25 of a vertex (skims a corner) | 11 | **0.081** (seed 13) |
| 3א | Drain within 0.25 of a corner | 40 | **0.028** (seed 6) |
| 1 | Drain within 0.25 of a corner | 32 | **0.003** (seed 10): drain in the corner |
| 4 | Winning bounce within 0.25 of the 70° corner | 22 | 0.107 (seed 5) |
| 1 / 2 | Bath touching the drain | 4 / 4 | gap −0.024 (r2 seed 22) |
| 6 | Bath within 6 cm of the winning line | 15 | 4.9 cm (seed 12) |
| 1 / 3א / 3ב / 7 | Bath cuts into the cushion face | 89 / 108 / 76 / 21 | — |
| 3א / 3ב | 4–6 baths | 78 / 29 | — |

Add these to `isFair`:
- winning bounces and the drain at least 0.25 from any vertex
- label centres at least 0.25 apart
- bath clear of the drain by at least 0.1 and inside the cushion face
- at most 2 guard baths
- lean ∈ {4, 6}

---

## 7. Sequences played through `Game`

| Sequence | Result |
|---|---|
| Full success | 8 rooms, solution on stroke 1: 24/24 stars, 8 unaided first-stroke sinks logged. |
| Recoverable mistake (room 1) | 130 → pool, 1 stroke spent, "130° is on the other side… the protractor measures from 0°", 130° arc circled. Then 50 → 2 stars. Correct, but the 0° engraving isn't visible (protractor bug). |
| Hint (room 4) | Corner + arrival + "?" lit, triangle rule named, no number. 65 → 2 stars, `hint: true`, `unaided: false`. Correct. |
| Three misses (3ב: 55, 59, 45) | Each miss gets the right specific text (88 ≠ 92; subtract the 4°; hit at 49° vs 55°), then the worked card "55° − 4° = 51°". 51 → 1 star. Correct. |
| Soft strike | Right angle and soft → no stroke, "חלש מדי! הזווית נכונה". Wrong angle and soft → stroke spent, and the text only blames the angle ("60° לא מוביל לחור"). NICE: also say it was too soft. |
| Restart / replay farming | Gets 3 stars and `unaided: true` after seeing the answer (§3.3). **Bug.** |

Other observations:
- The star potential in the HUD agrees with `settle()`.
- Building the authored rooms with `guardUnique` took 4.8 s and fresh rooms 5.9 s. This was measured under a machine load average of about 165, so it is not representative. Measure on an idle machine; this runs on the main thread at startup and on "שולחנות חדשים".

---

## 8. Prioritized list

### MUST FIX (wrong math, wrong terms, or a bypass)

1. **Protractor scale misaligned with its needle**, all rooms. Fix `scene.ts:358`: `py = 1024/2 + 20 − …`. Confirmed in `docs/captures/01-first-30s.jpg`: dial 50 crosses "70–80".
2. **`explainMiss` quotes the arrival angle at the wrong cushion** (`game.ts:172`), for 29–104 dials per key room. Gate on `key.edge`.
3. **The generic pool text says "find the angle equal to the carved one"** in rooms whose fact is not an equality (`game.ts:184`; rooms 1, 4, 5, 6, 7). Make it per room.
4. **3א hint states a false rule** ("angles on opposite sides of the transversal are equal"). Use Workbook's alternate-angle wording (H1).
5. **3ב: the bottom cushion has no ≫** (`levels.ts:402`), so "helper ∥ bottom", which the deduction rests on, isn't shown. The worked text also calls the helper "dotted" (H3).
6. **Restart / replay resets strokes, hint and worked flags** (`game.ts:66`, `main.ts:511`). Unlimited strokes, 3 stars and `unaided: true` after seeing the answer; the end-screen first-try count is inflated.
7. **Room 5 never states "regular".** Equal-side ticks don't imply 120° angles. Put משוכלל in the name or goal, or draw equal-angle marks at every corner.
8. **"Always 35°" wins rooms 2, 5 and 7**, including the transfer room. Suggested values, checked with `isFair` (re-run the test suite after changing them): room 5 `arrive: 28` (answer 32, window 31–33) and room 7 `arrive: 27` (answer 38, window 38).

### SHOULD FIX

1. Eyeball give-aways: remove the worn answer stubs (`levels.ts:240, 288, 339, 406, 606`) and clip carved rays to the arc. Room 1's 0.75 ray covers the 0.42 stub. Reword room 2's goal. Room 6's house is easier to aim at than its window (§3.4).
2. Drop the "כמעט!" proximity cue (`game.ts:190`).
3. Vane blade drawn mirrored (`scene.ts:807` → `+(h/2)`; capture `04-curling.jpg`).
4. Fresh-room filters from §6: corner-skimming bounces down to 0.081, a drain in a corner at 0.003, overlapping room 7 labels (28/200), lean 2°, baths touching drains, baths cutting into cushion faces.
5. Guard basins: cap at 2, keep them off near-miss lines, and fix uniqueness by moving the drain or ball first (§3.5).
6. Pattern guessing ("carved / 180 − sum / sum" wins 5 of 8 rooms within 3 strokes): add a distractor carving in rooms 1, 4 and 6.
7. Feedback correction (§3.2) can't be removed without removing feedback. Log stroke-2+ wins after a key-mismatch message as "corrected", not "deduced", and don't call them unaided.
8. Room 4: give dial 115 (wrong side, or 70 + 45) a specific text, and say "110 + 70 + 45 = 225 > 180" for 110.
9. Hebrew H4–H14 and H16.
10. Measure room-build time on an idle machine.

### NICE

- H17–H19. In room 3ב, draw the 88°/92° pair so it's unmistakably alternate, since 88 + 92 = 180 invites a co-interior misreading.
- On a soft wrong strike, mention the power too.
- Replace the weak test "±4° wins at most 3 of 9" with tests for the real bypasses (restart farming, constant 35, wrong-cushion explanation, labels apart, vertices clear).
- Room 5 replays have only 10 variants.

---

Review scripts (throwaway, not part of the repo): `/private/tmp/claude-501/-Users-acedzn-idea-plotter/29d063ee-768c-41b4-a1e5-58c0a30c1f0d/scratchpad/review/`

| Script | What it does |
|---|---|
| `r1.ts` | Geometry dump, windows, basins |
| `r2.ts` | Strategies and secant correction |
| `r3.ts` | Eyeball cues |
| `r4.ts` | 200-seed fresh-room scan |
| `r5.ts` | Same checks on the authored rooms |
| `r6.ts` | `Game` sequences and every miss message |
| `r7.ts` | Wrong-cushion check |
| `r9.ts` | Alternative numbers for rooms 5 and 7 |
| `protractor_*.svg.png` | Protractor UV simulation |
