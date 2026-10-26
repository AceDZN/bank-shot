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
| `public/models/attendant.glb` (v2, 26 Oct; v1 replaced, see §1) | 864,096 | 18,746 | ≈ 0.62 × 1.00 × 0.21 in A-pose (bind pose), 0.34 wide in idle | `58fd997e46cdb687ee424e85b0e5801b55e5bf2c12c6b86fc477d8984dfec2cb` |
| `public/models/curling-stone.glb` | 194,484 | 5,724 | 1.00 × 0.674 × 1.00 | `490a99d207dd95dc89a5d6149c2f3183a5ed7697c6b9dca1ebb8f96a9e036437` |
| `public/models/lion-fountain.glb` | 256,880 | 7,961 | 1.00 × 1.00 × 0.62 | `0719d0c0ae568efe0eb5aeddd548978a78a73ef67c092d5b36a3299fd88bb3a9` |
| `public/models/column.glb` | 205,204 | 8,167 | 0.39 × 1.00 × 0.37 | `b452dfa6cfc33dc17c31f5a2ec7ac50f26365f0e5198b0a1f3a90f36565b339c` |
| `public/models/oil-lamp.glb` | 168,212 | 4,768 | 0.68 × 0.371 × 1.00 | `c93b6cba2806e66fa9c5c54bcfa2e9354b31f1b354edcdc3b3934cd89eb75691` |
| `cue.glb` | — | — | not made (generation budget went to the oil-lamp redo) | — |

Raw downloads (gitignored) are in `assets-src/`: `attendant-raw.glb` 2,593,852 B, `curling-stone-raw.glb` 1,021,348 B, `lion-fountain-raw.glb` 1,228,760 B, `column-raw.glb` 1,084,912 B, `oil-lamp-raw.glb` 1,095,384 B, plus the rejected `oil-lamp-raw-v1.glb` (teapot), the intermediate `attendant-renamed.glb`, the rejected `lion-fountain-sloppy.glb`, and small helper scripts in `assets-src/tools/` (clip rename, report, skin check, a three.js viewer).

### 1. Decimus, the bath attendant — `attendant.glb` (v2, 26 Oct 2026)

**v1 replaced.** The user played the game and said Decimus "is standing weirdly, and has a creepy smile" (user: creepy smile, stiff stance). v1 had a wide toothy grin from its T-pose reference and a stiff preset `idle` with arms locked straight down. v2 is a new model from a new reference with a soft closed-mouth smile, rigged in an A-pose, with a relaxed weight-shift idle. The v1 file is kept as `assets-src/attendant-v1.glb` (793,448 B, sha256 `37240fcb5d070c2146b5cec5cce18dbf759aeea5bc24f537ed4f449440585062`); its notes are at the end of this section.

