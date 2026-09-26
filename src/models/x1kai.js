// XM-X1 Crossbone Gundam X1 Kai: the Crossbone Vanguard's space-pirate Gundam. Navy and white with a skull crest on
// the chest, a big X-shaped vernier thruster binder on the back (its own node, so it can spin up for the screw whip's
// vortex and flare when boosting), and the ABC mantle's tattered cloak hanging off the waist. Runs ~0.88x the Gundam
// (16m vs 18m): scale 0.088 against the Gundam's 0.1, same voxel proportions.
import { VoxelModel } from '../core/voxel.js';
import { pal } from './suits.js';

const M = () => new VoxelModel(pal);
const X = {
  W: 0xe6eaf2, W2: 0xc4c9d6, N: 0x1c3f78, N2: 0x122c58, R: 0xc41f2c, R2: 0x8e1620,
  Y: 0xf0c020, K: 0x1a1a20, K2: 0x0e0e12, GR: 0x565c6a, DK: 0x2a2e38,
};
const EYE = { glow: 1.8, jitter: 0 };
// Small pixel skull, cranium-eyesockets-cheek-jaw, painted over a black backdrop plate.
const SKULL = [
  [-2, 6, 1], [-1, 6, 1], [0, 6, 1], [1, 6, 1],
  [-2, 5, 1], [-1, 5, 0], [0, 5, 0], [1, 5, 1],
  [-2, 4, 1], [-1, 4, 1], [0, 4, 1], [1, 4, 1],
  [-2, 3, 0], [-1, 3, 1], [0, 3, 1], [1, 3, 0],
];

function x1Hips() {
  const m = M();
  m.sbox(4, -2, -2, 1, 1, X.W);
  m.box(-1, -3, -1, 0, 0, 2, X.N2); // crotch
  m.box(-1, -1, 2, 0, -1, 2, X.Y);
  m.box(-4, -4, 2, -2, 0, 2, X.N); // front skirts, longer and pointed
  m.box(1, -4, 2, 3, 0, 2, X.N);
  m.box(-4, -5, 2, -3, -4, 2, X.N2);
  m.box(2, -5, 2, 3, -4, 2, X.N2);
  m.box(-3, 0, 2, -3, 0, 2, X.R);
  m.box(2, 0, 2, 2, 0, 2, X.R);
  m.box(-5, -3, -1, -5, 0, 0, X.N); // side skirts
  m.box(4, -3, -1, 4, 0, 0, X.N);
  m.box(-3, -3, -3, 2, 0, -3, X.N); // rear skirt
  m.sbox(4, 1, -2, 1, 1, X.GR); // belt
  return m;
}

function x1Torso() {
  const m = M();
  m.sbox(3, 0, -2, 1, 1, X.W); // abdomen
  m.box(-3, 0, 2, 2, 1, 2, X.W);
  m.sbox(5, 2, -3, 7, 2, X.N); // chest
  m.clearBox(-5, 7, -3, -5, 7, 2);
  m.clearBox(4, 7, -3, 4, 7, 2);
  m.sbox(5, 2, 3, 2, 3, X.N2);
  m.box(-2, 3, 3, 1, 6, 3, X.K); // skull backdrop plate
  for (const [x, y, w] of SKULL) m.set(x, y, 3, w ? X.W : X.K);
  for (const x0 of [-5, 2]) { // yellow vents either side of the skull
    m.box(x0, 4, 3, x0 + 2, 6, 3, X.Y);
    m.box(x0, 5, 3, x0 + 2, 5, 3, 0xb88a0e);
  }
  m.sbox(3, 8, -2, 8, 1, X.W); // collar
  m.sbox(2, 8, 2, 8, 2, X.W2);
  m.sbox(3, 2, -5, 7, -4, X.N2); // backpack base
  m.box(-3, 1, -5, -2, 1, -4, X.DK); // saber racks
  m.box(1, 1, -5, 2, 1, -4, X.DK);
  return m;
}

