// Turn state for one run through the rooms: dial, strokes, hints, stars and the learning log.
// Pure: the scene asks this module what happened and animates it.

import { type PathResult } from './rules.ts';
import { STROKES, shoot, type Room } from './levels.ts';

export type Phase = 'aim' | 'roll' | 'result' | 'worked' | 'done';

export interface ShotRecord {
  room: string;
  dial: number;
  power: number;
  outcome: PathResult['outcome'];
  stroke: number;
  hint: boolean;
  /** First stroke in this room in this run: no earlier miss, no hint, no worked explanation, not a replay. */
  unaided: boolean;
  /** A sink after a miss whose card quoted the measured cushion angle: may be correction, not deduction. */
  corrected: boolean;
  /** Replaying a room already won in this run (doesn't change the score). */
  replay: boolean;
  t: number;
}

export interface RoomScore {
  stars: number;
  strokes: number;
  hint: boolean;
  unaided: boolean;
}

/** Everything a room remembers for the whole run, so restarting it doesn't wipe misses or hints. */
interface RoomHistory {
  misses: number;
  hint: boolean;
  worked: boolean;
  keyFeedback: boolean;
  won: boolean;
}

export interface Explanation {
  /** Mark to circle on the ghost path. */
  mark?: string;
  /** Hebrew, may contain <bdi> spans. */
  text: string;
  /** The ghost path met the key cushion at this angle (vs the carved one). */
  measured?: number;
}

export class Game {
  rooms: Room[];
  index = 0;
  dial = 90;
  phase: Phase = 'aim';
  strokesUsed = 0;
  hintUsed = false;
  hintOpen = false;
  workedShown = false;
  path: PathResult | null = null;
  lastPower = 1;
  explanation: Explanation | null = null;
  scores: (RoomScore | null)[];
  history: RoomHistory[];
  log: ShotRecord[] = [];
  clock = 0;

  constructor(rooms: Room[]) {
    this.rooms = rooms;
    this.scores = rooms.map(() => null);
    this.history = rooms.map(() => ({ misses: 0, hint: false, worked: false, keyFeedback: false, won: false }));
    this.enter(0);
  }

  get past(): RoomHistory {
    return this.history[this.index];
  }

  /** Stars a sink would earn right now. */
  get potentialStars(): number {
    const h = this.past;
    if (h.worked) return 1;
    if (h.misses === 0 && !h.hint) return 3;
    return h.misses <= 1 ? 2 : 1;
  }

  get room(): Room {
    return this.rooms[this.index];
  }

  get strokesLeft(): number {
    return STROKES - this.strokesUsed;
  }

  enter(i: number): void {
    this.index = Math.max(0, Math.min(this.rooms.length - 1, i));
    this.dial = 90;
    this.phase = 'aim';
    this.strokesUsed = 0;
    this.hintUsed = this.past.hint;
    this.hintOpen = false;
    this.workedShown = this.past.worked;
    this.path = null;
    this.explanation = null;
  }

  setDial(a: number): void {
    if (this.phase !== 'aim') return;
    this.dial = Math.max(this.room.min, Math.min(this.room.max, Math.round(a)));
  }

  nudge(d: number): void {
    this.setDial(this.dial + d);
  }

  /** Light the relevant pair of angles and name the rule. Never the number. */
  toggleHint(): boolean {
    if (!this.room.hint || this.phase !== 'aim') return false;
    this.hintOpen = !this.hintOpen;
    if (this.hintOpen) this.hintUsed = this.past.hint = true;
    return true;
  }

  /** Strike. Returns the path to animate. A soft strike that stops short costs no stroke. */
  strike(power: number): PathResult | null {
    if (this.phase !== 'aim') return null;
    const p = Math.max(0.05, Math.min(1, power));
    this.lastPower = p;
    this.path = shoot(this.room, this.dial, p);
    this.hintOpen = false;
    this.phase = 'roll';
    return this.path;
  }

