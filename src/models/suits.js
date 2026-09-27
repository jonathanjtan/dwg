// Voxel mobile suits. Characters face +Z; their right side is -X.
// Every part is authored around its own pivot at the origin.
import { Palette, VoxelModel } from '../core/voxel.js';

export const pal = new Palette();
const M = () => new VoxelModel(pal);

// ---------------- MS-06 Zaku II ----------------
export const Z = {
  DG: 0x3e6a3c, LG: 0x78a85a, J: 0x4b5049, P: 0x676f64, P2: 0x3a4039, SL: 0x151716,
  SP: 0xb8bcb0, EYE: 0xff2f6e,
};

function zakuHips(c) {
  const m = M();
  m.sbox(4, -2, -2, 1, 1, c.DG);
  m.box(-1, -3, -1, 0, -1, 2, c.J);
  m.box(-4, -4, 2, -1, 0, 2, c.DG); // front skirts
  m.box(0, -4, 2, 3, 0, 2, c.DG);
  m.box(-4, -4, 2, -1, -4, 2, c.J);
  m.box(0, -4, 2, 3, -4, 2, c.J);
  m.box(-5, -4, -2, -5, 0, 1, c.DG); // side skirts
  m.box(4, -4, -2, 4, 0, 1, c.DG);
  m.box(-4, -4, -3, 3, 0, -3, c.DG);
  return m;
}

function zakuTorso(c) {
  const m = M();
  m.sbox(3, 0, -2, 1, 1, c.J);
  m.ellipsoid(0, 5, -0.5, 6, 4.6, 4.2, c.DG);
  m.clearBox(-7, -2, -7, 7, 1, 7);
  m.sbox(6, 2, -3, 6, 2, c.DG);
  // ribbed power pipes on the abdomen
  for (let y = 0; y <= 3; y++) {
    const col = y % 2 ? c.P : c.P2;
    m.box(-4, y, 2, -3, y, 3, col);
    m.box(2, y, 2, 3, y, 3, col);
  }
  m.sbox(3, 7, -2, 9, 2, c.DG); // collar
  // backpack
  m.sbox(4, 2, -6, 8, -4, c.DG);
  m.box(-3, 1, -6, -2, 1, -5, c.SL);
  m.box(1, 1, -6, 2, 1, -5, c.SL);
  return m;
}

function zakuHead(c, horn) {
  const m = M();
  m.ellipsoid(0, 2.6, 0, 3.3, 3.2, 3.4, c.LG);
  m.clearBox(-4, -2, -4, 4, -1, 4);
  // mono-eye slit
  m.box(-3, 2, 2, 2, 3, 3, c.SL);
  m.clearBox(-3, 2, 3, 2, 3, 3);
  m.box(-3, 2, 3, 2, 3, 3, c.SL);
  m.set(-1, 2, 3, Z.EYE, { glow: 3.2, jitter: 0 });
  m.set(0, 2, 3, Z.EYE, { glow: 3.2, jitter: 0 });
  m.set(-1, 3, 3, Z.EYE, { glow: 2.2, jitter: 0 });
  m.set(0, 3, 3, Z.EYE, { glow: 2.2, jitter: 0 });
  // snout + face pipes
  m.box(-1, 0, 3, 0, 1, 4, c.LG);
  for (let i = 0; i < 3; i++) {
    const col = i % 2 ? c.P : c.P2;
    m.set(-2 - i, 0 - (i > 1 ? 1 : 0), 3 - i, col);
    m.set(1 + i, 0 - (i > 1 ? 1 : 0), 3 - i, col);
  }
  m.box(-1, 5, -1, 0, 6, 1, c.LG); // crest
  if (horn === 'char') {
    m.box(-1, 6, 2, 0, 6, 3, c.LG);
    m.box(-1, 7, 3, 0, 8, 3, c.LG);
    m.box(-1, 9, 3, 0, 10, 2, c.LG);
    m.set(-1, 11, 1, c.LG);
    m.set(0, 11, 1, c.LG);
  } else if (horn === 'cmd') {
    m.box(3, 3, 0, 3, 4, 1, c.P2);
    m.box(4, 5, 0, 4, 7, 0, c.SP);
    m.box(5, 8, -1, 5, 9, -1, c.SP);
  }
  return m;
}

