// Side 7: a flat town band on the floor of an O'Neill cylinder whose far walls curve overhead.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Palette, VoxelModel, meshVoxels, VoxMat } from '../core/voxel.js';
import { mulberry32 } from '../core/util.js';
import { lensClear } from '../core/lensclear.js';

export const ARENA = 180; // half-size of the playable square
const R = 520; // colony radius
const W = 240; // half-width of the flat floor band

// Street grid: boulevards every 52 units around a wide centre block. Lots are indexed along each axis by the gap
// between boulevards (0 = the outer ring, 3 = the centre).
export const ROADS = [-156, -104, -52, 52, 104, 156];
const RW = 7; // half-width of a boulevard
const EDGES = [-ARENA - 20, ...ROADS, ARENA + 20];
const lotSpan = (i) => [EDGES[i] + RW + 1, EDGES[i + 1] - RW - 1];

// Dynasty Warriors battlefields ("fields"): big open squares cut out of the town, a few blocks apart. The plaza in
// the middle, and three yards where Zeon drops its supply pods. Each spans whole lots (and the boulevards between).
const FIELD_LOTS = [
  { name: 'PLAZA', kind: 'plaza', xs: [3, 3], zs: [3, 3] },
  { name: 'ALPHA', kind: 'yard', xs: [4, 5], zs: [4, 5] },
  { name: 'BRAVO', kind: 'yard', xs: [3, 3], zs: [0, 1] },
  { name: 'CHARLIE', kind: 'yard', xs: [1, 2], zs: [4, 5] },
];
export const FIELDS = FIELD_LOTS.map((f) => {
  const x0 = Math.max(-ARENA, lotSpan(f.xs[0])[0]), x1 = Math.min(ARENA, lotSpan(f.xs[1])[1]);
  const z0 = Math.max(-ARENA, lotSpan(f.zs[0])[0]), z1 = Math.min(ARENA, lotSpan(f.zs[1])[1]);
  return { name: f.name, kind: f.kind, x0, x1, z0, z1, cx: (x0 + x1) / 2, cz: (z0 + z1) / 2 };
});
export const fieldAt = (x, z, pad = 0) => FIELDS.find((f) => x > f.x0 - pad && x < f.x1 + pad && z > f.z0 - pad && z < f.z1 + pad);
const CHUNK = 60; // static props are merged into one mesh per chunk this size
const CELL = 24; // collider lookup grid
const LEN = 2600; // colony length drawn

export const HAZE = new THREE.Color(0xc9c2b4);

function hazeMaterial(map) {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: map },
      haze: { value: HAZE.clone() },
      sunTint: { value: new THREE.Color(0xfff1d6) },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        vUv = uv;
        vec4 w = modelMatrix * vec4(position, 1.0);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D map; uniform vec3 haze; uniform vec3 sunTint;
      varying vec2 vUv; varying vec3 vWorld;
      void main() {
        vec3 c = texture2D(map, vUv).rgb;
        c = pow(c, vec3(2.2));
        float d = length(vWorld - cameraPosition);
        float h = 1.0 - exp(-d * 0.0013);
        h = clamp(h, 0.0, 0.82);
        vec3 col = mix(c * sunTint, pow(haze, vec3(2.2)), h);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.DoubleSide,
    fog: false,
  });
}

