# Bank Shot — assets

Made 25–26 Oct 2026 by the Visual/Chrome builder in the user's signed-in Chrome (ChatGPT web app and Tripo Studio, own tabs, closed afterwards). No API keys, upgrades, purchases or other generators were used.

## Gameplay mockups (design targets, not evidence of the game)

`docs/visual-targets/01-first-30s.png`, `02-mid-play.png`, `03-failure.png`, `04-curling.png` (1672×941 PNG), plus two Tripo input references `ref-attendant-tpose.png` and `ref-oil-lamp.png`. Exact prompts, chat URL (https://chatgpt.com/c/6ade7359-68bc-83ed-877f-06846816abec), date and keep/reject notes: [`docs/visual-targets/PROMPTS.md`](docs/visual-targets/PROMPTS.md). Copy the layout, not the generated Hebrew; the failure card's headline in `03` reads like a "wrong!" message and must not be copied.

## Tripo budget

| | Used | Budget |
|---|---|---|
| Model generations (H3.1 "Best Quality", HD Model, 2K PBR texture, triangle topology, 20k polycount default) | 6 × 30 credits = 180 | 6 |
| Rig / animation jobs | Auto Rig (20) + one AI animation "facepalm" (20) = 40 | 2 |
| Free retry (Tripo's own "Free Retry", no credits) | 1 (oil lamp v1, result was still a teapot, not used) | — |
| Preset animations (idle, cheer, clap, frustrated_01) | 0 credits | — |

Total spent by this crew: **220 credits**. The balance is shared with two other crews generating at the same time, so before/after balances below are snapshots of the shared counter, not this crew's spend alone: **7695** when the Tripo tab opened (23:36), **7575** just before the first generation, **7005** after the last generation (00:09). Each per-task "credits shown" is the cost printed on the button.

## Files

All Tripo GLBs are +Y up, faces/front toward **+Z**, origin at the base centre (min Y = 0), units ≈ metres-by-convention but Tripo normalises the longest dimension to **1.0**, so scale in the scene. All optimized files use `EXT_meshopt_compression`, `KHR_mesh_quantization` and `EXT_texture_webp` → load with `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` (three/examples/jsm/libs/meshopt_decoder.module.js). Each has baseColor + normal + metallicRoughness textures, 1024² WebP.

| File | Bytes | Tris | Bounds (x × y × z, GLB units) | sha256 |
|---|---|---|---|---|
| `public/models/attendant.glb` | 793,448 | 14,983 | ≈ 0.99 × 1.00 × 0.29 in T-pose (bind pose), 0.36 wide in idle | `37240fcb5d070c2146b5cec5cce18dbf759aeea5bc24f537ed4f449440585062` |
| `public/models/curling-stone.glb` | 194,484 | 5,724 | 1.00 × 0.674 × 1.00 | `490a99d207dd95dc89a5d6149c2f3183a5ed7697c6b9dca1ebb8f96a9e036437` |
| `public/models/lion-fountain.glb` | 256,880 | 7,961 | 1.00 × 1.00 × 0.62 | `0719d0c0ae568efe0eb5aeddd548978a78a73ef67c092d5b36a3299fd88bb3a9` |
| `public/models/column.glb` | 205,204 | 8,167 | 0.39 × 1.00 × 0.37 | `b452dfa6cfc33dc17c31f5a2ec7ac50f26365f0e5198b0a1f3a90f36565b339c` |
| `public/models/oil-lamp.glb` | 168,212 | 4,768 | 0.68 × 0.371 × 1.00 | `c93b6cba2806e66fa9c5c54bcfa2e9354b31f1b354edcdc3b3934cd89eb75691` |
| `cue.glb` | — | — | not made (generation budget went to the oil-lamp redo) | — |

Raw downloads (gitignored) are in `assets-src/`: `attendant-raw.glb` 2,593,852 B, `curling-stone-raw.glb` 1,021,348 B, `lion-fountain-raw.glb` 1,228,760 B, `column-raw.glb` 1,084,912 B, `oil-lamp-raw.glb` 1,095,384 B, plus the rejected `oil-lamp-raw-v1.glb` (teapot), the intermediate `attendant-renamed.glb`, the rejected `lion-fountain-sloppy.glb`, and small helper scripts in `assets-src/tools/` (clip rename, report, skin check, a three.js viewer).

### 1. Decimus, the bath attendant — `attendant.glb`

- **Source:** image-to-model from `docs/visual-targets/ref-attendant-tpose.png` (ChatGPT turn 5, T-pose). Task: https://studio.tripo3d.ai/workspace/generate/c421fe1e-acd2-4e30-a9d9-9fd5af4b7267 — 30 credits. Raw mesh 19,214 faces.
- **Rig:** Rig tab → Humanoid, skeleton preset **Mixamo**, Auto Rig — 20 credits. 65 joints, one skin.
- **Animations:** presets `idle`, `cheer`, `clap`, `frustrated_01` (no credits) and one AI animation (20 credits, 5 s) with the prompt: "Facepalm: the character sees a bad shot, slaps one hand onto his forehead and covers his eyes, shakes his head slowly in disbelief, shoulders drop, then lowers the hand and returns to a relaxed standing pose." Tripo has no facepalm preset.
- **Export:** GLB, texture 1k, Export Skeleton on, Number of Animations 5 (all), "Animation stay in Place" on → one GLB with skeleton + 5 clips.
- **Processing:** `assets-src/tools/prep-attendant.mjs` renames two clips (`Facepalm: the character…` → `facepalm`, `frustrated_01` → `disappointed`), then `npx gltf-transform optimize in out --texture-compress webp --texture-size 1024 --simplify-ratio 0.78 --simplify-error 0.001` (the lead's sloppy simplifier was not used on the skinned mesh).
- **Clips (name, duration):** `idle` 15.33 s, `facepalm` 4.96 s, `cheer` 12.08 s, `clap` 13.67 s, `disappointed` 3.54 s (Tripo preset `frustrated_01`: slumped, head down).
- **Verified:** loaded in three.js 0.186.1 (repo version) with GLTFLoader + MeshoptDecoder in a local viewer; `AnimationMixer` played `idle`, `cheer` (arms up, height 1.11) and `facepalm` (hand on forehead) with no visible skin tearing. A CPU skinning check (`assets-src/tools/skin-check.mjs`) gives matching bind-pose and posed bounds for raw vs optimized (bind 0..1.00 tall; cheer@2 s 1.115 vs 1.111). Height ≈ **1.0 GLB unit** feet to top of hair; feet at y = 0; faces +Z. Note: `gltf-transform inspect`'s static bbox reports −1..1 for the optimized file because quantization moves the scale into the skin; the rendered size is unchanged.

### 2. Curling stone — `curling-stone.glb`

- Text-to-model. Prompt: "A single curling stone, game prop: round polished grey granite body with subtle speckles and a darker band around the middle, smooth rounded edges, flat bottom, with an ornate antique bronze handle on top (curved bronze grip on a round bronze base), stylized realistic, clean silhouette, centered, no base, no background."
- Task: https://studio.tripo3d.ai/workspace/generate/ee570bad-0908-414b-88e8-9f78b5ed1495 — 30 credits. Raw 19,082 tris.
- Processing: `npx gltf-transform optimize … --texture-compress webp --texture-size 1024 --simplify-ratio 0.3 --simplify-error 0.01`.
- Orientation: diameter 1.0, height 0.674, flat bottom at y = 0; the handle grip runs along the X axis.

### 3. Lion-head wall fountain — `lion-fountain.glb`

- Text-to-model. Prompt: "An antique Roman bronze lion-head wall fountain spout, game prop: a stylized lion face with a full curly mane in aged bronze with green patina in the crevices, mouth open with a short round bronze water spout pipe sticking out, mounted on a flat round bronze wall plate behind the mane, front facing, clean silhouette, no water, no wall, no background."
- Task: https://studio.tripo3d.ai/workspace/generate/c7c148ef-88b7-453d-8518-3b141ef2cbf6 — 30 credits. Raw 19,910 tris.
- Processing: first tried `node scripts/optimize-model.mjs … 8000 1024 0.05` (sloppy) — it left visible bright seams across the mane and face, so it was replaced by `npx gltf-transform optimize … --texture-compress webp --texture-size 1024 --simplify-ratio 0.4 --simplify-error 0.01`, which looked clean.
- Orientation: wall plate on the −Z side (z ≈ −0.31), face toward +Z (nose at z ≈ 0.31, y ≈ 0.4–0.58); the spout pipe is at the bottom centre, its tip at about x 0, y 0.05–0.14, z 0.245. Mount it with the back against a wall and emit water from the pipe tip.

### 4. Corinthian column — `column.glb`

- Text-to-model. Prompt: "A short Roman Corinthian column in cream marble with faint rust-colored veins, game prop: ornate Corinthian capital with acanthus leaves and volutes on top, a fluted shaft, and a simple square base plinth, slightly worn edges, stylized realistic, about three times as tall as it is wide, centered, clean silhouette, no background."
- Task: https://studio.tripo3d.ai/workspace/generate/43245e9a-4045-4e76-b378-993680fc70de — 30 credits. Raw 18,149 tris.
- Processing: `npx gltf-transform optimize … --texture-compress webp --texture-size 1024 --simplify-ratio 0.45 --simplify-error 0.01`.
- Orientation: 1.0 tall, 0.39 wide; scale ×3–4 for a hall column, or use as a short pedestal for the attendant to lean on.

### 5. Roman clay oil lamp — `oil-lamp.glb`

- First attempt (rejected): text-to-model, prompt "A small ancient Roman terracotta clay oil lamp, game prop: round flat body with a decorated top disc (simple relief rosette) and a filling hole, a short pointed nozzle at the front with a wick, a small ring handle at the back, warm orange-red fired clay, slightly worn, stylized realistic, centered, clean silhouette, no flame, no background." Task https://studio.tripo3d.ai/workspace/generate/04f863f0-4615-4cce-aad6-05d09b22745b — 30 credits. It came out as a teapot/jug with a tall neck; Tripo's free retry produced another teapot. Kept only as `assets-src/oil-lamp-raw-v1.glb`.
- Used: image-to-model from `docs/visual-targets/ref-oil-lamp.png` (ChatGPT turn 6). Task: https://studio.tripo3d.ai/workspace/generate/2d917703-b813-4f02-bd23-f5cb8517ed43 — 30 credits. Raw 19,072 tris. Flat lucerna with rosette + laurel relief, Greek-key band, nozzle and ring handle.
- Processing: `npx gltf-transform optimize … --texture-compress webp --texture-size 1024 --simplify-ratio 0.25 --simplify-error 0.01`.
- Orientation: long axis along Z (1.0), nozzle/wick hole toward **+Z** (tip at z 0.50, y 0.12–0.22, x ±0.08), ring handle at −Z; height 0.371. Put the flame (procedural sprite/light) at the nozzle tip.

### 6. Cue — not made

The sixth generation was spent on the oil-lamp redo, so there is no `cue.glb`. A procedural cue (cylinder taper + bronze ferrule ring) is cheap if the game needs one.

## Not verified

- No performance or FPS measurement of these models in the real game.
- `npx gltf-transform validate` on all five optimized files: **no errors, no hints**; two warnings each — `MESH_PRIMITIVE_GENERATED_TANGENT_SPACE` (normal map without tangents; three.js derives them in the shader, fine) and `UNSUPPORTED_EXTENSION EXT_meshopt_compression` (the validator can't decode meshopt, not a defect). All five loaded and rendered in a local three.js 0.186.1 viewer (GLTFLoader + MeshoptDecoder).
