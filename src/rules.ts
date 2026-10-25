// Pure table geometry and the bounce rule. No Three.js here: the scene only renders what this
// module computes, so the path you watch is exactly the path the tests check.
//
// Table coordinates: x to the right, y away from the player (into the table), units ≈ metres.
// Angles are in degrees, counter-clockwise from +x, unless a name says otherwise.

export interface Vec {
  x: number;
  y: number;
}

export const v = (x: number, y: number): Vec => ({ x, y });
export const add = (a: Vec, b: Vec): Vec => v(a.x + b.x, a.y + b.y);
export const sub = (a: Vec, b: Vec): Vec => v(a.x - b.x, a.y - b.y);
export const scale = (a: Vec, s: number): Vec => v(a.x * s, a.y * s);
export const dot = (a: Vec, b: Vec): number => a.x * b.x + a.y * b.y;
export const cross = (a: Vec, b: Vec): number => a.x * b.y - a.y * b.x;
export const len = (a: Vec): number => Math.hypot(a.x, a.y);
export const dist = (a: Vec, b: Vec): number => len(sub(a, b));
export const norm = (a: Vec): Vec => scale(a, 1 / len(a));

const RAD = Math.PI / 180;
export const dir = (deg: number): Vec => v(Math.cos(deg * RAD), Math.sin(deg * RAD));
/** Heading of a vector in degrees, in [0, 360). */
export function heading(a: Vec): number {
  const d = Math.atan2(a.y, a.x) / RAD;
  return d < 0 ? d + 360 : d;
}
/** Angle in [0, 360) normalised. */
export const wrap = (deg: number): number => ((deg % 360) + 360) % 360;
/** Point along a ray. */
export const along = (p: Vec, deg: number, t: number): Vec => add(p, scale(dir(deg), t));

/** Acute angle (0–90°) between a direction and a line direction. This is "the angle to the cushion". */
export function angleToLine(d: Vec, lineDir: Vec): number {
  const c = Math.abs(dot(norm(d), norm(lineDir)));
  return Math.acos(Math.min(1, c)) / RAD;
}

/** The table's stated rule: an ideal elastic bounce. The ball leaves at the angle it arrived. */
export function reflect(d: Vec, lineDir: Vec): Vec {
  const t = norm(lineDir);
  const n = v(-t.y, t.x);
  return sub(d, scale(n, 2 * dot(d, n)));
}

export interface Pocket {
  c: Vec;
  /** Capture radius for the ball's centre (the drain's opening minus the ball). */
  r: number;
}

export interface Pool {
  c: Vec;
  r: number;
}

/** A bronze vane mid-floor that turns a curling stone by a set angle (room 6). */
export interface Vane {
  p: Vec;
  /** +1 turns counter-clockwise (left), −1 clockwise. */
  sign: 1 | -1;
  /** How close the stone's line must pass to the vane's pivot to be turned. */
  r: number;
}

export interface Table {
  /** Polygon of the ball-centre boundary, counter-clockwise. Each edge is a cushion. */
  poly: Vec[];
  pockets: Pocket[];
  pools: Pool[];
  vane?: Vane;
}

export interface Shot {
  start: Vec;
  /** Initial heading in degrees. */
  heading: number;
  /** Vane turn angle in degrees (room 6) — ignored without a vane. */
  turn?: number;
  /** Distance the ball travels before it stops. */
  reach: number;
}

export interface Bounce {
  p: Vec;
  /** Cushion (edge) index. */
  edge: number;
  /** Acute angle between the arriving path and the cushion. */
  angle: number;
  /** Arc length from the start. */
  s: number;
}

export type Outcome = 'pocket' | 'pool' | 'short' | 'stuck';

export interface PathResult {
  /** Polyline of the ball centre, start to end. */
  points: Vec[];
  /** Cumulative arc length at each point. */
  s: number[];
  bounces: Bounce[];
  /** Where the vane turned the stone, if it did. */
  turnAt?: { p: Vec; s: number; turn: number };
  outcome: Outcome;
  /** Index of the pocket the ball dropped into. */
  pocket?: number;
  length: number;
}

