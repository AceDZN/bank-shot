# Bank Shot — background music

Date: 2026-10-26

## Summary

| File | Duration | Size | Bitrate | Loudness | Peak | SHA-256 |
|---|---|---|---|---|---|---|
| `public/audio/bathhouse-loop.mp3` | 120.000 s (5,292,000 samples = 48 bars at 96 BPM) | 1,920,984 B | 128 kbps CBR, 44.1 kHz stereo | −16.0 LUFS integrated (mean −18.2 dB) | max −3.9 dBFS (true peak −3.86 dBTP) | `faa29494603b1c1b3e7e3cacc80dedfc28d35ca5bff32a15eab389d92a084645` |
| `public/audio/win-sting.mp3` | 3.600 s | 58,558 B | 128 kbps, 44.1 kHz stereo | −16.0 LUFS integrated (mean −19.4 dB) | max −1.7 dBFS (true peak −1.66 dBTP) | `5f4abe988fb08fd8936c420c6fe65b86ce194c83aecc8418187fc2bb670599fd` |

Both tracks are **original music composed and synthesized in code**: `scripts/generate-music.py` (numpy, deterministic, seed 7). No AI music service, sample library or third-party recording is involved.

**Nobody has listened to these files yet.** The agent that made them cannot hear audio. Everything below was checked with numbers (levels, spectrum, loop seam, sample counts), not by ear. Have someone listen before release.

## Why not an AI music tool

On 2026-10-26 we tried these in the user's Chrome. None was signed in, and the brief forbids creating accounts or entering passwords:

| Tool | URL | Result |
|---|---|---|
| Google Gemini (Lyria in chat) | https://gemini.google.com/app | Signed-out landing page ("Chat with Gemini", "Try Google AI Pro") |
| Google Labs MusicFX | https://labs.google/fx/tools/music-fx | Redirects to Google Flow Music (https://www.flowmusic.app/?utm_source=music-fx), which shows "Log in / Sign up" |
| Suno | https://suno.com/create | Redirected to sign-in |
| ElevenLabs Music | https://elevenlabs.io/app/music | Redirected to sign-in |
| Udio | https://www.udio.com/create | Redirected to login |
| Stable Audio | https://stableaudio.com/generate | Redirected to the home page, which shows "Sign up / Log in" |

Browser work also had to stop because another agent was driving the same Chrome tab group at the same time. To redo this with an AI tool, sign in to one of the tools above (Flow Music / Gemini runs Lyria) and use the prompt in the next section. Check that plan's commercial-use terms before shipping.

### Prompt for a future AI-tool pass (not used yet)

> Instrumental only, no vocals. Loopable background music for a calm-but-playful puzzle game set in a candle-lit ancient Roman bathhouse. 96 BPM, D minor. Plucked lyre / kithara arpeggios and a short lyre melody, soft frame drum / darbuka in a gentle maqsum groove with light riq jingles, a low breathy ney, warm pad, roomy stone-hall reverb. Warm, clever, curious; steady groove from start to end, no intro, no outro, no fade, no big build. Not epic, not cinematic, not sleepy.

Win sting: "2–3 second bright lyre/harp upward flourish resolving to a D major chord, light frame-drum hit, short reverb tail."

## What the music is

