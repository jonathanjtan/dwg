// Humanoid rig shared by the Gundam, commanders (Object3D hierarchy) and crowds (InstancedMesh).
import * as THREE from 'three';
import { meshVoxels, VoxMat } from './voxel.js';

export const PARTS = ['hips', 'torso', 'head', 'uArmL', 'fArmL', 'uArmR', 'fArmR', 'thighL', 'shinL', 'thighR', 'shinR', 'hand', 'handL'];
export const P = Object.fromEntries(PARTS.map((n, i) => [n, i]));
const NP = PARTS.length;
// Trailing scalars: rootY offset, root pitch, root roll, root yaw offset.
export const POSE_LEN = NP * 3 + 4;
export const RY = NP * 3, RPITCH = NP * 3 + 1, RROLL = NP * 3 + 2, RYAW = NP * 3 + 3;

export const makePose = () => new Float32Array(POSE_LEN);

export function poseFrom(obj, base) {
  const p = base ? Float32Array.from(base) : makePose();
  for (const k in obj) {
    const v = obj[k];
    if (k === 'y') p[RY] = v;
    else if (k === 'pitch') p[RPITCH] = v;
    else if (k === 'roll') p[RROLL] = v;
    else if (k === 'yaw') p[RYAW] = v;
    else if (P[k] !== undefined) {
      p[P[k] * 3] = v[0] || 0;
      p[P[k] * 3 + 1] = v[1] || 0;
      p[P[k] * 3 + 2] = v[2] || 0;
    }
  }
  return p;
}

export function lerpPose(out, a, b, t) {
  for (let i = 0; i < POSE_LEN; i++) out[i] = a[i] + (b[i] - a[i]) * t;
  return out;
}

const easeInOut = (t) => t * t * (3 - 2 * t);
const EASES = {
  linear: (t) => t,
  smooth: easeInOut,
  in: (t) => t * t,
  out: (t) => 1 - (1 - t) * (1 - t),
  snap: (t) => 1 - Math.pow(1 - t, 4),
};

// Keyframed clip. keys: [{ t, p: {part:[x,y,z], y, pitch...}, e: 'smooth' }]
// Each key inherits unspecified channels from the previous key (first key from `base`).
export class Clip {
  constructor(keys, base) {
    this.keys = [];
    let prev = base || makePose();
    for (const k of keys) {
      const pose = poseFrom(k.p || {}, prev);
      this.keys.push({ t: k.t, pose, ease: EASES[k.e || 'smooth'] });
      prev = pose;
    }
    this.dur = this.keys[this.keys.length - 1].t;
  }
  sample(t, out) {
    const ks = this.keys;
    if (t <= ks[0].t) return out.set(ks[0].pose), out;
    for (let i = 1; i < ks.length; i++) {
      if (t <= ks[i].t) {
        const a = ks[i - 1], b = ks[i];
        const u = (t - a.t) / Math.max(1e-5, b.t - a.t);
        return lerpPose(out, a.pose, b.pose, b.ease(u));
      }
    }
    out.set(ks[ks.length - 1].pose);
    return out;
  }
}

function sortedParts(def) {
  const order = [];
  const seen = new Set();
  const visit = (n) => {
    if (seen.has(n)) return;
    const p = def.parts[n];
    if (p.parent) visit(p.parent);
    seen.add(n);
    order.push(n);
  };
  Object.keys(def.parts).forEach(visit);
  return order;
}

// Cache geometries per model so multiple rigs can share them.
function partGeoms(def) {
  if (def._geoms) return def._geoms;
  const s = def.scale;
  const out = {};
  for (const n in def.parts) {
    const p = def.parts[n];
    out[n] = p.model ? meshVoxels(p.model, { scale: s }) : { solid: null, glow: null };
  }
  def._geoms = out;
  def._order = sortedParts(def);
  return out;
}

