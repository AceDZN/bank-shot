import { test } from 'node:test';
import assert from 'node:assert/strict';
import { explainMiss, Game } from '../src/game.ts';
import { authoredRooms, shoot } from '../src/levels.ts';
import { freshRoom, freshRooms, isFair } from '../src/variants.ts';

test('first-stroke unaided sink earns three stars and logs as unaided', () => {
  const g = new Game(authoredRooms());
  g.setDial(50);
  assert.ok(g.strike(1));
  g.settle();
  assert.equal(g.won, true);
  assert.equal(g.scores[0]?.stars, 3);
  assert.equal(g.log[0].unaided, true);
});

test('a hint caps the room at two stars and is logged', () => {
  const g = new Game(authoredRooms());
  assert.equal(g.toggleHint(), true);
  g.setDial(50);
  g.strike(1);
  g.settle();
  assert.equal(g.scores[0]?.stars, 2);
  assert.equal(g.log[0].hint, true);
  assert.equal(g.log[0].unaided, false);
});

test('the wrong-side 130° goes in the bath, costs a stroke and explains the adjacent angle', () => {
  const g = new Game(authoredRooms());
  g.setDial(130);
  g.strike(1);
  assert.equal(g.path?.outcome, 'pool');
  g.settle();
  assert.equal(g.phase, 'result');
  assert.equal(g.strokesUsed, 1);
  assert.match(g.explanation!.text, /130/);
  assert.equal(g.explanation!.mark, 'given');
  g.retry();
  assert.equal(g.phase, 'aim');
  g.setDial(50);
  g.strike(1);
  g.settle();
  assert.equal(g.scores[0]?.stars, 2);
});

test('a soft strike at the right angle stops short and costs no stroke', () => {
  const g = new Game(authoredRooms());
  g.setDial(50);
  g.strike(0.4);
  g.settle();
  assert.equal(g.path?.outcome, 'short');
  assert.equal(g.strokesUsed, 0);
  assert.match(g.explanation!.text, /חלש/);
});

test('three misses open the worked explanation; afterwards a sink scores one star', () => {
  const g = new Game(authoredRooms());
  for (const a of [40, 60, 70]) {
    if (g.phase !== 'aim') g.retry();
    g.setDial(a);
    g.strike(1);
    g.settle();
  }
  assert.equal(g.phase, 'worked');
  g.retry();
  assert.equal(g.strokesLeft, 3);
  g.setDial(50);
  g.strike(1);
  g.settle();
  assert.equal(g.scores[0]?.stars, 1);
});

test('restarting a room keeps its misses and hint: no farming three stars after seeing the answer', () => {
  const rooms = authoredRooms();
  const g = new Game(rooms);
  const i = rooms.findIndex((r) => r.id === 'r3b');
  g.enter(i);
  // 55° (the parallel slip) and 47° (whose card quotes the measured cushion angle).
  for (const a of [55, 47]) {
    if (g.phase !== 'aim') g.retry();
    g.setDial(a);
    g.strike(1);
    g.settle();
  }
  g.enter(i); // pause → restart room
  assert.equal(g.strokesLeft, 3);
  g.setDial(51);
  g.strike(1);
  g.settle();
  assert.equal(g.scores[i]?.stars, 1);
  assert.equal(g.log.at(-1)!.unaided, false);
  assert.equal(g.log.at(-1)!.corrected, true);
  // Replaying the won room can't raise the score either.
  g.enter(i);
  g.setDial(51);
  g.strike(1);
  g.settle();
  assert.equal(g.scores[i]?.stars, 1);
  assert.equal(g.log.at(-1)!.replay, true);
});

test('a miss on a different cushion never quotes that cushion against the carved angle', () => {
  const rooms = authoredRooms();
  for (const r of rooms.filter((x) => x.key)) {
    for (let a = r.min; a <= r.max; a++) {
      const p = shoot(r, a);
      if (p.outcome === 'pocket') continue;
      const ex = explainMiss(r, a, p);
      if (ex.measured !== undefined) assert.equal(p.bounces[r.key!.bounce].edge, r.key!.edge, `${r.id} at ${a}`);
    }
  }
});

test('miss texts never tell a non-equality room to look for an equal angle, and never say "almost"', () => {
  for (const r of authoredRooms()) {
    for (let a = r.min; a <= r.max; a += 7) {
      const p = shoot(r, a);
      if (p.outcome === 'pocket') continue;
      const t = explainMiss(r, a, p).text;
      assert.doesNotMatch(t, /כמעט/);
      assert.doesNotMatch(t, /שווה לזווית החצובה/);
    }
  }
});

test('the corridor miss names the angle at which the ball met the top cushion', () => {
  const rooms = authoredRooms();
  const g = new Game(rooms);
  g.enter(rooms.findIndex((r) => r.id === 'r3a'));
  g.setDial(58);
  g.strike(1);
  g.settle();
  assert.match(g.explanation!.text, /58/);
  assert.match(g.explanation!.text, /55/);
});

test('the transfer room has no hint lamp', () => {
  const rooms = authoredRooms();
  const g = new Game(rooms);
  g.enter(rooms.length - 1);
  assert.equal(g.toggleHint(), false);
});

test('the dial snaps to whole degrees and stays in range', () => {
  const g = new Game(authoredRooms());
  g.setDial(49.6);
  assert.equal(g.dial, 50);
  g.setDial(500);
  assert.equal(g.dial, g.room.max);
  g.setDial(-3);
  assert.equal(g.dial, g.room.min);
});

test('the dial is locked while the ball rolls', () => {
  const g = new Game(authoredRooms());
  g.setDial(50);
  g.strike(1);
  g.setDial(70);
  assert.equal(g.dial, 50);
  assert.equal(g.strike(1), null);
});

test('fresh rooms: every generated room is fair and constant 45° never wins a whole run', () => {
  for (const seed of [1, 2, 3, 17, 2026]) {
    const rooms = freshRooms(seed);
    assert.equal(rooms.length, 8);
    for (const r of rooms) {
      assert.ok(isFair(r), `${r.id} not fair`);
      assert.notEqual(shoot(r, 45).outcome, 'pocket');
    }
  }
});

test('fresh rooms actually change the numbers', () => {
  const sols = new Set<number>();
  for (let s = 1; s <= 8; s++) sols.add(freshRoom(0, s).solution);
  assert.ok(sols.size >= 3, `only ${[...sols]}`);
});
