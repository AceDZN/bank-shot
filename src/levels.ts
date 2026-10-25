// The authored rooms. Every room is built from a few parameters by a builder, so the givens,
// the needed angle, the drain and the bath are always consistent with the bounce rule. The
// same builders make fresh replay rooms (variants.ts). No Three.js here.

import {
  type Table,
  type Vec,
  type Pool,
  type PathResult,
  adjacent,
  add,
  along,
  dir,
  dist,
  exterior,
  heading,
  interiorAngle,
  lineIntersect,
  polygonAngleSum,
  polygonFromAngles,
  regularInterior,
  sub,
  trace,
  triangleThird,
  v,
  wrap,
} from './rules.ts';

export type Fact = 'adjacent' | 'vertical' | 'alternate' | 'not-parallel' | 'triangle' | 'polygon' | 'exterior' | 'transfer';

export interface AngleMark {
  id: string;
  at: Vec;
  /** Heading of the first ray, degrees. */
  from: number;
  /** Counter-clockwise sweep to the second ray, degrees (0–180). */
  sweep: number;
  /** "130°", "?" or "" (an unlabelled helper arc). */
  label: string;
  kind: 'given' | 'unknown' | 'helper' | 'corner';
  radius: number;
  /** Length of the two rays drawn from the vertex (0 = arc only). */
  rays: number;
}

export interface TileLine {
  a: Vec;
  b: Vec;
  /** gold: carved line; worn: faint remains; parallel: carries ≫ marks; dashed: helper. */
  kind: 'gold' | 'worn' | 'parallel' | 'dashed';
}

export interface Misconception {
  angle: number;
  /** One line, Hebrew: what this number means and why it goes there. */
  text: string;
  /** Mark to circle on the ghost path. */
  mark?: string;
}

export interface Room {
  id: string;
  /** Label shown in the HUD: "1", "3א" … */
  code: string;
  name: string;
  fact: Fact;
  factName: string;
  table: Table;
  ball: Vec;
  /** Heading of the protractor's 0° ray (shot rooms). */
  base: number;
  /** +1: the dial sweeps counter-clockwise from the 0° ray; −1: clockwise. */
  dialSign: 1 | -1;
  mode: 'shot' | 'vane';
  /** Fixed throw heading (vane rooms). */
  lane?: number;
  /** The angle that sinks it. */
  solution: number;
  /** Full-power travel distance. */
  reach: number;
  /** Arc length of the winning path (for the power meter's "enough" check). */
  needed: number;
  marks: AngleMark[];
  lines: TileLine[];
  hint: { marks: string[]; text: string } | null;
  misconceptions: Misconception[];
  /** Worked explanation, shown after the room's strokes run out. */
  worked: string[];
  /** The diagnostic point on the path: which bounce should meet which carved angle. */
  key?: { bounce: number; carved: number; mark: string };
  stone: boolean;
  look: 'bath' | 'caldarium';
  /** Dial range. */
  min: number;
  max: number;
  /** One-line goal for the HUD. */
  goal: string;
}

export const STROKES = 3;
export const BALL_R = 0.055;
const DRAIN_R = 0.06;

/** Shot heading from the dial value. */
export function shotOf(room: Room, angle: number, power = 1) {
  if (room.mode === 'vane') return { start: room.ball, heading: room.lane ?? 0, turn: angle, reach: room.reach * power };
  return { start: room.ball, heading: room.base + room.dialSign * angle, reach: room.reach * power };
}

export function shoot(room: Room, angle: number, power = 1): PathResult {
  return trace(room.table, shotOf(room, angle, power));
}

/** Trace the winning line on a bare table (no drains) to find where the drain belongs. */
function bareTrace(t: Table, start: Vec, h: number, turn?: number): PathResult {
  return trace({ ...t, pockets: [], pools: [] }, { start, heading: h, turn, reach: 60 });
}

function rectPoly(w: number, h: number): Vec[] {
  return [v(0, 0), v(w, 0), v(w, h), v(0, h)];
}

/** A bath on the line of a wrong shot, placed `s` along it. */
function poolOn(t: Table, start: Vec, h: number, s: number, r: number): Pool {
  return { c: pointAt(bareTrace(t, start, h), s), r };
}