- **Reference:** `docs/visual-targets/ref-attendant-v2.png` (1254×1254 PNG, 1,383,823 B, sha256 `6a9f403c8b086e156f34a1a502ddae591b83eb12415af8707905443a3c603421`), ChatGPT web app, new chat https://chatgpt.com/c/6adf4f09-87d4-83ed-a8cf-4525675928e9, kept on the first generation. Exact prompt under "Decimus v2 (26 Oct 2026)" in [`docs/visual-targets/PROMPTS.md`](docs/visual-targets/PROMPTS.md). Face: lips together in a small gentle smile, no teeth, relaxed eyes, freckles. Symmetric A-pose, arms ≈ 45–50° below horizontal.
- **Model:** image-to-model, H3.1 "Best Quality", HD Model, 2K PBR texture, triangle topology, 20k polycount. Task: https://studio.tripo3d.ai/workspace/generate/b53c7732-0745-4693-8b7d-8906a6c8385f — 30 credits, used on the first try (no retry, no second generation). Raw mesh 18,950 faces / 11,625 vertices. In Tripo's viewer the face kept the closed-mouth smile.
- **Rig:** Rig tab → Humanoid, skeleton preset **Mixamo**, Auto Rig — 20 credits. 65 joints, one skin.
- **Animations:** presets `standing_relax`, `fold_arms`, `cheer`, `clap`, `frustrated_01` and Tripo's `idle` (no credits), plus one AI animation (20 credits, 5 s) with the same prompt as v1: "Facepalm: the character sees a bad shot, slaps one hand onto his forehead and covers his eyes, shakes his head slowly in disbelief, shoulders drop, then lowers the hand and returns to a relaxed standing pose." No AI idle was made: the free `fold_arms` preset already gives the mockup's arms-crossed stance.
- **Idle choice:** compared Tripo's `idle` (straight, knees together, arms hanging stiffly: the v1 look), `standing_relax` (weight on one leg, hip shift, loose arms, slow sway and head turns) and `fold_arms` (arms crossed, small sway). `standing_relax` became `idle`, the game's default. `fold_arms` is kept as `folded_arms`. The name avoids the keywords `src/scene.ts` checks before `idle` (`idle_lean`, `lean`, `cross`, `relax`), so the game still plays the relaxed idle. Renaming it to `idle_lean` would make the game use the arms-crossed stance instead. Tripo's stiff `idle` was dropped from the GLB.
- **Export:** GLB, texture 1k, Export Skeleton on, Number of Animations 7 (all), "Animation stay in Place" on → `assets-src/attendant-v2-raw.glb` (3,238,676 B, sha256 `1a4fdab97bbba69ca7c571eb55f42e8234a175df2e1ea33ff0e9e98fa66cc3fd`, JPEG textures, 7 clips).
- **Processing:** `node assets-src/tools/prep-attendant-v2.mjs assets-src/attendant-v2-raw.glb assets-src/attendant-v2-renamed.glb` renames the clips (`standing_relax` → `idle`, `fold_arms` → `folded_arms`, `frustrated_01` → `disappointed`, `Facepalm: …` → `facepalm`), drops Tripo's `idle` and prunes (3,171,812 B). Then `npx @gltf-transform/cli optimize assets-src/attendant-v2-renamed.glb public/models/attendant.glb --texture-compress webp --texture-size 1024`. No simplify flag: the mesh is already under 20k tris, and the default optimize pass took it to 18,746.
- **Output:** `public/models/attendant.glb` **864,096 B**, 18,746 tris, 65 joints, 1 skin, 3 × 1024² WebP (baseColor, normal, metallicRoughness), sha256 `58fd997e46cdb687ee424e85b0e5801b55e5bf2c12c6b86fc477d8984dfec2cb`.
- **Clips (name, duration):** `idle` 17.58 s (Tripo `standing_relax`), `folded_arms` 17.08 s (Tripo `fold_arms`), `cheer` 12.08 s, `clap` 13.67 s, `disappointed` 3.54 s (Tripo `frustrated_01`: slumped, head down), `facepalm` 4.96 s (AI).
- **Size and orientation:** +Y up, faces **+Z**, feet at y = 0, height ≈ **1.0 GLB unit** (bind pose 0..0.998). Bind pose is an A-pose, ≈ 0.62 wide × 0.21 deep. In `idle` it is ≈ 0.34 wide. In `cheer` the hands reach 1.14. Same scale convention as v1, so `fitHeight` in the scene still applies. `gltf-transform inspect`'s static bbox reads −1..1 for the optimized file because quantization moves the scale into the skin. The rendered size is unchanged.
- **Verified:** `assets-src/tools/skin-check.mjs` gives matching CPU-skinned bounds for renamed and optimized at bind and at `idle`@3 s, `cheer`@2 s (max y 1.137 vs 1.137), `facepalm`@1.2 s and `folded_arms`@5 s (all within 0.003). `assets-src/tools/viewer.html` (three.js 0.186.1, GLTFLoader + MeshoptDecoder, served locally) loaded the file, listed all 6 clips and posed `idle`, `folded_arms` (arms crossed), `facepalm` (hand on forehead) and `cheer` (arms up) with no visible skin tearing. `gltf-transform validate`: no errors, no hints. The only warning is `UNSUPPORTED_EXTENSION EXT_meshopt_compression`. Not checked: how it looks in the running game.
- **Credits:** 30 (model) + 20 (rig) + 20 (AI facepalm) = **70**. Shared balance: **6485** before the generation, 6455 after it, 6435 after the rig, **6415** after the AI animation and at the end (no other crew spent credits in between).

#### v1 (replaced 26 Oct 2026)

- **Source:** image-to-model from `docs/visual-targets/ref-attendant-tpose.png` (ChatGPT turn 5, T-pose, toothy grin). Task: https://studio.tripo3d.ai/workspace/generate/c421fe1e-acd2-4e30-a9d9-9fd5af4b7267 — 30 credits. Raw mesh 19,214 faces.
- **Rig:** Rig tab → Humanoid, skeleton preset **Mixamo**, Auto Rig — 20 credits. 65 joints, one skin.
- **Animations:** presets `idle`, `cheer`, `clap`, `frustrated_01` (no credits) and the AI facepalm above (20 credits, 5 s).
- **Export:** GLB, texture 1k, Export Skeleton on, Number of Animations 5 (all), "Animation stay in Place" on.
- **Processing:** `assets-src/tools/prep-attendant.mjs` renamed two clips, then `npx gltf-transform optimize in out --texture-compress webp --texture-size 1024 --simplify-ratio 0.78 --simplify-error 0.001`.
- **Clips:** `idle` 15.33 s, `facepalm` 4.96 s, `cheer` 12.08 s, `clap` 13.67 s, `disappointed` 3.54 s. 14,983 tris, 793,448 B. T-pose bind ≈ 0.99 × 1.00 × 0.29.
- **Why replaced:** user: creepy smile, stiff stance.

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
