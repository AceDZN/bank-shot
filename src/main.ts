import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import '@fontsource/rubik/800.css';
import '@fontsource/rubik/900.css';
import './style.css';
import * as THREE from 'three';
import { Game } from './game.ts';
import { authoredRooms, BALL_R, reachOf, STROKES, type Room } from './levels.ts';
import { freshRooms } from './variants.ts';
import { World, type ShotAnim } from './scene.ts';
import { loadModels } from './models.ts';
import { initAudio, isMuted, setMuted, sfx, suspendAudio } from './audio.ts';
import { heading, sub, v, type Vec } from './rules.ts';
import { initHost, parseLevelParam, postToHost } from './host.ts';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

const SAVE_KEY = 'bank-shot-save-v1';
const LOG_KEY = 'bank-shot-log-v1';

interface Save {
  stars: Record<string, number>;
  muted: boolean;
  reduced: boolean;
}
function loadSave(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '');
    return { stars: s.stars ?? {}, muted: !!s.muted, reduced: !!s.reduced };
  } catch {
    return { stars: {}, muted: false, reduced: matchMedia('(prefers-reduced-motion: reduce)').matches };
  }
}
const save = loadSave();
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    /* private mode */
  }
}
function persistLog(rec: object) {
  try {
    const arr = JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]');
    arr.push(rec);
    localStorage.setItem(LOG_KEY, JSON.stringify(arr.slice(-500)));
  } catch {
    /* ignore */
  }
}

// ─── State ───────────────────────────────────────────────────────────────────────────────────
type Mode = 'title' | 'play' | 'paused' | 'done';
let mode: Mode = 'title';
let game = new Game(authoredRooms());
let fresh = false;
let world: World;
let anim: (ShotAnim & { reach: number; v0: number; endT: number; t: number; phase: 'roll' | 'drop' | 'sink' | 'rest' }) | null = null;
let charging = false;
let charge = 0;
let manualClock = false;
let goalTimer = 0;
let resultShown = false;

const canvas = $<HTMLCanvasElement>('game');

// ─── Boot ────────────────────────────────────────────────────────────────────────────────────
async function boot() {
  initHost('bank-shot');
  await Promise.all([document.fonts.load('800 120px Rubik'), document.fonts.load('700 34px Rubik')]).catch(() => undefined);
  const models = await loadModels((d, t) => ($('loading').textContent = `מדליקים את המנורות… ${d}/${t}`));
  world = new World(canvas, models);
  world.reducedMotion = save.reduced;
  setMuted(save.muted);
  syncSoundBtn();
  resize();
  world.buildRoom(game.room);
  world.setDial(game.dial);
  world.showAim(false);
  $('loading').classList.add('hidden');
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    $('glerror').classList.remove('hidden');
  });
  // ?fresh=SEED plays a generated run (same seed → same tables).
  const freshSeed = new URLSearchParams(location.search).get('fresh');
  if (freshSeed !== null && /^\d+$/.test(freshSeed)) {
    fresh = true;
    game = new Game(freshRooms(Number(freshSeed)));
  }
  const deep = parseLevelParam(location.search, game.rooms.length);
  if (deep !== null) startRoom(deep);
  else if (fresh) startRoom(0);
  postToHost({ type: 'ready' });
  requestAnimationFrame(frame);
}

function resize() {
  if (!world) return;
  if (world.resize(window.innerWidth, window.innerHeight)) {
    // The table was rebuilt for the new orientation: restore what's on it.
    world.setDial(game.dial);
    world.showAim(game.phase === 'aim');
    world.setHint(game.hintOpen ? (game.room.hint?.marks ?? []) : []);
    if (game.path && game.phase !== 'aim' && !anim) world.showGhost(game.path);
  }
}
window.addEventListener('resize', resize);

// ─── Rooms ───────────────────────────────────────────────────────────────────────────────────
function startRoom(i: number) {
  mode = 'play';
  $('title').classList.add('hidden');
  $('overlay').classList.add('hidden');
  $('hud').classList.remove('hidden');
  game.enter(i);
  world.buildRoom(game.room);
  enterAim();
  showGoal();
  postToHost({ type: 'level-start', level: game.index + 1 });
}

