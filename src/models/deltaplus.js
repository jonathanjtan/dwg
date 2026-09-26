// MSN-001A1 Delta Plus: Riddhe Marcenas's transformable Zeta-lineage suit (Gundam Unicorn / Reborn's "ALL MOVES"
// footage). White-grey armor over indigo joints with gold accents; a beam saber, beam rifle and a shield with a
// built-in grenade launcher. About 1.15x the RX-78's height (a taller, slimmer U.C. 0096 successor design) - a bit
// more leg and a narrower waist than the Gundam, with a V-fin closer to Zeta's than Amuro's block helmet.
import { pal } from './suits.js';
import { VoxelModel } from '../core/voxel.js';

const M = () => new VoxelModel(pal);
const D = {
  W: 0xe8ebf2, W2: 0xc4c9d6, B: 0x364683, B2: 0x232c52, Y: 0xf0c63c, Y2: 0xb88a0e,
  R: 0xa8283a, GR: 0x767c8a, DK: 0x2a2e38, V: 0x3a3f52,
};
const EYE = { glow: 1.9, jitter: 0 };

function dpHips() {
  const m = M();
  m.sbox(4, -2, -2, 1, 1, D.W);
  m.box(-1, -3, -1, 0, 0, 2, D.B); // crotch block
  m.box(-1, -1, 2, 0, -1, 2, D.Y);
  m.box(-4, -4, 2, -2, 0, 2, D.W); // front skirts (longer than the Gundam's)
  m.box(1, -4, 2, 3, 0, 2, D.W);
  m.box(-4, -4, 2, -2, -4, 2, D.W2);
  m.box(1, -4, 2, 3, -4, 2, D.W2);
  m.box(-3, 0, 2, -3, 0, 2, D.Y);
  m.box(2, 0, 2, 2, 0, 2, D.Y);
  m.box(-5, -3, -1, -5, 0, 0, D.W); // side skirts
  m.box(4, -3, -1, 4, 0, 0, D.W);
  m.box(-3, -3, -3, 2, 0, -3, D.W); // rear skirt
  m.sbox(4, 1, -2, 1, 1, D.GR); // belt line
  return m;
}

function dpTorso() {
  const m = M();
  m.sbox(3, 0, -2, 1, 1, D.B); // abdomen
  m.box(-3, 0, 2, 2, 1, 2, D.B);
  m.sbox(5, 2, -3, 8, 2, D.W); // chest, a touch taller than the Gundam's
  m.clearBox(-5, 8, -3, -5, 8, 2);
  m.clearBox(4, 8, -3, 4, 8, 2);
  m.sbox(5, 2, 3, 2, 3, D.W2);
  // twin red intake vents (Zeta-lineage) either side of the cockpit hatch
  for (const x0 of [-4, 1]) {
    m.box(x0, 4, 3, x0 + 2, 6, 3, D.R);
    m.box(x0, 5, 3, x0 + 2, 5, 3, 0x7a1420);
  }
  m.box(-1, 3, 3, 0, 6, 3, D.B); // cockpit hatch
  m.box(-1, 3, 3, 0, 3, 3, D.W2);
  m.box(-1, 6, 3, 0, 6, 3, D.Y); // hatch camera light
  m.sbox(3, 9, -2, 9, 1, D.W); // collar
  m.sbox(2, 9, 2, 9, 2, D.W2);
  // backpack + beam saber hilt mount + thrusters
  m.sbox(3, 2, -5, 8, -4, D.W);
  m.sbox(3, 8, -5, 8, -5, D.W2);
  m.box(-3, 1, -5, -2, 1, -4, D.DK);
  m.box(1, 1, -5, 2, 1, -4, D.DK);
  m.box(-3, 9, -6, -3, 11, -6, D.W);
  m.box(2, 9, -6, 2, 11, -6, D.W);
  m.box(-3, 11, -6, -3, 11, -6, D.GR);
  m.box(2, 11, -6, 2, 11, -6, D.GR);
  // wing binders: flat swept panels off the shoulders, folded back like the waverider's forward fins
  for (const s of [-1, 1]) {
    m.box(s * 6, 4, -4, s * 12, 5, 1, D.W);
    m.box(s * 6, 4, -4, s * 12, 4, 1, D.W2);
    m.box(s * 11, 4, -3, s * 12, 5, 0, D.B2);
    m.box(s * 9, 3, -4, s * 10, 3, -2, D.Y); // binder stripe
  }
  return m;
}

function dpHead() {
  const m = M();
  m.box(-2, 0, -2, 1, 4, 1, D.W); // helmet
  m.box(-3, 1, -2, -3, 3, 0, D.W); // ear blocks
  m.box(2, 1, -2, 2, 3, 0, D.W);
  m.box(-3, 2, -1, -3, 2, -1, D.Y); // vulcans
  m.box(2, 2, -1, 2, 2, -1, D.Y);
  m.box(-1, 5, 0, 0, 5, 1, D.W2); // low crown (no block crest, unlike the Gundam)
  // face
  m.box(-2, 0, 2, 1, 3, 2, D.W);
  m.box(-1, 0, 2, 0, 0, 2, D.B); // chin
  m.box(-2, 1, 2, -2, 1, 2, D.V);
  m.box(1, 1, 2, 1, 1, 2, D.V);
  m.set(-2, 2, 2, 0x9fe8ff, EYE);
  m.set(1, 2, 2, 0x9fe8ff, EYE);
  m.box(-2, 3, 2, 1, 3, 2, D.W);
  m.box(-1, 4, 2, 0, 4, 2, D.B); // forehead camera
  // tall Zeta-style V-fin
  const V = [[0, 4, 3], [1, 5, 3], [2, 6, 3], [3, 7, 3], [4, 8, 4], [5, 9, 4]];
  for (const [x, y, z] of V) {
    m.set(x, y, z, D.Y);
    m.set(-1 - x, y, z, D.Y);
  }
  return m;
}

