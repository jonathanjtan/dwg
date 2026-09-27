// Resolution-independent voxel sculpting. A part is described with solid shapes in design units (one design unit is
// one voxel at R = 1, the density the first suits were built at) and rasterized at R voxels per unit: a voxel is solid
// when its centre falls inside the shape. Doubling R keeps every proportion and doubles the detail, so a suit can be
// drafted coarse and refined without re-authoring. Mecha armour is mostly flat facets, so the workhorse is `hull`: the
// part's silhouette from the front, the side and/or the top, each extruded through the others and intersected, the way
// a modeller blocks out from orthographic blueprints.
//
// Shapes are plain { lo, hi, inside(x, y, z) } objects in design units; combine them with and / or / sub, move, rot and
// mirror. Characters face +z and their right side is -x, as everywhere else.
import { VoxelModel } from './voxel.js';

const INF = 1e6;
const shape = (lo, hi, inside) => ({ lo, hi, inside });

// ---------- primitives ----------
export const box = (x0, y0, z0, x1, y1, z1) => {
  const lo = [Math.min(x0, x1), Math.min(y0, y1), Math.min(z0, z1)], hi = [Math.max(x0, x1), Math.max(y0, y1), Math.max(z0, z1)];
  return shape(lo, hi, (x, y, z) => x >= lo[0] && x <= hi[0] && y >= lo[1] && y <= hi[1] && z >= lo[2] && z <= hi[2]);
};
// Box with every edge rounded to radius r (r may be a per-axis [rx, ry, rz]).
export const rbox = (x0, y0, z0, x1, y1, z1, r) => {
  const b = box(x0, y0, z0, x1, y1, z1);
  const c = b.lo.map((v, i) => (v + b.hi[i]) / 2), h = b.lo.map((v, i) => (b.hi[i] - v) / 2);
  const rr = Array.isArray(r) ? r : [r, r, r];
  return shape(b.lo, b.hi, (x, y, z) => {
    let s = 0;
    const p = [x, y, z];
    for (let i = 0; i < 3; i++) {
      const q = Math.abs(p[i] - c[i]) - (h[i] - rr[i]);
      if (q > 0) s += (q / rr[i]) ** 2;
    }
    return s <= 1;
  });
};
export const ell = (cx, cy, cz, rx, ry = rx, rz = rx) =>
  shape([cx - rx, cy - ry, cz - rz], [cx + rx, cy + ry, cz + rz], (x, y, z) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 + ((z - cz) / rz) ** 2 <= 1);

// [axis, first plane coord, second plane coord]: cylinders take the other two in x,y,z order, prisms take a side
// silhouette as [z, y] so every profile keeps y as its second (up) coordinate
const AX = { x: [0, 1, 2], y: [1, 0, 2], z: [2, 0, 1] };
const PAX = { x: [0, 2, 1], y: [1, 0, 2], z: [2, 0, 1] };
// Cylinder along `axis` through (u, v) in the other two axes (x,y,z order: for 'y' that's (x, z)), from a0 to a1,
// radius r at a0 tapering to r1 at a1 (a cone or frustum). rv squashes it into an elliptic cylinder.
export const cyl = (axis, u, v, r, a0, a1, r1 = r, rv = null) => {
  const [a, i, j] = AX[axis];
  const lo = [], hi = [], R = Math.max(r, r1), k = rv ? rv / r : 1;
  lo[a] = Math.min(a0, a1); hi[a] = Math.max(a0, a1);
  lo[i] = u - R; hi[i] = u + R; lo[j] = v - R * k; hi[j] = v + R * k;
  return shape(lo, hi, (...p) => {
    if (p[a] < lo[a] || p[a] > hi[a]) return false;
    const t = (p[a] - a0) / (a1 - a0 || 1), rad = r + (r1 - r) * t;
    return (p[i] - u) ** 2 + ((p[j] - v) / k) ** 2 <= rad * rad;
  });
};

