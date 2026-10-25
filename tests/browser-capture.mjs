// Real-browser playthrough + screenshots through real inputs (keyboard, mouse drag, touch).
// Needs the dev server on :5213 (npm run dev).  Usage: node tests/browser-capture.mjs [outDir]
// Game time is stepped with window.advanceTime, so captures are deterministic.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const out = process.argv[2] ?? 'docs/captures';
mkdirSync(out, { recursive: true });
const base = 'http://localhost:5213/';
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const errors = [];
const report = [];
const log = (...a) => {
  console.log(...a);
  report.push(a.join(' '));
};

async function open(viewport, query = '', touch = false) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: 1, hasTouch: touch, isMobile: touch });
  const p = await ctx.newPage();
  p.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  p.on('pageerror', (e) => errors.push(String(e)));
  await p.goto(base + query);
  await p.waitForFunction(() => typeof window.render_game_to_text === 'function' && window.bankShot?.world());
  await p.waitForTimeout(600);
  return p;
}
const state = (p) => p.evaluate(() => JSON.parse(window.render_game_to_text()));
const adv = (p, ms) => p.evaluate((m) => window.advanceTime(m), ms);
const shot = (p, name) => p.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 85 });

/** Turn the dial to `target` with the arrow keys (↑ +1, ↓ −1, Shift for 10). */
async function dialTo(p, target) {
  let s = await state(p);
  let d = target - s.dial.value;
  while (Math.abs(d) >= 10) {
    await p.keyboard.press(d > 0 ? 'Shift+ArrowUp' : 'Shift+ArrowDown');
    d += d > 0 ? -10 : 10;
  }
  for (let i = 0; i < Math.abs(d); i++) await p.keyboard.press(d > 0 ? 'ArrowUp' : 'ArrowDown');
  s = await state(p);
  return s.dial.value;
}
/** Hold Space for `ms` of game time, release. */
async function strike(p, ms = 1000) {
  await p.keyboard.down('Space');
  await adv(p, ms);
  await p.keyboard.up('Space');
}
/** Step until the shot settles; returns the final state. */
async function settle(p, maxMs = 20000) {
  for (let t = 0; t < maxMs; t += 200) {
    await adv(p, 200);
    const s = await state(p);
    if (s.phase !== 'roll') return s;
  }
  return state(p);
}

const SOL = { r1: 50, r2: 35, r3a: 55, r3b: 51, r4: 65, r5: 35, r6: 115, r7: 35 };
const W = { width: 1672, height: 941 }; // the mockups' size

// 01 — first 30 seconds: title → play → dial 50° on room 1.
let p = await open(W);
await adv(p, 600);
await shot(p, '00-title');
await p.click('#btn-play');
await adv(p, 400);
await dialTo(p, 50);
await adv(p, 300);
await shot(p, '01-first-30s');
let s = await state(p);
log('room 1 aiming:', s.room.code, 'dial', s.dial.value, 'givens', s.givens.map((g) => g.label).join(','));

// 03 — failure: 130° (the carved number) on room 1.
await dialTo(p, 130);
await strike(p);
s = await settle(p);
await adv(p, 900);
await shot(p, '03-failure');
log('room 1 at 130°:', s.shot.outcome, '| strokes left', s.strokes.left, '|', s.result?.reason);

// Retry with R, then the deduced 50°.
await p.keyboard.press('KeyR');
await adv(p, 200);
await dialTo(p, 50);
await strike(p);
for (let i = 0; i < 40; i++) {
  await adv(p, 100);
  if ((await p.$eval('#slowmo', (e) => !e.classList.contains('hidden'))) === true) break;
}
await shot(p, '01b-slowmo-drop');
s = await settle(p);
await adv(p, 600);
await shot(p, '01c-win-card');
log('room 1 at 50°:', s.shot.outcome, 'stars', s.stars[0]);

// 02 — mid-play on the hexagon: strike 35° and capture during the slow-motion last bounce.
p = await open(W, '?level=6');
await adv(p, 300);
await dialTo(p, 35);
await strike(p);
for (let i = 0; i < 60; i++) {
  await adv(p, 80);
  if ((await p.$eval('#slowmo', (e) => !e.classList.contains('hidden'))) === true) break;
}
await adv(p, 250);
await shot(p, '02-mid-play');
s = await settle(p);
log('room 5 at 35°:', s.shot.outcome, 'bounces', s.shot.bounces.map((b) => b.angle).join(','));