function x1Head() {
  const m = M();
  m.box(-2, 0, -2, 1, 4, 1, X.W); // helmet
  m.box(-3, 1, -2, -3, 3, 0, X.N); // ear blocks, navy
  m.box(2, 1, -2, 2, 3, 0, X.N);
  m.box(-2, 5, -2, 1, 5, 0, X.W); // crown ridge
  m.box(-1, 6, -1, 0, 6, 1, X.R); // small horn
  m.set(-1, 7, 0, X.R);
  m.box(-2, 0, 2, 1, 2, 2, X.K); // skull-guard grille (mouth)
  m.box(-2, 3, 2, 1, 3, 2, X.W); // brow
  m.set(-2, 2, 2, 0xff3a3a, EYE); // eyes
  m.set(1, 2, 2, 0xff3a3a, EYE);
  m.box(-1, 0, 2, 0, 0, 2, X.K2); // chin vent
  m.box(-1, 7, -1, 0, 7, 0, X.Y); // forehead antenna
  return m;
}

function x1UpperArmR() {
  const m = M();
  m.box(-2, -1, -2, 1, 2, 1, X.N); // pauldron
  m.box(-2, 2, -2, 1, 2, 1, X.N2);
  m.box(-3, -1, -2, -3, 2, 1, X.N); // side flare
  m.box(-3, 2, -2, -3, 2, -2, X.R); // spike tip
  m.box(-1, -5, -1, 0, -2, 0, X.GR);
  m.box(-1, -4, -1, 0, -3, 0, X.W);
  return m;
}
function x1ForeArmR() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, X.GR); // elbow
  m.box(-2, -5, -2, 1, -1, 1, X.W);
  m.box(-2, -1, -2, 1, -1, 1, X.W2);
  m.box(-2, -5, -2, 1, -5, 1, X.R); // wrist trim
  m.box(-1, -7, -1, 0, -6, 0, X.GR); // fist
  return m;
}
function x1Thigh() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, X.GR);
  m.sbox(2, -7, -2, -1, 1, X.W);
  m.sbox(2, -4, -2, -4, 1, X.N2);
  return m;
}
function x1Shin() {
  const m = M();
  m.sbox(2, -1, -1, 0, 0, X.GR); // knee joint
  m.sbox(2, -5, -2, 0, 1, X.W);
  m.box(-1, -2, 2, 0, 0, 2, X.N); // knee cap, navy
  m.sbox(3, -6, -3, -4, 1, X.W); // calf
  m.sbox(2, -6, -3, -6, -3, X.N2);
  m.sbox(2, -8, -3, -7, 3, X.R); // foot
  m.sbox(2, -8, 4, -8, 4, X.R);
  m.sbox(1, -8, -4, -7, -4, X.R);
  // heat dagger, stowed flush along the shin front, a hot orange edge
  m.box(-1, -4, 3, 0, -1, 3, X.GR);
  m.set(-1, -4, 3, 0xff8a30, { glow: 1.6, jitter: 0 });
  m.set(0, -4, 3, 0xff8a30, { glow: 1.6, jitter: 0 });
  return m;
}

