// Voxel mobile suits. Characters face +Z; their right side is -X.
// Every part is authored around its own pivot at the origin.
import { Palette, VoxelModel } from '../core/voxel.js';

export const pal = new Palette();
const M = () => new VoxelModel(pal);

// ---------------- RX-78-2 Gundam ----------------
const G = {
  W: 0xe8eaf0, W2: 0xc9cdd8, B: 0x2346a6, R: 0xcc2230, Y: 0xf3c11c, Y2: 0xb88a0e,
  GR: 0x6a707e, DK: 0x2a2e38, V: 0x3a3f4c,
};
const EYE_G = { glow: 1.7, jitter: 0 };

function gundamHips() {
  const m = M();
  m.sbox(4, -2, -2, 1, 1, G.W);
  m.box(-1, -3, -1, 0, 0, 2, G.R); // crotch block
  m.box(-1, -1, 2, 0, -1, 2, G.Y);
  m.box(-4, -3, 2, -2, 0, 2, G.W); // front skirts
  m.box(1, -3, 2, 3, 0, 2, G.W);
  m.box(-4, -3, 2, -2, -3, 2, G.W2);
  m.box(1, -3, 2, 3, -3, 2, G.W2);
  m.box(-3, 0, 2, -3, 0, 2, G.Y);
  m.box(2, 0, 2, 2, 0, 2, G.Y);
  m.box(-5, -3, -1, -5, 0, 0, G.W); // side skirts
  m.box(4, -3, -1, 4, 0, 0, G.W);
  m.box(-3, -3, -3, 2, 0, -3, G.W); // rear skirt
  m.sbox(4, 1, -2, 1, 1, G.GR); // belt line
  return m;
}

function gundamTorso() {
  const m = M();
  m.sbox(3, 0, -2, 1, 1, G.R); // abdomen
  m.box(-3, 0, 2, 2, 1, 2, G.R);
  m.sbox(5, 2, -3, 7, 2, G.B); // chest
  m.clearBox(-5, 7, -3, -5, 7, 2);
  m.clearBox(4, 7, -3, 4, 7, 2);
  m.sbox(5, 2, 3, 2, 3, G.B);
  // yellow chest vents with slats
  for (const x0 of [-4, 1]) {
    m.box(x0, 4, 3, x0 + 2, 6, 3, G.Y);
    m.box(x0, 5, 3, x0 + 2, 5, 3, G.Y2);
  }
  m.box(-1, 3, 3, 0, 6, 3, G.B); // cockpit hatch
  m.box(-1, 3, 3, 0, 3, 3, G.W2);
  m.sbox(3, 8, -2, 8, 1, G.W); // collar
  m.sbox(2, 8, 2, 8, 2, G.W2);
  // backpack + beam saber hilts + thrusters
  m.sbox(3, 2, -5, 7, -4, G.W);
  m.sbox(3, 7, -5, 7, -5, G.W2);
  m.box(-3, 1, -5, -2, 1, -4, G.DK);
  m.box(1, 1, -5, 2, 1, -4, G.DK);
  m.box(-3, 8, -5, -3, 10, -5, G.W);
  m.box(2, 8, -5, 2, 10, -5, G.W);
  m.box(-3, 10, -5, -3, 10, -5, G.GR);
  m.box(2, 10, -5, 2, 10, -5, G.GR);
  return m;
}

function gundamHead() {
  const m = M();
  m.box(-2, 0, -2, 1, 4, 1, G.W); // helmet
  m.box(-3, 1, -2, -3, 3, 0, G.W); // ear blocks
  m.box(2, 1, -2, 2, 3, 0, G.W);
  m.box(-3, 2, -1, -3, 2, -1, G.Y); // vulcans
  m.box(2, 2, -1, 2, 2, -1, G.Y);
  m.box(-2, 5, -2, 1, 5, 0, G.W); // crest
  m.box(-1, 5, 1, 0, 5, 1, G.R);
  // face
  m.box(-2, 0, 2, 1, 3, 2, G.W);
  m.box(-1, 0, 2, 0, 0, 2, G.R); // chin
  m.box(-2, 1, 2, -2, 1, 2, G.V);
  m.box(1, 1, 2, 1, 1, 2, G.V);
  m.set(-2, 2, 2, 0xc8ff4a, EYE_G);
  m.set(1, 2, 2, 0xc8ff4a, EYE_G);
  m.box(-2, 3, 2, 1, 3, 2, G.W);
  m.box(-1, 4, 2, 0, 4, 2, G.R); // forehead camera
  // V-fin
  const V = [[0, 4, 3], [1, 5, 3], [2, 5, 3], [2, 6, 3], [3, 6, 3], [4, 7, 3]];
  for (const [x, y, z] of V) {
    m.set(x, y, z, G.Y);
    m.set(-1 - x, y, z, G.Y);
  }
  return m;
}