function enterAim() {
  anim = null;
  resultShown = false;
  world.clearRun();
  world.ball.visible = true;
  world.ball.scale.setScalar(1);
  world.placeBall(game.room.ball);
  world.setDial(game.dial);
  world.showAim(true);
  world.setHint(game.hintOpen ? (game.room.hint?.marks ?? []) : []);
  world.pushTo(null, 0);
  hideCard();
  updateHud();
}

function showGoal() {
  const r = game.room;
  const g = $('goal');
  g.innerHTML = `<b>${r.goal}</b>`;
  g.classList.remove('hidden');
  goalTimer = 6;
}

// ─── HUD ─────────────────────────────────────────────────────────────────────────────────────
function updateHud() {
  const r = game.room;
  $('room-title').textContent = `חדר ${r.code} · ${r.name}`;
  $('fact').textContent = r.factName;
  $('rule').classList.toggle('hidden', r.mode === 'vane');
  $('rule').textContent = r.stone ? 'חוק החדר: האבן יוצאת מהקיר באותה זווית שבה פגעה בו' : 'חוק השולחן: הכדור יוצא מהגדה באותה זווית שבה פגע בה';
  $('angle').textContent = `${game.dial}°`;
  $('angle-cap').textContent = r.mode === 'vane' ? 'סיבוב הפלטה' : r.stone ? 'זווית לקיר' : r.fact === 'vertical' ? 'זווית לקו האריחים' : 'זווית לגדה';
  const tokens = $('tokens');
  tokens.innerHTML = '';
  for (let i = 0; i < STROKES; i++) {
    const t = document.createElement('span');
    t.className = `tok${r.stone ? ' stone' : ''}${i < game.strokesUsed ? ' used' : ''}`;
    tokens.appendChild(t);
  }
  const stars = $('stars');
  stars.innerHTML = '';
  const best = game.scores[game.index]?.stars ?? 0;
  const show = best || game.potentialStars;
  for (let i = 0; i < 3; i++) {
    const s = document.createElement('span');
    s.className = `star${i < show ? '' : ' off'}`;
    stars.appendChild(s);
  }
  const lamp = $<HTMLButtonElement>('btn-hint');
  lamp.classList.toggle('hidden', !r.hint);
  lamp.setAttribute('aria-pressed', String(game.hintOpen));
  const hc = $('hint-card');
  if (game.hintOpen && r.hint) {
    hc.innerHTML = `<b>רמז:</b> ${r.hint.text}`;
    hc.classList.remove('hidden');
  } else hc.classList.add('hidden');
  $('panel').classList.toggle('locked', game.phase !== 'aim');
}

function syncSoundBtn() {
  $('btn-sound').setAttribute('aria-pressed', String(!isMuted()));
}

function showCard(title: string, body: string, buttons: { label: string; cls: string; on: () => void }[]) {
  $('card-title').innerHTML = title;
  $('card-body').innerHTML = body;
  const b = $('card-btns');
  b.innerHTML = '';
  for (const x of buttons) {
    const el = document.createElement('button');
    el.className = `btn ${x.cls}`;
    el.innerHTML = x.label;
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      x.on();
    });
    b.appendChild(el);
  }
  $('card').classList.remove('hidden');
}
function hideCard() {
  $('card').classList.add('hidden');
}

let toastTimer = 0;
function toast(html: string, secs = 1.6) {
  const t = $('toast');
  t.innerHTML = html;
  t.classList.remove('hidden', 'pop');
  void t.offsetWidth;
  t.classList.add('pop');
  toastTimer = secs;
}

// ─── Dial and strike ─────────────────────────────────────────────────────────────────────────
function setDial(a: number) {
  const before = game.dial;
  game.setDial(a);
  if (game.dial !== before) {
    sfx.tick();
    world.setDial(game.dial);
    $('angle').textContent = `${game.dial}°`;
    if (goalTimer > 1.5) goalTimer = 1.5;
  }
}

