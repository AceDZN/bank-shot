# Bank Shot — gameplay mockup prompts

- Date: 2026-10-25
- Tool: ChatGPT web app (chatgpt.com, the user's signed-in Chrome), built-in image generation, model picker showed "Instant".
- Chat: https://chatgpt.com/c/6ade7359-68bc-83ed-877f-06846816abec (one chat, six turns, in a tab opened for this crew)
- Saved through the page (blob of the rendered image → browser download → moved here). Native size 1672×941 (≈16:9), PNG.

These are **design targets, not evidence of the implemented game**. Generated Hebrew text is unreliable: copy the layout, not the text. The geometry in the images is illustrative only; the real angles come from the pure rules module.

## Kept images

| File | Turn | Verdict |
|---|---|---|
| `01-first-30s.png` | 1 | Kept on the first try. Strong read: mosaic table, cream marble cushions, ivory ball + brass protractor + short gold stub, gold "130°" arc left of the cue line and "?" arc right, drain pocket top-right, plunge pool + lion fountain right, oil lamps, attendant on a column (left). HUD matches: room chip + fact chip top-right, stroke balls + stars + pause/sound top-left, `− 50° +` and the round hold-to-strike with ring meter bottom-center, oil-lamp hint button right edge. Deviations: the attendant wears a laurel wreath and looks younger than intended; camera is slightly lower than 55°. |
| `02-mid-play.png` | 2 | Kept. Regular hexagon table, camera pushed in, gold trail with bounce arcs "50°" and "10°", ball heading into a drain pocket, sparks, attendant leaning in with fists. HUD: one stroke token greyed, dimmed `50°`, hourglass "slow-mo" indicator, greyed strike button. Deviation: the trail geometry is not a true hexagon bounce (design target only). |
| `03-failure.png` | 3 | Kept. Ball splashes into the plunge pool, faint ghost line across the table, gold circle on the "130°" arc next to the "?" arc, explanation card with a small adjacent-angles diagram and `130° + 50° = 180°`, round gold "שוב" button, attendant facepalming. **Do not copy the card's headline text**: the model wrote a "you chose the wrong angle!"-style line, which the identity forbids (no "wrong!" cards). Use a neutral one-line explanation of the rule instead. |
| `04-curling.png` | 4 | Kept. Low, long camera behind a granite curling stone with a bronze handle on wet reflective marble, bronze vane post with a glowing "115°" arc, floor arcs "40°" and "75°" on gold tile lines, drain ring far down the lane, lion fountain and pool on the left, attendant cheering on the pool edge. HUD with curling-stone stroke tokens, `− 115° +`, strike button, hint lamp. |
| `ref-attendant-tpose.png` | 5 | Not a gameplay mockup: a clean T-pose reference of Decimus on grey, used as the Tripo image-to-model input for the rigged attendant. |
| `ref-oil-lamp.png` | 6 | Not a gameplay mockup: a reference of a flat Roman lucerna, used as the Tripo image-to-model input after Tripo's text-to-model produced a teapot. |

Rejected iterations: none. Every turn produced a usable target on the first generation, so no regenerations were spent.

## Exact prompts

### Turn 1 → `01-first-30s.png`

```
Create an image: an in-game screenshot of a polished 3D browser game (landscape 16:9, 1536x864), stylized PBR like a premium indie game, not a worksheet. Game: "Bank Shot" - trick-shot billiards in a candle-lit Roman bathhouse at night (inspired by Beit She'an thermae). Camera: 3/4 overhead view about 55 degrees down framing the whole table and pool. Scene: a rectangular billiard table whose floor is a mosaic of deep teal (#1f5f63) and ochre tesserae with thin gold tile lines, framed by cream marble cushions with rust veins; an ivory ball with a thin gold band rests against the bottom cushion; on the ball sits a brass half-disc protractor engraved every 10 degrees, with a SHORT glowing gold aim stub (only a hand's length). Carved into the mosaic beside the ball: a glowing gold angle arc labeled "130°" on the LEFT side of the cue line and a glowing arc with "?" on the RIGHT side. In the far corner, a bronze-rimmed drain pocket. Beside one corner of the table a deep blue-green plunge pool with a bronze lion-head fountain spouting water. Drifting steam, clay oil lamps on the cushions, warm candle-orange light, wet marble highlights, columns with Corinthian capitals, dark warm shadows. At the edge, a cheeky cartoonish Roman bath attendant (Pixar-like proportions, short cream tunic with terracotta trim, towel over shoulder, curly dark hair) leans on a column grinning. HUD overlay in Hebrew, right-to-left layout: top-right a rounded chip with room title "חדר 1 · הגדה הישרה" and a small chip "זוויות צמודות"; top-left three small ivory ball stroke tokens, three stars, pause and sound icons; bottom-center a big LTR angle readout "50°" with − and + buttons on each side and next to it a large round hold-to-strike button with a glowing ring power meter; on the right edge a small bronze hint oil-lamp button. HUD style: warm gold and cream, glassy dark-teal panels, chunky readable game UI. Make it look like a game a 13-year-old would choose to play.
```

### Turn 2 → `02-mid-play.png`

```
Great, keep exactly this art style, lighting, HUD style and the same attendant character. Now create image 2 (landscape 16:9): the core action mid-play in a later room. The table is a REGULAR HEXAGON mosaic table (six equal cream marble cushions, interior corners 120 degrees) in the same candle-lit Roman bath hall, plunge pool and lion fountain beside it. The camera is pushed in closer and lower than before, following the ball. The ivory ball with gold band is mid-flight across the mosaic leaving a glowing gold-and-white motion trail; the trail shows a straight path that already bounced off two cushions, and at each bounce point a glowing gold angle arc with a number in LTR ("50°" at the first cushion, "10°" at the second). The ball is about to make its last bounce toward a bronze-rimmed drain pocket in a corner, with a subtle slow-motion effect (speed lines, slight radial blur, water droplets hanging in the air, steam). Small gold sparks where the ball hit the cushion. The attendant at the edge leans forward with both fists clenched in suspense. HUD in Hebrew right-to-left: top-right room chip "חדר 5 · השולחן המשושה" and fact chip "סכום זוויות במצולע"; top-left two remaining ivory stroke tokens (one used, greyed), stars; bottom-center the angle readout "50°" dimmed during the shot and a small "slow-mo" indicator; the strike button greyed while the ball moves. Exciting, juicy, premium game feel.
```

### Turn 3 → `03-failure.png`

```
Same style, same game, same attendant, same HUD style. Now image 3 (landscape 16:9): the failure moment, funny and recoverable. Room 1 rectangular mosaic table from image 1, same 3/4 overhead camera about 55 degrees down. The ivory ball has just flown the wrong way (mirror direction) off the table and PLOPPED into the deep blue-green plunge pool with a big cartoony splash and water droplets. The whole path of the shot is drawn on the table as a faint translucent white ghost line from the ball's start to the pool. At the start point, a bright gold circle highlights the wrongly chosen angle arc ("130°" shown in the wrong position) next to the correct carved "?" arc. Near it, a short explanation card in a dark teal glass panel with gold border, Hebrew right-to-left, one line of text and a small diagram of two adjacent angles adding up to 180° ("130° + 50° = 180°" written LTR), and a big round gold button labelled "שוב" (again). The cheeky attendant at the column facepalms dramatically, towel slipping off his shoulder. HUD: top-right room chip "חדר 1 · הגדה הישרה", top-left stroke tokens with one greyed out, stars; bottom-center angle readout "130°". Funny, not punishing.
```

### Turn 4 → `04-curling.png`

```
Same style, same game, same attendant, same HUD style. Now image 4 (landscape 16:9): the curling room. A flooded caldarium (hot bath hall) at night: a long lane of wet polished cream marble with a thin film of water reflecting oil lamps and columns, steam everywhere. The camera is LOW and long, just behind and above a polished grey granite curling stone with a bronze handle, looking down the lane. The stone is sliding forward leaving a shimmering wake in the thin water. Ahead, a bronze vane deflector post (a rotating bronze blade on a pivot) that will turn the stone; a glowing gold arc on the floor at the post shows the turn with "115°" in LTR, and two smaller carved gold arcs in the floor mosaic marked "40°" and "75°" form a triangle with gold tile lines. Beyond, a bronze-rimmed drain target ring glowing softly. A deep blue-green pool and a bronze lion-head fountain on the side. The attendant sits on the pool edge cheering with both arms up. HUD Hebrew right-to-left: top-right room chip "חדר 6 · פניית הקרלינג" and fact chip "זווית חיצונית"; top-left stroke tokens shaped like tiny curling stones, stars; bottom-center angle readout "115°" labelled with a small vane icon, −/+ buttons and the round strike button with ring meter; hint lamp at the right edge. Cinematic, atmospheric, fun.
```

### Turn 5 → `ref-attendant-tpose.png` (Tripo input, not a mockup)

```
Now a 3D-model reference image (square 1:1), NOT a game screenshot: the same cheeky Roman bath attendant character "Decimus" as a single full-body stylized 3D character (Pixar-like proportions, slightly bigger head, teen-to-young-adult, not realistic), standing in a clean symmetric T-pose, facing the camera straight on, arms straight out horizontally, legs slightly apart, feet flat. Short cream tunic with terracotta trim and a belt, a white towel draped over his left shoulder (tight to the body so it does not cover the arm), leather sandals, curly dark hair, no laurel wreath, no props in hands, cheeky grin. Plain light grey background, even soft studio lighting, no shadows on the background, whole body visible with margin, no text.
```

### Turn 6 → `ref-oil-lamp.png` (Tripo input, not a mockup)

```
Now another 3D-model reference image (square 1:1), not a game screenshot: a single ancient Roman terracotta oil lamp (lucerna), seen from a 3/4 top-front angle. It is LOW and FLAT like a small closed saucer: a round flat body about as tall as a finger, a shallow concave top disc with a small relief rosette and a small filling hole in the center, ONE short rounded nozzle sticking out horizontally at the front with a small dark wick hole, and a small vertical ring handle at the back. NOT a teapot, NOT a jug: no neck, no lid, no spout rising upward, no tall body. Warm orange-red fired clay, slightly worn, stylized realistic like a game prop. Plain light grey background, soft even studio light, whole object visible with margin, no flame, no text.
```

## Decimus v2 (26 Oct 2026)

Why: the user played the game and said Decimus "is standing weirdly, and has a creepy smile" (v1 had a wide toothy grin and stiff locked arms). v2 is a new Tripo input with a calm closed-mouth smile and an A-pose.

- Tool: ChatGPT web app (signed-in Chrome, own tab), built-in image generation, model picker "Instant". New chat: https://chatgpt.com/c/6adf4f09-87d4-83ed-a8cf-4525675928e9 (one turn).
- Output: `ref-attendant-v2.png`, 1254×1254 PNG, saved from the rendered image blob. Kept on the first generation: warm soft closed-mouth smile (lips together, no teeth), relaxed brown eyes, freckles, curly dark hair, cream tunic with terracotta Greek-key trim at neck, sleeves and hem, brown belt, white towel over his left shoulder tight to the body, brown sandals, symmetric A-pose with arms about 45–50° below horizontal and a clear gap to the torso, plain light grey background. Deviation: he reads a little older/leaner (≈14) than the chubbier v1 kid, and the fingers are slightly spread.

### Turn 1 → `ref-attendant-v2.png` (Tripo input, not a mockup)

```
Create an image: a 3D-model reference image (square 1:1), not a game screenshot: a single full-body stylized 3D cartoon character in a Pixar-like style, "Decimus", a friendly Roman bath attendant boy of about 14, slightly bigger head, not realistic. He stands in a clean, symmetric, relaxed A-pose facing the camera straight on: arms angled down about 40 degrees below horizontal and slightly away from the body (hands open and relaxed, palms facing down/back, fingers gently together, a clear gap between arms and torso), legs slightly apart, feet flat, shoulders relaxed. Face: warm, calm and kind, with a soft gentle CLOSED-MOUTH smile (lips together, no teeth showing, no grin), relaxed friendly eyes looking at the camera, natural eyebrows, a few freckles. Curly dark brown hair, no laurel wreath. Short cream wool tunic with a terracotta Greek-key trim at the neck, sleeves and hem, a simple belt, a white towel draped over his left shoulder lying tight against the chest and back (not covering the arm), brown leather sandals. No props in hands. Plain light grey background, even soft studio lighting, no cast shadows on the background, whole body visible with margin, no text.
```