function gundamUpperArmR() {
  const m = M();
  m.box(-2, -1, -2, 1, 2, 1, G.W); // pauldron
  m.box(-2, 2, -2, 1, 2, 1, G.W2);
  m.box(-3, -1, -2, -3, 1, 1, G.W);
  m.box(-1, -5, -1, 0, -2, 0, G.GR);
  m.box(-1, -4, -1, 0, -3, 0, G.W);
  return m;
}
function gundamForeArmR() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, G.GR); // elbow
  m.box(-2, -5, -2, 1, -1, 1, G.W);
  m.box(-2, -1, -2, 1, -1, 1, G.W2);
  m.box(-2, -5, -2, 1, -5, 1, G.W2);
  m.box(-1, -7, -1, 0, -6, 0, G.GR); // fist
  return m;
}
function gundamThigh() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, G.GR);
  m.sbox(2, -7, -2, -1, 1, G.W);
  m.sbox(2, -4, -2, -4, 1, G.W2);
  return m;
}
function gundamShin() {
  const m = M();
  m.sbox(2, -1, -1, 0, 0, G.GR); // knee joint
  m.sbox(2, -5, -2, 0, 1, G.W);
  m.box(-1, -2, 2, 0, 0, 2, G.W); // knee cap
  m.box(-1, 0, 2, 0, 0, 2, G.W2);
  m.sbox(3, -6, -3, -4, 1, G.W); // flared calf
  m.clearBox(-3, -4, -3, -3, -4, 1);
  m.clearBox(2, -4, -3, 2, -4, 1);
  m.sbox(2, -6, -3, -6, -3, G.W2);
  m.sbox(2, -8, -3, -7, 3, G.R); // foot
  m.sbox(2, -8, 4, -8, 4, G.R);
  m.sbox(1, -8, -4, -7, -4, G.R);
  m.sbox(2, -7, -2, -7, 1, G.GR);
  return m;
}
function gundamShield() {
  const m = M();
  // Flat shield in YZ plane; face points +x (outward on the left arm).
  for (let y = -10; y <= 3; y++) {
    let hz = 4;
    if (y === 3) hz = 3;
    if (y < -5) hz = Math.max(1, 4 - Math.ceil((-5 - y) * 0.8));
    m.box(0, y, -hz, 0, y, hz - 1, G.W);
    m.box(1, y, -hz, 1, y, hz - 1, G.R);
    m.set(1, y, -hz, G.W);
    m.set(1, y, hz - 1, G.W);
  }
  m.box(1, 3, -3, 1, 3, 2, G.W);
  m.box(1, -3, -1, 1, 1, 0, G.Y); // star
  m.box(1, -1, -3, 1, -1, 2, G.Y);
  m.box(1, -2, -2, 1, 0, 1, G.Y);
  m.box(1, -1, -1, 1, -1, 0, G.W);
  return m;
}