function beginCharge() {
  if (mode !== 'play' || game.phase !== 'aim' || charging) return;
  initAudio();
  charging = true;
  charge = 0;
  $('btn-strike').classList.add('charging');
}

function releaseCharge() {
  if (!charging) return;
  charging = false;
  $('btn-strike').classList.remove('charging');
  strike(charge);
}

function strike(power: number) {
  const path = game.strike(power);
  if (!path) return;
  const r = game.room;
  const reach = reachOf(r, game.lastPower);
  const T = 1.3 + reach * 0.4;
  const v0 = (2 * reach) / T;
  anim = {
    path,
    s: 0,
    speed: v0,
    decel: v0 / T,
    nextBounce: 0,
    turned: false,
    dropT: 0,
    done: false,
    slowmo: false,
    reach,
    v0,
    endT: T,
    t: 0,
    phase: 'roll',
  };
  world.showAim(false);
  world.setHint([]);
  world.clearGhost();
  world.clearRun();
  hideCard();
  $('goal').classList.add('hidden');
  $('hint-card').classList.add('hidden');
  updateHud();
  sfx.clack(0.5 + power * 0.5);
  world.shake = 0.04 + power * 0.04;
}

function posAt(path: ShotAnim['path'], s: number): Vec {
  const pts = path.points;
  for (let i = 1; i < pts.length; i++) {
    if (path.s[i] >= s) {
      const f = (s - path.s[i - 1]) / (path.s[i] - path.s[i - 1] || 1);
      return v(pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f);
    }
  }
  return pts[pts.length - 1];
}

/** Advance the rolling ball. dt is already scaled by slow motion. */
function stepShot(dt: number) {
  if (!anim) return;
  const a = anim;
  const path = a.path;
  const r = game.room;
  if (a.phase === 'roll') {
    a.t += dt;
    const sNow = Math.min(a.v0 * a.t - 0.5 * a.decel * a.t * a.t, a.reach);
    const prevS = a.s;
    a.s = Math.min(sNow, path.length);
    const p = posAt(path, a.s);
    world.placeBall(p);
    // Roll the ball (or spin the stone).
    const ds = a.s - prevS;
    if (ds > 0) {
      const q = posAt(path, Math.max(0, a.s - 0.01));
      const h = heading(sub(p, q));
      if (r.stone) world.ball.rotation.y += ds * 2;
      else {
        const axis = new THREE.Vector3(-Math.sin(h * (Math.PI / 180)), 0, -Math.cos(h * (Math.PI / 180)));
        world.ballMesh.rotateOnWorldAxis(axis, ds / BALL_R);
      }
    }
    world.drawRun(path, a.s);
    // Bounces.
    while (a.nextBounce < path.bounces.length && path.bounces[a.nextBounce].s <= a.s) {
      const b = path.bounces[a.nextBounce++];
      sfx.tock();
      world.sparkle(b.p);
      world.addBounceLabel(b.p, b.angle);
      world.shake = Math.max(world.shake, 0.03);
    }
    if (path.turnAt && !a.turned && path.turnAt.s <= a.s) {
      a.turned = true;
      sfx.clang();
      world.sparkle(path.turnAt.p);
      world.addBounceLabel(path.turnAt.p, path.turnAt.turn);
    }
    // Slow motion for the last bounce of a shot that is going in.
    if (path.outcome === 'pocket' && !a.slowmo) {
      const last = path.bounces[path.bounces.length - 1]?.s ?? path.turnAt?.s ?? 0;
      const from = Math.max(last - 0.35, path.length - 0.9);
      if (a.s >= from) {
        a.slowmo = true;
        $('slowmo').classList.remove('hidden');
      }
    }
    world.pushTo(a.slowmo ? path.points[path.points.length - 1] : p, a.slowmo ? 0.55 : 0.18);
    if (a.s >= path.length - 1e-6) {
      if (path.outcome === 'pocket') {
        a.phase = 'drop';
        a.t = 0;
        sfx.plonk();
        world.sparkle(path.points[path.points.length - 1]);
      } else if (path.outcome === 'pool') {
        a.phase = 'sink';
        a.t = 0;
        sfx.plop();
        world.splash(p);
      } else {
        a.phase = 'rest';
        a.t = 0;
      }
    }
  } else if (a.phase === 'drop') {
    a.t += dt;
    const f = Math.min(1, a.t / 0.45);
    world.ball.position.y = (r.stone ? 0 : BALL_R) - f * 0.16;
    world.ball.scale.setScalar(1 - f * 0.4);
    if (f >= 1) finishShot();
  } else if (a.phase === 'sink') {
    a.t += dt;
    const f = Math.min(1, a.t / 0.4);
    world.ball.position.y = BALL_R - f * 0.2;
    if (f >= 1) {
      world.ball.visible = false;
      finishShot();
    }
  } else {
    a.t += dt;
    if (a.t > 0.35) finishShot();
  }
}