function inPoly(pts, u, v) {
  let c = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [ui, vi] = pts[i], [uj, vj] = pts[j];
    if ((vi > v) !== (vj > v) && u < ((uj - ui) * (v - vi)) / (vj - vi) + ui) c = !c;
  }
  return c;
}
// Polygon extruded along `axis` from a0 to a1. Points are in the plane of the other two axes, in x,y,z order:
// 'z' takes [x, y] (a front silhouette), 'x' takes [z, y] (a side silhouette), 'y' takes [x, z] (seen from above).
export const prism = (axis, pts, a0 = -INF, a1 = INF) => {
  const [a, i, j] = PAX[axis];
  const lo = [], hi = [];
  lo[a] = Math.min(a0, a1); hi[a] = Math.max(a0, a1);
  lo[i] = Math.min(...pts.map((p) => p[0])); hi[i] = Math.max(...pts.map((p) => p[0]));
  lo[j] = Math.min(...pts.map((p) => p[1])); hi[j] = Math.max(...pts.map((p) => p[1]));
  return shape(lo, hi, (...p) => p[a] >= lo[a] && p[a] <= hi[a] && inPoly(pts, p[i], p[j]));
};
// Blueprint block-out: the intersection of the front ([x, y]), side ([z, y]) and top ([x, z]) silhouettes. Any may be
// null, but at least two are needed to bound the shape.
export const hull = (front, side, top) =>
  and(...[front && prism('z', front), side && prism('x', side), top && prism('y', top)].filter(Boolean));

// Half-space n·p <= d: intersect with it to chamfer an edge or slope a face.
export const half = (nx, ny, nz, d) =>
  shape([-INF, -INF, -INF], [INF, INF, INF], (x, y, z) => nx * x + ny * y + nz * z <= d);
// A custom test inside explicit bounds, e.g. alternating stripes for ribbed pipe.
export const fn = (lo, hi, inside) => shape(lo, hi, inside);

// ---------- combinators ----------
export const and = (...s) => shape(
  [0, 1, 2].map((i) => Math.max(...s.map((q) => q.lo[i]))),
  [0, 1, 2].map((i) => Math.min(...s.map((q) => q.hi[i]))),
  (x, y, z) => s.every((q) => q.inside(x, y, z)),
);
export const or = (...s) => shape(
  [0, 1, 2].map((i) => Math.min(...s.map((q) => q.lo[i]))),
  [0, 1, 2].map((i) => Math.max(...s.map((q) => q.hi[i]))),
  (x, y, z) => s.some((q) => q.inside(x, y, z)),
);
export const sub = (a, ...b) => shape(a.lo, a.hi, (x, y, z) => a.inside(x, y, z) && !b.some((q) => q.inside(x, y, z)));
export const move = (s, dx, dy, dz) =>
  shape([s.lo[0] + dx, s.lo[1] + dy, s.lo[2] + dz], [s.hi[0] + dx, s.hi[1] + dy, s.hi[2] + dz], (x, y, z) => s.inside(x - dx, y - dy, z - dz));
export const mirror = (s) => shape([-s.hi[0], s.lo[1], s.lo[2]], [-s.lo[0], s.hi[1], s.hi[2]], (x, y, z) => s.inside(-x, y, z));
// The shape and its mirror image across x = 0.
export const both = (s) => or(s, mirror(s));

// Rotate by Euler angles (XYZ, radians) about pivot p.
export const rot = (s, [rx, ry, rz], p = [0, 0, 0]) => {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // M = Rx * Ry * Rz (three.js XYZ order); inverse = transpose
  const m = [
    cy * cz, -cy * sz, sy,
    cx * sz + sx * sy * cz, cx * cz - sx * sy * sz, -sx * cy,
    sx * sz - cx * sy * cz, sx * cz + cx * sy * sz, cx * cy,
  ];
  const lo = [INF, INF, INF], hi = [-INF, -INF, -INF];
  for (let k = 0; k < 8; k++) {
    const q = [k & 1 ? s.hi[0] : s.lo[0], k & 2 ? s.hi[1] : s.lo[1], k & 4 ? s.hi[2] : s.lo[2]].map((v, i) => v - p[i]);
    for (let r = 0; r < 3; r++) {
      const v = m[r * 3] * q[0] + m[r * 3 + 1] * q[1] + m[r * 3 + 2] * q[2] + p[r];
      lo[r] = Math.min(lo[r], v); hi[r] = Math.max(hi[r], v);
    }
  }
  return shape(lo, hi, (x, y, z) => {
    const qx = x - p[0], qy = y - p[1], qz = z - p[2];
    return s.inside(
      m[0] * qx + m[3] * qy + m[6] * qz + p[0],
      m[1] * qx + m[4] * qy + m[7] * qz + p[1],
      m[2] * qx + m[5] * qy + m[8] * qz + p[2],
    );
  });
};

