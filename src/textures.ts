// Procedural canvas textures: mosaic floors, veined marble, the brass protractor, carved labels,
// soft sprites. Everything is drawn at load, so the build needs no image files.
import * as THREE from 'three';
import type { Vec } from './rules.ts';

/** Small seeded PRNG so a room's mosaic looks the same every time. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!] as const;
}

function tex(c: HTMLCanvasElement, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const TEAL = ['#1d5f63', '#226a6c', '#1a5658', '#256f6f', '#1f6466', '#18504f', '#2a7774'];
const GOLD = ['#e2b04a', '#d9a23c', '#eabf5c', '#c99036', '#f0c86a'];
const CREAM = ['#efe3cf', '#e8d9c0', '#f3e9d8'];
const TERRA = ['#b5583a', '#a84d31', '#c06646'];

export interface MosaicSpec {
  /** Visual floor polygon (table coords). */
  poly: Vec[];
  min: Vec;
  max: Vec;
  seed: number;
  look: 'bath' | 'caldarium';
}

/** The table's mosaic floor: teal tesserae, a gold-and-cream border, a laurel and amphora motif. */
export function mosaicTexture(spec: MosaicSpec): THREE.CanvasTexture {
  const W = spec.max.x - spec.min.x;
  const H = spec.max.y - spec.min.y;
  const k = Math.min(420, 2048 / Math.max(W, H));
  const [c, g] = canvas(Math.ceil(W * k), Math.ceil(H * k));
  const r = rng(spec.seed);
  const P = (p: Vec) => [(p.x - spec.min.x) * k, (spec.max.y - p.y) * k] as const;
  const water = spec.look === 'caldarium';

  g.fillStyle = water ? '#24504f' : '#123f42';
  g.fillRect(0, 0, c.width, c.height);
  const cell = 0.034 * k;
  const pal = water ? ['#3d6a64', '#466f68', '#355f5a', '#4d766d', '#2f5853'] : TEAL;
  for (let y = 0; y < c.height; y += cell) {
    const off = (Math.floor(y / cell) % 2) * cell * 0.5;
    for (let x = -cell; x < c.width; x += cell) {
      g.fillStyle = pal[Math.floor(r() * pal.length)];
      const j = cell * 0.08;
      g.fillRect(x + off + (r() - 0.5) * j, y + (r() - 0.5) * j, cell * 0.86, cell * 0.86);
    }
  }

  // Border bands follow the table outline, inset.
  const center = spec.poly.reduce((a, p) => ({ x: a.x + p.x / spec.poly.length, y: a.y + p.y / spec.poly.length }), { x: 0, y: 0 });
  const inset = (d: number) => spec.poly.map((p) => {
    const dx = center.x - p.x;
    const dy = center.y - p.y;
    const l = Math.hypot(dx, dy);
    return { x: p.x + (dx / l) * d, y: p.y + (dy / l) * d };
  });
  const band = (d: number, width: number, colors: string[]) => {
    g.save();
    g.lineJoin = 'miter';
    const pts = inset(d).map(P);
    // Dotted tesserae along the band.
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      const L = Math.hypot(bx - ax, by - ay);
      const n = Math.floor(L / cell);
      for (let s = 0; s < n; s++) {
        const t = s / n;
        g.fillStyle = colors[Math.floor(r() * colors.length)];
        g.save();
        g.translate(ax + (bx - ax) * t, ay + (by - ay) * t);
        g.rotate(Math.atan2(by - ay, bx - ax));
        for (let w = 0; w < width; w++) g.fillRect(0, (w - width / 2) * cell, cell * 0.86, cell * 0.86);
        g.restore();
      }
    }
    g.restore();
  };
  band(0.12, 1, GOLD);
  band(0.2, 2, water ? CREAM : CREAM);
  band(0.3, 1, TERRA);
  // Stepped triangles between the bands, Beit She'an style.
  const tri = inset(0.42).map(P);
  for (let i = 0; i < tri.length; i++) {
    const [ax, ay] = tri[i];
    const [bx, by] = tri[(i + 1) % tri.length];
    const L = Math.hypot(bx - ax, by - ay);
    const n = Math.floor(L / (cell * 6));
    for (let s = 1; s < n; s++) {
      const t = s / n;
      g.save();
      g.translate(ax + (bx - ax) * t, ay + (by - ay) * t);
      g.rotate(Math.atan2(by - ay, bx - ax));
      g.fillStyle = GOLD[s % GOLD.length];
      g.globalAlpha = 0.55;
      g.beginPath();
      g.moveTo(-cell * 1.5, -cell * 0.6);
      g.lineTo(cell * 1.5, -cell * 0.6);
      g.lineTo(0, cell * 1.4);
      g.closePath();
      g.fill();
      g.restore();
    }
  }

  // Centre motif: an amphora between two laurel branches, in muted gold so the geometry stays on top.
  const [cx, cy] = P(center);
  const size = Math.min(W, H) * k * 0.2;
  g.save();
  g.translate(cx, cy);
  g.globalAlpha = 0.42;
  g.fillStyle = '#d9a23c';
  g.beginPath();
  g.moveTo(-size * 0.18, -size * 0.55);
  g.lineTo(size * 0.18, -size * 0.55);
  g.quadraticCurveTo(size * 0.14, -size * 0.35, size * 0.4, -size * 0.05);
  g.quadraticCurveTo(size * 0.5, size * 0.3, size * 0.12, size * 0.55);
  g.lineTo(-size * 0.12, size * 0.55);
  g.quadraticCurveTo(-size * 0.5, size * 0.3, -size * 0.4, -size * 0.05);
  g.quadraticCurveTo(-size * 0.14, -size * 0.35, -size * 0.18, -size * 0.55);
  g.fill();
  g.lineWidth = size * 0.06;
  g.strokeStyle = '#d9a23c';
  g.beginPath();
  g.arc(-size * 0.3, -size * 0.32, size * 0.14, Math.PI * 0.5, Math.PI * 1.5);
  g.arc(size * 0.3, -size * 0.32, size * 0.14, -Math.PI * 0.5, Math.PI * 0.5);
  g.stroke();
  for (const side of [-1, 1]) {
    for (let i = 0; i < 7; i++) {
      const a = -0.9 + i * 0.32;
      const lx = side * (size * 0.85 + Math.cos(a) * size * 0.1);
      const ly = Math.sin(a) * size * 0.75;
      g.save();
      g.translate(lx, ly);
      g.rotate(side * (a + 0.9));
      g.beginPath();
      g.ellipse(side * size * 0.12, 0, size * 0.14, size * 0.05, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
    }
  }
  g.restore();

  // A soft vignette toward the cushions.
  const grad = g.createRadialGradient(cx, cy, Math.min(c.width, c.height) * 0.2, cx, cy, Math.max(c.width, c.height) * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(1, 'rgba(10,20,20,0.35)');
  g.fillStyle = grad;
  g.fillRect(0, 0, c.width, c.height);
  return tex(c);
}

/** Cream marble with rust veins. */
export function marbleTexture(seed = 7, base = '#ecdcc4', vein = 'rgba(160,72,44,'): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 1024);
  const r = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = `rgba(255,255,255,${r() * 0.08})`;
    g.beginPath();
    g.arc(r() * 1024, r() * 1024, 10 + r() * 60, 0, Math.PI * 2);
    g.fill();
  }
  for (let v = 0; v < 26; v++) {
    let x = r() * 1024;
    let y = r() * 1024;
    let a = r() * Math.PI * 2;
    const w = 0.6 + r() * 2.4;
    g.strokeStyle = `${vein}${0.18 + r() * 0.4})`;
    g.lineWidth = w;
    g.beginPath();
    g.moveTo(x, y);
    for (let s = 0; s < 70; s++) {
      a += (r() - 0.5) * 0.7;
      x += Math.cos(a) * 9;
      y += Math.sin(a) * 9;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Large hall floor tiles, alternating marble tones. */
export function hallFloorTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(1024, 1024);
  const r = rng(99);
  const tones = ['#5a3222', '#6b3c28', '#4a2a1c', '#74462f'];
  const n = 4;
  const s = 1024 / n;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++) {
      g.fillStyle = tones[(i + j) % 2 === 0 ? Math.floor(r() * 2) : 2 + Math.floor(r() * 2)];
      g.fillRect(i * s, j * s, s, s);
      for (let v = 0; v < 5; v++) {
        g.strokeStyle = `rgba(240,210,180,${0.05 + r() * 0.12})`;
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        let x = i * s + r() * s;
        let y = j * s + r() * s;
        g.moveTo(x, y);
        for (let k = 0; k < 12; k++) {
          x += (r() - 0.5) * 50;
          y += (r() - 0.5) * 50;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      g.strokeStyle = 'rgba(30,15,8,0.6)';
      g.lineWidth = 4;
      g.strokeRect(i * s, j * s, s, s);
    }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/**
 * The brass protractor: a half disc, 0° on the right, 180° on the left, ticks every degree and
 * numbers every 10° (Western digits read left to right).
 */
export function protractorTexture(): THREE.CanvasTexture {
  const S = 1024;
  const [c, g] = canvas(S, S / 2 + 40);
  const cx = S / 2;
  const cy = S / 2 + 20;
  const R = S / 2 - 12;
  const grad = g.createLinearGradient(0, 0, 0, cy);
  grad.addColorStop(0, '#f2cf7a');
  grad.addColorStop(0.6, '#c99036');
  grad.addColorStop(1, '#a8752a');
  g.fillStyle = grad;
  g.beginPath();
  g.arc(cx, cy, R, Math.PI, 0);
  g.closePath();
  g.fill();
  g.globalAlpha = 0.25;
  g.fillStyle = '#5a3a12';
  g.beginPath();
  g.arc(cx, cy, R * 0.42, Math.PI, 0);
  g.closePath();
  g.fill();
  g.globalAlpha = 1;
  g.strokeStyle = '#4a2c0c';
  g.lineWidth = 5;
  g.beginPath();
  g.arc(cx, cy, R, Math.PI, 0);
  g.closePath();
  g.stroke();
  for (let d = 0; d <= 180; d++) {
    const a = Math.PI - (d * Math.PI) / 180; // 0° on the right
    const long = d % 10 === 0 ? 0.13 : d % 5 === 0 ? 0.085 : 0.05;
    g.lineWidth = d % 10 === 0 ? 4 : 2;
    g.beginPath();
    g.moveTo(cx - Math.cos(a) * R, cy - Math.sin(a) * R);
    g.lineTo(cx - Math.cos(a) * R * (1 - long), cy - Math.sin(a) * R * (1 - long));
    g.stroke();
  }
  g.fillStyle = '#3b2208';
  g.font = '700 34px Rubik, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let d = 0; d <= 180; d += 10) {
    const a = (d * Math.PI) / 180;
    const x = cx + Math.cos(a) * R * 0.78;
    const y = cy - Math.sin(a) * R * 0.78;
    g.save();
    g.translate(x, y);
    g.rotate(Math.PI / 2 - a);
    g.fillText(String(d), 0, 0);
    g.restore();
  }
  return tex(c);
}

/** Text on a transparent canvas: carved numbers, "?" and small captions. */
export function labelTexture(text: string, opts: { color?: string; size?: number; glow?: string; weight?: number } = {}) {
  const size = opts.size ?? 120;
  const [m] = canvas(8, 8);
  const mg = m.getContext('2d')!;
  mg.font = `${opts.weight ?? 800} ${size}px Rubik, sans-serif`;
  const w = Math.ceil(mg.measureText(text).width + size * 0.6);
  const h = Math.ceil(size * 1.5);
  const [c, g] = canvas(w, h);
  g.font = `${opts.weight ?? 800} ${size}px Rubik, sans-serif`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.direction = 'ltr';
  if (opts.glow) {
    g.shadowColor = opts.glow;
    g.shadowBlur = size * 0.25;
  }
  g.lineWidth = size * 0.1;
  g.strokeStyle = 'rgba(30,18,6,0.9)';
  g.strokeText(text, w / 2, h / 2);
  g.fillStyle = opts.color ?? '#f6c75a';
  g.fillText(text, w / 2, h / 2);
  const t = tex(c);
  return { texture: t, aspect: w / h };
}

/** Soft round sprite (steam, glow, flame core). */
export function softDot(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)'): THREE.CanvasTexture {
  const [c, g] = canvas(128, 128);
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return tex(c);
}

/** Ivory ball with a thin gold band. */
export function ballTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 256);
  g.fillStyle = '#f4ead6';
  g.fillRect(0, 0, 512, 256);
  const r = rng(3);
  for (let i = 0; i < 200; i++) {
    g.fillStyle = `rgba(190,160,120,${r() * 0.08})`;
    g.fillRect(r() * 512, r() * 256, 6, 2);
  }
  g.fillStyle = '#d9a23c';
  g.fillRect(0, 118, 512, 20);
  g.fillStyle = '#8a5a1c';
  g.fillRect(0, 116, 512, 2);
  g.fillRect(0, 138, 512, 2);
  return tex(c);
}

/** Bronze drain grate seen from above. */
export function grateTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(256, 256);
  g.fillStyle = '#050a0a';
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = '#a8752a';
  g.lineWidth = 10;
  g.beginPath();
  g.arc(128, 128, 118, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 5;
  for (let i = -3; i <= 3; i++) {
    g.beginPath();
    g.moveTo(128 + i * 28, 20);
    g.lineTo(128 + i * 28, 236);
    g.stroke();
  }
  return tex(c);
}

/** Tileable water ripples used as a bump/normal-ish map and an emissive shimmer. */
export function waterTexture(): THREE.CanvasTexture {
  const [c, g] = canvas(512, 512);
  g.fillStyle = '#0f3b44';
  g.fillRect(0, 0, 512, 512);
  const r = rng(11);
  for (let i = 0; i < 140; i++) {
    g.strokeStyle = `rgba(120,230,220,${0.05 + r() * 0.12})`;
    g.lineWidth = 1 + r() * 3;
    g.beginPath();
    const x = r() * 512;
    const y = r() * 512;
    g.ellipse(x, y, 20 + r() * 60, 6 + r() * 14, r() * 0.4, 0, Math.PI * 2);
    g.stroke();
  }
  const t = tex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