function finishShot() {
  if (!anim || resultShown) return;
  resultShown = true;
  $('slowmo').classList.add('hidden');
  const path = anim.path;
  game.settle();
  const rec = game.log[game.log.length - 1];
  if (rec) persistLog({ ...rec, fresh, at: Date.now() });
  world.pushTo(null, 0);
  const r = game.room;
  if (game.won) {
    world.play('cheer');
    sfx.lyre();
    sfx.whistle(true);
    const sc = game.scores[game.index]!;
    if (!fresh) {
      save.stars[r.id] = Math.max(save.stars[r.id] ?? 0, sc.stars);
      persist();
    }
    toast(`${'★'.repeat(sc.stars)}<br>נכנס!`);
    const last = game.index >= game.rooms.length - 1;
    const angles = path.bounces.map((b) => `<bdi dir="ltr">${Math.round(b.angle)}°</bdi>`).join(' · ');
    showCard(
      sc.stars === 3 ? 'מכה מושלמת!' : 'נכנס!',
      `${r.mode === 'vane' ? 'הפלטה סובבה את האבן' : r.stone ? 'הזוויות בקירות' : 'הזוויות בגדות'}: ${angles || `<bdi dir="ltr">${game.dial}°</bdi>`}<br>${unaidedLine()}`,
      [
        { label: last ? 'לסיום' : 'לחדר הבא ←', cls: 'gold', on: () => nextRoom() },
        { label: 'שוב', cls: 'dark', on: () => replayRoom() },
      ],
    );
    postToHost({ type: 'level-complete', level: game.index + 1, stars: sc.stars });
  } else {
    world.showGhost(path);
    const ex = game.explanation;
    if (ex?.mark) world.setFocus(ex.mark);
    if (path.outcome === 'pool') world.play('facepalm');
    else world.play('disappointed');
    sfx.whistle(false);
    if (game.phase === 'worked') {
      showCard('דקימוס מסביר', `${ex?.text ?? ''}<span class="math">${r.worked.join('<br>')}</span>`, [
        { label: 'הבנתי — עוד ניסיון', cls: 'gold', on: () => retry() },
      ]);
    } else {
      const title = path.outcome === 'pool' ? 'פלופ! לתוך האמבט' : path.outcome === 'short' ? (r.stone ? 'נעצרה באמצע' : 'נעצר באמצע') : 'החטאה';
      showCard(title, ex?.text ?? '', [{ label: '↻ שוב', cls: 'gold', on: () => retry() }]);
    }
  }
  updateHud();
}

function unaidedLine() {
  const sc = game.scores[game.index];
  if (!sc) return '';
  if (sc.stars === 3) return 'ממכה ראשונה, בלי רמז.';
  if (sc.hint) return 'עם רמז. נסו בלי — 3 כוכבים מחכים.';
  return `במכה ${sc.strokes}.`;
}

function retry() {
  if (mode !== 'play') return;
  if (game.phase === 'aim') return;
  game.retry();
  world.clearRun();
  enterAim();
  // Keep the ghost of the last miss so you can compare.
}