export const MAX_BOUNCES = 7;
const EPS = 1e-9;

function edgeOf(poly: Vec[], i: number): [Vec, Vec] {
  return [poly[i], poly[(i + 1) % poly.length]];
}

/** First parameter t > tMin where the ray p + t·d crosses segment ab. */
function raySegment(p: Vec, d: Vec, a: Vec, b: Vec, tMin: number): number | null {
  const e = sub(b, a);
  const den = cross(d, e);
  if (Math.abs(den) < EPS) return null;
  const ap = sub(a, p);
  const t = cross(ap, e) / den;
  const u = cross(ap, d) / den;
  if (t <= tMin || u < -1e-7 || u > 1 + 1e-7) return null;
  return t;
}

/** Smallest t in (tMin, tMax] at which the ray enters a circle, or null. */
function rayCircleEnter(p: Vec, d: Vec, c: Vec, r: number, tMin: number, tMax: number): number | null {
  const f = sub(p, c);
  const b = dot(f, d);
  const cc = dot(f, f) - r * r;
  if (cc <= 0) return tMin; // already inside
  const disc = b * b - cc;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > tMin && t <= tMax ? t : null;
}

/** Closest approach parameter of the ray to a point, clamped into [tMin, tMax]. */
function closestT(p: Vec, d: Vec, c: Vec, tMin: number, tMax: number): number {
  return Math.max(tMin, Math.min(tMax, dot(sub(c, p), d)));
}

/**
 * Trace a shot. Straight lines between cushions; at a cushion the ball reflects (equal angles);
 * it drops when its line passes within a pocket's capture radius; it sinks in a pool; it stops when
 * it runs out of reach; a vane turns it once.
 */
export function trace(table: Table, shot: Shot): PathResult {
  let p = shot.start;
  let d = dir(shot.heading);
  const points: Vec[] = [p];
  const sArr: number[] = [0];
  const bounces: Bounce[] = [];
  let s = 0;
  let lastEdge = -1;
  let turned = false;
  let turnAt: PathResult['turnAt'];
  const push = (q: Vec) => {
    s += dist(points[points.length - 1], q);
    points.push(q);
    sArr.push(s);
  };
  const done = (outcome: Outcome, pocket?: number): PathResult => ({
    points,
    s: sArr,
    bounces,
    turnAt,
    outcome,
    pocket,
    length: s,
  });

  for (let step = 0; step < 64; step++) {
    // Next cushion along the ray (ignore the edge we're leaving from).
    let tWall = Infinity;
    let wall = -1;
    for (let i = 0; i < table.poly.length; i++) {
      if (i === lastEdge) continue;
      const [a, b] = edgeOf(table.poly, i);
      const t = raySegment(p, d, a, b, 1e-7);
      if (t !== null && t < tWall) {
        tWall = t;
        wall = i;
      }
    }
    if (wall < 0) return done('stuck');
    const remaining = shot.reach - s;
    const tEnd = Math.min(tWall, remaining);

    // Events before the wall, earliest wins.
    let best: { t: number; kind: 'pocket' | 'pool' | 'vane'; i: number } | null = null;
    table.pockets.forEach((pk, i) => {
      const t = closestT(p, d, pk.c, 0, tEnd);
      if (dist(add(p, scale(d, t)), pk.c) <= pk.r + 1e-9) {
        const tIn = rayCircleEnter(p, d, pk.c, pk.r, 0, tEnd) ?? t;
        if (!best || tIn < best.t) best = { t: tIn, kind: 'pocket', i };
      }
    });
    table.pools.forEach((pl, i) => {
      const t = rayCircleEnter(p, d, pl.c, pl.r, 0, tEnd);
      if (t !== null && (!best || t < best.t)) best = { t, kind: 'pool', i };
    });
    if (table.vane && !turned && shot.turn !== undefined) {
      const vn = table.vane;
      const t = closestT(p, d, vn.p, 0, tEnd);
      if (t > 1e-6 && dist(add(p, scale(d, t)), vn.p) <= vn.r && (!best || t < best.t)) {
        best = { t, kind: 'vane', i: 0 };
      }
    }
    const ev = best as { t: number; kind: 'pocket' | 'pool' | 'vane'; i: number } | null;
    if (ev) {
      if (ev.kind === 'pocket') {
        push(add(p, scale(d, ev.t)));
        push(table.pockets[ev.i].c);
        return done('pocket', ev.i);
      }
      if (ev.kind === 'pool') {
        push(add(p, scale(d, ev.t)));
        return done('pool');
      }
      // Vane: the stone pivots on the vane and leaves turned by the set angle.
      const vn = table.vane!;
      push(vn.p);
      turned = true;
      const h = heading(d) + vn.sign * (shot.turn ?? 0);
      turnAt = { p: vn.p, s, turn: shot.turn ?? 0 };
      p = vn.p;
      d = dir(h);
      lastEdge = -1;
      continue;
    }

    if (remaining < tWall) {
      push(add(p, scale(d, remaining)));
      return done('short');
    }
    const hit = add(p, scale(d, tWall));
    push(hit);
    const [a, b] = edgeOf(table.poly, wall);
    const ed = sub(b, a);
    bounces.push({ p: hit, edge: wall, angle: angleToLine(d, ed), s });
    if (bounces.length > MAX_BOUNCES) return done('short');
    d = norm(reflect(d, ed));
    p = hit;
    lastEdge = wall;
  }
  return done('stuck');
}