function mark(id: string, at: Vec, from: number, sweep: number, label: string, kind: AngleMark['kind'], radius = 0.32, rays = 0.42): AngleMark {
  return { id, at, from: wrap(from), sweep, label, kind, radius, rays };
}

const deg = (n: number) => `${n}°`;
/** A number with its degree sign, kept left-to-right inside Hebrew text. */
const b = (s: string | number) => `<bdi dir="ltr">${typeof s === 'number' ? deg(s) : s}</bdi>`;

function finish(room: Omit<Room, 'reach' | 'needed' | 'dialSign'> & { dialSign?: 1 | -1 }, extraReach = 1.2): Room {
  const full: Room = { dialSign: 1, ...room, reach: 60, needed: 0 };
  const needed = shoot(full, room.solution).length;
  const out: Room = { ...full, needed, reach: needed * extraReach };
  guardUnique(out);
  return out;
}

function distToPolyline(p: Vec, pts: Vec[]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const ab = sub(pts[i], a);
    const l2 = ab.x * ab.x + ab.y * ab.y;
    const t = l2 ? Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / l2)) : 0;
    best = Math.min(best, dist(p, v(a.x + ab.x * t, a.y + ab.y * t)));
  }
  return best;
}

/**
 * The drain should take only the deduced angle (± what its width allows). When another dial
 * value finds it by a long detour, put a small basin on that detour, clear of the true line.
 */
function guardUnique(room: Room, tries = 8): void {
  const ok = (a: number) => Math.abs(a - room.solution) <= 1;
  const keep = [-1, 0, 1].map((d) => shoot(room, room.solution + d).points);
  for (let n = 0; n < tries; n++) {
    const stray = winningAngles(room).find((a) => !ok(a));
    if (stray === undefined) return;
    const path = shoot(room, stray);
    const end = path.length;
    let placed = false;
    for (const r of [0.2, 0.16, 0.12]) {
      for (let s = 0.45; s < end - 0.15 && !placed; s += 0.05) {
        const c = pointAt(path, s);
        const clear = Math.min(...keep.map((k) => distToPolyline(c, k)));
        const fromBall = dist(c, room.ball);
        const fromDrain = Math.min(...room.table.pockets.map((pk) => dist(c, pk.c)));
        if (clear > r + 0.08 && fromBall > r + 0.15 && fromDrain > r + 0.15) {
          room.table.pools.push({ c, r });
          placed = true;
        }
      }
      if (placed) break;
    }
    if (!placed) return;
  }
}

function pointAt(p: PathResult, s: number): Vec {
  for (let i = 1; i < p.points.length; i++) {
    if (p.s[i] >= s) {
      const a = p.points[i - 1];
      const b = p.points[i];
      const f = (s - p.s[i - 1]) / (p.s[i] - p.s[i - 1] || 1);
      return v(a.x + (b.x - a.x) * f, a.y + (b.y - a.y) * f);
    }
  }
  return p.points[p.points.length - 1];
}

// ─── 1. Straight cushion: adjacent angles ──────────────────────────────────────────────────────
export interface StraightParams {
  w: number;
  h: number;
  bx: number;
  /** The carved angle on the far side of the cue line. */
  carved: number;
}
export function buildStraight(p: StraightParams, id = 'r1'): Room {
  const sol = adjacent(p.carved);
  const ball = v(p.bx, 0);
  const t: Table = { poly: rectPoly(p.w, p.h), pockets: [], pools: [] };
  const win = bareTrace(t, ball, sol);
  t.pockets.push({ c: win.bounces[1].p, r: DRAIN_R });
  // The classic slip: dialling the carved number itself sends the ball the mirror way.
  t.pools.push(poolOn(t, ball, p.carved, Math.min(1.05, p.h * 0.62), 0.3));
  return finish({
    id,
    code: '1',
    name: 'הגדה הישרה',
    fact: 'adjacent',
    factName: 'זוויות צמודות',
    table: t,
    ball,
    base: 0,
    mode: 'shot',
    solution: sol,
    marks: [
      mark('given', ball, sol, 180 - sol, deg(p.carved), 'given', 0.3, 0.5),
      mark('need', ball, 0, sol, '?', 'unknown', 0.22, 0),
    ],
    lines: [{ a: ball, b: along(ball, sol, 0.5), kind: 'worn' }],
    hint: { marks: ['given', 'need'], text: 'זוויות צמודות: שתי הזוויות על הגדה הישרה משלימות זו את זו לזווית שטוחה.' },
    misconceptions: [
      { angle: p.carved, text: `${b(p.carved)} היא הזווית שבצד השני של הקו. מד־הזווית מודד מהצד שמסומן ${b('0°')}.`, mark: 'given' },
      { angle: 90, text: 'ישר למעלה? הקו החצוב לא עומד בניצב לגדה.', mark: 'given' },
    ],
    worked: [`הזוויות על הגדה צמודות: יחד הן <bdi dir="ltr">180°</bdi>.`, `<bdi dir="ltr">180° − ${p.carved}° = ${sol}°</bdi>`],
    stone: false,
    look: 'bath',
    min: 5,
    max: 175,
    goal: 'הכניסו את הכדור לחור הניקוז אחרי גדה אחת',
  });
}