function replayRoom() {
  startRoom(game.index);
}

function nextRoom() {
  game.next();
  if (game.phase === 'done') return showEnd();
  world.clearGhost();
  startRoom(game.index);
}

// ─── Screens ─────────────────────────────────────────────────────────────────────────────────
function openOverlay(html: string, wire: (box: HTMLElement) => void) {
  const box = $('panel-box');
  box.innerHTML = html;
  $('overlay').classList.remove('hidden');
  wire(box);
}

function roomsHtml(rooms: Room[]) {
  return `<div class="rooms">${rooms
    .map((r, i) => {
      const st = fresh ? (game.scores[i]?.stars ?? 0) : (save.stars[r.id] ?? 0);
      return `<button class="room-btn" data-i="${i}"><b>${r.code} · ${r.name}</b><span>${r.factName}</span><span class="stars">${[0, 1, 2]
        .map((k) => `<span class="star${k < st ? '' : ' off'}"></span>`)
        .join('')}</span></button>`;
    })
    .join('')}</div>`;
}

function showRooms() {
  openOverlay(`<h2>בחירת חדר</h2>${roomsHtml(game.rooms)}<button class="btn dark" id="ov-close">סגירה</button>`, (box) => {
    box.querySelectorAll<HTMLButtonElement>('.room-btn').forEach((b) => b.addEventListener('click', () => startRoom(Number(b.dataset.i))));
    box.querySelector('#ov-close')!.addEventListener('click', () => {
      $('overlay').classList.add('hidden');
      if (mode === 'paused') mode = 'play';
    });
  });
}

function showHow() {
  openOverlay(
    `<h2>איך משחקים?</h2>
    <p>בכל שולחן חצובות בפסיפס כמה זוויות מוזהבות. סימן <b>?</b> מראה איזו זווית חסרה לכם.</p>
    <p><b>חוק השולחן:</b> כדור שפוגע בגדה יוצא ממנה באותה זווית שבה פגע (בלי סיבוב ובלי חיכוך).</p>
    <p>קו הכיוון קצר בכוונה — בעין מגיעים קרוב, אבל רק החשבון מכניס. הסיקו את הזווית, כוונו את מד־הזווית (גרירה, <kbd>←</kbd><kbd>→</kbd> או <b>−</b>/<b>+</b>), החזיקו את <b>הכה</b> ושחררו.</p>
    <p>שלוש מכות לכל שולחן. מכה ראשונה בלי רמז = שלושה כוכבים. החטאתם? המסלול נשאר על השולחן, ועיגול מוזהב מראה איפה החשבון התפצל.</p>
    <button class="btn gold" id="ov-close">יאללה</button>`,
    (box) => box.querySelector('#ov-close')!.addEventListener('click', () => $('overlay').classList.add('hidden')),
  );
}

function pause() {
  if (mode !== 'play') return;
  mode = 'paused';
  charging = false;
  suspendAudio(true);
  openOverlay(
    `<h2>הפסקה</h2>
    <label class="toggle"><span>צלילים</span><input type="checkbox" id="t-sound" ${isMuted() ? '' : 'checked'}></label>
    <label class="toggle"><span>פחות תנועה (בלי רעידות ובלי זום)</span><input type="checkbox" id="t-reduced" ${save.reduced ? 'checked' : ''}></label>
    <div class="row"><button class="btn gold" id="p-resume">המשך</button><button class="btn dark" id="p-restart">התחלת החדר מחדש</button><button class="btn dark" id="p-rooms">חדרים</button><button class="btn dark" id="p-title">למסך הפתיחה</button></div>`,
    (box) => {
      box.querySelector<HTMLInputElement>('#t-sound')!.addEventListener('change', (e) => {
        setMuted(!(e.target as HTMLInputElement).checked);
        save.muted = isMuted();
        persist();
        syncSoundBtn();
      });
      box.querySelector<HTMLInputElement>('#t-reduced')!.addEventListener('change', (e) => {
        save.reduced = (e.target as HTMLInputElement).checked;
        world.reducedMotion = save.reduced;
        persist();
      });
      box.querySelector('#p-resume')!.addEventListener('click', resume);
      box.querySelector('#p-restart')!.addEventListener('click', () => {
        resume();
        replayRoom();
      });
      box.querySelector('#p-rooms')!.addEventListener('click', showRooms);
      box.querySelector('#p-title')!.addEventListener('click', () => {
        $('overlay').classList.add('hidden');
        $('hud').classList.add('hidden');
        $('title').classList.remove('hidden');
        suspendAudio(false);
        mode = 'title';
      });
    },
  );
}
function resume() {
  if (mode !== 'paused') return;
  $('overlay').classList.add('hidden');
  suspendAudio(false);
  mode = 'play';
}

