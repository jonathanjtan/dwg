// Voxel model builder + culled mesher with baked ambient occlusion and optional greedy merging.
// Models are authored in integer voxel coordinates; a part's pivot sits at (0,0,0).
import * as THREE from 'three';

const pack = (x, y, z) => ((x + 512) << 20) | ((y + 512) << 10) | (z + 512);

export class Palette {
  constructor() {
    this.entries = [null];
    this.byKey = new Map();
  }
  // glow: rendered unlit and pushed above 1.0 so bloom picks it up.
  id(hex, { glow = 0, jitter = 0.035 } = {}) {
    const key = `${hex}|${glow}|${jitter}`;
    let i = this.byKey.get(key);
    if (i) return i;
    i = this.entries.length;
    this.entries.push({ color: new THREE.Color(hex), glow, jitter });
    this.byKey.set(key, i);
    return i;
  }
}

export class VoxelModel {
  constructor(palette) {
    this.palette = palette;
    this.map = new Map();
  }
  c(color, opts) {
    return typeof color === 'number' && color < 65536 && this.palette.entries[color]
      ? color
      : this.palette.id(color, opts);
  }
  set(x, y, z, color, opts) {
    const id = this.c(color, opts);
    this.map.set(pack(x, y, z), { x, y, z, id });
    return this;
  }
  del(x, y, z) {
    this.map.delete(pack(x, y, z));
    return this;
  }
  get(x, y, z) {
    return this.map.get(pack(x, y, z));
  }
  has(x, y, z) {
    return this.map.has(pack(x, y, z));
  }
  // Inclusive box fill.
  box(x0, y0, z0, x1, y1, z1, color, opts) {
    const id = this.c(color, opts);
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++)
          this.map.set(pack(x, y, z), { x, y, z, id });
    return this;
  }
  // Symmetric box: x spans [-hw, hw-1] (2*hw voxels wide, centred on the x=0 plane).
  sbox(hw, y0, z0, y1, z1, color, opts) {
    return this.box(-hw, y0, z0, hw - 1, y1, z1, color, opts);
  }
  clearBox(x0, y0, z0, x1, y1, z1) {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
      for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
        for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.map.delete(pack(x, y, z));
    return this;
  }
  // Only paint voxels that already exist.
  paint(x0, y0, z0, x1, y1, z1, color, opts) {
    const id = this.c(color, opts);
    for (const v of this.map.values()) {
      if (v.x >= Math.min(x0, x1) && v.x <= Math.max(x0, x1) &&
          v.y >= Math.min(y0, y1) && v.y <= Math.max(y0, y1) &&
          v.z >= Math.min(z0, z1) && v.z <= Math.max(z0, z1)) v.id = id;
    }
    return this;
  }
  ellipsoid(cx, cy, cz, rx, ry, rz, color, opts) {
    const id = this.c(color, opts);
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++)
      for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
        for (let z = Math.floor(cz - rz); z <= Math.ceil(cz + rz); z++) {
          const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, dz = (z + 0.5 - cz) / rz;
          if (dx * dx + dy * dy + dz * dz <= 1) this.map.set(pack(x, y, z), { x, y, z, id });
        }
    return this;
  }
  // Mirror everything with x >= 0 onto negative x (voxel x -> -1-x).
  mirrorX() {
    const add = [];
    for (const v of this.map.values()) if (v.x >= 0) add.push(v);
    for (const v of add) this.map.set(pack(-1 - v.x, v.y, v.z), { x: -1 - v.x, y: v.y, z: v.z, id: v.id });
    return this;
  }
  flipX() {
    const out = new Map();
    for (const v of this.map.values()) {
      const nx = -1 - v.x;
      out.set(pack(nx, v.y, v.z), { x: nx, y: v.y, z: v.z, id: v.id });
    }
    this.map = out;
    return this;
  }
  clone() {
    const m = new VoxelModel(this.palette);
    for (const [k, v] of this.map) m.map.set(k, { ...v });
    return m;
  }
  recolor(fromHex, toHex, opts) {
    const from = new THREE.Color(fromHex);
    const to = this.c(toHex, opts);
    for (const v of this.map.values()) {
      const e = this.palette.entries[v.id];
      if (e.color.equals(from)) v.id = to;
    }
    return this;
  }
}