  /** The ball came to rest (or dropped). Settle strokes, stars and the explanation. */
  settle(): void {
    if (this.phase !== 'roll' || !this.path) return;
    const r = this.room;
    const h = this.past;
    const out = this.path.outcome;
    const softOnly = out === 'short' && shoot(r, this.dial, 1).outcome === 'pocket';
    if (!softOnly) this.strokesUsed++;
    const unaided = out === 'pocket' && h.misses === 0 && !h.hint && !h.worked && !h.won;
    this.log.push({
      room: r.id,
      dial: this.dial,
      power: this.lastPower,
      outcome: out,
      stroke: this.strokesUsed,
      hint: this.hintUsed,
      unaided,
      corrected: out === 'pocket' && !unaided && h.keyFeedback,
      replay: h.won,
      t: this.clock,
    });
    if (out === 'pocket') {
      // A replay of a won room is practice: it never raises the score.
      if (!h.won) this.scores[this.index] = { stars: this.potentialStars, strokes: this.strokesUsed, hint: h.hint, unaided };
      h.won = true;
      this.explanation = null;
      this.phase = 'result';
      return;
    }
    this.explanation = softOnly ? { text: r.stone ? 'חלשה מדי! הזווית נכונה — החזיקו את המכה עוד קצת.' : 'חלש מדי! הזווית נכונה — החזיקו את המכה עוד קצת.' } : explainMiss(r, this.dial, this.path);
    if (!softOnly) {
      h.misses++;
      if (this.explanation.measured !== undefined) h.keyFeedback = true;
      if (out === 'short' && this.lastPower < 0.75) this.explanation.text += ' (וגם המכה הייתה חלשה.)';
    }
    if (!softOnly && this.strokesLeft <= 0) {
      this.phase = 'worked';
      h.worked = true;
      return;
    }
    this.phase = 'result';
  }

  /** After a miss: back to aiming with the same dial. */
  retry(): void {
    if (this.phase === 'worked') {
      this.workedShown = true;
      this.strokesUsed = 0;
    }
    this.phase = 'aim';
    this.path = null;
    this.explanation = null;
  }

  get won(): boolean {
    return this.phase === 'result' && this.path?.outcome === 'pocket';
  }

  next(): void {
    if (this.index >= this.rooms.length - 1) {
      this.phase = 'done';
      return;
    }
    this.enter(this.index + 1);
  }

  get totalStars(): number {
    return this.scores.reduce((s, x) => s + (x?.stars ?? 0), 0);
  }
}

/** Say where the reasoning split from the true line, without handing over the number. */
export function explainMiss(room: Room, dial: number, path: PathResult): Explanation {
  const m = room.misconceptions.find((x) => x.angle === dial);
  if (m) return { mark: m.mark, text: m.text };
  const ball = room.stone ? 'האבן' : 'הכדור';
  const splash = path.outcome === 'pool' ? (room.stone ? ' …ונפלה לאמבט.' : ' …ונפל לאמבט.') : '';
  // Quote the measured angle only where the true line meets the carved cushion.
  const k = room.key;
  const hit = k ? path.bounces[k.bounce] : undefined;
  if (k && hit && hit.edge === k.edge) {
    const r = Math.round(hit.angle);
    if (r !== k.carved) {
      const where = room.stone ? 'פגעה בקיר הזה' : 'פגע בגדה הזו';
      return { mark: k.mark, measured: hit.angle, text: `${ball} ${where} ב־${bdi(r)}, והזווית החצובה כאן היא ${bdi(k.carved)}.${splash}` };
    }
  }
  if (k && hit && hit.edge !== k.edge) {
    return { mark: k.mark, text: `${ball} ${room.stone ? 'פגעה בקיר אחר' : 'פגע בגדה אחרת'} — לא בזו שעליה חצובה הזווית.${splash} חזרו לכלל של החדר: ${room.rule}.` };
  }
  if (room.mode === 'vane') return { mark: 'need', text: `בסיבוב של ${bdi(dial)} האבן לא מגיעה לבית. הסיבוב נמדד מהמשך הקו הישר.${splash}` };
  const lead = path.outcome === 'pool' ? `ב־${bdi(dial)} ${ball} ${room.stone ? 'נפלה' : 'נפל'} לאמבט.` : `ב־${bdi(dial)} ${ball} ${room.stone ? 'לא מגיעה' : 'לא מגיע'} ל${room.stone ? 'בית' : 'חור'}.`;
  return { mark: room.hint?.marks[0] ?? room.key?.mark, text: `${lead} חזרו לכלל של החדר: ${room.rule}.` };
}

const bdi = (n: number) => `<bdi dir="ltr">${n}°</bdi>`;