// The X-shaped vernier thruster binder on the backpack: four nacelle arms crossing at a central hub. Its own node
// (see x1kaiDef) so it can be spun up for the screw whip's vortex and picked up by the boost flame at its tips.
function x1Thrusters() {
  const m = M();
  m.ellipsoid(0, 0, 0, 2, 2, 2, X.N2); // hub
  for (const [dx, dy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    for (let r = 1; r <= 6; r++) {
      const c = r > 4 ? X.K : X.GR;
      m.box(dx * r - (dx > 0 ? 0 : 1), dy * r - (dy > 0 ? 0 : 1), -1, dx * r - (dx > 0 ? 0 : 1), dy * r - (dy > 0 ? 0 : 1), 1, c);
    }
    m.set(dx * 7 - (dx > 0 ? 0 : 1), dy * 7 - (dy > 0 ? 0 : 1), 0, 0xff8a40, { glow: 2, jitter: 0.1 });
  }
  return m;
}

// ABC Mantle: a tattered cloak hanging off the waist, jagged uneven hem.
function x1Mantle() {
  const m = M();
  const HEM = [6, 4, 7, 3, 6, 5, 7, 4, 6];
  for (let x = -4; x <= 4; x++) {
    const h = HEM[x + 4];
    m.box(x, -h, -2, x, 2, -1, (x + 4) % 2 === 0 ? X.K : X.K2);
  }
  return m;
}

export function x1kaiWeapons() {
  const zanberHilt = M();
  zanberHilt.box(-1, -1, -1, 0, 0, 2, X.N2);
  zanberHilt.box(-1, -1, 3, 0, 0, 3, X.GR);
  const saberHilt = M();
  saberHilt.box(-1, -1, -1, 0, 0, 1, X.GR);
  const buster = M();
  buster.box(-1, -1, -2, 0, 1, 4, X.DK); // body
  buster.box(-1, -3, 0, 0, -2, 1, X.DK); // grip
  buster.box(0, -1, 4, 0, 0, 7, X.GR); // barrel
  buster.set(-1, 1, 2, 0x8affff, { glow: 2, jitter: 0 });
  const whipHead = M();
  whipHead.ellipsoid(0, 0, 0, 1.6, 1.6, 1.6, X.GR);
  whipHead.box(-1, -1, 1, 0, 0, 3, X.N2); // claw prongs
  whipHead.box(-1, 1, 1, 0, 1, 3, X.N2);
  whipHead.box(-1, -2, 1, 0, -1, 3, X.N2);
  const whipLink = M();
  whipLink.box(0, 0, 0, 0, 0, 1, X.DK);
  const shieldPanel = M();
  for (let y = -6; y <= 4; y++) {
    const hz = y < -3 ? 2 : 3;
    shieldPanel.box(0, y, -hz, 0, y, hz - 1, X.N);
    shieldPanel.set(0, y, -hz, 0x8ad8ff, { glow: 1.6, jitter: 0 });
    shieldPanel.set(0, y, hz - 1, 0x8ad8ff, { glow: 1.6, jitter: 0 });
  }
  return { zanberHilt, saberHilt, buster, whipHead, whipLink, shieldPanel };
}

export function x1kaiDef() {
  const uR = x1UpperArmR(), fR = x1ForeArmR();
  const uL = uR.clone().flipX(), fL = fR.clone().flipX();
  const thigh = x1Thigh(), shin = x1Shin();
  return {
    scale: 0.088,
    hipHeight: 16,
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: x1Hips() },
      torso: { parent: 'hips', pivot: [0, 2, 0], model: x1Torso() },
      head: { parent: 'torso', pivot: [0, 9, 0], model: x1Head() },
      uArmR: { parent: 'torso', pivot: [-6.5, 6, 0], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -5, 0], model: fR },
      hand: { parent: 'fArmR', pivot: [0, -6, 0], model: null },
      uArmL: { parent: 'torso', pivot: [6.5, 6, 0], model: uL },
      fArmL: { parent: 'uArmL', pivot: [0, -5, 0], model: fL },
      handL: { parent: 'fArmL', pivot: [0, -6, 0], model: null },
      thighR: { parent: 'hips', pivot: [-2.2, -1, 0], model: thigh },
      shinR: { parent: 'thighR', pivot: [0, -7, 0], model: shin },
      thighL: { parent: 'hips', pivot: [2.2, -1, 0], model: thigh.clone() },
      shinL: { parent: 'thighL', pivot: [0, -7, 0], model: shin.clone() },
      thrusters: { parent: 'torso', pivot: [0, 5, -5], model: x1Thrusters() },
      mantle: { parent: 'torso', pivot: [0, 4, -3], model: x1Mantle() },
    },
  };
}