export function gundamWeapons() {
  const hilt = M();
  hilt.box(-1, -1, -1, 0, 0, 1, G.W2);
  hilt.box(-1, -1, 2, 0, 0, 2, G.GR);
  const rifle = M();
  rifle.box(-1, -1, -3, 0, 1, 7, G.DK); // body
  rifle.box(-1, 2, -1, 0, 2, 4, G.GR); // sight rail
  rifle.box(-2, 2, 2, -2, 3, 3, G.GR); // scope
  rifle.set(-2, 3, 4, 0x8affff, { glow: 2, jitter: 0 });
  rifle.box(0, -1, 8, 0, 0, 13, G.GR); // barrel
  rifle.box(-1, -4, 1, 0, -2, 2, G.DK); // magazine / grip
  rifle.box(-1, -1, 13, 0, 0, 13, G.DK);
  rifle.box(-1, 1, 7, 0, 1, 9, 0xf3c11c);

  // Beam javelin: the extended shaft with a three-pronged beam head, gripped a third of the way up.
  const javelin = M();
  javelin.box(-1, -1, -18, 0, 0, 30, G.GR);
  javelin.box(-1, -1, -3, 0, 0, 2, G.DK); // grip
  javelin.box(-1, -1, -18, 0, 0, -17, G.W2);
  javelin.box(-2, -2, 28, 1, 1, 30, G.W2); // emitter collar
  const BEAM = { glow: 2.4, jitter: 0 };
  for (let z = 31; z <= 44; z++) {
    const w = z < 36 ? 1 : z < 41 ? 0 : -1; // spearhead tapers to a point
    if (w >= 0) javelin.box(-1 - w, -1 - w, z, w, w, z, 0xff8ad8, BEAM);
    else javelin.set(0, 0, z, 0xffc8f0, BEAM);
  }
  for (const s of [-1, 1]) for (let i = 0; i < 5; i++) javelin.set(s > 0 ? 1 + i : -2 - i, 0, 31 + i * 2, 0xff8ad8, BEAM); // side prongs

  // Hyper bazooka: a long dark tube shouldered over the right arm, flared muzzle, grip and sight.
  const bazooka = M();
  bazooka.box(-2, -1, -14, 1, 2, 12, 0x3a4458);
  bazooka.box(-3, -2, 10, 2, 3, 13, 0x2a3040); // muzzle flare
  bazooka.box(-1, 0, 13, 0, 1, 13, G.DK);
  bazooka.box(-2, -2, -15, 1, 3, -13, 0x2a3040); // breech
  bazooka.box(-1, -4, -1, 0, -2, 1, G.DK); // grip
  bazooka.box(2, 2, -3, 3, 3, 3, G.GR); // sight
  bazooka.set(3, 3, 3, 0x8affff, { glow: 2, jitter: 0 });
  bazooka.box(-2, 3, -6, 1, 3, -2, 0xf3c11c);

  // Gundam hammer: a spiked iron ball on a chain; the grip sits in the fist.
  const ball = M();
  ball.ellipsoid(0, 0, 0, 4.2, 4.2, 4.2, 0x3a3f4c);
  for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    for (let k = 4; k <= 6; k++) ball.set(Math.round(x * k) - (x < 0 ? 1 : 0), Math.round(y * k) - (y < 0 ? 1 : 0), Math.round(z * k) - (z < 0 ? 1 : 0), 0x6a707e);
  }
  const grip = M();
  grip.box(-1, -1, -3, 0, 0, 3, G.GR);
  grip.box(-1, -1, 4, 0, 0, 5, G.DK);
  const link = M();
  link.box(0, 0, 0, 0, 0, 1, G.DK);
  return { hilt, rifle, javelin, bazooka, ball, grip, link };
}

export function gundamDef() {
  const uR = gundamUpperArmR(), fR = gundamForeArmR();
  const uL = uR.clone().flipX(), fL = fR.clone().flipX();
  const thigh = gundamThigh(), shin = gundamShin();
  return {
    scale: 0.1,
    hipHeight: 16,
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: gundamHips() },
      torso: { parent: 'hips', pivot: [0, 2, 0], model: gundamTorso() },
      head: { parent: 'torso', pivot: [0, 9, 0], model: gundamHead() },
      uArmR: { parent: 'torso', pivot: [-6.5, 6, 0], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -5, 0], model: fR },
      hand: { parent: 'fArmR', pivot: [0, -6, 0], model: null },
      uArmL: { parent: 'torso', pivot: [6.5, 6, 0], model: uL },
      fArmL: { parent: 'uArmL', pivot: [0, -5, 0], model: fL },
      handL: { parent: 'fArmL', pivot: [2.5, -3, 0], model: gundamShield() },
      thighR: { parent: 'hips', pivot: [-2.2, -1, 0], model: thigh },
      shinR: { parent: 'thighR', pivot: [0, -7, 0], model: shin },
      thighL: { parent: 'hips', pivot: [2.2, -1, 0], model: thigh.clone() },
      shinL: { parent: 'thighL', pivot: [0, -7, 0], model: shin.clone() },
    },
  };
}