// Hint on room 3א, captured.
p = await open(W, '?level=3');
await adv(p, 300);
await p.keyboard.press('KeyH');
await adv(p, 400);
await shot(p, '05-hint');
s = await state(p);
log('room 3א hint:', JSON.stringify(s.hint));

// 3ב trap: 55° misses, the explanation names the transversal.
p = await open(W, '?level=4');
await adv(p, 300);
await dialTo(p, 55);
await strike(p);
s = await settle(p);
await adv(p, 600);
await shot(p, '06-trap-miss');
log('room 3ב at 55°:', s.shot.outcome, '|', s.result?.reason);

// 04 — curling vane: aim 115°, mouse-drag check, then strike.
p = await open(W, '?level=7');
await adv(p, 300);
await dialTo(p, 115);
await adv(p, 300);
await shot(p, '04-curling');
await strike(p);
s = await settle(p);
await adv(p, 600);
await shot(p, '04b-curling-result');
log('room 6 at 115°:', s.shot.outcome, 'turn', s.shot.turn);

// Full run through all 8 tables with the deduced angles, by keyboard; Enter goes to the next room.
p = await open(W);
await p.click('#btn-play');
await adv(p, 300);
const outcomes = [];
for (let i = 0; i < 8; i++) {
  s = await state(p);
  const id = s.room.id;
  await dialTo(p, SOL[id]);
  await strike(p);
  s = await settle(p);
  outcomes.push(`${s.room.code}:${s.shot.outcome}`);
  await adv(p, 400);
  if (i < 7) {
    await p.keyboard.press('Enter');
    await adv(p, 300);
  }
}
await adv(p, 300);
await p.keyboard.press('Enter');
await adv(p, 800);
await shot(p, '07-end');
s = await state(p);
log('full run:', outcomes.join(' '), '| stars', s.stars.join(''), '| mode', s.mode);

// Mouse drag aiming: drag on the table toward a point, check the dial follows.
p = await open(W, '?level=2');
await adv(p, 300);
const target = await p.evaluate(() => {
  const w = window.bankShot.world();
  const g = window.bankShot.game();
  const b = g.room.ball;
  const a = (35 * Math.PI) / 180;
  return w.toScreen({ x: b.x + Math.cos(a) * 1.2, y: b.y + Math.sin(a) * 1.2 });
});
await p.mouse.move(target.x - 60, target.y + 40);
await p.mouse.down();
await p.mouse.move(target.x, target.y, { steps: 8 });
await p.mouse.up();
s = await state(p);
log('mouse drag on room 2 → dial', s.dial.value, '(aimed at 35°)');

// Pause + restart.
await p.keyboard.press('Escape');
s = await state(p);
log('Escape →', s.mode);
await p.click('#p-restart');
s = await state(p);
log('restart →', s.mode, s.phase, 'strokes used', s.strokes.used);

// Mobile portrait with touch: tap +, drag on the table, hold the strike button.
p = await open({ width: 390, height: 844 }, '?level=1', true);
await adv(p, 300);
await shot(p, '08-mobile-aim');
await p.tap('#btn-plus');
s = await state(p);
log('mobile tap + →', s.dial.value);
const box = await p.$eval('#btn-strike', (e) => {
  const r = e.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await dialTo(p, 50);
// Touch press-and-hold via pointer events on the strike button.
await p.evaluate(({ x, y }) => {
  const el = document.getElementById('btn-strike');
  el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y }));
}, box);
await adv(p, 1000);
await p.evaluate(({ x, y }) => {
  const el = document.getElementById('btn-strike');
  el.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch', clientX: x, clientY: y }));
}, box);
s = await settle(p);
await adv(p, 600);
await shot(p, '09-mobile-win');
log('mobile strike at 50°:', s.shot.outcome);

// Real-time FPS on room 5 (no manual clock).
p = await open({ width: 1280, height: 720 }, '?level=6');
await p.waitForTimeout(3500);
s = await state(p);
log('fps (1280×720, real time):', s.fps);

log('console errors:', errors.length ? errors.join(' | ') : 'none');
writeFileSync(`${out}/capture-log.txt`, report.join('\n') + '\n');
await browser.close();