function zakuUpperArmR(c) {
  // Right shoulder carries the iconic rounded shield.
  const m = M();
  m.box(-2, -1, -1, 1, 1, 0, c.J);
  m.box(-1, -5, -1, 0, -2, 0, c.J);
  for (let y = -4; y <= 3; y++) {
    const hz = y === 3 || y === -4 ? 3 : 4;
    m.box(-4, y, -hz, -3, y, hz - 1, c.DG);
  }
  m.box(-4, 3, -3, -4, 3, 2, c.LG);
  return m;
}
function zakuUpperArmL(c) {
  // Left shoulder: spiked pauldron.
  const m = M();
  m.box(-2, -1, -1, 1, 1, 0, c.J);
  m.box(-1, -5, -1, 0, -2, 0, c.J);
  m.ellipsoid(0.5, 0.8, -0.5, 3.4, 3.1, 3.4, c.DG);
  m.clearBox(-4, -4, -5, 5, -2, 5);
  m.clearBox(-4, -1, -5, -2, 5, 5);
  // outward-facing spikes: 2x2 base + tip
  for (const [y, z] of [[0, -3], [0, 1], [2, -1]]) {
    m.box(4, y, z, 4, y + 1, z + 1, c.SP);
    m.set(5, y, z, c.SP);
    m.set(5, y + 1, z + 1, c.SP);
    m.set(6, y + 1, z, 0xd8dbd0);
  }
  m.box(1, 4, -1, 2, 4, 0, c.SP); // top spike
  m.set(1, 5, -1, c.SP);
  m.set(2, 5, 0, 0xd8dbd0);
  return m;
}
function zakuForeArmR(c) {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, c.J);
  m.box(-2, -5, -2, 1, -1, 1, c.LG);
  m.box(-2, -5, -2, 1, -5, 1, c.DG);
  m.box(-1, -7, -1, 0, -6, 0, c.J);
  return m;
}
function zakuThigh(c) {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, c.J);
  m.sbox(2, -7, -2, -1, 1, c.J);
  m.sbox(2, -5, -2, -5, 1, c.P2);
  m.sbox(2, -3, -2, -3, 1, c.P2);
  return m;
}
function zakuShin(c) {
  const m = M();
  m.ellipsoid(0, -3.5, -0.3, 3.4, 4.6, 3.3, c.LG);
  m.clearBox(-4, -9, -4, 4, -7, 4);
  m.sbox(2, 0, -1, 0, 0, c.J);
  m.sbox(3, -8, -3, -7, 3, c.DG); // foot
  m.sbox(3, -8, 4, -8, 4, c.DG);
  m.sbox(2, -8, -4, -7, -4, c.DG);
  m.sbox(3, -6, -2, -6, 2, c.DG);
  return m;
}

function heatHawk() {
  const m = M();
  m.box(0, -1, -2, 0, 0, 5, 0x5a5f58);
  m.box(0, -1, 3, 0, 0, 3, 0x2d302c);
  m.box(0, -4, 4, 0, -2, 7, 0xff7a24, { glow: 2.4, jitter: 0.08 });
  m.box(0, -5, 5, 0, -5, 7, 0xffb24a, { glow: 2.8, jitter: 0.05 });
  m.set(0, -1, 7, 0xff7a24, { glow: 2.4 });
  return m;
}
function zakuMG() {
  const m = M();
  m.box(-1, -1, -3, 0, 1, 6, 0x353a36);
  m.box(0, -1, 7, 0, 0, 11, 0x5a5f58); // barrel
  m.box(-3, 0, 0, -2, 3, 3, 0x454b45); // drum magazine
  m.box(-1, -3, 1, 0, -2, 2, 0x353a36);
  return m;
}