// ---------------- RX-77-2 Guncannon ----------------
// Red and bulky, teal joints, a cream helmet with a green visor, and twin 240mm cannons on the backpack (their own
// node, so they can swing down over the shoulders to fire).
const GC = {
  R: 0xc8342a, R2: 0x9c2821, T: 0x3f8f8c, T2: 0x2e6b69, K: 0x565c69, K2: 0x3a3f49, K3: 0x24272d,
  C: 0xe2ddcf, C2: 0xb9b4a6,
};

function gcHips() {
  const m = M();
  m.sbox(4, -2, -2, 1, 1, GC.R);
  m.sbox(4, 1, -2, 1, 2, GC.T2); // belt
  m.box(-1, -3, -1, 0, 0, 2, GC.K2); // crotch
  m.box(-5, -4, 2, -2, 0, 3, GC.R); // front skirts
  m.box(1, -4, 2, 4, 0, 3, GC.R);
  m.box(-5, -4, 3, -2, -4, 3, GC.R2);
  m.box(1, -4, 3, 4, -4, 3, GC.R2);
  m.box(-6, -3, -2, -6, 0, 1, GC.R); // side skirts
  m.box(5, -3, -2, 5, 0, 1, GC.R);
  m.box(-4, -3, -3, 3, 0, -3, GC.R2); // rear
  return m;
}

function gcTorso() {
  const m = M();
  m.sbox(4, 0, -2, 1, 2, GC.T2); // abdomen
  m.sbox(6, 2, -3, 7, 3, GC.R); // chest
  m.clearBox(-6, 7, -3, -6, 7, 3);
  m.clearBox(5, 7, -3, 5, 7, 3);
  m.sbox(5, 3, 4, 6, 4, GC.R2); // chest plate
  m.box(-2, 3, 4, 1, 5, 4, GC.K2); // hatch
  m.box(-2, 6, 4, 1, 6, 4, GC.C2);
  for (const x0 of [-5, 3]) m.box(x0, 4, 4, x0 + 1, 6, 4, GC.K3); // intakes
  m.sbox(3, 8, -2, 8, 2, GC.R2); // collar
  // backpack
  m.sbox(4, 1, -7, 8, -4, GC.K2);
  m.sbox(3, 2, -8, 6, -8, GC.K);
  m.box(-3, 1, -8, -2, 1, -7, GC.K3); // nozzles
  m.box(1, 1, -8, 2, 1, -7, GC.K3);
  return m;
}

// Twin 240mm cannons, barrels pointing up from the backpack (pivot at the mount).
function gcCannons() {
  const m = M();
  for (const x0 of [-5, 3]) {
    m.box(x0, 0, -2, x0 + 1, 3, 1, GC.K2); // breech
    m.box(x0, 4, -1, x0 + 1, 13, 0, GC.K); // barrel
    m.box(x0, 8, -1, x0 + 1, 8, 0, GC.K2);
    m.box(x0, 13, -1, x0 + 1, 13, 0, GC.K3); // muzzle
  }
  m.box(-3, 1, -1, 2, 2, 0, GC.K3); // cross mount
  return m;
}

function gcHead() {
  const m = M();
  m.box(-2, 0, -2, 1, 4, 1, GC.C); // helmet
  m.box(-2, 5, -1, 1, 5, 0, GC.C2); // crown
  m.box(-3, 1, -2, -3, 3, 0, GC.C); // ear blocks
  m.box(2, 1, -2, 2, 3, 0, GC.C);
  m.set(-3, 2, 1, GC.T);
  m.set(2, 2, 1, GC.T);
  m.box(-2, 0, 2, 1, 1, 2, GC.K2); // mouth grille
  m.box(-2, 2, 2, 1, 2, 2, 0x7affbe, { glow: 1.8, jitter: 0 }); // visor
  m.box(-2, 3, 2, 1, 4, 2, GC.C);
  m.box(-1, 5, -2, 0, 6, -2, GC.C2); // rear sensor
  return m;
}

