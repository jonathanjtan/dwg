// Gundam F91: Seabook Arno's compact Formula-project Gundam (U.C. 0123). White with blue/red/yellow trim, a big
// tri-blade V-fin, and twin VSBR (variable-speed beam rifles) racked on the back that swing down over the shoulders
// to fire, same mechanic as the Guncannon's cannons. Characters face +Z; their right side is -X.
import { pal } from './suits.js';
import { VoxelModel } from '../core/voxel.js';

const M = () => new VoxelModel(pal);

const F = {
  W: 0xf2f4f7, W2: 0xd3d8e0, B: 0x3f6fc4, B2: 0x1f3f78, R: 0xd8342a, Y: 0xf0c419,
  GR: 0x6a707e, DK: 0x262a33,
};
const EYE_G = { glow: 1.7, jitter: 0 };
export const VSBR_BEAM = 0xfff2a0; // gold beam colour: the rifle, the VSBR, the beam launcher
export const SHIELD_GLOW = 0x9fd8ff; // beam shield: pale blue disc off the left forearm

function f91Hips() {
  const m = M();
  m.sbox(3, -2, -2, 1, 1, F.W); // pelvis core
  m.box(-1, -3, -1, 0, 0, 2, F.B2); // crotch block
  m.box(-3, -3, 2, -1, 0, 2, F.W); // front skirt L
  m.box(1, -3, 2, 3, 0, 2, F.W); // front skirt R
  m.box(-3, -3, 2, -1, -3, 2, F.B); // skirt underside
  m.box(1, -3, 2, 3, -3, 2, F.B);
  m.box(-2, 0, 2, -2, 0, 2, F.Y); // skirt tabs
  m.box(1, 0, 2, 1, 0, 2, F.Y);
  m.box(-4, -3, -1, -4, 0, 0, F.W); // side skirt L
  m.box(3, -3, -1, 3, 0, 0, F.W); // side skirt R
  m.box(-3, -3, -3, 2, 0, -3, F.W); // rear skirt
  m.sbox(3, 1, -2, 1, 1, F.B); // belt line
  return m;
}

function f91Torso() {
  const m = M();
  m.sbox(3, 0, -2, 1, 1, F.B2); // abdomen
  m.box(-4, 0, 2, 3, 1, 3, F.B2); // abdomen front fill (closes the gap up to the chest)
  m.sbox(4, 2, -3, 7, 2, F.W); // chest block
  m.clearBox(-4, 7, -3, -4, 7, 2);
  m.clearBox(3, 7, -3, 3, 7, 2);
  m.sbox(4, 2, 3, 7, 3, F.W); // chest cap (full front face)
  m.box(-1, 3, 3, 0, 7, 3, F.R); // centre vent stripe
  m.box(-1, 3, 3, 0, 3, 3, F.W2); // hatch line
  m.box(-3, 4, 3, -2, 5, 3, F.B); // side vents
  m.box(2, 4, 3, 3, 5, 3, F.B);
  m.sbox(3, 8, -2, 8, 1, F.W); // collar
  m.sbox(2, 8, 2, 8, 2, F.W2);
  m.sbox(3, 2, -5, 7, -4, F.GR); // backpack mount plate
  m.sbox(3, 7, -5, 7, -5, F.W2);
  return m;
}

// The VSBR rack: two long barrels resting up along the spine, swung forward over the shoulders to fire
// (same rotation.x mechanic as the Guncannon's cannons node).
function f91Vsbr() {
  const m = M();
  for (const x0 of [-3, 2]) {
    m.box(x0, -1, -2, x0 + 1, 0, 0, F.W2); // mount block
    m.box(x0, 0, -2, x0 + 1, 9, -1, F.GR); // barrel
    m.box(x0, 9, -2, x0 + 1, 9, -1, F.DK);
    m.box(x0, 10, -1, x0 + 1, 10, 0, F.DK); // muzzle
    m.set(x0, 10, 0, VSBR_BEAM, { glow: 1.8, jitter: 0 });
    m.set(x0 + 1, 10, 0, VSBR_BEAM, { glow: 1.8, jitter: 0 });
  }
  m.box(-2, -1, -2, 1, 0, -1, F.DK); // cross mount
  return m;
}

function f91Head() {
  const m = M();
  m.box(-2, 0, -2, 1, 4, 1, F.W); // helmet
  m.box(-3, 1, -2, -3, 3, 0, F.W); // ear block
  m.box(2, 1, -2, 2, 3, 0, F.W);
  m.box(-3, 2, -1, -3, 2, -1, F.Y); // vulcans
  m.box(2, 2, -1, 2, 2, -1, F.Y);
  m.box(-2, 0, 2, 1, 3, 2, F.W); // face
  m.box(-1, 0, 2, 0, 0, 2, F.DK); // chin vent
  m.box(-2, 1, 2, -2, 1, 2, F.DK);
  m.box(1, 1, 2, 1, 1, 2, F.DK);
  m.set(-2, 2, 2, 0x7affea, EYE_G);
  m.set(1, 2, 2, 0x7affea, EYE_G);
  m.box(-2, 3, 2, 1, 3, 2, F.W);
  m.box(-1, 4, 2, 0, 4, 2, F.R); // forehead sensor
  // tri-blade V-fin: opens outward like the Gundam's, a touch taller and slimmer
  const V = [[0, 4, 2], [1, 4, 2], [2, 5, 1], [2, 6, 1], [3, 7, 0], [4, 8, -1]];
  for (const [x, y, z] of V) { m.set(x, y, z, F.W); m.set(-1 - x, y, z, F.W); }
  m.set(4, 8, -1, F.Y); m.set(-5, 8, -1, F.Y); // tip accents
  return m;
}