### Main loop: 48 bars, 96 BPM, D minor (A major as V)
- **Form:** A (lyre arpeggios) → B (lyre theme over low harp) → C (low ney melody, sparse lyre, lighter drums) → A2 (varied arpeggios with grace turns, riq) → B2 (theme with octave doubles, soft ney counter-line) → D (breakdown: half-time drum, lyre quarter notes, a soft 16th-note tek fill in the last bar that leads back into A).
- **Harmony:** Dm–C–Bb–A (Andalusian-style descent), with Gm in section C. The loop ends on A, the dominant, so the jump back to Dm at the top resolves like a phrase ending, not a cut.
- **Instruments, all synthesized:** additive plucked-string lyre and harp; low oud-like bass pluck; frame drum with *dum* (pitch-dropping membrane) and *tek*/*ka* (band-passed noise plus rim ring); riq jingles; breathy ney with glides and delayed vibrato; two-oscillator detuned pad. Light timing and velocity humanization.
- **Space:** synthetic stereo "bath hall" impulse response (RT about 2.6 s, early reflections, highs decaying faster), applied by circular convolution.
- **Mix:** lyre on top (−13 dB RMS bus), drums −16, bass −16.5, harp −18, ney −17, pad −23; 35 Hz low-cut; very light tanh saturation. Per-8-bar RMS ranges from −14.5 dB (B sections) to −18.5 dB (breakdown); LRA 4.5 LU, so it stays even under the SFX.

### Loop points
The **whole file is the loop**: 0.000 s → 120.000 s (sample 0 → 5,292,000), exactly 48 bars. Every note tail and the reverb tail that would run past the end were rendered *circularly*, so they wrap onto the start. The last sample flows into the first with no gap and no level change. At the seam, the sample-to-sample jump is 0.024 full-scale, within normal range for this file (99.9th percentile of all sample steps is about 0.09–0.12). **No edge fades were applied on purpose:** with circular rendering, a 20 ms fade would *create* a 40 ms dip at the loop point.

### Gapless MP3
LAME writes encoder-delay and padding info. ffmpeg honours it: the decoded file is exactly 5,292,000 frames and lines up sample-for-sample with the WAV master (cross-correlation offset 0). `src/audio.ts` loops it through Web Audio (`decodeAudioData` + `loop = true`). Chrome trims MP3 encoder delay in `decodeAudioData`, but **this was not checked in a browser here.** If a ~25 ms click or gap appears at the loop in any browser, re-encode to Ogg/Opus or AAC (m4a), or set `loopStart`/`loopEnd` on the source to the exact 0 → 120 s range.

### Win sting
An eight-note lyre run D4–F♯4–A4–D5–E5–F♯5–A5–D6, 55 ms apart, then a D major harp chord (D3 A3 D4 F♯4 A4 D5 F♯5) with a frame-drum *dum*, a riq shimmer, a short pad swell and two high lyre echoes. Linear (non-looping) reverb, 0.6 s squared fade-out at the end. It is a Picardy D major resolution in the loop's key.

## License

Original work composed and rendered by code written for this project. It has no third-party samples, no AI-model output and no service terms. The music belongs to the project owner (the user's company) like the rest of the codebase, and can be used commercially without restriction.

## Processing commands

```sh
# 1. Render the WAV masters (44.1 kHz, 16-bit stereo, normalised to −1 dBFS peak)
python3 -m venv venv && ./venv/bin/pip install numpy
./venv/bin/python -I scripts/generate-music.py <out_dir>
#   -> bathhouse-loop.wav (120.0 s, −13.2 LUFS), win-sting.wav (3.6 s, −15.3 LUFS)

# 2. Static gain to −16 LUFS (not dynamic loudnorm, which would change gain over time
#    and break the seamless seam), encode 128 kbps MP3
ffmpeg -y -i <out_dir>/bathhouse-loop.wav -af volume=-2.37dB -ar 44100 -ac 2 -c:a libmp3lame -b:a 128k public/audio/bathhouse-loop.mp3
ffmpeg -y -i <out_dir>/win-sting.wav     -af volume=-0.25dB -ar 44100 -ac 2 -c:a libmp3lame -b:a 128k public/audio/win-sting.mp3

# 3. Checks
ffprobe -v error -show_entries format=duration,bit_rate,size -of default=nw=1 public/audio/bathhouse-loop.mp3
ffmpeg -i public/audio/bathhouse-loop.mp3 -af volumedetect -f null -
ffmpeg -i public/audio/bathhouse-loop.mp3 -af loudnorm=I=-16:TP=-1:print_format=json -f null -
ffmpeg -v error -i public/audio/bathhouse-loop.mp3 -f s16le - | wc -c   # /4 = 5,292,000 frames
```

The WAV masters are not committed: about 21 MB, and they can be rebuilt exactly from the script. Rendering takes about 45 s of CPU.

## Tweaking

Edit `scripts/generate-music.py`, re-run steps 1–2 and re-measure the gain in step 2. Useful handles:
- `levels` in `mix()`: per-instrument balance. Lower `drums` to make it calmer; raise `pad` for more warmth.
- `BPM`: keep 90–105. At 96 BPM a bar is exactly 2.5 s, so the loop is a whole number of samples.
- `SECTIONS`, `THEME`, `NEY_C`: form, melody and ney line.
- The reverb mix factor in `mix()`, `wet * ... * 0.42`, sets how "bath hall" it sounds.