// ─── 2. Crossing tiles: vertical angles ────────────────────────────────────────────────────────
export interface CrossParams {
  w: number;
  h: number;
  ball: Vec;
  carved: number;
}
export function buildCross(p: CrossParams, id = 'r2'): Room {
  const sol = p.carved;
  const t: Table = { poly: rectPoly(p.w, p.h), pockets: [], pools: [] };
  const win = bareTrace(t, p.ball, sol);
  t.pockets.push({ c: win.bounces[1].p, r: DRAIN_R });
  t.pools.push(poolOn(t, p.ball, adjacent(sol), 1.0, 0.28));
  const back = 180 + sol;
  return finish({
    id,
    code: '2',
    name: 'אריחים מצטלבים',
    fact: 'vertical',
    factName: 'זוויות קודקודיות',
    table: t,
    ball: p.ball,
    base: 0,
    mode: 'shot',
    solution: sol,
    marks: [
      mark('given', p.ball, 180, sol, deg(p.carved), 'given', 0.34, 0),
      mark('need', p.ball, 0, sol, '?', 'unknown', 0.24, 0),
    ],
    lines: [
      // The tile line the ball sits on, and the crossing line; the mosaic ahead of the ball is worn away.
      { a: along(p.ball, 180, 1.1), b: along(p.ball, 0, 0.55), kind: 'gold' },
      { a: along(p.ball, back, 0.9), b: p.ball, kind: 'gold' },
      { a: p.ball, b: along(p.ball, sol, 0.35), kind: 'worn' },
    ],
    hint: { marks: ['given', 'need'], text: 'זוויות קודקודיות: כששני ישרים נחתכים, הזוויות שמול זו את זו שוות.' },
    misconceptions: [
      { angle: adjacent(sol), text: `${b(adjacent(sol))} היא הזווית הצמודה, לא הקודקודית. הקודקודית יושבת מול הזווית החצובה.`, mark: 'given' },
    ],
    worked: ['הזווית החצובה והזווית שלך נמצאות זו מול זו, בין אותם שני קווים: זוויות קודקודיות שוות.', `<bdi dir="ltr">? = ${sol}°</bdi>`],
    stone: false,
    look: 'bath',
    min: 5,
    max: 175,
    goal: 'המשיכו את קו האריחים השבור — הוא מוביל לחור',
  });
}