/** Interior angle sum of an n-gon: (n − 2)·180°. */
export const polygonAngleSum = (n: number): number => (n - 2) * 180;
/** Interior angle of a regular n-gon. */
export const regularInterior = (n: number): number => polygonAngleSum(n) / n;
/** Third angle of a triangle. */
export const triangleThird = (a: number, b: number): number => 180 - a - b;
/** Adjacent angle on a straight line. */
export const adjacent = (a: number): number => 180 - a;
/** Exterior angle of a triangle = sum of the two remote interior angles. */
export const exterior = (a: number, b: number): number => a + b;

/** Interior angle of a polygon at vertex i, in degrees (polygon counter-clockwise). */
export function interiorAngle(poly: Vec[], i: number): number {
  const n = poly.length;
  const prev = poly[(i + n - 1) % n];
  const cur = poly[i];
  const next = poly[(i + 1) % n];
  const a = heading(sub(prev, cur));
  const b = heading(sub(next, cur));
  return wrap(a - b);
}

/** Build a closed polygon from interior angles (counter-clockwise) and all but two side lengths. */
export function polygonFromAngles(start: Vec, startHeading: number, interior: number[], sides: number[]): Vec[] {
  // Walk side i from vertex i to i+1; turn left by the exterior angle at vertex i+1.
  // sides has n−2 lengths; the last two are solved so the polygon closes.
  const n = interior.length;
  const headings: number[] = [];
  let h = startHeading;
  for (let i = 0; i < n; i++) {
    headings.push(h);
    h += 180 - interior[(i + 1) % n];
  }
  let sum = v(0, 0);
  for (let i = 0; i < n - 2; i++) sum = add(sum, scale(dir(headings[i]), sides[i]));
  // Solve a·u + b·w = −sum for the last two sides.
  const u = dir(headings[n - 2]);
  const w = dir(headings[n - 1]);
  const den = cross(u, w);
  const target = scale(sum, -1);
  const a = cross(target, w) / den;
  const b = cross(u, target) / den;
  const all = [...sides.slice(0, n - 2), a, b];
  const pts: Vec[] = [start];
  let p = start;
  for (let i = 0; i < n - 1; i++) {
    p = add(p, scale(dir(headings[i]), all[i]));
    pts.push(p);
  }
  return pts;
}

/** Intersection of two infinite lines (p + t·d). */
export function lineIntersect(p: Vec, d: Vec, q: Vec, e: Vec): Vec {
  const t = cross(sub(q, p), e) / cross(d, e);
  return add(p, scale(d, t));
}
