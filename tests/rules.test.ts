import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  angleToLine,
  dir,
  interiorAngle,
  norm,
  polygonAngleSum,
  polygonFromAngles,
  reflect,
  regularInterior,
  sub,
  trace,
  v,
} from '../src/rules.ts';
import { authoredRooms, shoot, winningAngles, type Room } from '../src/levels.ts';
import { isFair } from '../src/variants.ts';

const rooms = authoredRooms();
const room = (id: string): Room => rooms.find((r) => r.id === id)!;
const near = (a: number, b: number, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

test('the table rule: a ball leaves a cushion at the angle it arrived', () => {
  for (let h = 5; h < 360; h += 17) {
    for (const wall of [0, 30, 88, 135]) {
      const d = dir(h);
      const out = reflect(d, dir(wall));
      near(angleToLine(d, dir(wall)), angleToLine(out, dir(wall)));
    }
  }
});

test('angle sums used in the rooms', () => {
  assert.equal(polygonAngleSum(3), 180);
  assert.equal(polygonAngleSum(5), 540);
  assert.equal(polygonAngleSum(6), 720);
  assert.equal(regularInterior(6), 120);
  assert.equal(regularInterior(5), 108);
});

test('a pentagon built from interior angles has those angles', () => {
  const poly = polygonFromAngles(v(0, 0), 0, [115, 100, 110, 120, 95], [3, 2, 2]);
  const got = poly.map((_, i) => interiorAngle(poly, i));
  [115, 100, 110, 120, 95].forEach((a, i) => near(got[i], a, 1e-6));
});

test('every authored room has its handoff number', () => {
  const want: Record<string, number> = { r1: 50, r2: 35, r3a: 55, r3b: 51, r4: 65, r5: 32, r6: 115, r7: 38 };
  assert.equal(rooms.length, 8);
  for (const r of rooms) assert.equal(r.solution, want[r.id], r.id);
});

for (const r of rooms) {
  test(`${r.code} ${r.name}: the deduced angle sinks it at full power`, () => {
    const res = shoot(r, r.solution);
    assert.equal(res.outcome, 'pocket');
  });

  test(`${r.code}: only the deduced angle (± the drain's width) sinks it`, () => {
    const win = winningAngles(r);
    assert.ok(win.includes(r.solution));
    for (const a of win) assert.ok(Math.abs(a - r.solution) <= 1, `${a} also sinks room ${r.id}`);
    assert.ok(win.length <= 3);
  });

  test(`${r.code}: constant strategies (always 45°, always 90°) miss`, () => {
    for (const a of [45, 90]) assert.notEqual(shoot(r, a).outcome, 'pocket', `${a}° sinks ${r.id}`);
  });

  test(`${r.code}: each listed misconception misses`, () => {
    for (const m of r.misconceptions) {
      assert.notEqual(shoot(r, m.angle).outcome, 'pocket', `${m.angle} sinks ${r.id}`);
      assert.ok(m.text.length > 10);
    }
  });

  test(`${r.code}: a soft strike stops short`, () => {
    assert.equal(shoot(r, r.solution, 0.5).outcome, 'short');
  });

  test(`${r.code}: the generated-room fairness checks hold (no corner skims, labels apart, baths inside)`, () => {
    assert.ok(isFair(r));
  });

  test(`${r.code}: no carved ray runs past its arc (it would hand over the answer line)`, () => {
    for (const m of r.marks) assert.ok(m.rays <= m.radius + 1e-9, m.id);
    assert.ok(!r.lines.some((l) => (l.kind as string) === 'worn'));
  });

  test(`${r.code}: every bounce on the winning line leaves at its arrival angle`, () => {
    const res = shoot(r, r.solution);
    for (let i = 0; i < res.bounces.length; i++) {
      const b = res.bounces[i];
      const k = res.points.findIndex((p) => p === b.p);
      const inD = norm(sub(b.p, res.points[k - 1]));
      const outD = norm(sub(res.points[k + 1], b.p));
      const a = r.table.poly[b.edge];
      const c = r.table.poly[(b.edge + 1) % r.table.poly.length];
      near(angleToLine(inD, sub(c, a)), angleToLine(outD, sub(c, a)), 1e-6);
    }
  });

  if (r.key) {
    test(`${r.code}: the carved angle is where the true line meets the cushion`, () => {
      const res = shoot(r, r.solution);
      near(res.bounces[r.key!.bounce].angle, r.key!.carved, 1e-6);
    });
  }

  test(`${r.code}: given arcs are drawn at their labelled size`, () => {
    for (const m of r.marks) {
      if (m.label.endsWith('°')) near(m.sweep, Number(m.label.slice(0, -1)), 0.51);
    }
  });
}

test('1: dialling the carved 130° (wrong side) lands in the bath', () => {
  assert.equal(shoot(room('r1'), 130).outcome, 'pool');
});

test('2: the adjacent 145° instead of the vertical 35° lands in the bath', () => {
  assert.equal(shoot(room('r2'), 145).outcome, 'pool');
});

test('3א: parallel cushions — the path meets the top cushion at the same 55°', () => {
  const r = room('r3a');
  const res = shoot(r, 55);
  assert.equal(res.bounces[0].edge, 2);
  near(res.bounces[0].angle, 55);
});

test('3ב: non-parallel trap — 55° (the parallel answer) misses, 51° sinks', () => {
  const r = room('r3b');
  assert.notEqual(shoot(r, 55).outcome, 'pocket');
  assert.equal(shoot(r, 51).outcome, 'pocket');
  // The transversal marks prove the cushions are not parallel.
  const trP = r.marks.find((m) => m.id === 'trP')!;
  const trQ = r.marks.find((m) => m.id === 'trQ')!;
  assert.equal(trP.label, '88°');
  assert.equal(trQ.label, '92°');
  // The top cushion really leans 4°.
  const [, , tr, tl] = r.table.poly;
  near(Math.atan2(tl.y - tr.y, tr.x - tl.x) * (180 / Math.PI), 4, 1e-9);
});

test('4: corner 70°, exit 45° → 65°; the triangle sums to 180°', () => {
  const r = room('r4');
  near(interiorAngle(r.table.poly, 1), 70);
  const res = shoot(r, 65);
  near(res.bounces[0].angle, 45);
  assert.equal(65 + 70 + 45, 180);
});

test('5: the hexagon is regular with 120° corners and says so; the 60° slip misses', () => {
  const r = room('r5');
  for (let i = 0; i < 6; i++) near(interiorAngle(r.table.poly, i), 120);
  assert.match(r.name + r.goal, /משוכלל/);
  assert.equal(r.solution, 180 - 120 - 28);
  assert.notEqual(shoot(r, 180 - 60 - 28).outcome, 'pocket');
});

test('a constant dial wins at most two of the eight tables, and never the transfer room together with another', () => {
  for (let a = 5; a <= 175; a++) {
    const wins = rooms.filter((r) => shoot(r, a).outcome === 'pocket').map((r) => r.id);
    assert.ok(wins.length <= 2, `${a}° wins ${wins}`);
    if (wins.includes('r7')) assert.equal(wins.length, 1, `${a}° wins ${wins}`);
  }
});

test('6: exterior angle 40° + 75° = 115°; the interior 65° goes in the bath', () => {
  const r = room('r6');
  assert.equal(r.mode, 'vane');
  assert.equal(shoot(r, 115).outcome, 'pocket');
  assert.equal(shoot(r, 65).outcome, 'pool');
});

test('7 (transfer): four corners 100/110/120/95 → the fifth is 115°, and the shot is 180 − 115 − 27 = 38°', () => {
  const r = room('r7');
  const corners = r.table.poly.map((_, i) => Math.round(interiorAngle(r.table.poly, i)));
  assert.deepEqual(corners, [115, 100, 110, 120, 95]);
  assert.equal(r.hint, null);
  assert.ok(!r.marks.some((m) => m.label === '?'));
  assert.ok(!r.marks.some((m) => m.label === '115°'), 'the needed corner is not written on the floor');
  const res = shoot(r, 38);
  assert.equal(res.outcome, 'pocket');
  assert.ok(res.bounces.length >= 2, 'it is a two-wall shot');
  // A regular-pentagon guess (108°) misses.
  assert.notEqual(shoot(r, 180 - 108 - 27).outcome, 'pocket');
});

test('trace is deterministic', () => {
  const r = room('r5');
  assert.deepEqual(trace(r.table, { start: r.ball, heading: 35, reach: 9 }), trace(r.table, { start: r.ball, heading: 35, reach: 9 }));
});
