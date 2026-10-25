// The bathhouse and the table. Table, cushions, mosaic lines, angle arcs, protractor, drains and
// baths are built from the rules geometry, so what you see is exactly what the math says.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { type Vec, add, along, dir, heading, norm, scale, sub, v, type PathResult } from './rules.ts';
import { BALL_R, type AngleMark, type Room } from './levels.ts';
import { ballTexture, grateTexture, hallFloorTexture, labelTexture, marbleTexture, mosaicTexture, protractorTexture, softDot, waterTexture } from './textures.ts';
import { type Models, findClip, fitHeight, shadowsOn } from './models.ts';

const RAD = Math.PI / 180;
const CUSHION_W = 0.22;
const CUSHION_H = 0.065;
const TABLE_DROP = 0.75;
const GOLD = new THREE.Color('#f2c25a');

/** Offset a convex counter-clockwise polygon outward by d. */
export function offsetPoly(poly: Vec[], d: number): Vec[] {
  const n = poly.length;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const e = norm(sub(b, a));
    const out = v(e.y, -e.x);
    return { p: add(a, scale(out, d)), e };
  });
  return lines.map((L, i) => {
    const P = lines[(i + n - 1) % n];
    const den = P.e.x * L.e.y - P.e.y * L.e.x;
    const t = ((L.p.x - P.p.x) * L.e.y - (L.p.y - P.p.y) * L.e.x) / den;
    return add(P.p, scale(P.e, t));
  });
}

interface MarkView {
  mark: AngleMark;
  /** Label centre in plane-group coordinates (or the arc's middle when unlabelled). */
  focus: THREE.Vector3;
  group: THREE.Group;
  mats: THREE.MeshBasicMaterial[];
  base: number[];
}

interface Particle {
  sprite: THREE.Sprite;
  vel: THREE.Vector3;
  life: number;
  max: number;
  grow: number;
  gravity: number;
}

export interface ShotAnim {
  path: PathResult;
  /** Elapsed arc length. */
  s: number;
  speed: number;
  /** Deceleration so the ball stops exactly at the end of its reach. */
  decel: number;
  nextBounce: number;
  turned: boolean;
  dropT: number;
  done: boolean;
  slowmo: boolean;
}

