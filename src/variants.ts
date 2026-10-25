// Fresh tables for replay: new numbers for every room type, each one checked by the solver.
// A room is kept only if exactly the deduced angle (± what the drain's width allows) sinks it,
// the listed misconceptions miss, and constant strategies (45°, 90°) miss.
import {
  AUTHORED,
  buildCorner,
  buildCorridor,
  buildCrooked,
  buildCross,
  buildHex,
  buildPenta,
  buildStraight,
  buildVane,
  shoot,
  winningAngles,
  type Room,
} from './levels.ts';
import { v } from './rules.ts';

function rand(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function isFair(r: Room): boolean {
  if (shoot(r, r.solution).outcome !== 'pocket') return false;
  const win = winningAngles(r);
  if (!win.includes(r.solution) || win.some((a) => Math.abs(a - r.solution) > 1)) return false;
  if ([45, 90].some((a) => shoot(r, a).outcome === 'pocket')) return false;
  if (r.misconceptions.some((m) => shoot(r, m.angle).outcome === 'pocket')) return false;
  if (r.key && !shoot(r, r.solution).bounces[r.key.bounce]) return false;
  return true;
}

type Maker = (R: () => number) => Room;
const int = (R: () => number, a: number, b: number) => a + Math.floor(R() * (b - a + 1));
const real = (R: () => number, a: number, b: number) => a + R() * (b - a);

const MAKERS: Maker[] = [
  (R) => buildStraight({ w: real(R, 2.9, 3.4), h: real(R, 1.4, 1.8), bx: real(R, 0.7, 1.1), carved: int(R, 112, 148) }, 'r1'),
  (R) => buildCross({ w: 4, h: real(R, 2.0, 2.4), ball: v(real(R, 1.0, 1.5), real(R, 0.5, 0.9)), carved: int(R, 25, 58) }, 'r2'),
  (R) => buildCorridor({ w: 4.2, h: real(R, 1.2, 1.6), bx: real(R, 0.5, 0.8), carved: int(R, 48, 66), drainAt: 3 }, 'r3a'),
  (R) => buildCrooked({ w: 5, h0: 1.6, bx: real(R, 0.5, 0.8), lean: [2, 4, 6][int(R, 0, 2)], carved: int(R, 50, 64), tx: real(R, 3.3, 3.9), drainAt: 2 }, 'r3b'),
  (R) => buildCorner({ w: 4, h: 2.3, corner: int(R, 62, 80), toCorner: real(R, 1.2, 1.7), exit: int(R, 36, 54) }, 'r4'),
  (R) => buildHex({ side: 1.6, toCorner: real(R, 0.7, 1.0), arrive: int(R, 20, 33) }, 'r5'),
  (R) => buildVane({ w: 4.6, h: 3.2, start: v(0.45, 0.8), lane: real(R, 2.4, 2.9), atStart: int(R, 32, 48), atHouse: int(R, 58, 82) }, 'r6'),
  (R) => {
    for (;;) {
      const a = [int(R, 96, 124), int(R, 96, 124), int(R, 96, 124), int(R, 92, 120)];
      const e = 540 - a.reduce((s, x) => s + x, 0);
      if (e < 100 || e > 128) continue;
      const arrive = int(R, 26, 40);
      if (180 - e - arrive < 18) continue;
      return buildPenta({ angles: [a[0], a[1], a[2], a[3], e], sides: [3.2, 2.0, 2.2], toCorner: real(R, 0.65, 1.0), arrive, houseAfter: real(R, 0.7, 1.0) }, 'r7');
    }
  },
];

const AUTHORED_BUILD: (() => Room)[] = [
  () => buildStraight(AUTHORED.r1),
  () => buildCross(AUTHORED.r2),
  () => buildCorridor(AUTHORED.r3a),
  () => buildCrooked(AUTHORED.r3b),
  () => buildCorner(AUTHORED.r4),
  () => buildHex(AUTHORED.r5),
  () => buildVane(AUTHORED.r6),
  () => buildPenta(AUTHORED.r7),
];

/** One fresh room of type i, fair by the solver; falls back to the authored room. */
export function freshRoom(i: number, seed: number, tries = 60): Room {
  const R = rand(seed * 7919 + i * 104729);
  for (let t = 0; t < tries; t++) {
    try {
      const r = MAKERS[i](R);
      if (isFair(r)) return { ...r, id: `${r.id}-f${seed}-${t}` };
    } catch {
      /* degenerate geometry; try other numbers */
    }
  }
  return AUTHORED_BUILD[i]();
}

export function freshRooms(seed: number): Room[] {
  return MAKERS.map((_, i) => freshRoom(i, seed));
}