// ─── 3א. Parallel corridor: alternate angles ───────────────────────────────────────────────────
export interface CorridorParams {
  w: number;
  h: number;
  bx: number;
  /** Angle at which the path must meet the top cushion. */
  carved: number;
  /** Drain at this cushion contact (0 = the first top hit). */
  drainAt: number;
}
export function buildCorridor(p: CorridorParams, id = 'r3a'): Room {
  const sol = p.carved;
  const ball = v(p.bx, 0);
  const t: Table = { poly: rectPoly(p.w, p.h), pockets: [], pools: [] };
  const win = bareTrace(t, ball, sol);
  const T = win.bounces[0].p;
  t.pockets.push({ c: win.bounces[p.drainAt].p, r: DRAIN_R });
  t.pools.push(poolOn(t, ball, adjacent(sol), 0.75, 0.24));
  return finish({
    id,
    code: '3א',
    name: 'המסדרון המקביל',
    fact: 'alternate',
    factName: 'זוויות מתחלפות',
    table: t,
    ball,
    base: 0,
    mode: 'shot',
    solution: sol,
    marks: [
      mark('given', T, 180, sol, deg(p.carved), 'given', 0.3, 0.5),
      mark('need', ball, 0, sol, '?', 'unknown', 0.24, 0),
    ],
    lines: [
      { a: v(0, 0), b: v(p.w, 0), kind: 'parallel' },
      { a: v(0, p.h), b: v(p.w, p.h), kind: 'parallel' },
      { a: T, b: along(T, 180 + sol, 0.5), kind: 'worn' },
    ],
    hint: { marks: ['given', 'need'], text: 'זוויות מתחלפות במקבילים: בין שני ישרים מקבילים, הזוויות בצדדים מנוגדים של החותך שוות.' },
    misconceptions: [
      { angle: adjacent(sol), text: `${b(adjacent(sol))} שולח את הכדור אחורה. הזווית המתחלפת נמצאת בצד השני של המסלול.`, mark: 'given' },
    ],
    worked: ['הגדות מקבילות (≫), והמסלול חותך את שתיהן.', `הזווית למעלה והזווית אצלך מתחלפות: <bdi dir="ltr">? = ${sol}°</bdi>`],
    key: { bounce: 0, carved: p.carved, mark: 'given' },
    stone: false,
    look: 'bath',
    min: 5,
    max: 175,
    goal: 'הכדור צריך לפגוע בגדה העליונה בזווית החצובה',
  });
}

// ─── 3ב. Crooked corridor: the cushions are NOT parallel ───────────────────────────────────────
export interface CrookedParams {
  w: number;
  /** Height of the top cushion at x = 0. */
  h0: number;
  bx: number;
  /** The top cushion tilts down to the right by this many degrees. */
  lean: number;
  carved: number;
  /** x where the transversal tile line crosses the bottom cushion. */
  tx: number;
  drainAt: number;
}
export function buildCrooked(p: CrookedParams, id = 'r3b'): Room {
  const sol = p.carved - p.lean;
  const ball = v(p.bx, 0);
  const topRight = v(p.w, p.h0 - p.w * Math.tan((p.lean * Math.PI) / 180));
  const topLeft = v(0, p.h0);
  const t: Table = { poly: [v(0, 0), v(p.w, 0), topRight, topLeft], pockets: [], pools: [] };
  const win = bareTrace(t, ball, sol);
  const T = win.bounces[0].p;
  t.pockets.push({ c: win.bounces[p.drainAt].p, r: DRAIN_R });
  t.pools.push(poolOn(t, ball, adjacent(sol), 0.75, 0.24));
  const topLeftRay = 180 - p.lean;
  // Transversal tile line at 88° from the bottom cushion.
  const trAngle = 90 - p.lean / 2;
  const P = v(p.tx, 0);
  const Q = lineIntersect(P, dir(trAngle), topLeft, sub(topRight, topLeft));
  return finish({
    id,
    code: '3ב',
    name: 'המסדרון העקום',
    fact: 'not-parallel',
    factName: 'מקבילים? בדקו!',
    table: t,
    ball,
    base: 0,
    mode: 'shot',
    solution: sol,
    marks: [
      mark('given', T, topLeftRay, p.carved, deg(p.carved), 'given', 0.42, 0.5),
      mark('lean', T, topLeftRay, p.lean, deg(p.lean), 'given', 0.75, 0),
      mark('need', ball, 0, sol, '?', 'unknown', 0.24, 0),
      mark('trP', P, 0, trAngle, deg(Math.round(trAngle)), 'given', 0.22, 0),
      mark('trQ', Q, topLeftRay, wrap(180 + trAngle) - topLeftRay, deg(Math.round(wrap(180 + trAngle) - topLeftRay)), 'given', 0.22, 0),
    ],
    lines: [
      { a: v(0, 0), b: v(p.w, 0), kind: 'gold' },
      { a: P, b: Q, kind: 'gold' },
      // A tile line through the arrival point that really is parallel to the bottom cushion.
      { a: along(T, 180, 0.9), b: along(T, 0, 1.4), kind: 'parallel' },
      { a: T, b: along(T, 180 + sol, 0.5), kind: 'worn' },
    ],
    hint: {
      marks: ['trP', 'trQ', 'lean'],
      text: 'זוויות מתחלפות שוות רק בין ישרים מקבילים. כאן הן לא שוות — אז הגדה העליונה לא מקבילה. מצאו קו שכן מקביל.',
    },
    misconceptions: [
      {
        angle: p.carved,
        text: `${b(p.carved)} עבד במסדרון הקודם, כי שם הגדות היו מקבילות. כאן ${b(`${Math.round(trAngle)}° ≠ ${Math.round(wrap(180 + trAngle) - topLeftRay)}°`)}: הגדה העליונה נוטה.`,
        mark: 'trQ',
      },
      { angle: p.carved + p.lean, text: `הגדה נוטה לצד השני: את ה־${b(p.lean)} צריך להוריד, לא להוסיף.`, mark: 'lean' },
    ],
    worked: [
      'הקו המנוקד (≫) מקביל לגדה התחתונה. הזווית שלך מתחלפת עם הזווית שבין הקו המנוקד למסלול.',
      `<bdi dir="ltr">${p.carved}° − ${p.lean}° = ${sol}°</bdi>`,
    ],
    key: { bounce: 0, carved: p.carved, mark: 'given' },
    stone: false,
    look: 'bath',
    min: 5,
    max: 175,
    goal: 'אותו טריק כמו קודם… או שלא?',
  });
}