function showEnd() {
  mode = 'done';
  $('hud').classList.add('hidden');
  const total = game.totalStars;
  const max = game.rooms.length * 3;
  const firstTries = game.scores.filter((x) => x?.unaided).length;
  openOverlay(
    `<h2>${fresh ? 'סיבוב שולחנות חדשים — הושלם!' : 'עברתם את כל בית המרחץ!'}</h2>
    <p style="font-size:28px">${'★'.repeat(Math.round((total / max) * 5))}<bdi dir="ltr"> ${total}/${max}</bdi></p>
    <p>מכות ראשונות בלי רמז: <bdi dir="ltr">${firstTries}/${game.rooms.length}</bdi>. דקימוס מסיר בפניכם את הכובע.</p>
    <p>רוצים עוד? <b>שולחנות חדשים</b> מגרילים מספרים אחרים לכל חדר — כל אחד נבדק במחשב: רק הזווית הנכונה (בסטייה של עד <bdi dir="ltr">1°</bdi>) נכנסת.</p>
    <div class="row"><button class="btn gold" id="e-fresh">שולחנות חדשים</button><button class="btn dark" id="e-again">שוב מההתחלה</button></div>`,
    (box) => {
      box.querySelector('#e-fresh')!.addEventListener('click', () => newRun(true));
      box.querySelector('#e-again')!.addEventListener('click', () => newRun(false));
    },
  );
  world.play('cheer');
  sfx.lyre([0, 4, 7, 12, 16, 19, 24]);
}

function newRun(isFresh: boolean) {
  fresh = isFresh;
  game = new Game(isFresh ? freshRooms(Date.now() % 100000) : authoredRooms());
  startRoom(0);
}

// ─── Input ───────────────────────────────────────────────────────────────────────────────────
$('btn-play').addEventListener('click', () => {
  initAudio();
  const firstUnplayed = game.rooms.findIndex((r) => !save.stars[r.id]);
  startRoom(firstUnplayed < 0 ? 0 : firstUnplayed);
});
$('btn-rooms').addEventListener('click', () => {
  initAudio();
  showRooms();
});
$('btn-how').addEventListener('click', showHow);
$('btn-pause').addEventListener('click', pause);
$('btn-sound').addEventListener('click', () => {
  initAudio();
  setMuted(!isMuted());
  save.muted = isMuted();
  persist();
  syncSoundBtn();
});
$('btn-hint').addEventListener('click', () => toggleHint());

function toggleHint() {
  if (mode !== 'play') return;
  if (game.toggleHint()) {
    world.setHint(game.hintOpen ? (game.room.hint?.marks ?? []) : []);
    if (game.hintOpen) sfx.lyre([0, 7]);
    updateHud();
  }
}

// − / + with press-and-hold repeat.
function holdRepeat(el: HTMLElement, delta: number) {
  let timer = 0;
  let wait = 0;
  const stop = () => {
    clearTimeout(timer);
    clearInterval(wait);
  };
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    initAudio();
    const step = e.shiftKey ? delta * 10 : delta;
    setDial(game.dial + step);
    timer = window.setTimeout(() => {
      wait = window.setInterval(() => setDial(game.dial + step), 70);
    }, 380);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) el.addEventListener(ev, stop);
}
holdRepeat($('btn-minus'), -1);
holdRepeat($('btn-plus'), 1);

