# Curriculum map — Bank Shot (מכת גדה)

Source of truth: Workbook (math.workbook.co.il), Israeli Ministry of Education curriculum. Module snapshots used while building are saved in [`docs/curriculum/`](docs/curriculum/) (fetched 25–26 Oct 2026).

**The table's rule is a game rule, not curriculum:** a ball (or stone) that hits a cushion leaves at the same angle it arrived (ideal elastic bounce, no spin, no friction curve). The HUD states it in every billiard room. All the curriculum work is deducing the angle you need from the angles carved in the floor.

Every number below is checked by `tests/rules.test.ts` against the pure engine in `src/rules.ts` / `src/levels.ts`.

| Room | Workbook module | Skill practiced | Given → needed | Misconception the room catches (what happens) |
|---|---|---|---|---|
| 1 · הגדה הישרה | [grade-7/chapter-9/adjacent-angles](https://math.workbook.co.il/grade-7/chapter-9/adjacent-angles), [angle-types](https://math.workbook.co.il/grade-7/chapter-9/angle-types) | זוויות צמודות: two angles on a straight line sum to 180° | 130° carved on the far side of the cue line → **50°** | Measuring on the wrong side of the cushion: dialling 130° sends the ball the mirror way into the bath. The explanation names the adjacent angle and the protractor's 0° side. |
| 2 · אריחים מצטלבים | [grade-7/chapter-9/vertical-angles](https://math.workbook.co.il/grade-7/chapter-9/vertical-angles) | זוויות קודקודיות are equal | 35° carved behind the ball where two tile lines cross → **35°** | Taking the adjacent angle (145°) instead of the vertical one: the ball goes into the bath. |
| 3א · המסדרון המקביל | [grade-7/chapter-9/transversal-intro](https://math.workbook.co.il/grade-7/chapter-9/transversal-intro), [parallel-alternate-angles](https://math.workbook.co.il/grade-7/chapter-9/parallel-alternate-angles) | זוויות מתחלפות במקבילים are equal (cushions marked ≫) | the path must meet the top cushion at 55° → **55°** | 125° (the co-interior/adjacent slip) heads backward into the bath. Any other miss is explained as "the ball met the top cushion at X°, the carving needs 55°". |
| 3ב · המסדרון העקום | [transversal-intro](https://math.workbook.co.il/grade-7/chapter-9/transversal-intro) ("when the lines aren't parallel the angles differ"), [parallel-alternate-angles](https://math.workbook.co.il/grade-7/chapter-9/parallel-alternate-angles), [parallel-corresponding-angles](https://math.workbook.co.il/grade-7/chapter-9/parallel-corresponding-angles) | Alternate angles are equal **only** between parallel lines; use a line that really is parallel | Transversal marked 88° and 92° (not equal → cushions not parallel); a ≫ tile line through the arrival point parallel to the bottom cushion; 55° to the leaning cushion and 4° between it and the ≫ line → **51°** | "Alternate angles are equal for any two lines": 55° (the answer from 3א) misses the drain; the explanation points at 88° ≠ 92°. 59° (adding the lean instead of subtracting) also misses. |
| 4 · חיתוך הפינה | [grade-7/chapter-9/triangle-angle-sum](https://math.workbook.co.il/grade-7/chapter-9/triangle-angle-sum) | סכום זוויות במשולש = 180°, plus the table rule (arrival = exit) | corner 70°, leave the slanted cushion at 45° → 180 − 70 − 45 = **65°** | Using the carved 45° directly, or only completing the corner (110°, into the bath). A "triangle over 180°" answer can't sink. |
| 5 · השולחן המשושה | [grade-7/chapter-9/polygon-angle-sum](https://math.workbook.co.il/grade-7/chapter-9/polygon-angle-sum) | סכום זוויות במצולע (n − 2)·180°; a regular hexagon's angle is 120° | regular hexagon (equal-side ticks), meet the next cushion at 25° → 180 − 120 − 25 = **35°** | "A regular hexagon's angle is 60°": 180 − 60 − 25 = 95° goes into the bath, and the explanation gives (6 − 2)·180° ÷ 6. |
| 6 · פניית הקרלינג (extension) | [grade-9/chapter-7/exterior-angles-triangle](https://math.workbook.co.il/grade-9/chapter-7/exterior-angles-triangle) | זווית חיצונית במשולש = sum of the two remote interior angles; the turn is measured from the continuation of the straight path | remote angles 40° (at the hack) and 75° (at the house) → turn the bronze vane **115°** | Turning by the interior angle (65°) slides the stone into the bath. |
| 7 · הקלדריום המוצף (transfer) | [polygon-angle-sum](https://math.workbook.co.il/grade-7/chapter-9/polygon-angle-sum), [triangle-angle-sum](https://math.workbook.co.il/grade-7/chapter-9/triangle-angle-sum) | Combine: pentagon sum 540°, missing corner, then a triangle; dial measured clockwise from the wall | corners 100°, 110°, 120°, 95° carved; fifth corner unmarked (540 − 425 = 115°); leave the second wall at 30° → **35°** | No hint lamp, no "?" marker, curling stone, flooded floor, mirrored protractor. A regular-pentagon guess (108°) gives 42° and misses. |

## Deviations from the build handoff (and why)

- **Room 5 numbers.** The handoff's pair (leave at 50°, meet the next cushion at 10°) is correct angle arithmetic, but on a hexagon table the ball must start within 0.3 of a corner for the 10° hit to land on the next cushion, and the graze then skims two corners. The room keeps the same deduction (120° interior, triangle sum) with 35° / 25°.
- **Room 3ב.** The handoff names the 88°/92° transversal. To make the room solvable with grade-7 tools (no "find the lean via two triangles"), the floor also has a tile line through the arrival point that really is parallel to the bottom cushion (≫), and the 4° between it and the leaning cushion is carved. 55° − 4° = 51°.
- **Room 3 is two tables** (3א and 3ב), so the slice has 8 tables for the 7 rooms.
- **Cue position.** The handoff mentions picking the cue position along a rail. The cue spot is fixed per table so that exactly one angle (± what the drain's width allows) sinks it; fresh replay tables vary the spot instead.

## Drain tolerance (computed, not chosen)

The drain captures the ball when its centre passes within 6 cm of the drain centre (5 cm for the curling house). The winning integer dial values, measured over 5°–175° at full power:

| Room | 1 | 2 | 3א | 3ב | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| Sinks | 49–51 | 34–36 | 55 | 51 | 64–66 | 34–36 | 114–116 | 35 |

Small basins are placed automatically (`guardUnique` in `src/levels.ts`) on any long detour that would otherwise reach the drain from a far-off angle, so a constant or random strategy can't win.

## Learning log

Each shot is logged locally (`localStorage["bank-shot-log-v1"]`, never sent anywhere): room id, dial value, power, outcome, stroke number, hint used, and `unaided` (first stroke in that room, no hint, no worked explanation). First unaided successes are counted separately on the end screen.
