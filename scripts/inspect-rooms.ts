// Print each authored room's numbers: winning dial values, drain, bath and what wrong values do.
import { authoredRooms, shoot, winningAngles } from '../src/levels.ts';
import { interiorAngle } from '../src/rules.ts';

const f = (n: number) => n.toFixed(3);
for (const r of authoredRooms()) {
  const win = shoot(r, r.solution);
  console.log(`\n${r.code} ${r.id} solution ${r.solution} → ${win.outcome}, length ${f(win.length)}, reach ${f(r.reach)}`);
  console.log('  poly', r.table.poly.map((p) => `(${f(p.x)},${f(p.y)})`).join(' '));
  if (r.table.poly.length === 5) console.log('  corners', r.table.poly.map((_, i) => interiorAngle(r.table.poly, i).toFixed(2)).join(' '));
  console.log('  ball', f(r.ball.x), f(r.ball.y), 'drain', r.table.pockets.map((p) => `(${f(p.c.x)},${f(p.c.y)})`).join(' '), 'pools', r.table.pools.map((p) => `(${f(p.c.x)},${f(p.c.y)} r${p.r})`).join(' '));
  console.log('  bounces', win.bounces.map((b) => `e${b.edge}@(${f(b.p.x)},${f(b.p.y)}) ${b.angle.toFixed(2)}°`).join(' | '));
  console.log('  winning', winningAngles(r).join(','));
  for (const m of [...r.misconceptions.map((m) => m.angle), 45, 90]) {
    const res = shoot(r, m);
    console.log(`  try ${m}: ${res.outcome} after ${res.bounces.length} bounces, first ${res.bounces[0]?.angle.toFixed(1) ?? '-'}°`);
  }
  // Outcome histogram over all dial values.
  const hist: Record<string, number> = {};
  for (let a = r.min; a <= r.max; a++) hist[shoot(r, a).outcome] = (hist[shoot(r, a).outcome] ?? 0) + 1;
  console.log('  all', JSON.stringify(hist));
}