const strikeBtn = $('btn-strike');
strikeBtn.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  strikeBtn.setPointerCapture(e.pointerId);
  beginCharge();
});
strikeBtn.addEventListener('pointerup', () => releaseCharge());
strikeBtn.addEventListener('pointercancel', () => {
  charging = false;
  strikeBtn.classList.remove('charging');
});

// Drag on the table to aim: the dial follows the direction from the pivot to the pointer.
let dragging = false;
function aimAt(clientX: number, clientY: number) {
  const r = game.room;
  const p = world.pick(clientX, clientY);
  if (!p) return;
  const pivot = r.mode === 'vane' && r.table.vane ? r.table.vane.p : r.ball;
  const d = sub(p, pivot);
  if (Math.hypot(d.x, d.y) < 0.08) return;
  const h = heading(d);
  const base = r.mode === 'vane' ? (r.lane ?? 0) : r.base;
  let a = r.dialSign === 1 || r.mode === 'vane' ? h - base : base - h;
  a = ((a % 360) + 360) % 360;
  if (a > 270) a = r.min; // dragged below the base line on the start side
  else if (a > 180) a = r.max;
  setDial(a);
}
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'play' || game.phase !== 'aim') return;
  initAudio();
  dragging = true;
  canvas.setPointerCapture(e.pointerId);
  aimAt(e.clientX, e.clientY);
});
canvas.addEventListener('pointermove', (e) => {
  if (dragging) aimAt(e.clientX, e.clientY);
});
canvas.addEventListener('pointerup', () => (dragging = false));
canvas.addEventListener('pointercancel', () => (dragging = false));

window.addEventListener('keydown', (e) => {
  if (e.repeat && e.code === 'Space') return;
  if (mode === 'title' && (e.code === 'Enter' || e.code === 'Space')) {
    $('btn-play').click();
    return;
  }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (mode === 'play') pause();
    else if (mode === 'paused') resume();
    return;
  }
  if (mode !== 'play') return;
  const big = e.shiftKey ? 10 : 1;
  // The protractor reads 0° on the right: → moves the needle toward 0°, ← toward 180°.
  const flip = game.room.dialSign === -1 ? -1 : 1;
  if (e.code === 'ArrowLeft') setDial(game.dial + big * flip);
  else if (e.code === 'ArrowRight') setDial(game.dial - big * flip);
  else if (e.code === 'ArrowUp' || e.key === '+' || e.key === '=') setDial(game.dial + big);
  else if (e.code === 'ArrowDown' || e.key === '-') setDial(game.dial - big);
  else if (e.code === 'Space') {
    e.preventDefault();
    beginCharge();
  } else if (e.code === 'KeyH') toggleHint();
  else if (e.code === 'KeyR') {
    if (game.phase === 'result' || game.phase === 'worked') {
      if (game.won) replayRoom();
      else retry();
    }
  } else if (e.code === 'Enter' || e.code === 'KeyN') {
    if (game.won) nextRoom();
    else if (game.phase === 'result' || game.phase === 'worked') retry();
  } else if (e.code === 'KeyM') $('btn-sound').click();
});
window.addEventListener('keyup', (e) => {
  if (e.code === 'Space') releaseCharge();
});
// Pause when the tab really goes away (a brief hide, e.g. a screenshot, doesn't count).
let hideTimer = 0;
document.addEventListener('visibilitychange', () => {
  clearTimeout(hideTimer);
  if (document.hidden) {
    charging = false;
    hideTimer = window.setTimeout(() => {
      if (document.hidden && mode === 'play') pause();
    }, 1500);
  }
});
window.addEventListener('blur', () => {
  charging = false;
  strikeBtn.classList.remove('charging');
});

// ─── Loop ────────────────────────────────────────────────────────────────────────────────────
let last = performance.now();
let fpsFrames = 0;
let fpsTime = 0;
let fps = 0;