export function zakuDef(colors = Z, horn = null) {
  const uR = zakuUpperArmR(colors), uL = zakuUpperArmL(colors);
  const fR = zakuForeArmR(colors), fL = fR.clone().flipX();
  const thigh = zakuThigh(colors), shin = zakuShin(colors);
  return {
    scale: 0.1,
    hipHeight: 16,
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: zakuHips(colors) },
      torso: { parent: 'hips', pivot: [0, 2, 0], model: zakuTorso(colors) },
      head: { parent: 'torso', pivot: [0, 8.5, 0.5], model: zakuHead(colors, horn) },
      uArmR: { parent: 'torso', pivot: [-7, 6, 0], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -5, 0], model: fR },
      hand: { parent: 'fArmR', pivot: [0, -6, 0], model: null },
      hawk: { parent: 'hand', pivot: [0, 0, 0], model: heatHawk(), bit: 1 },
      gun: { parent: 'hand', pivot: [0, 0, 0], model: zakuMG(), bit: 2 },
      uArmL: { parent: 'torso', pivot: [7, 6, 0], model: uL },
      fArmL: { parent: 'uArmL', pivot: [0, -5, 0], model: fL },
      thighR: { parent: 'hips', pivot: [-2.2, -1, 0], model: thigh },
      shinR: { parent: 'thighR', pivot: [0, -7, 0], model: shin },
      thighL: { parent: 'hips', pivot: [2.2, -1, 0], model: thigh.clone() },
      shinL: { parent: 'thighL', pivot: [0, -7, 0], model: shin.clone() },
    },
  };
}

export const CHAR_COLORS = { ...Z, DG: 0xa82838, LG: 0xe8707e, J: 0x5a3a40, P: 0x7a5a60, P2: 0x4a2a30 };
export const CMD_COLORS = { ...Z, DG: 0x355e45, LG: 0x6e9e78 };

export function charDef() {
  return zakuDef(CHAR_COLORS, 'char');
}
export function commanderDef() {
  return zakuDef(CMD_COLORS, 'cmd');
}
export const CAPT_COLORS = { ...Z, DG: 0x5a6440, LG: 0x9fae6c, J: 0x4a4a3e };
export function captainDef() {
  return zakuDef(CAPT_COLORS, 'cmd');
}

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

// ---------------- RB-79 Ball ----------------
// A space pod with arms: a white sphere with an orange-ringed green viewport, a grab rail across the brow, the 180mm
// recoilless cannon on a turret on top (the head node, so poses aim it: head pitch 0 points it straight up, ~1.4
// levels it forward), two thin manipulator arms with claws low on the sides, four stub landing legs and a pair of
// thrusters at the back. The torso pivot is the sphere's centre, so torso rotations tumble the whole pod in place.
const BL = {
  W: 0xdadee4, W2: 0xb4bbc5, W3: 0x9098a4, O: 0xc4602a, O2: 0x8e3f1c, G: 0x4ff0c0,
  K: 0x5a616d, K2: 0x3c424c, K3: 0x24282f,
};