// ─── 4. Corner cut: triangle sum ───────────────────────────────────────────────────────────────
export interface CornerParams {
  w: number;
  h: number;
  /** Interior angle where the bottom cushion meets the slanted one. */
  corner: number;
  /** Distance from the ball to that corner. */
  toCorner: number;
  /** The angle at which the path leaves the slanted cushion. */
  exit: number;
}
export function buildCorner(p: CornerParams, id = 'r4'): Room {
  const sol = triangleThird(p.corner, p.exit);
  const C = v(p.w, 0);
  const slant = 180 - p.corner; // heading from C up the slanted cushion
  const slantLen = p.h / Math.sin((slant * Math.PI) / 180);
  const D = along(C, slant, slantLen);
  const poly = [v(0, 0), C, D, v(0, D.y)];
  const ball = v(p.w - p.toCorner, 0);
  const t: Table = { poly, pockets: [], pools: [] };
  const win = bareTrace(t, ball, sol);
  const Q = win.bounces[0].p;
  t.pockets.push({ c: win.bounces[1].p, r: DRAIN_R });
  // "Just complete the corner to 180°" heads up and left, into the bath.
  t.pools.push(poolOn(t, ball, adjacent(p.corner), 0.95, 0.26));
  return finish({
    id,
    code: '4',
    name: 'חיתוך הפינה',
    fact: 'triangle',
    factName: 'סכום זוויות במשולש',
    table: t,
    ball,
    base: 0,
    mode: 'shot',
    solution: sol,
    marks: [
      mark('corner', C, slant, 180 - slant, deg(p.corner), 'corner', 0.3, 0),
      mark('given', Q, slant, p.exit, deg(p.exit), 'given', 0.3, 0.5),
      mark('arrive', Q, wrap(slant + 180 - p.exit), p.exit, '', 'helper', 0.24, 0),
      mark('need', ball, 0, sol, '?', 'unknown', 0.24, 0),
    ],
    lines: [{ a: Q, b: along(Q, slant + p.exit, 0.5), kind: 'worn' }],
    hint: {
      marks: ['corner', 'arrive', 'need'],
      text: 'הכדור מגיע לגדה בזווית שבה הוא יוצא ממנה. המסלול, הגדה התחתונה והגדה האלכסונית יוצרים משולש — וסכום זוויות במשולש הוא קבוע.',
    },
    misconceptions: [
      { angle: p.exit, text: `${b(p.exit)} היא זווית היציאה מהגדה האלכסונית, לא הזווית אצלך.`, mark: 'given' },
      { angle: adjacent(p.corner), text: `${b(adjacent(p.corner))} משלימה רק את זווית הפינה. חסרה עוד זווית במשולש.`, mark: 'corner' },
    ],
    worked: [
      `זווית ההגעה לגדה האלכסונית שווה לזווית היציאה: <bdi dir="ltr">${p.exit}°</bdi>.`,
      `במשולש: <bdi dir="ltr">180° − ${p.corner}° − ${p.exit}° = ${sol}°</bdi>`,
    ],
    key: { bounce: 0, carved: p.exit, mark: 'given' },
    stone: false,
    look: 'bath',
    min: 5,
    max: 175,
    goal: 'צאו מהגדה האלכסונית בזווית החצובה',
  });
}