function f91UpperArmR() {
  const m = M();
  m.box(-2, -1, -2, 1, 2, 1, F.W); // pauldron
  m.box(-2, 2, -2, 1, 2, 1, F.B); // pauldron cap
  m.box(-3, -1, -2, -3, 1, 1, F.W); // side joint
  m.box(-1, -5, -1, 0, -2, 0, F.GR);
  m.box(-1, -4, -1, 0, -3, 0, F.W);
  return m;
}
function f91ForeArmR() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, F.GR); // elbow
  m.box(-2, -5, -2, 1, -1, 1, F.W);
  m.box(-2, -1, -2, 1, -1, 1, F.W2);
  m.box(-2, -5, -2, 1, -5, 1, F.W2);
  m.box(-1, -7, -1, 0, -6, 0, F.GR); // fist
  m.box(-1, -6, 2, 0, -6, 2, F.R); // knuckle accent
  return m;
}
function f91Thigh() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, F.GR);
  m.sbox(2, -6, -2, -1, 1, F.W);
  m.sbox(2, -3, -2, -3, 1, F.B);
  return m;
}
function f91Shin() {
  const m = M();
  m.sbox(2, -1, -1, 0, 0, F.GR); // knee joint
  m.sbox(2, -4, -2, 0, 1, F.W);
  m.box(-1, -2, 2, 0, 0, 2, F.W); // knee cap
  m.box(-1, 0, 2, 0, 0, 2, F.W2);
  m.sbox(2, -5, -3, -3, 1, F.W); // calf flare
  m.sbox(2, -7, -3, -6, 3, F.R); // foot
  m.sbox(2, -7, 4, -7, 4, F.R);
  m.sbox(1, -7, -4, -6, -4, F.R);
  m.sbox(2, -6, -2, -6, 1, F.GR);
  return m;
}

// Beam shield: a flat glowing disc projected off the left forearm.
function f91Shield() {
  const m = M();
  for (let y = -4; y <= 4; y++) {
    for (let z = -4; z <= 4; z++) {
      const d2 = y * y + z * z;
      if (d2 > 16) continue;
      m.set(0, y, z, SHIELD_GLOW, { glow: d2 > 12 ? 2.2 : 1.4, jitter: 0 });
    }
  }
  return m;
}

export function f91Weapons() {
  const hilt = M();
  hilt.box(-1, -1, -1, 0, 0, 1, F.GR);
  hilt.box(-1, -1, 2, 0, 0, 2, F.DK);

  // Beam rifle: slimmer than the Gundam's, a small scope and a gold beam cell.
  const rifle = M();
  rifle.box(-1, -1, -2, 0, 1, 5, F.DK);
  rifle.box(-1, 2, -1, 0, 2, 3, F.GR);
  rifle.box(-2, 2, 1, -2, 3, 2, F.GR);
  rifle.set(-2, 3, 2, VSBR_BEAM, { glow: 2, jitter: 0 });
  rifle.box(0, -1, 6, 0, 0, 10, F.GR);
  rifle.box(-1, -3, 0, 0, -2, 1, F.DK);
  rifle.box(-1, -1, 10, 0, 0, 10, F.DK);
  rifle.box(-1, 1, 5, 0, 1, 7, F.Y);

  // Beam launcher: a chunkier cannon with a glowing emitter instead of a physical muzzle flare.
  const launcher = M();
  launcher.box(-2, -1, -11, 1, 2, 9, 0x3a4458);
  launcher.box(-2, -2, -13, 1, 3, -11, 0x2a3040); // breech
  launcher.box(-1, -4, -1, 0, -2, 1, F.DK); // grip
  launcher.box(2, 2, -4, 3, 3, 2, F.GR); // sight
  launcher.set(3, 3, 2, VSBR_BEAM, { glow: 2, jitter: 0 });
  launcher.box(-2, -2, 9, 1, 3, 11, VSBR_BEAM, { glow: 1.6, jitter: 0 }); // emitter collar
  launcher.set(0, 0, 12, 0xffffff, { glow: 2.6, jitter: 0 });

  return { hilt, rifle, launcher };
}

export function f91Def() {
  const uR = f91UpperArmR(), fR = f91ForeArmR();
  const thigh = f91Thigh(), shin = f91Shin();
  return {
    scale: 0.1,
    hipHeight: 14,
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: f91Hips() },
      torso: { parent: 'hips', pivot: [0, 2, 0], model: f91Torso() },
      vsbr: { parent: 'torso', pivot: [0, 7, -5], model: f91Vsbr() },
      head: { parent: 'torso', pivot: [0, 9, 0], model: f91Head() },
      uArmR: { parent: 'torso', pivot: [-6, 6, 0], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -5, 0], model: fR },
      hand: { parent: 'fArmR', pivot: [0, -6, 0], model: null },
      uArmL: { parent: 'torso', pivot: [6, 6, 0], model: uR.clone().flipX() },
      fArmL: { parent: 'uArmL', pivot: [0, -5, 0], model: fR.clone().flipX() },
      handL: { parent: 'fArmL', pivot: [3, -3, 0], model: f91Shield() },
      thighR: { parent: 'hips', pivot: [-2, -1, 0], model: thigh },
      shinR: { parent: 'thighR', pivot: [0, -6, 0], model: shin },
      thighL: { parent: 'hips', pivot: [2, -1, 0], model: thigh.clone() },
      shinL: { parent: 'thighL', pivot: [0, -6, 0], model: shin.clone() },
    },
  };
}