function ballBody() {
  const m = M();
  m.ellipsoid(0, 0, 0, 7.5, 7.5, 7.5, BL.W);
  // seams: the equator and a ring round the top hatch
  for (const v of m.map.values()) {
    if (v.y === -1) v.id = m.c(BL.W2);
    else if (v.y === 5 && Math.hypot(v.x + 0.5, v.z + 0.5) > 4.4) v.id = m.c(BL.W2);
  }
  // viewport: an orange ring round green glass, a little below the middle of the face
  for (let x = -5; x <= 4; x++) {
    for (let y = -6; y <= 3; y++) {
      const d = Math.hypot(x + 0.5, y + 1.5);
      if (d > 4.3) continue;
      for (let z = 7; z >= 0; z--) {
        if (!m.has(x, y, z)) continue;
        m.set(x, y, z, d < 2.7 ? BL.G : BL.O, d < 2.7 ? { glow: 0.9, jitter: 0.02 } : undefined);
        if (d >= 2.7 && d < 3.3) m.set(x, y, z + 1, BL.O2); // the ring stands proud of the hull
        break;
      }
    }
  }
  // grab rail across the brow, on two posts
  m.box(-5, 4, 6, 4, 4, 6, BL.K);
  m.box(-5, 3, 5, -5, 3, 6, BL.K2);
  m.box(4, 3, 5, 4, 3, 6, BL.K2);
  // arm sockets low on each side, a sensor lamp on the right
  m.box(-9, -3, 0, -8, 0, 3, BL.W3);
  m.box(7, -3, 0, 8, 0, 3, BL.W3);
  m.set(-8, 2, 3, 0xffd070, { glow: 1.6, jitter: 0 });
  // back: two thruster bells and a hatch
  for (const x0 of [-4, 2]) {
    m.box(x0, -5, -8, x0 + 1, -3, -8, BL.K2);
    m.box(x0, -5, -9, x0 + 1, -4, -9, BL.K3);
  }
  m.box(-2, 0, -8, 1, 3, -8, BL.W2);
  // four stub landing legs with pads
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
    const x = sx < 0 ? -5 : 4, z = sz < 0 ? -5 : 4;
    m.box(x, -9, z, x, -6, z, BL.K);
    m.box(x + (sx < 0 ? -1 : 0), -10, z + (sz < 0 ? -1 : 0), x + (sx < 0 ? 0 : 1), -10, z + (sz < 0 ? 0 : 1), BL.K2);
  }
  return m;
}

// The 180mm cannon, barrel up from its turret (pivot at the turret's base).
function ballCannon() {
  const m = M();
  m.box(-2, 0, -2, 1, 1, 1, BL.K); // turret ring
  m.box(-2, 2, -2, 1, 4, 0, BL.W2); // breech housing
  m.box(-1, 2, 1, 0, 3, 1, BL.K2);
  m.box(-1, 5, -1, 0, 14, 0, BL.K); // barrel
  m.box(-1, 9, -1, 0, 9, 0, BL.K2);
  m.box(-2, 14, -2, 1, 15, 1, BL.K2); // muzzle brake
  m.box(-1, 15, -1, 0, 15, 0, BL.K3);
  m.box(-1, 1, -3, 0, 3, -3, BL.K3); // recoilless vent
  return m;
}

function ballUpperArm() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, BL.K); // shoulder
  m.box(-1, -5, -1, 0, -2, 0, BL.W3);
  return m;
}
function ballForeArm() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, BL.K2); // elbow
  m.box(-1, -4, -1, 0, -2, 0, BL.W3);
  return m;
}
// Two-pronged claw, open toward the front.
function ballClaw() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, BL.K);
  m.box(-1, -3, 0, -1, -2, 1, BL.K2);
  m.box(0, -3, -1, 0, -2, 0, BL.K2);
  m.set(-1, -4, 1, BL.K3);
  m.set(0, -4, -1, BL.K3);
  return m;
}

export function ballDef() {
  const uR = ballUpperArm(), fR = ballForeArm(), claw = ballClaw();
  return {
    scale: 0.1,
    hipHeight: 10.5,
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: null },
      torso: { parent: 'hips', pivot: [0, 0, 0], model: ballBody() },
      head: { parent: 'torso', pivot: [0, 7, -1], model: ballCannon() },
      uArmR: { parent: 'torso', pivot: [-8.5, -1.5, 1.5], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -5, 0], model: fR },
      hand: { parent: 'fArmR', pivot: [0, -4.5, 0], model: claw },
      uArmL: { parent: 'torso', pivot: [8.5, -1.5, 1.5], model: uR.clone().flipX() },
      fArmL: { parent: 'uArmL', pivot: [0, -5, 0], model: fR.clone().flipX() },
      handL: { parent: 'fArmL', pivot: [0, -4.5, 0], model: claw.clone().flipX() },
    },
  };
}
