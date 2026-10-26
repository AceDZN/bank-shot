"""Bank Shot - procedural background music.

Renders two WAV masters, fully synthesized (no samples, no AI service):
  bathhouse-loop.wav  48 bars, D minor, 96 BPM, rendered circularly, so the last
                      sample flows straight into the first (note tails and reverb wrap).
  win-sting.wav       ~3 s bright lyre run that resolves to D major.

Instruments: plucked lyre/kithara and harp (additive plucked-string model), low
oud-like bass, frame drum / darbuka in a soft maqsum groove with riq jingles,
a breathy low ney, and a warm pad, all in a synthetic bath-hall reverb.

Usage: python generate_music.py OUT_DIR   (needs numpy; deterministic, seed 7)
"""
import sys
import wave

import numpy as np

SR = 44100
BPM = 96
BEAT = 60.0 / BPM            # 0.625 s
BAR = 4 * BEAT               # 2.5 s
rng = np.random.default_rng(7)

NAMES = {'C': 0, 'C#': 1, 'D': 2, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8,
         'A': 9, 'Bb': 10, 'B': 11}


def n2m(s):
    return 12 * (int(s[-1]) + 1) + NAMES[s[:-1]]


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


# ---------------------------------------------------------------- buffers
class Bus:
    """Stereo buffer. circular=True wraps anything that runs past the end to the start."""

    def __init__(self, n, circular=True):
        self.n = n
        self.circular = circular
        self.buf = np.zeros((2, n))

    def add(self, t, sig, pan=0.0, gain=1.0):
        """Add mono (1-D) or stereo (2xN) signal at time t seconds with equal-power pan."""
        if sig.ndim == 1:
            th = (pan + 1) * np.pi / 4
            sig = np.vstack([sig * np.cos(th), sig * np.sin(th)]) * np.sqrt(2)
        sig = sig * gain
        s = int(round(t * SR)) % self.n if self.circular else int(round(t * SR))
        m = sig.shape[1]
        pos = 0
        while pos < m:
            if s >= self.n:
                if not self.circular:
                    return
                s = 0
            k = min(m - pos, self.n - s)
            self.buf[:, s:s + k] += sig[:, pos:pos + k]
            pos += k
            s += k


def bandnoise(n, lo, hi, seed_rng=rng):
    """White noise band-limited with a soft (log-gaussian-ish) band via FFT."""
    x = seed_rng.standard_normal(n)
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    lf = np.log(np.maximum(f, 1.0))
    c = (np.log(lo) + np.log(hi)) / 2
    w = (np.log(hi) - np.log(lo)) / 2
    X *= np.exp(-0.5 * ((lf - c) / max(w, 1e-3)) ** 4)
    y = np.fft.irfft(X, n)
    return y / (np.max(np.abs(y)) + 1e-9)


# ---------------------------------------------------------------- instruments
def pluck(f, vel=1.0, tau=1.4, bright=1.0, nh=14, pos=0.17, inh=0.00025, length=None,
          noise_amt=0.12):
    """Additive plucked string: harmonics decay faster the higher they are."""
    if length is None:
        length = min(tau * 4.0, 5.0)
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, nh + 1):
        fk = f * k * np.sqrt(1 + inh * k * k)
        if fk > 15000:
            break
        amp = abs(np.sin(np.pi * k * pos)) / k ** (1.7 - 0.6 * bright) + 0.01
        tk = tau / (1 + 0.5 * (k - 1) * (1.25 - 0.45 * bright))
        out += amp * np.exp(-t / tk) * np.sin(2 * np.pi * fk * t + rng.uniform(0, 2 * np.pi))
    a = int(0.004 * SR)
    out[:a] *= np.linspace(0, 1, a) ** 2
    nn = int(0.03 * SR)
    nz = bandnoise(nn, 1500, 6000) * np.exp(-np.arange(nn) / (0.005 * SR))
    out[:nn] += noise_amt * bright * nz
    # soft release at the very end so cut notes never click
    r = int(0.05 * SR)
    out[-r:] *= np.linspace(1, 0, r)
    return vel * out