export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(42, 1, 0.05, 80);
  room!: Room;
  center = v(0, 0);
  table = new THREE.Group();
  /** Floor decals live here: x/y are table coordinates minus the centre, z is height. */
  plane = new THREE.Group();
  ball = new THREE.Group();
  ballMesh!: THREE.Mesh;
  stoneObj: THREE.Object3D | null = null;
  protractor = new THREE.Group();
  needle!: THREE.Mesh;
  protractorDisc!: THREE.Mesh;
  aim!: THREE.Mesh;
  vane = new THREE.Group();
  vaneBlade = new THREE.Group();
  marks = new Map<string, MarkView>();
  ghost = new THREE.Group();
  runLine = new THREE.Group();
  bounceLabels = new THREE.Group();
  focusRing!: THREE.Mesh;
  particles: Particle[] = [];
  steam: THREE.Sprite[] = [];
  flames: { sprite: THREE.Sprite; light?: THREE.PointLight; t: number }[] = [];
  water: THREE.Mesh[] = [];
  mixer: THREE.AnimationMixer | null = null;
  actions: Record<string, THREE.AnimationAction | null> = {};
  currentAction: THREE.AnimationAction | null = null;
  attendant = new THREE.Group();
  models: Models;
  camYaw = 0;
  camBase = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  camGoal = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  camNow = { pos: new THREE.Vector3(), look: new THREE.Vector3() };
  shake = 0;
  hint: string[] = [];
  focus: string | null = null;
  reducedMotion = false;
  time = 0;
  private texCache = {
    marble: marbleTexture(7, '#e8c4a2', 'rgba(150,58,34,'),
    marbleDark: marbleTexture(21, '#a9765a', 'rgba(90,36,20,'),
    protractor: protractorTexture(),
    protractorRev: protractorTexture(true),
    soft: softDot(),
    flame: softDot('rgba(255,230,160,1)', 'rgba(255,120,30,0)'),
    grate: grateTexture(),
    water: waterTexture(),
    ball: ballTexture(),
  };

  constructor(canvas: HTMLCanvasElement, models: Models) {
    this.models = models;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.28;
    this.scene.background = new THREE.Color('#1a0f0a');
    this.scene.fog = new THREE.Fog('#24140c', 9, 22);
    this.buildLights();
    this.buildHall();
    this.scene.add(this.table);
    this.plane.rotation.x = -Math.PI / 2;
    this.plane.position.y = 0.004;
    this.table.add(this.plane);
    this.buildBall();
    this.buildProtractor();
    this.buildVane();
    this.buildAttendant();
    this.plane.add(this.ghost, this.runLine, this.bounceLabels);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.9, depthWrite: false });
    this.focusRing = new THREE.Mesh(new THREE.RingGeometry(0.2, 0.235, 48), ringMat);
    this.focusRing.visible = false;
    this.plane.add(this.focusRing);
  }

  // ─── Static hall ────────────────────────────────────────────────────────────────────────────
  private buildLights() {
    this.scene.add(new THREE.HemisphereLight('#ffc890', '#2a1408', 0.32));
    const key = new THREE.DirectionalLight('#ffc38a', 1.45);
    key.position.set(-3.5, 7, 4.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -6;
    key.shadow.camera.right = 6;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    key.shadow.bias = -0.0004;
    key.shadow.normalBias = 0.02;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight('#5fd0c8', 0.35);
    rim.position.set(5, 3, -5);
    this.scene.add(rim);
  }

  private buildHall() {
    const floorTex = hallFloorTexture();
    floorTex.repeat.set(10, 10);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.28, metalness: 0.05, envMapIntensity: 1.2 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -TABLE_DROP;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Back colonnade and walls.
    const wallMat = new THREE.MeshStandardMaterial({ map: this.texCache.marbleDark, roughness: 0.6 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(30, 7, 0.4), wallMat);
    wall.position.set(0, 2.7, -7.5);
    wall.receiveShadow = true;
    this.scene.add(wall);
    for (let i = -3; i <= 3; i++) {
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.16, 8, 24, Math.PI),
        new THREE.MeshStandardMaterial({ map: this.texCache.marble, roughness: 0.5 }),
      );
      arch.position.set(i * 3, 2.4, -7.25);
      this.scene.add(arch);
      const niche = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.4), new THREE.MeshBasicMaterial({ color: '#120804' }));
      niche.position.set(i * 3, 1.2, -7.28);
      this.scene.add(niche);
    }
    const colPos: [number, number][] = [];
    for (let i = -3; i <= 3; i++) colPos.push([i * 3 + 1.5, -6.2]);
    colPos.push([-6.2, -2.5], [-6.2, 1.5], [6.6, -2.5], [6.6, 1.5]);
    const colModel = this.models.column?.scene;
    for (const [x, z] of colPos) {
      let col: THREE.Object3D;
      if (colModel) {
        col = fitHeight(colModel.clone(true), 4.2);
      } else {
        col = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 3.8, 20), new THREE.MeshStandardMaterial({ map: this.texCache.marble, roughness: 0.45 }));
        shaft.position.y = 1.9;
        const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), new THREE.MeshStandardMaterial({ map: this.texCache.marble }));
        cap.position.y = 3.9;
        col.add(shaft, cap);
      }
      col.position.set(x, -TABLE_DROP, z);
      shadowsOn(col, true, true);
      this.scene.add(col);
    }

    // Plunge pool to the right of the table.
    const poolW = 3.2;
    const poolD = 5;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(poolW, poolD), this.waterMaterial(0.92));
    pool.rotation.x = -Math.PI / 2;
    pool.position.set(5.1, -TABLE_DROP + 0.38, -1.2);
    this.scene.add(pool);
    this.water.push(pool);
    const rimMat = new THREE.MeshStandardMaterial({ map: this.texCache.marble, roughness: 0.35 });
    for (const [w, d, x, z] of [
      [poolW + 0.5, 0.25, 5.1, -1.2 - poolD / 2],
      [poolW + 0.5, 0.25, 5.1, -1.2 + poolD / 2],
      [0.25, poolD, 5.1 - poolW / 2, -1.2],
      [0.25, poolD, 5.1 + poolW / 2, -1.2],
    ] as const) {
      const r = new THREE.Mesh(new THREE.BoxGeometry(w, 0.55, d), rimMat);
      r.position.set(x, -TABLE_DROP + 0.27, z);
      r.castShadow = r.receiveShadow = true;
      this.scene.add(r);
    }
    const poolLight = new THREE.PointLight('#3fd6c8', 6, 7, 2);
    poolLight.position.set(5.1, -0.1, -1.2);
    this.scene.add(poolLight);

    // Lion-head fountain on a pier behind the pool.
    const pier = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.6, 0.6), wallMat);
    pier.position.set(5.1, -TABLE_DROP + 1.3, -4.1);
    pier.castShadow = true;
    this.scene.add(pier);
    const fountain = this.models.fountain?.scene;
    const lion = fountain ? fitHeight(fountain.clone(true), 0.9) : this.fallbackLion();
    lion.position.set(5.1, -TABLE_DROP + 1.25, -3.75);
    shadowsOn(lion, true, false);
    this.scene.add(lion);
    this.fountainSpout = new THREE.Vector3(5.1, -TABLE_DROP + 1.45, -3.35);

    // Steam drifting over the pool and the table.
    const steamMat = new THREE.SpriteMaterial({ map: this.texCache.soft, color: '#fff3e6', transparent: true, opacity: 0.08, depthWrite: false });
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(steamMat.clone());
      s.position.set(2 + Math.random() * 6, -0.3 + Math.random() * 1.8, -4 + Math.random() * 6);
      const k = 1.2 + Math.random() * 1.8;
      s.scale.set(k, k, 1);
      s.userData.v = 0.05 + Math.random() * 0.08;
      this.steam.push(s);
      this.scene.add(s);
    }

    // Wall lamps far back for depth.
    for (const [x, y, z] of [
      [-4.5, 1.2, -6.9],
      [-1.5, 1.2, -6.9],
      [1.5, 1.2, -6.9],
      [4.5, 1.2, -6.9],
      [-6, 0.3, -1],
    ] as const) {
      this.addFlame(new THREE.Vector3(x, y, z), 0.28, false);
    }
  }

  fountainSpout = new THREE.Vector3();
  private fountainT = 0;

  private fallbackLion() {
    const g = new THREE.Group();
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35, 20, 16), new THREE.MeshStandardMaterial({ color: '#a8752a', metalness: 0.8, roughness: 0.35 }));
    g.add(head);
    return g;
  }

  waterMaterial(opacity: number) {
    return new THREE.MeshStandardMaterial({
      color: '#0f4f58',
      emissive: '#0b5e60',
      emissiveIntensity: 0.55,
      emissiveMap: this.texCache.water,
      roughness: 0.08,
      metalness: 0.1,
      transparent: true,
      opacity,
      envMapIntensity: 1.6,
    });
  }

  addFlame(pos: THREE.Vector3, size: number, light: boolean, parent: THREE.Object3D = this.scene) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texCache.flame, color: '#ffd28a', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.position.copy(pos);
    s.scale.set(size * 0.6, size, 1);
    parent.add(s);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texCache.soft, color: '#ff9a3c', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.set(size * 4, size * 4, 1);
    s.add(glow);
    glow.scale.set(4, 6.5, 1);
    let L: THREE.PointLight | undefined;
    if (light) {
      L = new THREE.PointLight('#ffad5c', 2.2, 4.5, 2);
      L.position.copy(pos).add(new THREE.Vector3(0, 0.1, 0));
      parent.add(L);
    }
    this.flames.push({ sprite: s, light: L, t: Math.random() * 10 });
    return s;
  }

  // ─── Movable pieces ─────────────────────────────────────────────────────────────────────────
  private buildBall() {
    this.ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_R, 32, 24),
      new THREE.MeshStandardMaterial({ map: this.texCache.ball, roughness: 0.18, metalness: 0.05, envMapIntensity: 1.4 }),
    );
    this.ballMesh.castShadow = true;
    this.ball.add(this.ballMesh);
    const stone = this.models.stone?.scene;
    this.stoneObj = stone ? fitHeight(stone.clone(true), BALL_R * 2.6) : this.fallbackStone();
    shadowsOn(this.stoneObj, true, false);
    this.stoneObj.visible = false;
    this.ball.add(this.stoneObj);
    this.scene.add(this.ball);
  }

  private fallbackStone() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(BALL_R * 1.2, BALL_R * 1.25, BALL_R * 1.4, 28), new THREE.MeshStandardMaterial({ color: '#6b6f73', roughness: 0.35 }));
    body.position.y = BALL_R * 0.7;
    const handle = new THREE.Mesh(new THREE.TorusGeometry(BALL_R * 0.45, BALL_R * 0.12, 8, 16, Math.PI), new THREE.MeshStandardMaterial({ color: '#b07a2c', metalness: 0.8, roughness: 0.3 }));
    handle.position.y = BALL_R * 1.45;
    g.add(body, handle);
    return g;
  }

  private buildProtractor() {
    const R = 0.42;
    const geo = new THREE.CircleGeometry(R, 64, 0, Math.PI);
    // Map the half disc onto the protractor texture (whose flat edge is at the bottom).
    const uv = geo.attributes.uv as THREE.BufferAttribute;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const H = 1024 / 2 + 40;
    for (let i = 0; i < uv.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const px = 512 + (x / R) * (512 - 12);
      const py = 1024 / 2 + 20 - (y / R) * (512 - 12); // the texture's centre row is S/2 + 20
      uv.setXY(i, px / 1024, 1 - py / H);
    }
    const disc = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ map: this.texCache.protractor, metalness: 0.55, roughness: 0.32, transparent: true, opacity: 0.93, envMapIntensity: 1.3 }),
    );
    disc.position.z = 0.012;
    this.protractorDisc = disc;
    this.protractor.add(disc);
    this.needle = new THREE.Mesh(new THREE.PlaneGeometry(R * 1.02, 0.012), new THREE.MeshBasicMaterial({ color: '#3b1f04' }));
    this.needle.geometry.translate(R * 0.51, 0, 0);
    this.needle.position.z = 0.016;
    this.protractor.add(this.needle);
    this.plane.add(this.protractor);
    const aimMat = new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false });
    this.aim = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.03), aimMat);
    this.aim.geometry.translate(0.5, 0, 0);
    this.aim.position.z = 0.02;
    this.plane.add(this.aim);
  }

  private buildVane() {
    const bronze = new THREE.MeshStandardMaterial({ color: '#b07a2c', metalness: 0.85, roughness: 0.3 });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.32, 20), bronze);
    post.position.y = 0.16;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), bronze);
    knob.position.y = 0.34;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.04, 24), bronze);
    base.position.y = 0.02;
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.018), bronze);
    blade.position.y = 0.15;
    this.vaneBlade.add(blade);
    this.vane.add(post, knob, base, this.vaneBlade);
    shadowsOn(this.vane, true, false);
    this.vane.visible = false;
    this.scene.add(this.vane);
  }

  private buildAttendant() {
    const g = this.models.attendant;
    if (g) {
      const obj = fitHeight(g.scene, 1.45);
      shadowsOn(obj, true, false);
      this.attendant.add(obj);
      this.mixer = new THREE.AnimationMixer(g.scene);
      const clips = g.animations;
      const pick = (...n: string[]) => {
        const c = findClip(clips, ...n);
        return c ? this.mixer!.clipAction(c) : null;
      };
      this.actions.idle = pick('idle', 'breath', 'stand');
      this.actions.cheer = pick('cheer', 'clap', 'celebrat', 'victory', 'happy', 'jump');
      this.actions.facepalm = pick('facepalm', 'disappoint', 'sad', 'defeat', 'upset', 'shake');
      this.actions.disappointed = pick('disappoint', 'frustrat', 'sad') ?? this.actions.facepalm;
      if (!this.actions.idle && clips[0]) this.actions.idle = this.mixer.clipAction(clips[0]);
      this.play('idle');
    } else {
      // A simple stand-in so the composition holds without the model.
      const mat = new THREE.MeshStandardMaterial({ color: '#e9dcc0', roughness: 0.7 });
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.7, 6, 12), mat);
      body.position.y = 0.6;
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), new THREE.MeshStandardMaterial({ color: '#c58b62' }));
      head.position.y = 1.25;
      this.attendant.add(body, head);
      shadowsOn(this.attendant, true, false);
    }
    this.scene.add(this.attendant);
  }

  private reactionLeft = 0;

  play(name: 'idle' | 'cheer' | 'facepalm' | 'disappointed') {
    const a = this.actions[name];
    if (!a || !this.mixer) return;
    if (this.currentAction === a && name === 'idle') return;
    a.reset();
    a.setLoop(name === 'idle' ? THREE.LoopRepeat : THREE.LoopOnce, name === 'idle' ? Infinity : 1);
    a.clampWhenFinished = true;
    a.fadeIn(0.25).play();
    if (this.currentAction && this.currentAction !== a) this.currentAction.fadeOut(0.25);
    this.currentAction = a;
    // Reactions are long Tripo clips; cut back to idle after a few seconds.
    this.reactionLeft = name === 'idle' ? 0 : Math.min(a.getClip().duration, name === 'cheer' ? 4.5 : 4);
  }

  // ─── Room ───────────────────────────────────────────────────────────────────────────────────
  /** World position of a table point at height h. */
  w(p: Vec, h = 0): THREE.Vector3 {
    return new THREE.Vector3(p.x - this.center.x, h, -(p.y - this.center.y));
  }
  /** Plane-group local position. */
  lp(p: Vec, z = 0): THREE.Vector3 {
    return new THREE.Vector3(p.x - this.center.x, p.y - this.center.y, z);
  }

  buildRoom(room: Room) {
    this.room = room;
    // Clear previous room geometry (keep plane, ghost etc.).
    for (const c of [...this.table.children]) if (c !== this.plane) this.disposeTree(c, this.table);
    for (const c of [...this.plane.children]) {
      if (c === this.protractor || c === this.aim || c === this.ghost || c === this.runLine || c === this.bounceLabels || c === this.focusRing) continue;
      this.disposeTree(c, this.plane);
    }
    this.marks.clear();
    this.clearGhost();
    this.clearRun();
    const xs = room.table.poly.map((p) => p.x);
    const ys = room.table.poly.map((p) => p.y);
    this.center = v((Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2);
    this.camYaw = this.camYawFor(room);

    const shapeOf = (pts: Vec[]) => new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x - this.center.x, p.y - this.center.y)));
    const inner = offsetPoly(room.table.poly, BALL_R);
    const outer = offsetPoly(room.table.poly, BALL_R + CUSHION_W);

    // Marble body under the table.
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shapeOf(offsetPoly(room.table.poly, BALL_R + CUSHION_W - 0.02)), { depth: TABLE_DROP, bevelEnabled: false }),
      new THREE.MeshStandardMaterial({ map: this.texCache.marbleDark, roughness: 0.4 }),
    );
    body.rotation.x = -Math.PI / 2;
    body.position.y = -TABLE_DROP;
    body.castShadow = body.receiveShadow = true;
    this.table.add(body);

    // Cushions: a marble band with the inner face exactly BALL_R outside the ball-centre boundary.
    const band = shapeOf(outer);
    band.holes.push(new THREE.Path(inner.map((p) => new THREE.Vector2(p.x - this.center.x, p.y - this.center.y))));
    const marble = this.texCache.marble.clone();
    marble.repeat.set(0.5, 0.5);
    const cushion = new THREE.Mesh(
      new THREE.ExtrudeGeometry(band, { depth: CUSHION_H - 0.03, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.025, bevelSegments: 3, curveSegments: 4 }),
      new THREE.MeshStandardMaterial({ map: marble, roughness: 0.22, metalness: 0.02, envMapIntensity: 1.3 }),
    );
    cushion.rotation.x = -Math.PI / 2;
    cushion.castShadow = cushion.receiveShadow = true;
    this.table.add(cushion);

    // Mosaic floor.
    const floorPoly = offsetPoly(room.table.poly, BALL_R + 0.03);
    const fx = floorPoly.map((p) => p.x);
    const fy = floorPoly.map((p) => p.y);
    const min = v(Math.min(...fx), Math.min(...fy));
    const max = v(Math.max(...fx), Math.max(...fy));
    const floorGeo = new THREE.ShapeGeometry(shapeOf(floorPoly));
    const uv = floorGeo.attributes.uv as THREE.BufferAttribute;
    const pos = floorGeo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, (pos.getX(i) + this.center.x - min.x) / (max.x - min.x), (pos.getY(i) + this.center.y - min.y) / (max.y - min.y));
    }
    const seed = [...room.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7);
    const floor = new THREE.Mesh(
      floorGeo,
      new THREE.MeshStandardMaterial({ map: mosaicTexture({ poly: floorPoly, min, max, seed, look: room.look }), roughness: room.look === 'caldarium' ? 0.12 : 0.55, metalness: 0.0, envMapIntensity: room.look === 'caldarium' ? 1.5 : 0.6 }),
    );
    floor.receiveShadow = true;
    floor.position.z = -0.003;
    this.plane.add(floor);
    if (room.look === 'caldarium') {
      // A film of warm water over the floor.
      const film = new THREE.Mesh(new THREE.ShapeGeometry(shapeOf(floorPoly)), this.waterMaterial(0.28));
      film.position.z = 0.002;
      this.plane.add(film);
      this.water.push(film);
    }

    // Tile lines.
    for (const L of room.lines) this.addTileLine(L.a, L.b, L.kind);
    // Angle marks.
    for (const m of room.marks) this.addMark(m);
    // Drains and baths.
    for (const pk of room.table.pockets) (room.stone ? this.addHouse(pk.c, pk.r) : this.addDrain(pk.c, pk.r));
    for (const pl of room.table.pools) this.addBath(pl.c, pl.r);
    // Regular-hexagon ticks: equal-side marks on every cushion.
    if (room.fact === 'polygon') this.addEqualTicks(room.table.poly);

    // Oil lamps on the cushion corners nearest the camera and far side.
    const lampModel = this.models.lamp?.scene;
    const corners = outer.map((p) => p).sort((a, b) => a.y - b.y);
    const lampSpots = [corners[0], corners[1], corners[corners.length - 1], corners[corners.length - 2]];
    lampSpots.forEach((c, i) => {
      const inward = norm(sub(this.center, c));
      const spot = add(c, scale(inward, 0.16));
      const pos3 = this.w(spot, CUSHION_H);
      const lamp = lampModel ? fitHeight(lampModel.clone(true), 0.11) : this.fallbackLamp();
      lamp.position.copy(pos3);
      // Nozzle toward the table centre; the Tripo lamp's nozzle tip is at +Z, ~0.6 of its height.
      const toC = sub(this.center, c);
      const rot = Math.atan2(toC.x, toC.y);
      lamp.rotation.y = rot;
      shadowsOn(lamp, true, false);
      this.table.add(lamp);
      const tip = lampModel ? new THREE.Vector3(0, 0.075, 0.145).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot) : new THREE.Vector3(0, 0.12, 0);
      this.addFlame(pos3.clone().add(tip), 0.1, i === 0 || i === 2, this.table);
    });

    // Vane.
    this.vane.visible = !!room.table.vane;
    if (room.table.vane) this.vane.position.copy(this.w(room.table.vane.p, 0));

    // Ball or stone.
    this.ballMesh.visible = !room.stone;
    if (this.stoneObj) this.stoneObj.visible = room.stone;
    this.placeBall(room.ball);
    this.ball.visible = true;
    this.ball.scale.setScalar(1);

    // Protractor at the ball (or at the vane).
    const pivot = room.mode === 'vane' && room.table.vane ? room.table.vane.p : room.ball;
    this.protractor.position.copy(this.lp(pivot, 0));
    this.protractor.rotation.z = (room.dialSign === 1 ? room.base : room.base - 180) * RAD;
    (this.protractorDisc.material as THREE.MeshStandardMaterial).map = room.dialSign === 1 ? this.texCache.protractor : this.texCache.protractorRev;
    this.aim.position.copy(this.lp(pivot, 0.02));

    // Attendant at the left of the table, facing the player and the table.
    this.frameCamera(true);
  }

  private fallbackLamp() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#a0522d', roughness: 0.7 }));
    body.scale.set(1.4, 0.7, 1);
    body.rotation.x = Math.PI;
    body.position.y = 0.045;
    g.add(body);
    return g;
  }

  private disposeTree(obj: THREE.Object3D, parent: THREE.Object3D) {
    parent.remove(obj);
    obj.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mats = m.material ? (Array.isArray(m.material) ? m.material : [m.material]) : [];
      for (const mat of mats) {
        const mm = mat as THREE.MeshStandardMaterial;
        if (mm.map && !Object.values(this.texCache).includes(mm.map as THREE.CanvasTexture)) mm.map.dispose();
        mat.dispose();
      }
      const L = o as THREE.PointLight;
      if (L.isPointLight) this.flames = this.flames.filter((f) => f.light !== L);
    });
    this.flames = this.flames.filter((f) => f.sprite.parent);
  }

  private strip(a: Vec, b: Vec, width: number, mat: THREE.Material, z = 0.003) {
    const d = sub(b, a);
    const L = Math.hypot(d.x, d.y);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(L, width), mat);
    const mid = scale(add(a, b), 0.5);
    m.position.copy(this.lp(mid, z));
    m.rotation.z = Math.atan2(d.y, d.x);
    return m;
  }

  private addTileLine(a: Vec, b: Vec, kind: 'gold' | 'worn' | 'parallel' | 'dashed') {
    const g = new THREE.Group();
    const gold = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: kind === 'worn' ? 0.35 : 0.9 });
    if (kind === 'dashed' || kind === 'worn') {
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(2, Math.floor(L / 0.07));
      for (let i = 0; i < n; i += 2) {
        const p = add(a, scale(sub(b, a), i / n));
        const q = add(a, scale(sub(b, a), Math.min(1, (i + 1) / n)));
        g.add(this.strip(p, q, kind === 'worn' ? 0.022 : 0.018, gold));
      }
    } else {
      g.add(this.strip(a, b, 0.024, gold));
    }
    if (kind === 'parallel') {
      // ≫ marks in the middle of the line, the textbook sign for parallel.
      const mid = scale(add(a, b), 0.5);
      const h = heading(sub(b, a));
      for (const k of [0, 0.07]) {
        const tip = along(mid, h, k);
        g.add(this.strip(along(tip, h + 150, 0.07), tip, 0.02, gold));
        g.add(this.strip(along(tip, h - 150, 0.07), tip, 0.02, gold));
      }
    }
    this.plane.add(g);
  }

  private addEqualTicks(poly: Vec[]) {
    const mat = new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.85 });
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i];
      const b = poly[(i + 1) % poly.length];
      const mid = scale(add(a, b), 0.5);
      const h = heading(sub(b, a));
      const inward = along(mid, h + 90, 0.03);
      this.plane.add(this.strip(along(inward, h + 90, -0.05), along(inward, h + 90, 0.07), 0.018, mat));
    }
  }

  private addMark(m: AngleMark) {
    const g = new THREE.Group();
    g.position.copy(this.lp(m.at, 0.004));
    const mats: THREE.MeshBasicMaterial[] = [];
    const color = m.kind === 'unknown' ? '#fff1c9' : m.kind === 'helper' ? '#ffd27a' : '#f2c25a';
    const width = m.kind === 'helper' ? 0.012 : 0.022;
    const arcMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: m.kind === 'helper' ? 0.0 : 0.95, side: THREE.DoubleSide, depthWrite: false });
    mats.push(arcMat);
    const arc = new THREE.Mesh(new THREE.RingGeometry(m.radius - width, m.radius + width, 48, 1, m.from * RAD, m.sweep * RAD), arcMat);
    g.add(arc);
    // A faint wedge fill makes the angle read as a region.
    const fillMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: m.kind === 'helper' ? 0 : 0.12, side: THREE.DoubleSide, depthWrite: false });
    mats.push(fillMat);
    g.add(new THREE.Mesh(new THREE.CircleGeometry(m.radius, 48, m.from * RAD, m.sweep * RAD), fillMat));
    if (m.rays > 0) {
      const rayMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false });
      mats.push(rayMat);
      for (const h of [m.from, m.from + m.sweep]) {
        const r = new THREE.Mesh(new THREE.PlaneGeometry(m.rays, 0.02), rayMat);
        r.geometry.translate(m.rays / 2, 0, 0);
        r.rotation.z = h * RAD;
        g.add(r);
      }
    }
    if (m.label) {
      const big = m.label === '?' ? 150 : 120;
      const { texture, aspect } = labelTexture(m.label, { color: m.kind === 'unknown' ? '#fff3cf' : '#f6c75a', size: big, glow: m.kind === 'unknown' ? 'rgba(255,240,190,0.9)' : 'rgba(255,190,80,0.8)' });
      const hgt = m.kind === 'corner' ? 0.18 : 0.23;
      const labelMat = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false });
      mats.push(labelMat);
      const lab = new THREE.Mesh(new THREE.PlaneGeometry(hgt * aspect, hgt), labelMat);
      const mid = (m.labelAt ? m.labelAt.heading : m.from + m.sweep / 2) * RAD;
      // Half the label's extent along the radial direction (the label turns with the camera).
      const yawR = this.camYawFor(this.room) * RAD;
      const ext = (Math.abs(Math.cos(mid - yawR)) * hgt * aspect + Math.abs(Math.sin(mid - yawR)) * hgt) / 2;
      const pivot = this.room.mode === 'vane' && this.room.table.vane ? this.room.table.vane.p : this.room.ball;
      const atPivot = Math.hypot(m.at.x - pivot.x, m.at.y - pivot.y) < 1e-6;
      const inner = Math.max(m.radius, atPivot ? 0.46 : 0);
      const rr = m.labelAt ? m.labelAt.r : inner + 0.05 + ext + (m.sweep < 25 ? 0.1 : 0);
      lab.position.set(Math.cos(mid) * rr, Math.sin(mid) * rr, 0.002);
      // Keep the label clear of the cushions: push it inward from any edge it crowds.
      const poly = this.room.table.poly;
      const clearance = hgt * 0.6 + 0.04;
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < poly.length; i++) {
          const A = poly[i];
          const B = poly[(i + 1) % poly.length];
          const e = norm(sub(B, A));
          const inward = v(-e.y, e.x);
          const P = v(m.at.x + lab.position.x, m.at.y + lab.position.y);
          const dIn = (P.x - A.x) * inward.x + (P.y - A.y) * inward.y;
          if (dIn < clearance) {
            lab.position.x += inward.x * (clearance - dIn);
            lab.position.y += inward.y * (clearance - dIn);
          }
        }
      }
      if (m.labelAt) {
        // Leader from the middle of the thin arc to its label.
        const am = (m.from + m.sweep / 2) * RAD;
        const a = new THREE.Vector2(Math.cos(am) * m.radius, Math.sin(am) * m.radius);
        const b = new THREE.Vector2(Math.cos(mid) * (rr - hgt * 0.45), Math.sin(mid) * (rr - hgt * 0.45));
        const L = a.distanceTo(b);
        const leadMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8, depthWrite: false });
        mats.push(leadMat);
        const lead = new THREE.Mesh(new THREE.PlaneGeometry(L, 0.012), leadMat);
        lead.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, 0.001);
        lead.rotation.z = Math.atan2(b.y - a.y, b.x - a.x);
        g.add(lead);
      }
      lab.rotation.z = this.camYawFor(this.room) * RAD;
      lab.userData.label = true;
      g.add(lab);
    }
    this.plane.add(g);
    const lab = g.children.find((c) => c.userData.label);
    const am = (m.from + m.sweep / 2) * RAD;
    const focus = lab ? g.position.clone().add(lab.position) : g.position.clone().add(new THREE.Vector3(Math.cos(am) * m.radius, Math.sin(am) * m.radius, 0));
    this.marks.set(m.id, { mark: m, group: g, mats, base: mats.map((x) => x.opacity), focus });
  }

  /** Portrait screens look along the table's long side so it fills the phone. */
  camYawFor(room: Room) {
    const xs = room.table.poly.map((p) => p.x);
    const ys = room.table.poly.map((p) => p.y);
    const wide = Math.max(...xs) - Math.min(...xs) > 1.25 * (Math.max(...ys) - Math.min(...ys));
    if (this.camera.aspect < 0.8 && wide) return -90;
    return room.mode === 'vane' ? -12 : 0;
  }

  private addDrain(c: Vec, r: number) {
    const R = r + BALL_R + 0.02;
    const g = new THREE.Group();
    g.position.copy(this.lp(c, 0.001));
    const hole = new THREE.Mesh(new THREE.CircleGeometry(R, 40), new THREE.MeshStandardMaterial({ map: this.texCache.grate, metalness: 0.6, roughness: 0.4 }));
    g.add(hole);
    const ring = new THREE.Mesh(new THREE.RingGeometry(R, R + 0.03, 40), new THREE.MeshStandardMaterial({ color: '#c08a36', metalness: 0.9, roughness: 0.25 }));
    ring.position.z = 0.002;
    g.add(ring);
    const glow = new THREE.Mesh(new THREE.RingGeometry(R + 0.03, R + 0.09, 40), new THREE.MeshBasicMaterial({ color: '#ffcf70', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.userData.pulse = true;
    g.add(glow);
    this.plane.add(g);
  }

  /** Curling target: concentric rings in bathhouse colours around a small drain. */
  private addHouse(c: Vec, r: number) {
    const g = new THREE.Group();
    g.position.copy(this.lp(c, 0.001));
    const rings: [number, string][] = [
      [0.24, '#b5583a'],
      [0.18, '#efe3cf'],
      [0.13, '#1f6f72'],
      [0.09, '#efe3cf'],
    ];
    rings.forEach(([R, col], i) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(R, 48), new THREE.MeshStandardMaterial({ color: col, roughness: 0.35, transparent: true, opacity: 0.85 }));
      m.position.z = i * 0.0004;
      g.add(m);
    });
    // The hole is drawn at the real capture radius, so aiming at it is no easier than the math.
    const hole = new THREE.Mesh(new THREE.CircleGeometry(r, 32), new THREE.MeshStandardMaterial({ map: this.texCache.grate, metalness: 0.6, roughness: 0.4 }));
    hole.position.z = 0.002;
    g.add(hole);
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.24, 0.28, 48), new THREE.MeshBasicMaterial({ color: '#ffcf70', transparent: true, opacity: 0.25, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.userData.pulse = true;
    g.add(glow);
    this.plane.add(g);
  }

  private addBath(c: Vec, r: number) {
    const R = r;
    const g = new THREE.Group();
    g.position.copy(this.lp(c, 0.0015));
    const water = new THREE.Mesh(new THREE.CircleGeometry(R, 48), this.waterMaterial(0.95));
    this.water.push(water);
    g.add(water);
    const rim = new THREE.Mesh(new THREE.RingGeometry(R, R + 0.025, 48), new THREE.MeshStandardMaterial({ color: '#b07a2c', metalness: 0.8, roughness: 0.3 }));
    rim.position.z = 0.002;
    g.add(rim);
    this.plane.add(g);
  }

  placeBall(p: Vec) {
    this.ball.position.copy(this.w(p, this.room.stone ? 0 : BALL_R));
  }

  /** Dial → protractor needle, aim stub and the vane's blade. */
  setDial(angle: number) {
    const r = this.room;
    const h = r.mode === 'vane' ? (r.lane ?? 0) + angle : r.base + r.dialSign * angle;
    const local = (r.dialSign === 1 ? angle : 180 - angle) * RAD;
    this.needle.rotation.z = local;
    this.aim.rotation.z = h * RAD;
    this.aim.scale.x = 0.42;
    if (r.mode === 'vane') this.vaneBlade.rotation.y = (h / 2) * RAD;
    else if (this.room.stone && this.stoneObj) this.stoneObj.rotation.y = h * RAD;
  }

  showAim(on: boolean) {
    this.protractor.visible = on;
    this.aim.visible = on;
  }

  setHint(ids: string[]) {
    this.hint = ids;
  }

  setFocus(id: string | null) {
    this.focus = id;
    const mv = id ? this.marks.get(id) : null;
    this.focusRing.visible = !!mv;
    if (mv) {
      this.focusRing.position.copy(mv.focus);
      this.focusRing.position.z = 0.012;
      this.focusRing.scale.set(1.15, 1.15, 1);
    }
  }

  // ─── Paths ──────────────────────────────────────────────────────────────────────────────────
  clearGhost() {
    for (const c of [...this.ghost.children]) this.disposeTree(c, this.ghost);
    this.setFocus(null);
  }
  clearRun() {
    for (const c of [...this.runLine.children]) this.disposeTree(c, this.runLine);
    for (const c of [...this.bounceLabels.children]) this.disposeTree(c, this.bounceLabels);
  }

  /** The missed shot stays on the table as a faint dashed ghost with arrows. */
  showGhost(path: PathResult) {
    this.clearGhost();
    const mat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.55, depthWrite: false });
    const pts = path.points;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const L = Math.hypot(b.x - a.x, b.y - a.y);
      const n = Math.max(1, Math.floor(L / 0.08));
      for (let k = 0; k < n; k += 2) {
        const p = add(a, scale(sub(b, a), k / n));
        const q = add(a, scale(sub(b, a), Math.min(1, (k + 1) / n)));
        this.ghost.add(this.strip(p, q, 0.016, mat, 0.006));
      }
      if (L > 0.3) {
        const h = heading(sub(b, a));
        const tip = add(a, scale(sub(b, a), 0.55));
        this.ghost.add(this.strip(along(tip, h + 150, 0.08), tip, 0.016, mat, 0.006));
        this.ghost.add(this.strip(along(tip, h - 150, 0.08), tip, 0.016, mat, 0.006));
      }
    }
  }

  /** Grow the glowing run line up to arc length s. */
  drawRun(path: PathResult, s: number) {
    for (const c of [...this.runLine.children]) this.disposeTree(c, this.runLine);
    const mat = new THREE.MeshBasicMaterial({ color: '#ffd36b', transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
    for (let i = 1; i < path.points.length; i++) {
      if (path.s[i - 1] >= s) break;
      const a = path.points[i - 1];
      const bFull = path.points[i];
      const f = Math.min(1, (s - path.s[i - 1]) / (path.s[i] - path.s[i - 1] || 1));
      const b = add(a, scale(sub(bFull, a), f));
      if (Math.hypot(b.x - a.x, b.y - a.y) > 0.005) this.runLine.add(this.strip(a, b, 0.022, mat, 0.007));
    }
  }

  /** Pop the measured angle where the ball met a cushion. */
  addBounceLabel(p: Vec, angle: number) {
    const near = Math.abs(angle - Math.round(angle)) < 0.05;
    const txt = near ? `${Math.round(angle)}°` : `${angle.toFixed(1)}°`;
    const { texture, aspect } = labelTexture(txt, { color: '#ffffff', size: 90, glow: 'rgba(255,220,140,0.9)' });
    const h = 0.13;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(h * aspect, h), new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }));
    const toward = norm(sub(this.center, p));
    m.position.copy(this.lp(add(p, scale(toward, 0.2)), 0.01));
    m.rotation.z = this.camYaw * RAD;
    m.userData.born = this.time;
    this.bounceLabels.add(m);
  }

  // ─── Effects ────────────────────────────────────────────────────────────────────────────────
  burst(pos: THREE.Vector3, n: number, color: string, speed: number, gravity = 4, size = 0.05, life = 0.7) {
    if (this.reducedMotion) n = Math.ceil(n / 3);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texCache.soft, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.position.copy(pos);
      s.scale.setScalar(size);
      const a = Math.random() * Math.PI * 2;
      const up = 0.4 + Math.random();
      const vel = new THREE.Vector3(Math.cos(a) * speed * Math.random(), up * speed, Math.sin(a) * speed * Math.random());
      this.scene.add(s);
      this.particles.push({ sprite: s, vel, life: 0, max: life * (0.6 + Math.random() * 0.6), grow: 0.4, gravity });
    }
  }

  splash(p: Vec) {
    const pos = this.w(p, 0.02);
    this.burst(pos, 36, '#cfffff', 1.6, 6, 0.06, 0.9);
    this.burst(pos, 10, '#ffffff', 0.4, 0.2, 0.25, 1.4);
    this.shake = 0.12;
  }

  sparkle(p: Vec) {
    this.burst(this.w(p, 0.06), 16, '#ffd36b', 0.9, 2, 0.05, 0.6);
  }

  // ─── Camera ─────────────────────────────────────────────────────────────────────────────────
  frameCamera(snap = false) {
    const room = this.room;
    const outer = offsetPoly(room.table.poly, BALL_R + CUSHION_W);
    const pts = outer.map((p) => this.w(p, CUSHION_H));
    const yaw = this.camYaw * RAD;
    // Long shallow tables (the corridors) get a steeper view so the far cushion stays readable.
    const xs = room.table.poly.map((p) => p.x);
    const ys = room.table.poly.map((p) => p.y);
    const ratio = (Math.max(...ys) - Math.min(...ys)) / (Math.max(...xs) - Math.min(...xs));
    const pitch = (room.mode === 'vane' ? 50 : ratio < 0.4 ? 60 : 47) * RAD;
    const dirv = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    const portrait = this.camera.aspect < 1;
    // Screen window for the table (NDC): leave the corners to the HUD and the bottom to the panel.
    const top = portrait ? 0.62 : 0.8;
    const bottom = portrait ? -0.62 : -0.56;
    // Landscape leaves the left edge to Decimus, like the mockups.
    const xl = portrait ? -0.97 : -0.6;
    const xr = portrait ? 0.97 : 0.9;
    const fitX = (xr - xl) / 2;
    const cam = this.camera.clone();
    const look = new THREE.Vector3();
    const bbox = (d: number) => {
      cam.position.copy(look).addScaledVector(dirv, d);
      cam.lookAt(look);
      cam.updateMatrixWorld();
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of pts) {
        // A point behind the camera never fits.
        if (p.clone().applyMatrix4(cam.matrixWorldInverse).z > -0.1) return { x0: -9, x1: 9, y0: -9, y1: 9 };
        const q = p.clone().project(cam);
        x0 = Math.min(x0, q.x);
        x1 = Math.max(x1, q.x);
        y0 = Math.min(y0, q.y);
        y1 = Math.max(y1, q.y);
      }
      return { x0, x1, y0, y1 };
    };
    let d = 6;
    for (let it = 0; it < 4; it++) {
      // Distance so the table's projected size fits the window, then pan so it is centred in it.
      let lo = 1;
      let hi = 40;
      for (let k = 0; k < 28; k++) {
        const m = (lo + hi) / 2;
        const bb = bbox(m);
        if (bb.x1 - bb.x0 <= 2 * fitX && bb.y1 - bb.y0 <= top - bottom) hi = m;
        else lo = m;
      }
      d = hi;
      const bb = bbox(d);
      const dy = (bb.y0 + bb.y1) / 2 - (top + bottom) / 2;
      const dx = (bb.x0 + bb.x1) / 2 - (xl + xr) / 2;
      const halfH = Math.tan((this.camera.fov * RAD) / 2) * d;
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cam.quaternion);
      look.addScaledVector(up, dy * halfH).addScaledVector(right, dx * halfH * this.camera.aspect);
    }
    this.camBase.pos.copy(look).addScaledVector(dirv, d);
    this.camBase.look.copy(look);
    this.camGoal.pos.copy(this.camBase.pos);
    this.camGoal.look.copy(this.camBase.look);
    if (snap) {
      this.camNow.pos.copy(this.camBase.pos);
      this.camNow.look.copy(this.camBase.look);
      this.camera.position.copy(this.camNow.pos);
      this.camera.lookAt(this.camNow.look);
    }
    // Stand Decimus where a fixed screen spot meets the hall floor.
    cam.position.copy(this.camBase.pos);
    cam.lookAt(this.camBase.look);
    cam.updateMatrixWorld();
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(portrait ? -0.72 : -0.8, portrait ? -0.5 : -0.66), cam);
    const feet = new THREE.Vector3();
    if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), TABLE_DROP), feet)) {
      this.attendant.position.copy(feet);
      this.attendant.rotation.y = yaw + 0.2;
    }
  }

  /** Ease the camera toward a point on the table (strike follow, slow-motion push-in). */
  pushTo(p: Vec | null, amount: number) {
    this.camGoal.pos.copy(this.camBase.pos);
    this.camGoal.look.copy(this.camBase.look);
    if (!p || this.reducedMotion) return;
    const target = this.w(p, 0);
    this.camGoal.look.lerp(target, amount);
    this.camGoal.pos.lerp(target.clone().add(new THREE.Vector3(0, 1.2, 1.1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw * RAD)), amount * 0.55);
  }

  /** Returns true when the room had to be rebuilt (portrait ↔ landscape changes the view). */
  resize(w: number, h: number): boolean {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 58 : 48;
    this.camera.updateProjectionMatrix();
    if (!this.room) return false;
    if (this.camYawFor(this.room) !== this.camYaw) {
      this.buildRoom(this.room);
      return true;
    }
    this.frameCamera(true);
    return false;
  }

  // ─── Frame ──────────────────────────────────────────────────────────────────────────────────
  update(dt: number) {
    this.time += dt;
    const t = this.time;
    this.mixer?.update(dt);
    if (this.reactionLeft > 0) {
      this.reactionLeft -= dt;
      if (this.reactionLeft <= 0) this.play('idle');
    }
    // Camera.
    const k = 1 - Math.exp(-dt * 3.2);
    this.camNow.pos.lerp(this.camGoal.pos, k);
    this.camNow.look.lerp(this.camGoal.look, k);
    this.camera.position.copy(this.camNow.pos);
    if (this.shake > 0 && !this.reducedMotion) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake * 0.25;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.25;
      this.shake = Math.max(0, this.shake - dt * 0.5);
    }
    this.camera.lookAt(this.camNow.look);
    // Hint glow and focus ring.
    for (const [id, mv] of this.marks) {
      const lit = this.hint.includes(id);
      const pulse = lit ? 0.55 + 0.45 * Math.sin(t * 5) : 0;
      mv.mats.forEach((m, i) => {
        const base = mv.base[i];
        m.opacity = lit ? Math.min(1, Math.max(base, 0.5) + pulse * 0.4) : base;
      });
      mv.group.scale.setScalar(lit ? 1 + pulse * 0.05 : 1);
    }
    if (this.focusRing.visible) {
      const s = 1 + 0.08 * Math.sin(t * 6);
      (this.focusRing.material as THREE.MeshBasicMaterial).opacity = 0.6 + 0.35 * Math.sin(t * 6);
      this.focusRing.rotation.z = t * 0.5;
      this.focusRing.scale.z = s;
    }
    // Aim stub shimmer.
    (this.aim.material as THREE.MeshBasicMaterial).opacity = 0.75 + 0.2 * Math.sin(t * 6);
    // Drain glow pulse.
    this.plane.traverse((o) => {
      if (o.userData.pulse) ((o as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.18 + 0.12 * Math.sin(t * 3);
    });
    // Water shimmer.
    for (const w of this.water) {
      const m = w.material as THREE.MeshStandardMaterial;
      if (m.emissiveMap) m.emissiveMap.offset.set(Math.sin(t * 0.2) * 0.05, t * 0.02);
    }
    // Flames flicker.
    for (const f of this.flames) {
      f.t += dt;
      const fl = 1 + 0.12 * Math.sin(f.t * 13) + 0.08 * Math.sin(f.t * 23.7);
      f.sprite.scale.y = f.sprite.scale.x * 1.6 * fl;
      if (f.light) f.light.intensity = 2.2 * fl;
    }
    // Steam.
    for (const s of this.steam) {
      s.position.y += s.userData.v * dt;
      s.position.x += Math.sin(t * 0.3 + s.position.z) * dt * 0.05;
      if (s.position.y > 2.4) s.position.y = -0.4;
      (s.material as THREE.SpriteMaterial).opacity = 0.07 * Math.min(1, (2.4 - s.position.y) / 1.2);
    }
    // Fountain stream.
    this.fountainT += dt;
    if (this.fountainT > 0.05) {
      this.fountainT = 0;
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.texCache.soft, color: '#bff6ff', transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }));
      s.position.copy(this.fountainSpout);
      s.scale.setScalar(0.12);
      this.scene.add(s);
      this.particles.push({ sprite: s, vel: new THREE.Vector3((Math.random() - 0.5) * 0.1, 0.1, 0.9 + Math.random() * 0.2), life: 0, max: 0.9, grow: 0.2, gravity: 3.2 });
    }
    // Particles.
    this.particles = this.particles.filter((p) => {
      p.life += dt;
      if (p.life > p.max) {
        this.scene.remove(p.sprite);
        p.sprite.material.dispose();
        return false;
      }
      p.vel.y -= p.gravity * dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      const f = p.life / p.max;
      p.sprite.material.opacity = 1 - f;
      p.sprite.scale.multiplyScalar(1 + p.grow * dt);
      return true;
    });
    // Bounce labels fade in then settle.
    for (const c of this.bounceLabels.children) {
      const age = t - (c.userData.born ?? t);
      const s = Math.min(1, age * 5);
      c.scale.setScalar(0.6 + 0.4 * s + 0.15 * Math.max(0, 1 - age * 3));
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** Points of a world-space point on screen (for HUD anchoring). */
  toScreen(p: Vec, h = 0): { x: number; y: number } {
    const q = this.w(p, h).project(this.camera);
    const el = this.renderer.domElement;
    return { x: ((q.x + 1) / 2) * el.clientWidth, y: ((1 - q.y) / 2) * el.clientHeight };
  }

  /** Table point under a screen point (raycast on the table plane y = 0). */
  pick(clientX: number, clientY: number): Vec | null {
    const el = this.renderer.domElement;
    const rect = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), hit)) return null;
    return v(hit.x + this.center.x, -hit.z + this.center.y);
  }
}

export { dir };
