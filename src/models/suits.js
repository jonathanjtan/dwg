// Voxel mobile suits. Characters face +Z; their right side is -X.
// Every part is authored around its own pivot at the origin.
import { Palette, VoxelModel } from '../core/voxel.js';

export const pal = new Palette();
const M = () => new VoxelModel(pal);

// ---------------- RX-75 Guntank ----------------
// Tread base (hips), blue upper body with twin 120mm shoulder cannons, glass dome cockpit, 4-tube missile forearms.
const T = {
  B: 0x2f55b0, B2: 0x23408a, W: 0xdde2ea, W2: 0xb9c0cc, N: 0x1e2a48, TR: 0x2a2c30, TR2: 0x3c3f45,
  GR: 0x6a707e, DK: 0x22252c, R: 0xc02a30, Y: 0xe8b820,
};

function tankBase() {
  const m = M();
  // two tread units
  for (const [x0, x1] of [[-8, -4], [3, 7]]) {
    m.box(x0, -11, -8, x1, -6, 7, T.TR);
    for (let z = -8; z <= 7; z += 2) m.box(x0, -11, z, x1, -11, z, T.TR2); // tread links
    for (let z = -8; z <= 7; z += 2) m.box(x0, -6, z, x1, -6, z, T.TR2);
    m.clearBox(x0, -11, -8, x1, -11, -8); m.clearBox(x0, -11, 7, x1, -11, 7); // rounded ends
    m.clearBox(x0, -6, -8, x1, -6, -8); m.clearBox(x0, -6, 7, x1, -6, 7);
    const outer = x0 < 0 ? x0 - 1 : x1 + 1;
    for (const z of [-6, -2, 2, 5]) m.box(outer, -10, z, outer, -8, z + 1, T.GR); // road wheels
    m.box(outer, -7, -7, outer, -7, 6, T.N); // track skirt
  }
  // hull between the treads
  m.box(-4, -9, -6, 3, -2, 5, T.N);
  m.box(-4, -3, 6, 3, -2, 6, T.N);
  m.box(-3, -8, 6, 2, -4, 6, T.B2); // front plate
  m.box(-2, -7, 7, 1, -5, 7, T.Y);
  m.box(-5, -1, -4, 4, 1, 3, T.GR); // waist turret ring
  m.box(-4, 1, -3, 3, 1, 2, T.DK);
  return m;
}

function tankTorso() {
  const m = M();
  m.sbox(4, 0, -3, 1, 2, T.B2); // waist
  m.sbox(5, 2, -3, 7, 3, T.B); // chest
  m.sbox(4, 3, 4, 6, 4, T.B2);
  m.box(-2, 4, 4, 1, 5, 4, T.R); // chest intake
  m.box(-2, 3, 4, 1, 3, 4, T.W2);
  m.sbox(3, 8, -2, 8, 2, T.W); // collar
  // shoulder cannon mounts + long barrels pointing forward
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -7 : 5, x1 = x0 + 1;
    m.box(x0 - (sx < 0 ? 1 : 0), 6, -5, x1 + (sx > 0 ? 1 : 0), 9, 1, T.W); // breech block
    m.box(x0, 7, 2, x1, 8, 15, T.W2); // barrel
    m.box(x0, 7, 9, x1, 8, 9, T.GR);
    m.box(x0, 7, 16, x1, 8, 16, T.DK); // muzzle
    m.box(x0, 6, -6, x1, 9, -6, T.GR);
  }
  // backpack ammo drums
  m.sbox(3, 2, -6, 7, -4, T.W2);
  m.box(-3, 3, -7, 2, 6, -7, T.GR);
  return m;
}

function tankHead() {
  const m = M();
  m.box(-2, 0, -2, 1, 0, 1, T.N);
  m.ellipsoid(0, 1.2, 0, 2.6, 2.6, 2.6, 0x7fd6e8, { glow: 0.55, jitter: 0.02 });
  m.clearBox(-3, -2, -3, 3, 0, 3);
  m.box(-1, 1, 0, 0, 2, 0, 0x2a2e38); // pilot silhouette
  m.box(-3, 1, -1, -3, 2, 0, T.W); // side sensors
  m.box(2, 1, -1, 2, 2, 0, T.W);
  return m;
}

function tankUpperArmR() {
  const m = M();
  m.box(-2, -1, -2, 1, 1, 1, T.B);
  m.box(-1, -4, -1, 0, -2, 0, T.GR);
  return m;
}
function tankForeArmR() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, T.GR);
  m.box(-2, -6, -2, 1, -1, 1, T.W); // launcher pod
  m.box(-2, -6, -2, 1, -6, 1, T.W2);
  for (const [x, z] of [[-2, -2], [1, -2], [-2, 1], [1, 1]]) m.set(x, -7, z, T.DK); // 4 tubes
  m.box(-1, -7, -1, 0, -7, 0, T.GR);
  m.box(-2, -3, 2, 1, -3, 2, T.R);
  return m;
}

export function guntankDef() {
  const uR = tankUpperArmR(), fR = tankForeArmR();
  return {
    scale: 0.1,
    hipHeight: 11,
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: tankBase() },
      torso: { parent: 'hips', pivot: [0, 2, 0], model: tankTorso() },
      head: { parent: 'torso', pivot: [0, 9, 0], model: tankHead() },
      uArmR: { parent: 'torso', pivot: [-6.5, 5, 0], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -4, 0], model: fR },
      uArmL: { parent: 'torso', pivot: [6.5, 5, 0], model: uR.clone().flipX() },
      fArmL: { parent: 'uArmL', pivot: [0, -4, 0], model: fR.clone().flipX() },
    },
  };
}