// ---------- Object3D rig (hero, commanders) ----------
export class RigObject {
  constructor(def, { shadows = true } = {}) {
    this.def = def;
    const geoms = partGeoms(def);
    const s = def.scale;
    this.root = new THREE.Group();
    this.body = new THREE.Group(); // pitch/roll/yaw offsets applied here
    this.root.add(this.body);
    this.nodes = {};
    this.materials = [];
    this.solidMat = VoxMat.solid.clone();
    this.solidMat.emissive = new THREE.Color(0, 0, 0);
    for (const n of def._order) {
      const p = def.parts[n];
      const node = new THREE.Group();
      node.name = n;
      node.position.set(p.pivot[0] * s, p.pivot[1] * s, p.pivot[2] * s);
      if (n === 'hips') node.position.y += def.hipHeight * s;
      const g = geoms[n];
      if (g.solid) {
        const m = new THREE.Mesh(g.solid, this.solidMat);
        m.castShadow = shadows;
        m.receiveShadow = true;
        node.add(m);
      }
      if (g.glow) node.add(new THREE.Mesh(g.glow, VoxMat.glow));
      (p.parent ? this.nodes[p.parent] : this.body).add(node);
      this.nodes[n] = node;
      node.userData.restY = node.position.y;
    }
  }
  applyPose(pose) {
    const hipH = this.def.hipHeight * this.def.scale;
    for (const n in this.nodes) {
      const i = P[n];
      if (i === undefined) continue;
      this.nodes[n].rotation.set(pose[i * 3], pose[i * 3 + 1], pose[i * 3 + 2]);
    }
    this.nodes.hips.position.y = hipH + pose[RY];
    this.body.rotation.set(pose[RPITCH], pose[RYAW], pose[RROLL], 'YXZ');
  }
  setFlash(v, color = 0xffffff) {
    this.solidMat.emissive.set(color).multiplyScalar(v);
  }
}

// ---------- Instanced rig (crowds) ----------
const _m = new THREE.Matrix4();
const _r = new THREE.Matrix4();
const _t = new THREE.Matrix4();
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _v = new THREE.Vector3();
const _s = new THREE.Vector3();
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class InstancedRig {
  constructor(def, max, scene) {
    this.def = def;
    this.max = max;
    const geoms = partGeoms(def);
    this.order = def._order;
    this.world = {};
    this.meshes = [];
    this.parts = [];
    this.mat = VoxMat.solid.clone();
    for (const n of this.order) {
      const g = geoms[n];
      const entry = { name: n, solid: null, glow: null, idx: P[n], parent: def.parts[n].parent, pivot: def.parts[n].pivot, bit: def.parts[n].bit || 0 };
      if (g.solid) {
        entry.solid = new THREE.InstancedMesh(g.solid, this.mat, max);
        entry.solid.castShadow = true;
        entry.solid.receiveShadow = true;
        entry.solid.frustumCulled = false;
        entry.solid.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        entry.solid.setColorAt(0, new THREE.Color(1, 1, 1));
        entry.solid.instanceColor.setUsage(THREE.DynamicDrawUsage);
        scene.add(entry.solid);
        this.meshes.push(entry.solid);
      }
      if (g.glow) {
        entry.glow = new THREE.InstancedMesh(g.glow, VoxMat.glow, max);
        entry.glow.frustumCulled = false;
        entry.glow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(entry.glow);
        this.meshes.push(entry.glow);
      }
      this.world[n] = new THREE.Matrix4();
      this.parts.push(entry);
    }
    this.count = 0;
  }
  // root: {x,y,z,yaw,scale}; hide: bitmask of parts to hide; flash: [r,g,b] multiplier
  set(i, x, y, z, yaw, scale, pose, hide, cr, cg, cb) {
    const s = this.def.scale;
    _e.set(pose[RPITCH], yaw + pose[RYAW], pose[RROLL], 'YXZ');
    _q.setFromEuler(_e);
    _s.set(scale, scale, scale);
    _v.set(x, y, z);
    const root = _m.compose(_v, _q, _s);
    for (const e of this.parts) {
      const w = this.world[e.name];
      const parentM = e.parent ? this.world[e.parent] : root;
      let py = e.pivot[1] * s;
      if (e.name === 'hips') py += this.def.hipHeight * s + pose[RY];
      _t.makeTranslation(e.pivot[0] * s, py, e.pivot[2] * s);
      const pi = e.idx;
      if (pi !== undefined) {
        _e.set(pose[pi * 3], pose[pi * 3 + 1], pose[pi * 3 + 2], 'XYZ');
        _r.makeRotationFromEuler(_e);
        w.multiplyMatrices(parentM, _t).multiply(_r);
      } else {
        w.multiplyMatrices(parentM, _t);
      }
      const hidden = e.bit && (hide & e.bit);
      if (e.solid) {
        e.solid.setMatrixAt(i, hidden ? ZERO : w);
        e.solid.instanceColor.setXYZ(i, cr, cg, cb);
      }
      if (e.glow) e.glow.setMatrixAt(i, hidden ? ZERO : w);
    }
  }
  commit(count) {
    this.count = count;
    for (const e of this.parts) {
      if (e.solid) {
        e.solid.count = count;
        e.solid.instanceMatrix.needsUpdate = true;
        e.solid.instanceColor.needsUpdate = true;
      }
      if (e.glow) {
        e.glow.count = count;
        e.glow.instanceMatrix.needsUpdate = true;
      }
    }
  }
  worldOf(name) {
    return this.world[name];
  }
}