def dum(vel=1.0):
    n = int(0.7 * SR)
    t = np.arange(n) / SR
    f = 64 + 46 * np.exp(-t / 0.025)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.30)
    body += 0.30 * np.sin(2 * np.pi * 101 * t) * np.exp(-t / 0.10)
    body += 0.12 * np.sin(2 * np.pi * 163 * t) * np.exp(-t / 0.06)
    click = bandnoise(n, 300, 2500) * np.exp(-t / 0.006)
    out = body + 0.25 * click
    a = int(0.002 * SR)
    out[:a] *= np.linspace(0, 1, a)
    return vel * out


def tek(vel=1.0, center=3200, decay=0.035, ring=640):
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    out = bandnoise(n, center * 0.55, center * 1.8) * np.exp(-t / decay)
    out += 0.45 * np.sin(2 * np.pi * ring * t) * np.exp(-t / 0.045)
    out += 0.20 * np.sin(2 * np.pi * ring * 1.71 * t) * np.exp(-t / 0.03)
    a = int(0.001 * SR)
    out[:a] *= np.linspace(0, 1, a)
    return vel * out


def jingle(vel=1.0):
    """Riq zils: a few inharmonic metallic partials plus a hiss."""
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    out = 0.5 * bandnoise(n, 6000, 12000) * np.exp(-t / 0.05)
    for fr in (5270, 6810, 8150, 9930):
        fr *= rng.uniform(0.99, 1.01)
        out += 0.18 * np.sin(2 * np.pi * fr * t + rng.uniform(0, 6.28)) * np.exp(-t / 0.09)
    a = int(0.002 * SR)
    out[:a] *= np.linspace(0, 1, a)
    return vel * out


def pad_chord(midis, dur, att=0.9, rel=1.4):
    """Warm two-oscillator pad, stereo via different detune per side."""
    n = int((dur + rel) * SR)
    t = np.arange(n) / SR
    env = np.minimum(1, t / att)
    env = env * np.where(t > dur, np.exp(-(t - dur) / (rel / 3)), 1.0)
    env *= 1 + 0.06 * np.sin(2 * np.pi * 0.23 * t)
    out = np.zeros((2, n))
    for side, det in ((0, -1), (1, 1)):
        for m in midis:
            f = mtof(m)
            for cents in (det * 5, -det * 2):
                ff = f * 2 ** (cents / 1200)
                ph = rng.uniform(0, 6.28)
                for k, amp in ((1, 1.0), (2, 0.28), (3, 0.10), (4, 0.04)):
                    out[side] += amp * np.sin(2 * np.pi * ff * k * t + ph * k)
    out *= env / (len(midis) * 2)
    return out


def ney_phrase(notes, beat_len=BEAT):
    """notes: list of (midi or None, beats). Returns mono signal for the whole phrase.
    Continuous breath with glides, delayed vibrato, breath noise."""
    total = sum(b for _, b in notes) * beat_len + 0.6
    n = int(total * SR)
    t = np.arange(n) / SR
    fcurve = np.zeros(n)
    amp = np.zeros(n)
    vib_env = np.zeros(n)
    pos = 0.0
    last_f = None
    for m, b in notes:
        s = int(pos * SR)
        e = int((pos + b * beat_len) * SR)
        if m is not None:
            f = mtof(m)
            fcurve[s:e] = f
            seg = np.arange(e - s) / SR
            a = np.minimum(1, seg / 0.09) * np.minimum(1, (e - s - np.arange(e - s)) / SR / 0.12)
            a *= 0.85 + 0.15 * np.minimum(1, seg / (b * beat_len * 0.6 + 1e-3))
            amp[s:e] = a
            vib_env[s:e] = np.clip((seg - 0.35) / 0.4, 0, 1)
            last_f = f
        else:
            fcurve[s:e] = last_f if last_f else mtof(62)
        pos += b * beat_len
    fcurve[int(pos * SR):] = last_f if last_f else mtof(62)
    # glide: smooth the step curve with a 70 ms window
    w = np.hanning(int(0.07 * SR))
    w /= w.sum()
    fcurve = np.convolve(fcurve, w, 'same')
    amp = np.convolve(amp, np.hanning(int(0.03 * SR)) / np.hanning(int(0.03 * SR)).sum(), 'same')
    fcurve *= 1 + 0.006 * vib_env * np.sin(2 * np.pi * 5.1 * t)
    ph = 2 * np.pi * np.cumsum(fcurve) / SR
    tone = np.sin(ph) + 0.22 * np.sin(2 * ph + 0.4) + 0.07 * np.sin(3 * ph + 1.1)
    breath = bandnoise(n, 900, 4500) * 0.10 + bandnoise(n, 250, 900) * 0.06
    out = amp * (tone * (1 + 0.03 * np.sin(2 * np.pi * 3.3 * t)) + breath)
    return out


