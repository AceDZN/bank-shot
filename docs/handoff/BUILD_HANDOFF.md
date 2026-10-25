# Bank Shot — מכת גדה — build handoff

Read `../COMMON.md` first. Repo `/Users/acedzn/dev/AceDZN-exp/bank-shot` → public `AceDZN/bank-shot`, port 5213 (preview 4213).

## Promise

Trick-shot billiards and curling in an ancient, candle-lit mosaic bathhouse (Beit She'an and Roman-bath vibes): marble cushions, mosaic tile lines, steam, a pool of water that eats bad shots with a satisfying *plop*. The aim line is **short**, so you can't eyeball where a bounce goes. Instead the table gives you a few angles carved into the mosaic, and you deduce the ones you need: angles on a straight cushion, vertical angles where tile lines cross, alternate angles between parallel cushions, the triangle sum when a path cuts a corner, polygon sums on hex and pentagon tables. Set the brass protractor, strike, and watch a perfect three-cushion run drop into the pocket in slow motion. The fun is the trick-shot payoff and the "I called it" moment.

Map evidence: Real Pool 3D × Golf Peaks (related, density 0.720); Golf Peaks is at the 37.5th originality percentile. ISLANDERS × Golf Peaks (0.696) became the weaker Lighthouse Isles idea.

## Curriculum (Workbook grade 7, chapter 9 and 11; grade 9, chapter 7 extension)

[angle-types](https://math.workbook.co.il/grade-7/chapter-9/angle-types), [adjacent-angles](https://math.workbook.co.il/grade-7/chapter-9/adjacent-angles), [vertical-angles](https://math.workbook.co.il/grade-7/chapter-9/vertical-angles), [transversal-intro](https://math.workbook.co.il/grade-7/chapter-9/transversal-intro), [parallel-alternate-angles](https://math.workbook.co.il/grade-7/chapter-9/parallel-alternate-angles), [parallel-corresponding-angles](https://math.workbook.co.il/grade-7/chapter-9/parallel-corresponding-angles), [triangle-angle-sum](https://math.workbook.co.il/grade-7/chapter-9/triangle-angle-sum), [polygon-angle-sum](https://math.workbook.co.il/grade-7/chapter-9/polygon-angle-sum); extension [grade-9 exterior-angles-triangle](https://math.workbook.co.il/grade-9/chapter-7/exterior-angles-triangle).

Rules:
- **Game physics (stated, not curriculum):** a puck hits a cushion and leaves at the same angle to the cushion (an ideal elastic bounce, no spin, no friction curve on the angle). Say plainly in-game that this is the table's rule. The curriculum part is deducing angles.
- Adjacent angles on a straight line sum to 180°; vertical angles are equal; alternate and corresponding angles are equal **only between parallel lines** (include a level where the cushions look parallel but aren't, and the shot misses); triangle sum 180°; polygon sum (n − 2)·180°; exterior angle = sum of the two remote interior angles (extension).
- Angles are whole degrees; the protractor snaps to 1°; the solver accepts ±1° only where the pocket width really allows it (compute it).
- Hebrew terms: זוויות צמודות, זוויות קודקודיות, זוויות מתחלפות, זוויות מתאימות, סכום זוויות במשולש/במצולע, זווית חיצונית.

Misconceptions to catch: alternate angles are equal for any two lines; the "angle" is measured to the wrong side of the cushion; a triangle's angles can sum to more than 180°; the interior angle of a regular hexagon is 60°.

## Loop

- Turn-based. Pick the cue position along a rail, set the angle to the cushion with the protractor (drag or keys), set power, strike. The world shows given angles as carved, glowing arcs with numbers (LTR). The unknown you need is shown as "?" at the right place.
- Limited strokes per room, star rank by strokes and hints. Hint (logged): highlight the relevant pair of angles and name the rule, never the number.
- A miss shows the whole path ghosted, with the angle where your reasoning went wrong highlighted, and a quick reset.

## Levels (author exactly; tests prove each)

1. **Straight cushion** — the mosaic marks 130° on the far side of your cue line along the cushion → shoot at 50°.
2. **Crossing tiles** — two tile lines cross; the path must follow one of them; the marked angle is 35° on the opposite side → vertical angles → 35°.
3. **Parallel corridor** — two parallel cushions; the exit gap needs the path to meet the top cushion at 55° → alternate angles → shoot from the bottom at 55°. Follow with a twin room where the cushions are *not* parallel (marked 88° and 92° with a transversal) and the "same angle" shot misses.
4. **Corner cut (triangle)** — two cushions meet at 70°. To leave the second cushion at 45° toward the pocket, the first angle must be 180 − 70 − 45 = 65°.
5. **Hex table** — regular hexagon, interior angle (6 − 2)·180 / 6 = 120°. Leaving one cushion at 50° → hits the next at 180 − 120 − 50 = 10°. Plan a two-cushion shot from that.
6. **Curling turn (exterior angle, extension)** — a stone deflects off a bumper post; the turn angle is the exterior angle of a triangle with remote angles 40° and 75° → 115°.
7. **Transfer: the flooded caldarium (no hints, curling stones, irregular pentagon floor)** — four floor corners are marked 100°, 110°, 120°, 95° → the fifth is 540 − 425 = 115°, which you need for a two-wall shot. Unfamiliar look, no "?" marker on the needed angle.

After the slice works: generated rooms from a solver that guarantees a unique angle (within pocket tolerance) and verifies that a fixed "always 45°" strategy fails.

## 3D and art

Warm candlelight, steam, wet marble reflections, deep blue-green bath water, gold mosaic lines that double as geometry. A slow overhead-to-table camera on the strike and a dramatic slow-motion last bounce. Procedural: table geometry, cushions, mosaic lines, angle arcs, protractor and pockets (all exact). Tripo: a **rigged bathhouse attendant/rival character** (Mixamo idle/cheer/facepalm), a **cue or curling-stone hero prop**, and **set pieces** (a lion-head fountain, column capitals, an oil lamp).

## Acceptance

In the first 30 seconds: read the 130° carving, set 50°, sink the first shot with a slow-motion bounce; miss one on purpose and see the ghost path explain it. All angle deductions and bounce paths come from the pure module; tests cover every authored room, the non-parallel trap and the transfer.