// ─── 5. Hex table: polygon angle sum ───────────────────────────────────────────────────────────
export interface HexParams {
  /** Side length of the regular hexagon. */
  side: number;
  /** Ball distance from the right end of the bottom side. */
  toCorner: number;
  /** Angle at which the path must meet the next cushion. */
  arrive: number;
}
export function buildHex(p: HexParams, id = 'r5'): Room {
  const n = 6;
  const inner = regularInterior(n); // 120
  const sol = triangleThird(inner, p.arrive);
  const poly: Vec[] = [];
  const R = p.side; // circumradius = side for a hexagon
  for (let i = 0; i < n; i++) poly.push(along(v(R, R * Math.sin(Math.PI / 3)), 240 + 60 * i, R));
  const V1 = poly[1];
  const ball = along(V1, 180, p.toCorner);
  const t: Table = { poly, pockets: [], pools: [] };
  const win = bareTrace(t, ball, sol);
  const Q = win.bounces[0].p;
  t.pockets.push({ c: win.bounces[1].p, r: DRAIN_R });
  // The "60°" slip: 180 − 60 − arrive.
  const wrong = triangleThird(60, p.arrive);
  t.pools.push(poolOn(t, ball, wrong, 0.85, 0.24));
  const edge2 = heading(sub(poly[2], V1)); // 60°
  return finish({
    id,
    code: '5',
    name: 'השולחן המשושה',
    fact: 'polygon',
    factName: 'סכום זוויות במצולע',
    table: t,
    ball,
    base: 0,
    mode: 'shot',
    solution: sol,
    marks: [
      mark('corner', V1, edge2, inner, '', 'corner', 0.26, 0),
      mark('given', Q, edge2, p.arrive, deg(p.arrive), 'given', 0.34, 0.5),
      mark('arrive', Q, wrap(edge2 + 180 - p.arrive), p.arrive, '', 'helper', 0.24, 0),
      mark('need', ball, 0, sol, '?', 'unknown', 0.24, 0),
    ],
    lines: [{ a: Q, b: along(Q, edge2 + p.arrive, 0.5), kind: 'worn' }],
    hint: {
      marks: ['corner', 'arrive', 'need'],
      text: 'משושה משוכלל: כל זוויותיו שוות, וסכומן הוא סכום זוויות במצולע בן 6 צלעות. אחר כך — משולש.',
    },
    misconceptions: [
      { angle: wrong, text: `זווית במשושה משוכלל היא לא ${b(60)} — זו זווית של המשולשים שבמרכזו. נסו ${b('(6 − 2)·180° ÷ 6')}.`, mark: 'corner' },
      { angle: p.arrive, text: `${b(p.arrive)} היא הזווית בגדה הבאה, לא אצלך.`, mark: 'given' },
    ],
    worked: [
      `<bdi dir="ltr">(6 − 2)·180° = 720°</bdi>, ובמשושה משוכלל כל זווית היא <bdi dir="ltr">720° ÷ 6 = 120°</bdi>.`,
      `במשולש שבפינה: <bdi dir="ltr">180° − 120° − ${p.arrive}° = ${sol}°</bdi>`,
    ],
    key: { bounce: 0, carved: p.arrive, mark: 'given' },
    stone: false,
    look: 'bath',
    min: 5,
    max: 175,
    goal: 'פגעו בגדה הבאה בזווית החצובה',
  });
}