function dpUpperArmR() {
  const m = M();
  m.box(-2, -1, -2, 1, 2, 1, D.W); // pauldron
  m.box(-2, 2, -2, 1, 2, 1, D.W2);
  m.box(-3, -1, -2, -3, 1, 1, D.B);
  m.box(-1, -5, -1, 0, -2, 0, D.GR);
  m.box(-1, -4, -1, 0, -3, 0, D.W);
  return m;
}
function dpForeArmR() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, D.GR); // elbow
  m.box(-2, -5, -2, 1, -1, 1, D.W);
  m.box(-2, -1, -2, 1, -1, 1, D.W2);
  m.box(-2, -5, -2, 1, -5, 1, D.W2);
  m.box(-1, -7, -1, 0, -6, 0, D.GR); // fist
  m.box(-2, -3, -2, -2, -2, -1, D.Y); // saber mount stripe
  return m;
}
function dpThigh() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, D.GR);
  m.sbox(2, -8, -2, -1, 1, D.W); // longer leg than the Gundam's
  m.sbox(2, -5, -2, -4, 1, D.W2);
  return m;
}
function dpShin() {
  const m = M();
  m.sbox(2, -1, -1, 0, 0, D.GR); // knee joint
  m.sbox(2, -6, -2, 0, 1, D.W);
  m.box(-1, -2, 2, 0, 0, 2, D.W); // knee cap
  m.box(-1, 0, 2, 0, 0, 2, D.Y);
  m.sbox(3, -7, -3, -4, 1, D.W); // flared calf, heavy thrusters
  m.clearBox(-3, -5, -3, -3, -5, 1);
  m.clearBox(2, -5, -3, 2, -5, 1);
  m.sbox(2, -7, -3, -6, -4, D.B2); // thruster bell
  m.sbox(2, -9, -3, -8, 3, D.W); // foot
  m.sbox(2, -9, 4, -9, 4, D.W2);
  m.sbox(1, -9, -4, -8, -4, D.W2);
  m.sbox(2, -8, -2, -8, 1, D.GR);
  return m;
}
function dpShield() {
  const m = M();
  // Flat shield in YZ plane, face +x (outward on the left arm), plus a grenade-launcher barrel along the bottom edge.
  for (let y = -9; y <= 4; y++) {
    let hz = 4;
    if (y >= 3) hz = 3;
    if (y < -4) hz = Math.max(1, 4 - Math.ceil((-4 - y) * 0.85));
    m.box(0, y, -hz, 0, y, hz - 1, D.W);
    m.box(1, y, -hz, 1, y, hz - 1, D.B);
    m.set(1, y, -hz, D.W);
    m.set(1, y, hz - 1, D.W);
  }
  m.box(1, 4, -3, 1, 4, 2, D.W);
  m.box(1, -2, -1, 1, 2, 0, D.Y); // diamond badge
  m.box(1, 0, -2, 1, 0, 1, D.Y);
  m.box(1, -1, -1, 1, 1, 0, D.W);
  // grenade launcher: a stubby tube along the lower-outer edge, muzzle pointing +z
  m.box(2, -8, -1, 3, -7, 3, D.DK);
  m.box(2, -8, 3, 3, -7, 4, 0x14161a);
  return m;
}

export function deltaplusWeapons() {
  const hilt = M();
  hilt.box(-1, -1, -1, 0, 0, 1, D.W2);
  hilt.box(-1, -1, 2, 0, 0, 2, D.GR);
  const rifle = M();
  rifle.box(-1, -1, -3, 0, 1, 7, D.DK); // body
  rifle.box(-1, 2, -1, 0, 2, 4, D.GR); // sight rail
  rifle.box(-2, 2, 2, -2, 3, 3, D.GR); // scope
  rifle.set(-2, 3, 4, 0x8affff, { glow: 2, jitter: 0 });
  rifle.box(0, -1, 8, 0, 0, 14, D.GR); // longer barrel than the Gundam's
  rifle.box(-1, -4, 1, 0, -2, 2, D.DK); // magazine / grip
  rifle.box(-1, -1, 14, 0, 0, 14, D.DK);
  rifle.box(-1, 1, 7, 0, 1, 9, D.Y);
  return { hilt, rifle };
}

export function deltaplusDef() {
  const uR = dpUpperArmR(), fR = dpForeArmR();
  const uL = uR.clone().flipX(), fL = fR.clone().flipX();
  const thigh = dpThigh(), shin = dpShin();
  return {
    scale: 0.1,
    hipHeight: 18, // ~1.15x the Gundam's 16: a visibly taller frame
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: dpHips() },
      torso: { parent: 'hips', pivot: [0, 2, 0], model: dpTorso() },
      head: { parent: 'torso', pivot: [0, 10, 0], model: dpHead() },
      uArmR: { parent: 'torso', pivot: [-6.5, 6, 0], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -5, 0], model: fR },
      hand: { parent: 'fArmR', pivot: [0, -6, 0], model: null },
      uArmL: { parent: 'torso', pivot: [6.5, 6, 0], model: uL },
      fArmL: { parent: 'uArmL', pivot: [0, -5, 0], model: fL },
      handL: { parent: 'fArmL', pivot: [2.5, -3, 0], model: dpShield() },
      thighR: { parent: 'hips', pivot: [-2.2, -1, 0], model: thigh },
      shinR: { parent: 'thighR', pivot: [0, -8, 0], model: shin },
      thighL: { parent: 'hips', pivot: [2.2, -1, 0], model: thigh.clone() },
      shinL: { parent: 'thighL', pivot: [0, -8, 0], model: shin.clone() },
    },
  };
}