const FACES = [
  { n: [1, 0, 0], u: [0, 1, 0], v: [0, 0, 1], shade: 0.9 },
  { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0], shade: 0.9 },
  { n: [0, 1, 0], u: [0, 0, 1], v: [1, 0, 0], shade: 1.0 },
  { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1], shade: 0.7 },
  { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0], shade: 0.95 },
  { n: [0, 0, -1], u: [0, 1, 0], v: [1, 0, 0], shade: 0.85 },
];
const AO_CURVE = [0.5, 0.68, 0.84, 1.0];
const CORNERS = [[0, 0], [1, 0], [1, 1], [0, 1]];

function hash3(x, y, z) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return ((h >>> 0) % 10000) / 10000;
}

// Returns { solid, glow } BufferGeometries (either may be null).
export function meshVoxels(model, { scale = 0.1, offset = [0, 0, 0], ao = true, solidFn = null, greedy = false } = {}) {
  const pal = model.palette.entries;
  const out = {
    solid: { pos: [], nor: [], col: [], idx: [] },
    glow: { pos: [], nor: [], col: [], idx: [] },
  };
  const occ = solidFn
    ? (x, y, z) => model.map.has(pack(x, y, z)) || solidFn(x, y, z)
    : (x, y, z) => model.map.has(pack(x, y, z));
  const tmp = new THREE.Color();
  // greedy buckets: faces with no occlusion are merged into larger quads per plane
  const buckets = new Map();
  const AXES = FACES.map((f) => ({ n: f.n.findIndex((c) => c !== 0), u: f.u.findIndex((c) => c !== 0), v: f.v.findIndex((c) => c !== 0) }));
  const ck = (u, v) => (u + 1024) * 4096 + (v + 1024);

  for (const vox of model.map.values()) {
    const { x, y, z } = vox;
    const e = pal[vox.id];
    const target = e.glow ? out.glow : out.solid;
    const j = (hash3(x, y, z) - 0.5) * 2 * e.jitter;
    for (let fi = 0; fi < 6; fi++) {
      const f = FACES[fi];
      const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
      if (occ(nx, ny, nz)) continue;
      const bx = x + Math.max(f.n[0], 0), by = y + Math.max(f.n[1], 0), bz = z + Math.max(f.n[2], 0);
      const aoVals = [3, 3, 3, 3];
      if (ao && !e.glow) {
        for (let k = 0; k < 4; k++) {
          const su = CORNERS[k][0] ? 1 : -1, sv = CORNERS[k][1] ? 1 : -1;
          const ux = f.u[0] * su, uy = f.u[1] * su, uz = f.u[2] * su;
          const vx = f.v[0] * sv, vy = f.v[1] * sv, vz = f.v[2] * sv;
          const s1 = occ(nx + ux, ny + uy, nz + uz) ? 1 : 0;
          const s2 = occ(nx + vx, ny + vy, nz + vz) ? 1 : 0;
          const c = occ(nx + ux + vx, ny + uy + vy, nz + uz + vz) ? 1 : 0;
          aoVals[k] = s1 && s2 ? 0 : 3 - (s1 + s2 + c);
        }
      }
      if (greedy && !e.glow && aoVals[0] === 3 && aoVals[1] === 3 && aoVals[2] === 3 && aoVals[3] === 3) {
        const ax = AXES[fi];
        const p = [x, y, z], b = [bx, by, bz];
        const bk = fi * 100000 + (b[ax.n] + 50000);
        let cells = buckets.get(bk);
        if (!cells) buckets.set(bk, (cells = new Map()));
        cells.set(ck(p[ax.u], p[ax.v]), vox.id);
        continue;
      }
      const base = target.pos.length / 3;
      for (let k = 0; k < 4; k++) {
        const a = CORNERS[k][0], b = CORNERS[k][1];
        const px = bx + f.u[0] * a + f.v[0] * b;
        const py = by + f.u[1] * a + f.v[1] * b;
        const pz = bz + f.u[2] * a + f.v[2] * b;
        target.pos.push((px + offset[0]) * scale, (py + offset[1]) * scale, (pz + offset[2]) * scale);
        target.nor.push(f.n[0], f.n[1], f.n[2]);
        if (e.glow) {
          tmp.copy(e.color).multiplyScalar(e.glow * (1 + j));
        } else {
          const l = AO_CURVE[aoVals[k]] * (1 + j) * f.shade;
          tmp.copy(e.color).multiplyScalar(l);
        }
        target.col.push(tmp.r, tmp.g, tmp.b);
      }
      if (aoVals[0] + aoVals[2] < aoVals[1] + aoVals[3]) {
        target.idx.push(base + 1, base + 2, base + 3, base + 1, base + 3, base);
      } else {
        target.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
      }
    }
  }
  for (const [bk, cells] of buckets) {
    const fi = Math.floor(bk / 100000);
    const plane = (bk % 100000) - 50000;
    const f = FACES[fi], ax = AXES[fi];
    const visited = new Set();
    const keys = [...cells.keys()].sort((a, b) => a - b);
    for (const k of keys) {
      if (visited.has(k)) continue;
      const id = cells.get(k);
      const u0 = Math.floor(k / 4096) - 1024, v0 = (k % 4096) - 1024;
      let dv = 1;
      while (cells.get(ck(u0, v0 + dv)) === id && !visited.has(ck(u0, v0 + dv))) dv++;
      let du = 1;
      grow: for (;;) {
        for (let j = 0; j < dv; j++) {
          const kk = ck(u0 + du, v0 + j);
          if (cells.get(kk) !== id || visited.has(kk)) break grow;
        }
        du++;
      }
      for (let a = 0; a < du; a++) for (let j = 0; j < dv; j++) visited.add(ck(u0 + a, v0 + j));
      const e = pal[id];
      const jit = (hash3(u0, v0, plane) - 0.5) * 2 * e.jitter;
      tmp.copy(e.color).multiplyScalar(f.shade * (1 + jit));
      const base = out.solid.pos.length / 3;
      const o = [0, 0, 0];
      o[ax.n] = plane; o[ax.u] = u0; o[ax.v] = v0;
      for (let c = 0; c < 4; c++) {
        const a = CORNERS[c][0] * du, b = CORNERS[c][1] * dv;
        const px = o[0] + f.u[0] * a + f.v[0] * b;
        const py = o[1] + f.u[1] * a + f.v[1] * b;
        const pz = o[2] + f.u[2] * a + f.v[2] * b;
        out.solid.pos.push((px + offset[0]) * scale, (py + offset[1]) * scale, (pz + offset[2]) * scale);
        out.solid.nor.push(f.n[0], f.n[1], f.n[2]);
        out.solid.col.push(tmp.r, tmp.g, tmp.b);
      }
      out.solid.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const build = (d) => {
    if (!d.pos.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(d.nor, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(d.col, 3));
    g.setIndex(d.idx);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  };
  return { solid: build(out.solid), glow: build(out.glow) };
}

// Shared materials for voxel meshes.
export const VoxMat = {
  solid: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.08 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
};

export function voxelMesh(model, opts) {
  const g = meshVoxels(model, opts);
  const group = new THREE.Group();
  if (g.solid) {
    const m = new THREE.Mesh(g.solid, VoxMat.solid);
    m.castShadow = true;
    m.receiveShadow = true;
    group.add(m);
  }
  if (g.glow) group.add(new THREE.Mesh(g.glow, VoxMat.glow));
  return group;
}