// Texture for the colony shell: u maps to angle around the axis (0.5 = floor), v runs along the axis.
// Wide land bands (floor strip and two far strips overhead) separated by glass windows.
const DEG = Math.PI / 180;
const BANDS = [
  { a0: -55, a1: 55, land: true },
  { a0: 55, a1: 85, land: false }, { a0: -85, a1: -55, land: false },
  { a0: 85, a1: 155, land: true }, { a0: -155, a1: -85, land: true },
  { a0: 155, a1: 180, land: false }, { a0: -180, a1: -155, land: false },
];
function colonyTexture() {
  const w = 2048, h = 1024;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d');
  const rnd = mulberry32(7);
  const ux = (deg) => (0.5 + (deg * DEG) / (Math.PI * 2)) * w;
  for (const b of BANDS) {
    const x0 = ux(b.a0), x1 = ux(b.a1), bw = x1 - x0;
    if (b.land) {
      g.fillStyle = '#7f8b5c';
      g.fillRect(x0, 0, bw, h);
      // fields and parks
      for (let i = 0; i < bw * 3; i++) {
        const fw = 6 + rnd() * 26, fh = 6 + rnd() * 40;
        g.fillStyle = rnd() < 0.6
          ? `hsl(${78 + rnd() * 35},${22 + rnd() * 22}%,${32 + rnd() * 16}%)`
          : `hsl(${34 + rnd() * 16},${18 + rnd() * 20}%,${40 + rnd() * 14}%)`;
        g.fillRect(x0 + rnd() * (bw - fw), rnd() * h, fw, fh);
      }
      // towns: clusters of light blocks
      for (let t = 0; t < bw / 18; t++) {
        const cx = x0 + rnd() * bw, cy = rnd() * h, r = 12 + rnd() * 30;
        for (let i = 0; i < r * 5; i++) {
          const a = rnd() * Math.PI * 2, d = rnd() * r;
          g.fillStyle = `hsl(${30 + rnd() * 190},${4 + rnd() * 8}%,${58 + rnd() * 30}%)`;
          g.fillRect(cx + Math.cos(a) * d, cy + Math.sin(a) * d * 1.6, 2 + rnd() * 4, 2 + rnd() * 5);
        }
      }
      // roads + river
      g.fillStyle = 'rgba(80,80,84,0.85)';
      for (let i = 0; i < bw / 40; i++) g.fillRect(x0 + rnd() * bw, 0, 2, h);
      for (let i = 0; i < 30; i++) g.fillRect(x0, rnd() * h, bw, 2);
      g.fillStyle = '#5b8196';
      const rx = x0 + bw * (0.25 + rnd() * 0.5);
      for (let y = 0; y < h; y += 3) g.fillRect(rx + Math.sin(y * 0.015) * 14 + Math.sin(y * 0.05) * 4, y, 6, 3);
    } else {
      // window: bright glass panels lit by the mirrors, with mullions
      const grad = g.createLinearGradient(x0, 0, x1, 0);
      grad.addColorStop(0, '#8fa4bd');
      grad.addColorStop(0.5, '#b9cbe0');
      grad.addColorStop(1, '#8fa4bd');
      g.fillStyle = grad;
      g.fillRect(x0, 0, bw, h);
      g.fillStyle = 'rgba(70,82,100,0.55)';
      for (let y = 0; y < h; y += 24) g.fillRect(x0, y, bw, 2);
      for (let x = x0; x < x1; x += bw / 6) g.fillRect(x, 0, 2, h);
      g.fillStyle = '#5a5e66';
      g.fillRect(x0, 0, 3, h);
      g.fillRect(x1 - 3, 0, 3, h);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Rounded-rectangle tube: flat floor band of half-width W, then circular walls.
function colonyShell() {
  const arcLen = Math.PI * R; // each curved half
  const perim = 4 * W + 2 * arcLen;
  const seg = 256;
  const pts = [];
  for (let i = 0; i <= seg; i++) {
    let s = (i / seg) * perim - perim / 2; // centred on the floor
    const side = Math.sign(s) || 1;
    let a = Math.abs(s);
    let x, y;
    if (a <= W) { x = s; y = 0; }
    else if (a <= W + arcLen) {
      const t = (a - W) / R;
      x = side * (W + R * Math.sin(t));
      y = R * (1 - Math.cos(t));
    } else {
      const rest = a - W - arcLen;
      x = side * (W - rest);
      y = 2 * R;
    }
    pts.push([x, y - 0.4, (i / seg)]);
  }
  const zSeg = 24;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= zSeg; j++) {
    const z = -LEN / 2 + (j / zSeg) * LEN;
    for (let i = 0; i <= seg; i++) {
      const p = pts[i];
      pos.push(p[0], p[1], z);
      // angle around the tube centre (0 at the floor) keeps the land bands where the eye expects them
      const ang = Math.atan2(p[0], R - p[1]);
      uv.push(0.5 + ang / (Math.PI * 2), (j / zSeg) * 3);
    }
  }
  const row = seg + 1;
  for (let j = 0; j < zSeg; j++)
    for (let i = 0; i < seg; i++) {
      const a = j * row + i, b = a + 1, c = a + row, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, hazeMaterial(colonyTexture()));
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  return mesh;
}

// ---------- Playable town ----------
const pal = new Palette();

function groundTexture(rnd, roads) {
  const px = 2; // pixels per world unit
  const size = ARENA * 2 + 40;
  const n = size * px;
  const cv = document.createElement('canvas');
  cv.width = cv.height = n;
  const g = cv.getContext('2d');
  const toPx = (v) => (v + size / 2) * px;
  // base: concrete deck
  g.fillStyle = '#9a968c';
  g.fillRect(0, 0, n, n);
  // panel grid
  for (let y = 0; y < n; y += 8)
    for (let x = 0; x < n; x += 8) {
      const l = 52 + rnd() * 10;
      g.fillStyle = `hsl(40,${6 + rnd() * 5}%,${l}%)`;
      g.fillRect(x, y, 8, 8);
      g.fillStyle = 'rgba(0,0,0,0.08)';
      g.fillRect(x, y, 8, 1);
      g.fillRect(x, y, 1, 8);
    }
  // grass lots
  for (const lot of roads.lots) {
    if (lot.kind !== 'park') continue;
    for (let y = toPx(lot.z0); y < toPx(lot.z1); y += 2)
      for (let x = toPx(lot.x0); x < toPx(lot.x1); x += 2) {
        g.fillStyle = `hsl(${88 + rnd() * 20},${30 + rnd() * 15}%,${30 + rnd() * 10}%)`;
        g.fillRect(x, y, 2, 2);
      }
  }
  // roads
  for (const r of roads.list) {
    const x0 = toPx(r.x0), z0 = toPx(r.z0), x1 = toPx(r.x1), z1 = toPx(r.z1);
    for (let y = z0; y < z1; y += 2)
      for (let x = x0; x < x1; x += 2) {
        g.fillStyle = `hsl(220,4%,${24 + rnd() * 5}%)`;
        g.fillRect(x, y, 2, 2);
      }
    g.fillStyle = '#d8c77a';
    if (r.dir === 'x') {
      const cy = (z0 + z1) / 2;
      for (let x = x0; x < x1; x += 12) g.fillRect(x, cy - 1, 6, 2);
    } else {
      const cx = (x0 + x1) / 2;
      for (let y = z0; y < z1; y += 12) g.fillRect(cx - 1, y, 2, 6);
    }
    g.fillStyle = '#c9c4b8';
    if (r.dir === 'x') { g.fillRect(x0, z0, x1 - x0, 2); g.fillRect(x0, z1 - 2, x1 - x0, 2); }
    else { g.fillRect(x0, z0, 2, z1 - z0); g.fillRect(x1 - 2, z0, 2, z1 - z0); }
  }
  // fields: open concrete yards (painted bays and a landing circle) and the paved plaza
  for (const f of FIELDS) {
    const x0 = toPx(f.x0), z0 = toPx(f.z0), x1 = toPx(f.x1), z1 = toPx(f.z1);
    for (let y = z0; y < z1; y += 8)
      for (let x = x0; x < x1; x += 8) {
        g.fillStyle = f.kind === 'plaza' ? `hsl(32,${10 + rnd() * 8}%,${60 + rnd() * 8}%)` : `hsl(45,${4 + rnd() * 4}%,${50 + rnd() * 8}%)`;
        g.fillRect(x, y, 8, 8);
        g.fillStyle = 'rgba(0,0,0,0.1)';
        g.fillRect(x, y, 8, 1);
        g.fillRect(x, y, 1, 8);
      }
    const cx = toPx(f.cx), cz = toPx(f.cz);
    g.lineWidth = 3;
    if (f.kind === 'yard') {
      g.strokeStyle = 'rgba(214,178,70,0.75)';
      g.strokeRect(x0 + 10, z0 + 10, x1 - x0 - 20, z1 - z0 - 20);
      for (let x = x0 + 10; x < x1 - 20; x += 36) { g.beginPath(); g.moveTo(x, z0 + 10); g.lineTo(x, z0 + 34); g.stroke(); g.beginPath(); g.moveTo(x, z1 - 10); g.lineTo(x, z1 - 34); g.stroke(); }
      g.strokeStyle = 'rgba(235,235,225,0.7)';
      g.beginPath(); g.arc(cx, cz, 30 * px, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.arc(cx, cz, 24 * px, 0, Math.PI * 2); g.stroke();
    } else {
      g.strokeStyle = 'rgba(120,96,70,0.5)';
      for (const r of [8, 26, 36]) { g.beginPath(); g.arc(cx, cz, r * px, 0, Math.PI * 2); g.stroke(); }
      for (let a = 0; a < 8; a++) {
        g.beginPath();
        g.moveTo(cx + Math.cos((a * Math.PI) / 4) * 8 * px, cz + Math.sin((a * Math.PI) / 4) * 8 * px);
        g.lineTo(cx + Math.cos((a * Math.PI) / 4) * 36 * px, cz + Math.sin((a * Math.PI) / 4) * 36 * px);
        g.stroke();
      }
    }
  }
  // scorch marks
  for (let i = 0; i < 160; i++) {
    const cx = rnd() * n, cy = rnd() * n, rr = 4 + rnd() * 14;
    for (let k = 0; k < rr * 6; k++) {
      const a = rnd() * Math.PI * 2, d = rnd() * rr;
      g.fillStyle = `rgba(20,18,16,${0.15 + rnd() * 0.3})`;
      g.fillRect(((cx + Math.cos(a) * d) >> 1) << 1, ((cy + Math.sin(a) * d) >> 1) << 1, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return { tex, size };
}

// Hollow shell building; interior counts as solid for meshing so no hidden faces are emitted.
function buildingModel(rnd, w, h, d, style) {
  const m = new VoxelModel(pal);
  const wall = style.wall, trim = style.trim;
  const shell = (x, y, z) => x === 0 || x === w - 1 || z === 0 || z === d - 1 || y === h - 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let z = 0; z < d; z++) {
        if (!shell(x, y, z)) continue;
        let c = wall, o;
        const edge = (x === 0 || x === w - 1) && (z === 0 || z === d - 1);
        if (y === h - 1) c = trim;
        else if (y < 2) c = style.base;
        else if (!edge && y % 3 === 1) {
          const along = x === 0 || x === w - 1 ? z : x;
          if (along % 3 !== 0) {
            const lit = rnd() < 0.1;
            c = lit ? 0xffd89a : style.glass;
            if (lit) o = { glow: 1.3, jitter: 0.1 };
          }
        } else if (y % 3 === 0) c = trim;
        m.set(x, y, z, c, o);
      }
  // storefront doors + parapet
  for (let x = 2; x < w - 2; x += 5) m.box(x, 0, 0, x + 1, 1, 0, 0x2c3440);
  m.box(0, h, 0, w - 1, h, 0, trim);
  m.box(0, h, d - 1, w - 1, h, d - 1, trim);
  m.box(0, h, 0, 0, h, d - 1, trim);
  m.box(w - 1, h, 0, w - 1, h, d - 1, trim);
  // rooftop plant
  for (let i = 0; i < 2; i++) {
    if (rnd() < 0.6) {
      const rx = 2 + Math.floor(rnd() * (w - 6)), rz = 2 + Math.floor(rnd() * (d - 6));
      m.box(rx, h, rz, rx + 2, h + 1 + Math.floor(rnd() * 2), rz + 2, rnd() < 0.5 ? 0x7c7f86 : 0x9a9ea6);
    }
  }
  // battle damage: bite chunks out of the upper edges and line the crater with scorched rubble
  const bites = [];
  if (style.damaged) {
    const n = 1 + Math.floor(rnd() * 2);
    for (let i = 0; i < n; i++) {
      const side = rnd();
      const cx = side < 0.5 ? (rnd() < 0.5 ? 0 : w - 1) : rnd() * w;
      const cz = side < 0.5 ? rnd() * d : (rnd() < 0.5 ? 0 : d - 1);
      const cy = h - 1 - rnd() * h * 0.4;
      const r = 2.5 + rnd() * Math.min(5, h * 0.3);
      bites.push({ cx, cy, cz, r });
      for (let x = Math.floor(cx - r - 2); x <= cx + r + 2; x++)
        for (let y = Math.floor(cy - r - 2); y <= cy + r + 2; y++)
          for (let z = Math.floor(cz - r - 2); z <= cz + r + 2; z++) {
            if (x < 0 || x >= w || z < 0 || z >= d || y < 0 || y > h + 2) continue;
            const dd = Math.hypot(x - cx, y - cy, z - cz);
            if (dd < r) m.del(x, y, z);
            else if (dd < r + 1.6) {
              const v = m.get(x, y, z);
              if (v) v.id = m.c(rnd() < 0.5 ? 0x3a3532 : 0x4a4440);
              else if (y < h) m.set(x, y, z, rnd() < 0.5 ? 0x2e2a28 : 0x45403c);
            }
          }
    }
  }
  const solidFn = (x, y, z) => {
    if (x <= 0 || x >= w - 1 || z <= 0 || z >= d - 1 || y < 0 || y >= h - 1) return false;
    for (const b of bites) if (Math.hypot(x - b.cx, y - b.cy, z - b.cz) < b.r + 1.6) return false;
    return true;
  };
  return { m, solidFn, bites };
}

function lampModel() {
  const m = new VoxelModel(pal);
  m.box(0, 0, 0, 0, 9, 0, 0x5a5e66);
  m.box(0, 9, 0, 0, 9, 2, 0x5a5e66);
  m.set(0, 8, 2, 0xfff0c0, { glow: 2, jitter: 0 });
  return m;
}

function carModel(color) {
  const m = new VoxelModel(pal);
  m.box(0, 1, 0, 3, 2, 7, color);
  m.box(0, 3, 2, 3, 4, 5, color);
  m.box(0, 3, 2, 3, 4, 2, 0x3c4a58);
  m.box(0, 3, 5, 3, 4, 5, 0x3c4a58);
  m.box(0, 4, 3, 0, 4, 4, 0x3c4a58);
  m.box(3, 4, 3, 3, 4, 4, 0x3c4a58);
  for (const [x, z] of [[0, 1], [3, 1], [0, 6], [3, 6]]) m.set(x, 0, z, 0x1c1c1c);
  return m;
}

function craneModel() {
  const m = new VoxelModel(pal);
  const Y = 0xe0a526, D = 0x5a4a2a;
  for (let y = 0; y < 34; y++) {
    m.set(0, y, 0, Y); m.set(2, y, 0, Y); m.set(0, y, 2, Y); m.set(2, y, 2, Y);
    if (y % 3 === 0) { m.box(0, y, 0, 2, y, 0, D); m.box(0, y, 2, 2, y, 2, D); m.box(0, y, 0, 0, y, 2, D); m.box(2, y, 0, 2, y, 2, D); }
  }
  m.box(-6, 34, 0, 22, 35, 2, Y);
  for (let x = -6; x <= 22; x += 3) m.box(x, 36, 1, x, 36, 1, D);
  m.box(-6, 30, 0, -3, 33, 2, 0x6b6e75);
  m.box(-1, 36, 0, 3, 38, 2, 0x9fa3ab);
  for (let y = 22; y < 34; y++) m.set(18, y, 1, 0x333333);
  m.box(17, 20, 0, 19, 21, 2, 0x333333);
  return m;
}

function containerModel(color) {
  const m = new VoxelModel(pal);
  m.box(0, 0, 0, 5, 2, 2, color);
  for (let x = 0; x <= 5; x += 1) if (x % 2) m.box(x, 0, 0, x, 2, 0, new THREE.Color(color).multiplyScalar(0.8).getHex());
  return m;
}

function scaffoldModel(w, h, d) {
  const m = new VoxelModel(pal);
  const C = 0x8d9199, B = 0x5e636b;
  for (let y = 0; y < h; y++) {
    for (const [x, z] of [[0, 0], [w, 0], [0, d], [w, d]]) m.set(x, y, z, C);
    if (y % 4 === 3) {
      m.box(0, y, 0, w, y, 0, B); m.box(0, y, d, w, y, d, B);
      m.box(0, y, 0, 0, y, d, B); m.box(w, y, 0, w, y, d, B);
      m.box(1, y, 1, w - 1, y, d - 1, 0x777a80);
    }
  }
  return m;
}

function treeModel(rnd) {
  const m = new VoxelModel(pal);
  m.box(0, 0, 0, 0, 3, 0, 0x6a4a2e);
  const r = 2 + rnd() * 0.8;
  m.ellipsoid(0.5, 5, 0.5, r, r * 1.1, r, 0x4f7a36);
  for (const v of m.map.values()) if (v.y >= 3 && v.id !== m.c(0x6a4a2e) && rnd() < 0.3) v.id = m.c(0x3f6a2c);
  return m;
}

const propMat = lensClear(VoxMat.solid.clone(), 2.2);

function addVoxel(group, model, x, y, z, scale = 1, rotY = 0, solidFn = null) {
  const g = meshVoxels(model, { scale, solidFn, greedy: true });
  const holder = new THREE.Group();
  if (g.solid) {
    const mesh = new THREE.Mesh(g.solid, propMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    holder.add(mesh);
  }
  if (g.glow) holder.add(new THREE.Mesh(g.glow, VoxMat.glow));
  holder.position.set(x, y, z);
  holder.rotation.y = rotY;
  group.add(holder);
  return holder;
}

// Static props are baked into one solid + one glow mesh per CHUNK-sized square: a few dozen draw calls for the
// whole town instead of one per lamp post, while frustum culling still works chunk by chunk.
class PropBaker {
  constructor() {
    this.chunks = new Map();
    this._m = new THREE.Matrix4();
  }

  add(model, x, y, z, scale = 1, rotY = 0, solidFn = null) {
    const g = meshVoxels(model, { scale, solidFn, greedy: true });
    this._m.makeRotationY(rotY).setPosition(x, y, z);
    const key = `${Math.floor(x / CHUNK)},${Math.floor(z / CHUNK)}`;
    let c = this.chunks.get(key);
    if (!c) this.chunks.set(key, (c = { solid: [], glow: [] }));
    if (g.solid) c.solid.push(g.solid.applyMatrix4(this._m));
    if (g.glow) c.glow.push(g.glow.applyMatrix4(this._m));
  }

  bake(group) {
    for (const c of this.chunks.values()) {
      if (c.solid.length) {
        const mesh = new THREE.Mesh(mergeGeometries(c.solid), propMat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        group.add(mesh);
      }
      if (c.glow.length) group.add(new THREE.Mesh(mergeGeometries(c.glow), VoxMat.glow));
      for (const geo of [...c.solid, ...c.glow]) geo.dispose();
    }
    this.chunks.clear();
  }
}

function barrierModel() {
  const m = new VoxelModel(pal);
  m.box(0, 0, 0, 9, 1, 2, 0xa8a49a);
  m.box(0, 2, 0, 9, 3, 1, 0xb8b4aa);
  for (let x = 0; x <= 9; x += 3) m.box(x, 3, 0, x, 3, 1, 0xd0a030);
  return m;
}

function mastModel() {
  const m = new VoxelModel(pal);
  m.box(0, 0, 0, 1, 40, 1, 0x6b6f76);
  for (let y = 4; y < 40; y += 6) m.box(-1, y, -1, 2, y, 2, 0x55595f);
  m.box(-3, 40, -1, 4, 42, 2, 0x44484e);
  for (let x = -3; x <= 4; x += 2) m.set(x, 41, 3, 0xfff4d0, { glow: 2.2, jitter: 0 });
  return m;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // AABBs {x0,z0,x1,z1,h}
    this.cgrid = new Map(); // collider buckets, CELL units square
    this.trees = [];
    this.smokeSources = [];
    this.fireSources = [];
    const rnd = mulberry32(1979);

    scene.add(colonyShell());

    // layout: a grid of boulevards; the lots in between are town blocks, parks and building sites, except where a
    // field (the plaza, the landing yards) opens the town up
    const roads = { list: [], lots: [] };
    for (const c of ROADS) {
      roads.list.push({ dir: 'x', x0: -ARENA - 20, x1: ARENA + 20, z0: c - RW, z1: c + RW });
      roads.list.push({ dir: 'z', z0: -ARENA - 20, z1: ARENA + 20, x0: c - RW, x1: c + RW });
    }
    for (let i = 0; i < EDGES.length - 1; i++)
      for (let j = 0; j < EDGES.length - 1; j++) {
        const [x0, x1] = lotSpan(i), [z0, z1] = lotSpan(j);
        const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        const field = fieldAt(cx, cz);
        const edge = i === 0 || j === 0 || i === EDGES.length - 2 || j === EDGES.length - 2;
        const kind = field ? 'field' : edge ? 'city' : rnd() < 0.18 ? 'park' : rnd() < 0.25 ? 'construction' : 'city';
        roads.lots.push({ x0, x1, z0, z1, kind, cx, cz, edge });
      }
    this.fields = FIELDS;

    const { tex, size } = groundTexture(rnd, roads);
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95, metalness: 0 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    this.ground = ground;

    // buildings and props per lot (buildings use 0.35-unit voxels so the Gundam towers over the town)
    const BV = 0.35;
    const props = new THREE.Group();
    scene.add(props);
    const baker = new PropBaker();
    const styles = [
      { wall: 0xd8d4c8, trim: 0xb3ada0, glass: 0x3f5566, base: 0x8e8a80 },
      { wall: 0xc8ccd2, trim: 0x9ea4ad, glass: 0x34495c, base: 0x6f757e },
      { wall: 0xe0d6c0, trim: 0xb8a888, glass: 0x455a6a, base: 0x9a8a6a },
      { wall: 0xa9b3ba, trim: 0x7d8890, glass: 0x2e3f4f, base: 0x5d666e },
      { wall: 0xc9b8a0, trim: 0x8f7d66, glass: 0x3d4c5a, base: 0x6e604e },
    ];
    const addBuilding = (x, z, fw, fd, fh, style) => {
      const w = Math.max(8, Math.round(fw / BV)), d = Math.max(8, Math.round(fd / BV)), h = Math.max(6, Math.round(fh / BV));
      const b = buildingModel(rnd, w, h, d, style);
      baker.add(b.m, x, 0, z, BV, 0, b.solidFn);
      this.addCollider({ x0: x, z0: z, x1: x + w * BV, z1: z + d * BV, h: h * BV });
      for (const bt of b.bites) if (rnd() < 0.8) this.smokeSources.push(new THREE.Vector3(x + bt.cx * BV, bt.cy * BV, z + bt.cz * BV));
    };
    const colors = [0xb0442c, 0x2f6fa0, 0xc9a130, 0x4a7a4a, 0xd8d8d0];
    const containerStack = (x, z, rot) => {
      const stack = rnd() < 0.45 ? 2 : 1;
      for (let k = 0; k < stack; k++) baker.add(containerModel(colors[Math.floor(rnd() * 4)]), x, k * 0.9, z, 0.3, rot);
    };
    for (const lot of roads.lots) {
      const lw = lot.x1 - lot.x0, ld = lot.z1 - lot.z0;
      if (lot.kind === 'city') {
        const cols = lot.edge || rnd() < 0.75 ? 2 : 1, rows = lot.edge || rnd() < 0.75 ? 2 : 1;
        for (let a = 0; a < cols; a++)
          for (let b = 0; b < rows; b++) {
            if (!lot.edge && rnd() < 0.12) continue;
            const cw = lw / cols, cd = ld / rows;
            const w = cw * (0.6 + rnd() * 0.3), d = cd * (0.6 + rnd() * 0.3);
            const h = lot.edge ? 8 + rnd() * 12 : 3 + rnd() * 7;
            const x = lot.x0 + a * cw + (cw - w) / 2, z = lot.z0 + b * cd + (cd - d) / 2;
            addBuilding(x, z, w, d, h, { ...styles[Math.floor(rnd() * styles.length)], damaged: rnd() < 0.5 });
          }
      } else if (lot.kind === 'construction') {
        // steel frame of an unfinished block
        const sw = Math.floor(lw * 0.45 / 0.5), sd = Math.floor(ld * 0.45 / 0.5);
        const sx = lot.x0 + rnd() * (lw - sw * 0.5), sz = lot.z0 + rnd() * (ld - sd * 0.5);
        const sh = 10 + Math.floor(rnd() * 10);
        baker.add(scaffoldModel(sw, sh, sd), sx, 0, sz, 0.5);
        this.addCollider({ x0: sx, z0: sz, x1: sx + (sw + 1) * 0.5, z1: sz + (sd + 1) * 0.5, h: sh * 0.5 });
        const cx = lot.x0 + 3 + rnd() * (lw - 8), cz = lot.z0 + 3 + rnd() * (ld - 8);
        if (!this.blockedRaw(cx, cz, 2)) {
          baker.add(craneModel(), cx, 0, cz, 0.35, Math.floor(rnd() * 4) * Math.PI / 2);
          this.addCollider({ x0: cx - 0.2, z0: cz - 0.2, x1: cx + 1.2, z1: cz + 1.2, h: 13 });
        }
        for (let i = 0; i < 6; i++) {
          const x = lot.x0 + rnd() * (lw - 3), z = lot.z0 + rnd() * (ld - 2);
          if (!this.blockedRaw(x, z, 1.5)) containerStack(x, z, rnd() < 0.5 ? 0 : Math.PI / 2);
        }
      } else if (lot.kind === 'park') {
        for (let i = 0; i < 10; i++) {
          const x = lot.x0 + 2 + rnd() * (lw - 4), z = lot.z0 + 2 + rnd() * (ld - 4);
          this.trees.push(addVoxel(props, treeModel(rnd), x, 0, z, 0.3));
        }
      }
    }
    for (const f of FIELDS) {
      if (f.kind === 'plaza') {
        // a ring of trees around the paved centre, and a few more in the corners
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          this.trees.push(addVoxel(props, treeModel(rnd), f.cx + Math.sin(a) * 31, 0, f.cz + Math.cos(a) * 31, 0.3));
        }
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
          for (let i = 0; i < 3; i++) this.trees.push(addVoxel(props, treeModel(rnd), f.cx + sx * (38 - rnd() * 4), 0, f.cz + sz * (38 - rnd() * 4), 0.3));
      } else {
        // a military yard: container stacks along the fence line and floodlight masts at the corners, the middle
        // left clear for the pod and the fight around it
        for (let i = 0; i < 16; i++) {
          const side = i % 4, u = rnd();
          const x = side < 2 ? f.x0 + 4 + u * (f.x1 - f.x0 - 10) : side === 2 ? f.x0 + 3 + rnd() * 4 : f.x1 - 5 - rnd() * 4;
          const z = side === 0 ? f.z0 + 3 + rnd() * 4 : side === 1 ? f.z1 - 5 - rnd() * 4 : f.z0 + 4 + u * (f.z1 - f.z0 - 10);
          if (!this.blockedRaw(x, z, 1.5)) containerStack(x, z, side < 2 ? 0 : Math.PI / 2);
        }
        // where a yard runs up to the edge of the colony floor, a line of barriers marks the boundary
        for (const [edge, along0, along1, fixed] of [['z', f.x0, f.x1, f.z0], ['z', f.x0, f.x1, f.z1], ['x', f.z0, f.z1, f.x0], ['x', f.z0, f.z1, f.x1]]) {
          if (Math.abs(fixed) < ARENA - 0.5) continue;
          for (let v = along0; v < along1 - 2; v += 3.2) {
            if (edge === 'z') baker.add(barrierModel(), v, 0, fixed + Math.sign(fixed) * 0.6, 0.32);
            else baker.add(barrierModel(), fixed + Math.sign(fixed) * 0.6, 0, v, 0.32, Math.PI / 2);
          }
        }
        for (const [sx, sz] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const x = sx ? f.x1 - 3 : f.x0 + 2, z = sz ? f.z1 - 3 : f.z0 + 2;
          baker.add(mastModel(), x, 0, z, 0.3);
          this.addCollider({ x0: x - 0.3, z0: z - 0.3, x1: x + 0.9, z1: z + 0.9, h: 12 });
        }
      }
    }
    // street furniture: lamps and abandoned cars along the boulevards (not across the open fields)
    for (const c of ROADS) {
      for (let v = -ARENA; v <= ARENA; v += 13) {
        if (rnd() < 0.3) continue;
        if (!fieldAt(c + RW - 0.5, v, 2)) baker.add(lampModel(), c + RW - 0.5, 0, v, 0.28, -Math.PI / 2);
        if (!fieldAt(v, c - RW + 0.5, 2)) baker.add(lampModel(), v, 0, c - RW + 0.5, 0.28, 0);
      }
      for (let i = 0; i < 10; i++) {
        const along = -ARENA + rnd() * ARENA * 2;
        const lane = (rnd() < 0.5 ? -1 : 1) * rnd() * (RW - 2);
        const col = colors[Math.floor(rnd() * colors.length)];
        if (rnd() < 0.5) { if (!fieldAt(c + lane, along)) baker.add(carModel(col), c + lane, 0, along, 0.16, rnd() * 0.4 - 0.2); }
        else if (!fieldAt(along, c + lane)) baker.add(carModel(col), along, 0, c + lane, 0.16, Math.PI / 2 + rnd() * 0.4 - 0.2);
      }
    }
    baker.bake(props);

    // perimeter wall of rubble so the arena edge reads as a boundary
    this.bounds = ARENA;

    // lighting
    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x5c5446, 1.25);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
    sun.position.set(-40, 80, -30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 1; sc.far = 220;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.04;
    scene.add(sun);
    scene.add(sun.target);
    this.sun = sun;
    this.sunOffset = sun.position.clone();

    scene.fog = new THREE.Fog(HAZE, 80, 560);
    scene.background = HAZE.clone();
  }

  // Hide trees that would fill the screen when the camera passes through them.
  fadeNear(cam) {
    for (const t of this.trees) {
      const dx = t.position.x - cam.x, dz = t.position.z - cam.z;
      t.visible = dx * dx + dz * dz > 9 || cam.y > 4;
    }
  }

  follow(target) {
    this.sun.position.copy(target).add(this.sunOffset);
    this.sun.target.position.copy(target);
  }

  addCollider(c) {
    this.colliders.push(c);
    for (let i = Math.floor(c.x0 / CELL); i <= Math.floor(c.x1 / CELL); i++)
      for (let j = Math.floor(c.z0 / CELL); j <= Math.floor(c.z1 / CELL); j++) {
        const k = i * 4096 + j;
        let b = this.cgrid.get(k);
        if (!b) this.cgrid.set(k, (b = []));
        b.push(c);
      }
  }

  // Colliders whose cells overlap the square (x +- r, z +- r).
  near(x, z, r) {
    const out = this._near || (this._near = []);
    out.length = 0;
    const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL);
    const j0 = Math.floor((z - r) / CELL), j1 = Math.floor((z + r) / CELL);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const b = this.cgrid.get(i * 4096 + j);
        if (b) for (const c of b) if (!out.includes(c)) out.push(c);
      }
    return out;
  }

  // Is the point inside a building (grown by pad)? Used by the camera to pull in.
  solidAt(x, y, z, pad = 0) {
    for (const c of this.near(x, z, pad)) if (x > c.x0 - pad && x < c.x1 + pad && z > c.z0 - pad && z < c.z1 + pad && y < c.h + pad) return true;
    return false;
  }

  // Push a circle (x,z,r) out of static colliders; returns corrected [x,z].
  resolve(x, z, r, out) {
    for (const c of this.near(x, z, r)) {
      if (x + r < c.x0 || x - r > c.x1 || z + r < c.z0 || z - r > c.z1) continue;
      const nx = Math.max(c.x0, Math.min(x, c.x1));
      const nz = Math.max(c.z0, Math.min(z, c.z1));
      let dx = x - nx, dz = z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      if (d2 < 1e-6) {
        // centre inside the box: push out along the shallowest axis
        const l = x - c.x0, rr = c.x1 - x, t = z - c.z0, b = c.z1 - z;
        const m = Math.min(l, rr, t, b);
        if (m === l) x = c.x0 - r; else if (m === rr) x = c.x1 + r; else if (m === t) z = c.z0 - r; else z = c.z1 + r;
      } else {
        const d = Math.sqrt(d2);
        x = nx + (dx / d) * r;
        z = nz + (dz / d) * r;
      }
    }
    const B = this.bounds;
    out[0] = Math.max(-B, Math.min(B, x));
    out[1] = Math.max(-B, Math.min(B, z));
    return out;
  }

  blockedRaw(x, z, r = 0) {
    for (const c of this.near(x, z, r)) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
    return false;
  }

  blocked(x, z, r = 0) {
    return this.blockedRaw(x, z, r) || Math.abs(x) > this.bounds || Math.abs(z) > this.bounds;
  }
}