function step(dt: number) {
  if (mode === 'paused') return;
  game.clock += dt;
  if (charging) {
    const before = charge;
    charge = Math.min(1, charge + dt / 0.9);
    if (Math.floor(charge * 8) !== Math.floor(before * 8)) sfx.charge(charge);
  }
  ($('power-ring') as unknown as SVGCircleElement).style.strokeDashoffset = String(283 * (1 - (charging ? charge : 0)));
  const slow = anim?.slowmo && !world.reducedMotion ? 0.3 : 1;
  stepShot(dt * slow);
  world.update(dt * slow);
  if (goalTimer > 0) {
    goalTimer -= dt;
    if (goalTimer <= 0) $('goal').classList.add('hidden');
  }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) $('toast').classList.add('hidden');
  }
}

function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (!manualClock) step(dt);
  world.render();
  fpsFrames++;
  fpsTime += dt;
  if (fpsTime > 1) {
    fps = fpsFrames / fpsTime;
    fpsFrames = 0;
    fpsTime = 0;
  }
  requestAnimationFrame(frame);
}

// ─── Test hooks ──────────────────────────────────────────────────────────────────────────────
const strip = (s: string) => s.replace(/<[^>]+>/g, '');
function renderGameToText(): string {
  const r = game.room;
  const ballPos = world ? { x: +(world.ball.position.x + world.center.x).toFixed(3), y: +(-world.ball.position.z + world.center.y).toFixed(3) } : null;
  return JSON.stringify({
    coords: 'table metres: x right, y away from the player; angles in degrees CCW from +x',
    mode,
    phase: game.phase,
    room: { index: game.index, id: r.id, code: r.code, name: r.name, fact: r.factName, kind: r.mode, stone: r.stone, fresh },
    objective: r.goal,
    rule: 'ball leaves a cushion at the angle it arrived',
    dial: { value: game.dial, min: r.min, max: r.max, zeroRayHeading: r.mode === 'vane' ? r.lane : r.base, direction: r.dialSign === 1 ? 'ccw' : 'cw', pivot: r.mode === 'vane' ? r.table.vane?.p : r.ball },
    givens: r.marks.filter((m) => m.label && m.label !== '?').map((m) => ({ id: m.id, label: m.label, at: m.at })),
    unknown: r.marks.filter((m) => m.label === '?').map((m) => ({ id: m.id, at: m.at })),
    table: { poly: r.table.poly.map((p) => ({ x: +p.x.toFixed(3), y: +p.y.toFixed(3) })), drains: r.table.pockets.map((p) => p.c), baths: r.table.pools.map((p) => ({ c: p.c, r: p.r })), vane: r.table.vane?.p },
    ball: ballPos,
    strokes: { used: game.strokesUsed, left: game.strokesLeft },
    hint: { available: !!r.hint, open: game.hintOpen, used: game.hintUsed },
    charge: charging ? +charge.toFixed(2) : 0,
    shot: game.path
      ? { outcome: game.path.outcome, rolling: !!anim && !resultShown, bounces: game.path.bounces.map((b) => ({ edge: b.edge, angle: +b.angle.toFixed(2) })), turn: game.path.turnAt?.turn ?? null, length: +game.path.length.toFixed(3) }
      : null,
    result: game.phase === 'result' || game.phase === 'worked' ? { won: game.won, reason: strip(game.explanation?.text ?? (game.won ? 'sunk' : '')), worked: game.phase === 'worked' ? r.worked.map(strip) : null } : null,
    stars: game.scores.map((s) => s?.stars ?? 0),
    fps: Math.round(fps),
  });
}

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    bankShot: { game: () => Game; log: () => unknown; world: () => World };
  }
}
window.render_game_to_text = renderGameToText;
window.advanceTime = (ms: number) => {
  manualClock = true;
  const n = Math.max(1, Math.round(ms / (1000 / 60)));
  for (let i = 0; i < n; i++) step(1 / 60);
  world.render();
};
window.bankShot = {
  game: () => game,
  log: () => JSON.parse(localStorage.getItem(LOG_KEY) ?? '[]'),
  world: () => world,
};

void boot();