// ─── 6. Curling turn: exterior angle (grade-9 extension) ───────────────────────────────────────
export interface VaneParams {
  w: number;
  h: number;
  start: Vec;
  /** Distance from the hack to the vane along the lane (heading 0°). */
  lane: number;
  /** Remote angle at the hack, between the lane and the sight line to the house. */
  atStart: number;
  /** Remote angle at the house. */
  atHouse: number;
}
export function buildVane(p: VaneParams, id = 'r6'): Room {
  const sol = exterior(p.atStart, p.atHouse);
  const P = along(p.start, 0, p.lane);
  const atVane = triangleThird(p.atStart, p.atHouse);
  // Law of sines: hack→house = lane·sin(atVane)/sin(atHouse).
  const sg = (p.lane * Math.sin((atVane * Math.PI) / 180)) / Math.sin((p.atHouse * Math.PI) / 180);
  const G = along(p.start, p.atStart, sg);
  const t: Table = { poly: rectPoly(p.w, p.h), pockets: [{ c: G, r: 0.05 }], pools: [], vane: { p: P, sign: 1, r: 0.02 } };
  // Turning by the interior angle instead sends the stone into the bath.
  t.pools.push({ c: along(P, atVane, 1.0), r: 0.26 });
  const gs = heading(sub(p.start, G));
  return finish({
    id,
    code: '6',
    name: 'פניית הקרלינג',
    fact: 'exterior',
    factName: 'זווית חיצונית במשולש',
    table: t,
    ball: p.start,
    base: 0,
    mode: 'vane',
    lane: 0,
    solution: sol,
    marks: [
      mark('atStart', p.start, 0, p.atStart, deg(p.atStart), 'given', 0.42, 0),
      mark('atHouse', G, gs, heading(sub(P, G)) - gs, deg(p.atHouse), 'given', 0.36, 0),
      mark('need', P, 0, sol, '?', 'unknown', 0.3, 0),
      mark('inner', P, heading(sub(G, P)), atVane, '', 'helper', 0.22, 0),
    ],
    lines: [
      { a: p.start, b: along(p.start, 0, p.lane + 0.9), kind: 'dashed' },
      { a: p.start, b: G, kind: 'gold' },
      { a: G, b: along(G, heading(sub(P, G)), 0.45), kind: 'worn' },
    ],
    hint: {
      marks: ['atStart', 'atHouse', 'need'],
      text: 'זווית חיצונית במשולש שווה לסכום שתי הזוויות הפנימיות שלא צמודות לה.',
    },
    misconceptions: [
      { angle: atVane, text: `${b(atVane)} היא הזווית הפנימית ליד הפלטה. הפלטה מסובבת את האבן בזווית החיצונית — מהמשך המסלול הישר.`, mark: 'need' },
    ],
    worked: [
      'הסיבוב נמדד מהמשך הקו הישר של המסלול: זו הזווית החיצונית של המשולש.',
      `<bdi dir="ltr">${p.atStart}° + ${p.atHouse}° = ${sol}°</bdi>`,
    ],
    stone: true,
    look: 'bath',
    min: 0,
    max: 180,
    goal: 'כוונו את פלטת הארד כך שהאבן תיעצר בבית',
  });
}

