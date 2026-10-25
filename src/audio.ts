// Synthesised sounds: marble clack, cushion tock, drain plonk, bath plop, vane clang, the
// attendant's whistle, a lyre for wins and a quiet steam-and-lyre ambience. Starts after the
// first gesture (browser autoplay rules).

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;
let ambience: { stop: () => void } | null = null;

export function initAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') void ctx.resume();
    return;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.8;
  master.connect(ctx.destination);
  startAmbience();
}

export function setMuted(m: boolean) {
  muted = m;
  if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.8, ctx.currentTime, 0.05);
}
export const isMuted = () => muted;

/** Pause-friendly: suspend the context when the game pauses or the tab hides. */
export function suspendAudio(s: boolean) {
  if (!ctx) return;
  if (s) void ctx.suspend();
  else void ctx.resume();
}

function noiseBuffer(sec: number) {
  const b = ctx!.createBuffer(1, Math.ceil(ctx!.sampleRate * sec), ctx!.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function env(g: GainNode, t: number, a: number, peak: number, dcy: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + dcy);
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, peak: number, when = 0, dest?: AudioNode) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  env(g, t, 0.005, peak, dur);
  o.connect(g).connect(dest ?? master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, freq: number, q: number, peak: number, type: BiquadFilterType = 'bandpass', when = 0) {
  if (!ctx || !master) return;
  const t = ctx.currentTime + when;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer(dur + 0.05);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = ctx.createGain();
  env(g, t, 0.003, peak, dur);
  s.connect(f).connect(g).connect(master);
  s.start(t);
  s.stop(t + dur + 0.05);
}

export const sfx = {
  tick() {
    tone('triangle', 1800, 1500, 0.025, 0.05);
  },
  clack(power = 1) {
    noise(0.05, 2600, 3, 0.5 * power);
    tone('sine', 900, 500, 0.06, 0.25 * power);
  },
  tock() {
    tone('sine', 190, 120, 0.14, 0.45);
    noise(0.04, 900, 2, 0.2);
  },
  plonk() {
    tone('sine', 420, 110, 0.35, 0.5);
    tone('sine', 220, 70, 0.5, 0.3, 0.08);
    for (let i = 0; i < 5; i++) tone('sine', 300 + Math.random() * 500, 150, 0.08, 0.08, 0.25 + i * 0.07);
  },
  plop() {
    tone('sine', 520, 90, 0.28, 0.55);
    noise(0.5, 1200, 0.7, 0.35, 'lowpass', 0.03);
    noise(0.8, 3000, 0.5, 0.12, 'highpass', 0.08);
  },
  clang() {
    tone('square', 620, 600, 0.3, 0.08);
    tone('sine', 1240, 1200, 0.5, 0.12);
    tone('sine', 1870, 1860, 0.35, 0.06);
  },
  whistle(happy: boolean) {
    if (happy) {
      tone('sine', 1200, 1900, 0.18, 0.12);
      tone('sine', 1500, 2300, 0.2, 0.12, 0.22);
    } else {
      tone('sine', 1600, 700, 0.5, 0.1);
    }
  },
  lyre(notes = [0, 4, 7, 12, 16]) {
    notes.forEach((n, i) => {
      const f = 330 * Math.pow(2, n / 12);
      tone('triangle', f, f * 0.998, 0.9, 0.12, i * 0.09);
      tone('sine', f * 2, f * 2, 0.5, 0.04, i * 0.09);
    });
  },
  charge(level: number) {
    tone('sine', 300 + level * 500, 320 + level * 520, 0.04, 0.03);
  },
};

function startAmbience() {
  if (!ctx || !master || ambience) return;
  const steam = ctx.createBufferSource();
  steam.buffer = noiseBuffer(4);
  steam.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 5000;
  f.Q.value = 0.4;
  const g = ctx.createGain();
  g.gain.value = 0.015;
  steam.connect(f).connect(g).connect(master);
  steam.start();
  // A slow lyre pattern in D dorian, very quiet.
  const scale = [0, 2, 3, 5, 7, 9, 10, 12];
  let alive = true;
  const play = () => {
    if (!alive || !ctx) return;
    const n = scale[Math.floor(Math.random() * scale.length)];
    const f0 = 147 * Math.pow(2, n / 12);
    tone('triangle', f0, f0, 1.6, 0.025);
    if (Math.random() < 0.4) tone('triangle', f0 * 1.5, f0 * 1.5, 1.2, 0.015, 0.3);
    setTimeout(play, 900 + Math.random() * 1400);
  };
  setTimeout(play, 1500);
  ambience = {
    stop: () => {
      alive = false;
      steam.stop();
    },
  };
}
