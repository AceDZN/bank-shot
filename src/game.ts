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
  /** First stroke in this room, no hint, never shown the worked explanation. */
  unaided: boolean;
  t: number;
}

export interface RoomScore {
  stars: number;
  strokes: number;
  hint: boolean;
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
  log: ShotRecord[] = [];
  clock = 0;

  constructor(rooms: Room[]) {
    this.rooms = rooms;
    this.scores = rooms.map(() => null);
    this.enter(0);
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
    this.hintUsed = false;
    this.hintOpen = false;
    this.workedShown = false;
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
    if (this.hintOpen) this.hintUsed = true;
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
    const out = this.path.outcome;
    const softOnly = out === 'short' && shoot(r, this.dial, 1).outcome === 'pocket';
    if (!softOnly) this.strokesUsed++;
    this.log.push({
      room: r.id,
      dial: this.dial,
      power: this.lastPower,
      outcome: out,
      stroke: this.strokesUsed,
      hint: this.hintUsed,
      unaided: this.strokesUsed === 1 && !this.hintUsed && !this.workedShown,
      t: this.clock,
    });
    if (out === 'pocket') {
      const stars = this.workedShown ? 1 : this.strokesUsed === 1 && !this.hintUsed ? 3 : this.strokesUsed <= 2 ? 2 : 1;
      const prev = this.scores[this.index];
      if (!prev || prev.stars < stars) this.scores[this.index] = { stars, strokes: this.strokesUsed, hint: this.hintUsed };
      this.explanation = null;
      this.phase = 'result';
      return;
    }
    this.explanation = softOnly ? { text: 'חלש מדי! הזווית נכונה — החזיקו את המכה עוד קצת.' } : explainMiss(r, this.dial, this.path);
    if (!softOnly && this.strokesLeft <= 0) {
      this.phase = 'worked';
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
  const splash = path.outcome === 'pool' ? ' …ונפל לאמבט.' : '';
  if (room.key && path.bounces[room.key.bounce]) {
    const got = path.bounces[room.key.bounce].angle;
    const r = Math.round(got);
    if (r !== room.key.carved) {
      return {
        mark: room.key.mark,
        measured: got,
        text: `הכדור פגע בגדה ב־${bdi(r)}, והקו החצוב דורש ${bdi(room.key.carved)}.${splash}`,
      };
    }
  }
  if (path.outcome === 'pool') {
    return { mark: room.hint?.marks[0], text: `${bdi(dial)} שלח את הכדור לאמבט. בדקו שוב איזו זווית שווה לזווית החצובה.` };
  }
  if (room.mode === 'vane') return { mark: 'need', text: `סיבוב של ${bdi(dial)} לא מוביל לבית. הסיבוב נמדד מהמשך הקו הישר.` };
  const diff = dial - room.solution;
  return {
    mark: room.hint?.marks[0],
    text: Math.abs(diff) <= 3 ? `כמעט! ${bdi(dial)} עובר ליד חור הניקוז. עין לא מספיקה כאן — חשבו את הזווית.` : `${bdi(dial)} לא מוביל לחור. מה אומרות הזוויות החצובות?`,
  };
}

const bdi = (n: number) => `<bdi dir="ltr">${n}°</bdi>`;