// ─── 7. Transfer: the flooded caldarium (no hints, no "?") ─────────────────────────────────────
export interface PentaParams {
  /** Interior angles A, B, C, D, E (E is the one the path cuts and is not marked). */
  angles: [number, number, number, number, number];
  sides: [number, number, number];
  /** Stone distance from corner E along wall E→A. */
  toCorner: number;
  /** Angle at which the stone must leave wall D–E. */
  arrive: number;
  /** House placed this far after the second wall contact. */
  houseAfter: number;
}
export function buildPenta(p: PentaParams, id = 'r7'): Room {
  const E = p.angles[4];
  const sumKnown = p.angles[0] + p.angles[1] + p.angles[2] + p.angles[3];
  const e = polygonAngleSum(5) - sumKnown;
  if (Math.abs(e - E) > 1e-9) throw new Error('pentagon angles must sum to 540');
  const sol = triangleThird(e, p.arrive);
  // Vertex order E, A, B, C, D (counter-clockwise), first side E→A along +x.
  const poly = polygonFromAngles(v(0.4, 0.3), 0, [E, p.angles[0], p.angles[1], p.angles[2], p.angles[3]], p.sides);
  // Move the stone onto wall E→A, protractor 0° toward E (heading 180°).
  const Ev = poly[0];
  const ball = along(Ev, 0, p.toCorner);
  const t: Table = { poly, pockets: [], pools: [] };
  // The protractor's 0° ray points back at E (heading 180°) and opens clockwise into the room.
  const win = bareTrace(t, ball, 180 - sol);
  const Q = win.bounces[0].p;
  const house = along(win.bounces[1].p, heading(sub(win.points[3], win.points[2])), p.houseAfter);
  t.pockets.push({ c: house, r: 0.05 });
  const edgeDE = heading(sub(poly[0], poly[4]));
  const marksCorners = [1, 2, 3, 4].map((i) => {
    const ang = interiorAngle(poly, i);
    return mark(`c${i}`, poly[i], heading(sub(poly[(i + 1) % 5], poly[i])), ang, deg(Math.round(ang)), 'corner', 0.3, 0);
  });
  return finish({
    id,
    code: '7',
    name: 'הקלדריום המוצף',
    fact: 'transfer',
    factName: 'בלי רמזים',
    table: t,
    ball,
    base: 180,
    dialSign: -1,
    mode: 'shot',
    solution: sol,
    marks: [...marksCorners, mark('given', Q, edgeDE + 180 - p.arrive, p.arrive, deg(p.arrive), 'given', 0.32, 0.5)],
    lines: [{ a: Q, b: along(Q, edgeDE + 180 - p.arrive, 0.5), kind: 'worn' }],
    hint: null,
    misconceptions: [
      { angle: triangleThird(108, p.arrive), text: `הרצפה הזו לא משוכללת — לא כל הפינות ${b(108)}. ארבע פינות כתובות על הרצפה.` },
    ],
    worked: [
      `סכום זוויות במחומש: <bdi dir="ltr">(5 − 2)·180° = 540°</bdi>. הפינה החסרה: <bdi dir="ltr">540° − ${sumKnown}° = ${e}°</bdi>.`,
      `במשולש שבפינה: <bdi dir="ltr">180° − ${e}° − ${p.arrive}° = ${sol}°</bdi>`,
    ],
    key: { bounce: 0, carved: p.arrive, mark: 'given' },
    stone: true,
    look: 'caldarium',
    min: 5,
    max: 175,
    goal: 'החליקו את האבן אל הבית דרך שני קירות',
  });
}

// ─── The authored slice ────────────────────────────────────────────────────────────────────────
export const AUTHORED = {
  r1: { w: 3, h: 1.6, bx: 0.9, carved: 130 } as StraightParams,
  r2: { w: 4, h: 2.2, ball: v(1.2, 0.7), carved: 35 } as CrossParams,
  r3a: { w: 4.2, h: 1.4, bx: 0.6, carved: 55, drainAt: 3 } as CorridorParams,
  r3b: { w: 5, h0: 1.6, bx: 0.6, lean: 4, carved: 55, tx: 3.6, drainAt: 2 } as CrookedParams,
  r4: { w: 4, h: 2.3, corner: 70, toCorner: 1.5, exit: 45 } as CornerParams,
  r5: { side: 1.6, toCorner: 0.8, arrive: 25 } as HexParams,
  r6: { w: 4.6, h: 3.2, start: v(0.45, 0.8), lane: 2.6, atStart: 40, atHouse: 75 } as VaneParams,
  r7: { angles: [100, 110, 120, 95, 115], sides: [3.2, 2.0, 2.2], toCorner: 0.8, arrive: 30, houseAfter: 0.9 } as PentaParams,
};

export function authoredRooms(): Room[] {
  return [
    buildStraight(AUTHORED.r1),
    buildCross(AUTHORED.r2),
    buildCorridor(AUTHORED.r3a),
    buildCrooked(AUTHORED.r3b),
    buildCorner(AUTHORED.r4),
    buildHex(AUTHORED.r5),
    buildVane(AUTHORED.r6),
    buildPenta(AUTHORED.r7),
  ];
}

/** Integer dial values that sink the ball at full power. */
export function winningAngles(room: Room): number[] {
  const out: number[] = [];
  for (let a = room.min; a <= room.max; a++) if (shoot(room, a).outcome === 'pocket') out.push(a);
  return out;
}

export { dist };