# ---------------------------------------------------------------- reverb
def bath_ir(length=2.6, rt=2.6, predelay=0.022, seed=11):
    r = np.random.default_rng(seed)
    n = int(length * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    pd = int(predelay * SR)
    for c in range(2):
        x = r.standard_normal(n)
        # high frequencies die faster: mix a dark long tail with a bright short one
        X = np.fft.rfft(x)
        f = np.fft.rfftfreq(n, 1 / SR)
        dark = np.fft.irfft(X / (1 + (f / 2500) ** 2), n)
        bright = np.fft.irfft(X / (1 + (f / 9000) ** 2), n)
        tail = dark * np.exp(-6.9 * t / rt) + 0.5 * bright * np.exp(-6.9 * t / (rt * 0.35))
        tail[:pd] = 0
        # a few early reflections off marble walls
        for d, g in ((0.011, 0.5), (0.019, 0.35), (0.031, 0.3), (0.047, 0.22), (0.063, 0.16)):
            i = int((d + (0.003 if c else 0)) * SR)
            tail[i] += g * np.max(np.abs(tail[pd:pd + 2000])) * 3
        ir[c] = tail
    ir /= np.sqrt(np.sum(ir ** 2) / 2)
    return ir


def reverb(send, ir, circular=True):
    """Convolve stereo send with stereo IR. Circular keeps the loop seamless."""
    n = send.shape[1]
    out = np.zeros_like(send)
    if circular:
        N = n
        for c in range(2):
            h = np.zeros(N)
            h[:ir.shape[1]] = ir[c]
            out[c] = np.fft.irfft(np.fft.rfft(send[c]) * np.fft.rfft(h), N)
    else:
        N = n + ir.shape[1]
        for c in range(2):
            out[c] = np.fft.irfft(np.fft.rfft(send[c], N) * np.fft.rfft(ir[c], N), N)[:n]
    return out


def write_wav(path, stereo, peak_db=-1.0):
    x = stereo / (np.max(np.abs(stereo)) + 1e-12) * 10 ** (peak_db / 20)
    pcm = (np.clip(x.T, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())


def rms(x):
    return np.sqrt(np.mean(x ** 2)) + 1e-12


# ---------------------------------------------------------------- composition
CHORDS = {'Dm': (62, 'm'), 'C': (60, 'M'), 'Bb': (58, 'M'), 'A': (57, 'M'), 'Gm': (55, 'm')}


def chord_tones(name):
    r, q = CHORDS[name]
    third = 3 if q == 'm' else 4
    return [r, r + third, r + 7, r + 12, r + 12 + third, r + 19]


SECTIONS = [
    ('A', ['Dm', 'Dm', 'C', 'C', 'Bb', 'Bb', 'A', 'A']),
    ('B', ['Dm', 'C', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A']),
    ('C', ['Gm', 'Gm', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A']),
    ('A2', ['Dm', 'Dm', 'C', 'C', 'Bb', 'Bb', 'A', 'A']),
    ('B2', ['Dm', 'C', 'Bb', 'A', 'Dm', 'C', 'Bb', 'A']),
    ('D', ['Dm', 'Bb', 'C', 'A', 'Dm', 'Bb', 'C', 'A']),
]

THEME = [  # 8 bars over Dm C Bb A Dm C Bb A
    [('A4', 1), ('D5', .5), ('E5', .5), ('F5', 1), ('E5', .5), ('D5', .5)],
    [('E5', 1.5), ('C5', .5), ('G4', 2)],
    [('F4', .5), ('G4', .5), ('A4', .5), ('Bb4', .5), ('A4', 1), ('G4', 1)],
    [('A4', 2), ('C#5', 1), ('E5', 1)],
    [('F5', 1), ('E5', .5), ('D5', .5), ('A4', 1), ('D5', 1)],
    [('E5', .5), ('F5', .5), ('G5', 1), ('E5', 1), ('C5', 1)],
    [('D5', 1), ('Bb4', .5), ('A4', .5), ('G4', 1), ('F4', 1)],
    [('E4', 1), ('A4', 1), ('C#5', 2)],
]

NEY_C = [  # over Gm Gm Dm Dm Bb C A A, played an octave low (warm, breathy)
    ('D4', 2), ('Bb3', 1), ('C4', 1),
    ('D4', 3), (None, 1),
    ('F4', 1.5), ('E4', .5), ('D4', 2),
    ('A3', 3), (None, 1),
    ('Bb3', 1), ('C4', 1), ('D4', 2),
    ('E4', 1), ('G4', 1), ('F4', 1), ('E4', 1),
    ('E4', 2), ('D4', 1), ('C#4', 1),
    ('E4', 3), (None, 1),
]

NEY_B2 = [  # soft long counter-line under the lyre theme
    ('A3', 4), ('G3', 4), ('F3', 4), ('E3', 4), ('A3', 4), ('G3', 4), ('F3', 2), ('G3', 2), ('E3', 3.5),
    (None, .5),
]

PAT_A = [0, 2, 3, 1, 4, 3, 2, 3]
PAT_B = [3, 2, 1, 2, 0, 2, 3, 4]


def hum(t, ms=6):
    return t + rng.normal(0, ms / 1000)


def hv(v, spread=0.08):
    return v * (1 + rng.uniform(-spread, spread))


def render_loop():
    nbars = sum(len(c) for _, c in SECTIONS)
    L = int(round(nbars * BAR * SR))
    buses = {k: Bus(L) for k in ('lyre', 'arp', 'bass', 'drums', 'pad', 'ney')}
    D, T, K, J = buses['drums'], buses['drums'], buses['drums'], buses['drums']

    bar = 0
    for name, chords in SECTIONS:
        sec_start = bar * BAR
        for i, ch in enumerate(chords):
            t0 = (bar + i) * BAR
            tones = chord_tones(ch)
            r, q = CHORDS[ch]
            last_bar_of_loop = (name == 'D' and i == 7)

            # --- pad (all sections; D section a touch thinner)
            third = 3 if q == 'm' else 4
            voicing = [r - 12, r - 12 + 7, r + third - 12 + 12]
            buses['pad'].add(t0, pad_chord(voicing, BAR), gain=0.8 if name == 'D' else 1.0)

            # --- bass: oud-like low pluck matching the maqsum
            root = r - 24 if r - 24 >= 33 else r - 12
            bpat = [(0, root, 1.0), (1.5, root + 7, 0.6), (2, root, 0.8), (3.5, root + 12, 0.5)]
            if name == 'D':
                bpat = [(0, root, 0.9), (2, root + 7, 0.6)]
            for b, m, v in bpat:
                buses['bass'].add(hum(t0 + b * BEAT), pluck(mtof(m), hv(v), tau=0.9, bright=0.55,
                                                             nh=10, pos=0.22, length=1.6), pan=-0.25)

            # --- drums
            if name != 'D':
                hits = [(0, 'D', 1.0), (.5, 'T', .55), (1.5, 'T', .6), (2, 'D', .85), (3, 'T', .55)]
                ghosts = [1.25, 2.75, 3.5, 3.75] if name in ('B', 'B2', 'A2') else [2.75, 3.5]
                if name == 'C':
                    hits = [(0, 'D', .9), (1.5, 'T', .45), (2, 'D', .75), (3, 'T', .45)]
                    ghosts = [3.5]
            else:
                hits = [(0, 'D', .8), (2, 'D', .6), (3, 'T', .35)]
                ghosts = []
                if last_bar_of_loop:  # fill back into the top
                    hits = [(0, 'D', .8), (2, 'D', .7)]
                    ghosts = []
                    for k in range(8):
                        hits.append((2 + k * .25, 'K', 0.25 + 0.06 * k))
            for b, kind, v in hits:
                tt = hum(t0 + b * BEAT, 4)
                if kind == 'D':
                    D.add(tt, dum(hv(v)), pan=0.0)
                elif kind == 'T':
                    T.add(tt, tek(hv(v)), pan=0.12)
                else:
                    K.add(tt, tek(hv(v), center=2300, decay=0.025, ring=520), pan=-0.1)
            for b in ghosts:
                K.add(hum(t0 + b * BEAT, 5), tek(hv(0.22, 0.2), center=2400, decay=0.02, ring=540),
                      pan=-0.12)
            if name in ('B', 'B2', 'A2'):
                for b in (0.5, 1.5, 2.5, 3.5):
                    J.add(hum(t0 + b * BEAT, 5), jingle(hv(0.35 if name != 'A2' else 0.25, 0.2)),
                          pan=0.35)

            # --- lyre arpeggio / harp
            if name in ('A', 'A2'):
                pat = PAT_A if name == 'A' else PAT_B
                for k, idx in enumerate(pat):
                    v = 0.75 if k % 2 == 0 else 0.55
                    buses['lyre'].add(hum(t0 + k * .5 * BEAT), pluck(mtof(tones[idx]), hv(v), tau=1.3),
                                      pan=0.2 + 0.05 * (idx - 2))
                if name == 'A2' and i % 2 == 1:  # little grace turn at the end of every 2nd bar
                    top = tones[4]
                    for k, m in enumerate((top + 2, top, top - 2 if q == 'M' else top - 1)):
                        buses['lyre'].add(hum(t0 + (3.5 + k * 0.1667) * BEAT, 3),
                                          pluck(mtof(m), hv(0.4), tau=0.9), pan=0.3)
            elif name in ('B', 'B2'):
                bt = 0.0
                for nm, b in THEME[i]:
                    m = n2m(nm) + (0 if name == 'B' else 0)
                    buses['lyre'].add(hum(t0 + bt * BEAT, 4),
                                      pluck(mtof(m), hv(0.95), tau=1.6, bright=1.15), pan=0.15)
                    if name == 'B2' and b >= 1:  # octave double for the reprise, quiet
                        buses['lyre'].add(hum(t0 + bt * BEAT + 0.012, 3),
                                          pluck(mtof(m + 12), hv(0.25), tau=1.0, bright=1.2), pan=0.4)
                    bt += b
                for k in range(4):  # harp under the theme, quarter notes, low
                    idx = [0, 2, 1, 2][k]
                    buses['arp'].add(hum(t0 + k * BEAT), pluck(mtof(tones[idx] - 12), hv(0.5), tau=1.1,
                                                               bright=0.8), pan=-0.35)
            elif name == 'C':
                for k in range(4):
                    idx = PAT_B[k * 2]
                    buses['arp'].add(hum(t0 + k * BEAT), pluck(mtof(tones[idx]), hv(0.55), tau=1.5),
                                     pan=0.25)
            elif name == 'D':
                for k in range(4):
                    idx = [0, 3, 2, 4][k]
                    buses['lyre'].add(hum(t0 + k * BEAT), pluck(mtof(tones[idx]), hv(0.6), tau=1.8),
                                      pan=0.2)
                    if k in (1, 3):
                        buses['lyre'].add(hum(t0 + (k + .5) * BEAT),
                                          pluck(mtof(tones[idx - 1]), hv(0.35), tau=1.4), pan=0.25)
        # --- ney phrases (one per section where used)
        if name == 'C':
            phrase = [(n2m(x) if x else None, b) for x, b in NEY_C]
            buses['ney'].add(sec_start - 0.04, ney_phrase(phrase), pan=-0.2)
        if name == 'B2':
            phrase = [(n2m(x) if x else None, b) for x, b in NEY_B2]
            buses['ney'].add(sec_start + 0.02, ney_phrase(phrase), pan=-0.3, gain=0.55)
        bar += len(chords)

    return L, buses


def mix(buses, circular=True):
    # target RMS per bus (relative, dB) - lyre on top, drums under, pad far back
    levels = {'lyre': -13.0, 'arp': -18.0, 'bass': -16.5, 'drums': -16.0, 'pad': -23.0, 'ney': -17.0}
    sends = {'lyre': .32, 'arp': .30, 'bass': .08, 'drums': .16, 'pad': .25, 'ney': .38}
    n = next(iter(buses.values())).n
    dry = np.zeros((2, n))
    send = np.zeros((2, n))
    for k, b in buses.items():
        x = b.buf
        active = np.abs(x).sum(0) > 1e-6
        r = rms(x[:, active]) if active.any() else 1.0
        g = 10 ** (levels[k] / 20) / r
        dry += x * g
        send += x * g * sends[k]
    ir = bath_ir()
    wet = reverb(send, ir, circular=circular)
    out = dry + wet * (rms(dry) / rms(wet)) * 0.42
    # gentle low-cut below ~35 Hz and soft saturation
    X = np.fft.rfft(out, axis=1)
    f = np.fft.rfftfreq(out.shape[1], 1 / SR)
    X *= (f ** 4 / (f ** 4 + 35.0 ** 4))
    out = np.fft.irfft(X, out.shape[1], axis=1)
    out = np.tanh(out / np.max(np.abs(out)) * 1.2) / np.tanh(1.2)
    return out


def render_sting():
    dur = 3.6
    n = int(dur * SR)
    b = {k: Bus(n, circular=False) for k in ('lyre', 'arp', 'bass', 'drums', 'pad', 'ney')}
    run = ['D4', 'F#4', 'A4', 'D5', 'E5', 'F#5', 'A5', 'D6']
    for i, nm in enumerate(run):
        b['lyre'].add(0.02 + i * 0.055, pluck(mtof(n2m(nm)), 0.55 + 0.04 * i, tau=1.2, bright=1.2),
                      pan=-0.3 + 0.08 * i)
    tc = 0.02 + len(run) * 0.055 + 0.08
    for i, nm in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5']):
        b['arp'].add(tc + i * 0.012, pluck(mtof(n2m(nm)), 0.7, tau=1.8, bright=1.0, length=3.2),
                     pan=-0.2 + 0.07 * i)
    b['lyre'].add(tc + 0.35, pluck(mtof(n2m('A5')), 0.35, tau=1.4, bright=1.2), pan=0.35)
    b['lyre'].add(tc + 0.55, pluck(mtof(n2m('D6')), 0.3, tau=1.4, bright=1.2), pan=0.4)
    b['drums'].add(tc, dum(0.9))
    b['drums'].add(tc, jingle(0.5), pan=0.3)
    b['pad'].add(tc, pad_chord([n2m('D3'), n2m('A3'), n2m('F#4')], 1.2, att=0.25, rel=1.6))
    b['bass'].add(tc, pluck(mtof(n2m('D2')), 0.9, tau=1.2, bright=0.5, length=2.5))
    out = mix_sting(b)
    fade = int(0.6 * SR)
    out[:, -fade:] *= np.linspace(1, 0, fade) ** 2
    return out


def mix_sting(b):
    levels = {'lyre': -13.0, 'arp': -14.0, 'bass': -19.0, 'drums': -20.0, 'pad': -22.0}
    n = b['lyre'].n
    dry = np.zeros((2, n))
    send = np.zeros((2, n))
    for k, g_db in levels.items():
        x = b[k].buf
        g = 10 ** (g_db / 20) / rms(x)
        dry += x * g
        send += x * g * 0.35
    wet = reverb(send, bath_ir(rt=2.2), circular=False)
    out = dry + wet * (rms(dry) / rms(wet)) * 0.4
    return out / np.max(np.abs(out))


if __name__ == '__main__':
    out_dir = sys.argv[1]
    L, buses = render_loop()
    loop = mix(buses)
    write_wav(f'{out_dir}/bathhouse-loop.wav', loop)
    print('loop samples', L, 'seconds', L / SR)
    write_wav(f'{out_dir}/win-sting.wav', render_sting())
    print('done')