function gcUpperArmR() {
  const m = M();
  m.box(-3, -1, -3, 1, 2, 2, GC.R); // boxy shoulder block
  m.box(-3, 2, -3, 1, 2, 2, GC.R2);
  m.box(-4, -1, -2, -4, 1, 1, GC.T); // side joint
  m.box(-1, -5, -1, 0, -2, 0, GC.T2);
  m.box(-2, -4, -2, 1, -2, 1, GC.R);
  return m;
}
function gcForeArmR() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, GC.T); // elbow
  m.box(-2, -5, -2, 1, -1, 1, GC.R);
  m.box(-2, -5, -2, 1, -5, 1, GC.R2);
  m.box(-2, -8, -2, 1, -6, 1, GC.K2); // fist
  m.box(-2, -6, 2, 1, -6, 2, GC.K); // knuckles
  return m;
}
function gcThigh() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, GC.T2);
  m.sbox(2, -7, -2, -1, 2, GC.R);
  m.sbox(2, -3, -2, -3, 2, GC.R2);
  return m;
}
function gcShin() {
  const m = M();
  m.sbox(2, -2, -2, 0, 1, GC.T); // knee joint
  m.box(-2, -2, 2, 1, 0, 2, GC.T);
  m.sbox(3, -6, -3, -3, 2, GC.R); // heavy calf
  m.sbox(3, -6, -3, -6, -3, GC.R2);
  m.sbox(3, -8, -3, -7, 3, GC.R); // foot
  m.sbox(3, -8, 4, -8, 4, GC.R2);
  m.sbox(3, -8, -4, -7, -4, GC.K2);
  m.sbox(3, -8, -3, -8, 3, GC.K2); // sole
  return m;
}

export function guncannonWeapons() {
  const rifle = M();
  rifle.box(-1, -1, -3, 0, 1, 7, 0x363b46); // body
  rifle.box(-1, 2, -1, 0, 2, 4, 0x4a505c);
  rifle.box(0, -1, 8, 0, 0, 14, 0x4a505c); // barrel
  rifle.box(-1, -1, 14, 0, 0, 14, 0x24272d);
  rifle.box(-1, -4, 1, 0, -2, 2, 0x24272d); // grip
  rifle.box(-2, 2, 1, -2, 3, 2, 0x4a505c); // sensor
  rifle.set(-2, 3, 3, 0xffa040, { glow: 2, jitter: 0 });
  return { rifle };
}

export function guncannonDef() {
  const uR = gcUpperArmR(), fR = gcForeArmR();
  const thigh = gcThigh(), shin = gcShin();
  return {
    scale: 0.1,
    hipHeight: 16,
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: gcHips() },
      torso: { parent: 'hips', pivot: [0, 2, 0], model: gcTorso() },
      cannons: { parent: 'torso', pivot: [0, 8, -5], model: gcCannons() },
      head: { parent: 'torso', pivot: [0, 9, 0.5], model: gcHead() },
      uArmR: { parent: 'torso', pivot: [-7.5, 6, 0], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -5, 0], model: fR },
      hand: { parent: 'fArmR', pivot: [0, -7, 0], model: null },
      uArmL: { parent: 'torso', pivot: [7.5, 6, 0], model: uR.clone().flipX() },
      fArmL: { parent: 'uArmL', pivot: [0, -5, 0], model: fR.clone().flipX() },
      handL: { parent: 'fArmL', pivot: [0, -7, 0], model: null },
      thighR: { parent: 'hips', pivot: [-2.4, -1, 0], model: thigh },
      shinR: { parent: 'thighR', pivot: [0, -7, 0], model: shin },
      thighL: { parent: 'hips', pivot: [2.4, -1, 0], model: thigh.clone() },
      shinL: { parent: 'thighL', pivot: [0, -7, 0], model: shin.clone() },
    },
  };
}

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