// ---------- the sculpt ----------
export class Sculpt {
  constructor(pal, R = 1) {
    this.R = R;
    this.m = new VoxelModel(pal);
  }
  // every voxel whose centre lies inside s
  each(s, f) {
    const R = this.R;
    const i0 = s.lo.map((v) => Math.floor(Math.max(v, -500) * R)), i1 = s.hi.map((v) => Math.ceil(Math.min(v, 500) * R) - 1);
    for (let i = i0[0]; i <= i1[0]; i++)
      for (let j = i0[1]; j <= i1[1]; j++)
        for (let k = i0[2]; k <= i1[2]; k++)
          if (s.inside((i + 0.5) / R, (j + 0.5) / R, (k + 0.5) / R)) f(i, j, k);
    return this;
  }
  add(s, color, opts) {
    const id = this.m.c(color, opts);
    return this.each(s, (i, j, k) => this.m.set(i, j, k, id));
  }
  cut(s) {
    return this.each(s, (i, j, k) => this.m.del(i, j, k));
  }
  // recolour voxels already there
  paint(s, color, opts) {
    const id = this.m.c(color, opts);
    return this.each(s, (i, j, k) => { const v = this.m.get(i, j, k); if (v) v.id = id; });
  }
  // Pixel art stamped at voxel resolution onto the plane through design point o: rows top to bottom, one character
  // per voxel, '.' or ' ' for none; keys map to colours (or [colour, opts]). plane 'xy' faces +z, 'zy' faces +x.
  decal(rows, o, keys, plane = 'xy', paintOnly = false) {
    const R = this.R;
    const b = o.map((v) => Math.floor(v * R));
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const k = keys[ch];
      if (!k) return;
      const [col, opts] = Array.isArray(k) ? k : [k];
      const p = plane === 'xy' ? [b[0] + c, b[1] - r, b[2]] : [b[0], b[1] - r, b[2] + c];
      if (paintOnly) { const v = this.m.get(...p); if (v) v.id = this.m.c(col, opts); } else this.m.set(...p, col, opts);
    }));
    return this;
  }
  // The same pixel art projected onto whatever surface is there: each pixel recolours the first voxel met looking
  // down -z (plane 'xy', from the front) or -x (plane 'zy', from the suit's left), so it wraps slanted and curved armour.
  // o gives the top-left pixel; its depth coordinate is where the search starts.
  project(rows, o, keys, plane = 'xy', depth = 12) {
    const R = this.R;
    const b = o.map((v) => Math.floor(v * R));
    rows.forEach((row, r) => [...row].forEach((ch, c) => {
      const k = keys[ch];
      if (!k) return;
      const [col, opts] = Array.isArray(k) ? k : [k];
      for (let d = 0; d < depth * R; d++) {
        const v = plane === 'xy' ? this.m.get(b[0] + c, b[1] - r, b[2] - d) : this.m.get(b[0] - d, b[1] - r, b[2] + c);
        if (v) { v.id = this.m.c(col, opts); break; }
      }
    }));
    return this;
  }
  // copy x >= 0 onto the negative side (voxel x -> -1 - x): author the suit's left half, then mirror
  mirror() {
    this.m.mirrorX();
    return this;
  }
  get model() {
    return this.m;
  }
  // keep sculpting a model already built (a mirrored clone, say, that needs its own lettering)
  static on(model, R) {
    const s = new Sculpt(model.palette, R);
    s.m = model;
    return s;
  }
}

// A rig definition authored in design units: pivots and hipHeight are scaled into voxels, and the voxel size shrinks
// by R so the suit stays the same size in the world.
export function rigDef(R, scale, hipHeight, parts) {
  const out = { scale: scale / R, hipHeight: hipHeight * R, R, parts: {} };
  for (const n in parts) {
    const p = parts[n];
    out.parts[n] = { ...p, pivot: p.pivot.map((v) => v * R) };
  }
  return out;
}
