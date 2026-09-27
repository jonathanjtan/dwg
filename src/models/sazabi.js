// MSN-04 Sazabi: Char's Neo Zeon flagship suit from Char's Counterattack. Deep crimson and bulky, with huge rounded
// shoulder armor, a black chest plate carrying the gold Neo Zeon crest, a mono-eye behind a slit visor under a tall
// swept-back crest, two funnel containers standing up off the backpack, and a long shield with the crest in gold.
// A 25m suit against the Gundam's 18m: scale 0.11 against the Gundam's 0.1, and wider voxel proportions besides.
import { VoxelModel } from '../core/voxel.js';
import { pal } from './suits.js';

const M = () => new VoxelModel(pal);
const S = {
  R: 0xb81c2a, R2: 0x8c1420, R3: 0x64101a, K: 0x1c1c24, K2: 0x2e2e38, GR: 0x4c505c, Y: 0xe8b830, Y2: 0xa87e1a,
};
const EYE = { glow: 2.2, jitter: 0 };

// Neo Zeon crest: a stylised bird, a central spine with swept wings, painted flat on a face at depth z.
function crest(m, cx, cy, z, c = S.Y) {
  m.box(cx, cy - 2, z, cx, cy + 2, z, c);
  m.set(cx - 1, cy + 1, z, c); m.set(cx + 1, cy + 1, z, c);
  m.set(cx - 2, cy + 2, z, c); m.set(cx + 2, cy + 2, z, c);
  m.set(cx - 1, cy, z, c); m.set(cx + 1, cy, z, c);
}

function szHips() {
  const m = M();
  m.sbox(5, -2, -3, 1, 2, S.R2); // waist block
  m.box(-1, -3, -1, 0, -1, 2, S.K); // crotch
  m.box(-5, -4, 2, -2, 0, 3, S.R); // front skirts, big and flared
  m.box(1, -4, 2, 4, 0, 3, S.R);
  m.box(-5, -5, 3, -3, -5, 3, S.R2);
  m.box(2, -5, 3, 4, -5, 3, S.R2);
  m.box(-4, -1, 4, -3, 0, 4, S.Y); // skirt vents
  m.box(2, -1, 4, 3, 0, 4, S.Y);
  m.box(-7, -4, -2, -6, 0, 1, S.R); // side skirts
  m.box(6, -4, -2, 7, 0, 1, S.R);
  m.box(-7, -4, -2, -7, -4, 1, S.R3);
  m.box(6, -4, -2, 6, -4, 1, S.R3);
  m.box(-4, -4, -4, 3, 0, -4, S.R); // rear skirt
  m.sbox(5, 1, -3, 1, 2, S.K2); // belt
  return m;
}

function szTorso() {
  const m = M();
  m.sbox(4, 0, -3, 1, 2, S.K2); // abdomen
  m.box(-2, 0, 3, 1, 1, 3, S.K); // abdominal mega particle cannon port
  m.box(-1, 0, 3, 0, 1, 3, 0xff5a8a, { glow: 1.4, jitter: 0 });
  m.sbox(6, 2, -4, 8, 3, S.R); // chest, broad
  m.clearBox(-6, 8, -4, -6, 8, 3);
  m.clearBox(5, 8, -4, 5, 8, 3);
  m.sbox(3, 2, 4, 7, 4, S.K); // black chest plate
  crest(m, 0, 5, 5);
  m.box(-6, 5, 4, -4, 7, 4, S.R2); // pectoral armor lips
  m.box(3, 5, 4, 5, 7, 4, S.R2);
  m.box(-5, 3, 4, -4, 3, 4, S.Y); // vents under the pecs
  m.box(3, 3, 4, 4, 3, 4, S.Y);
  m.sbox(3, 9, -3, 9, 2, S.K); // collar
  m.sbox(4, 2, -7, 8, -5, S.R2); // backpack
  m.sbox(2, 3, -8, 6, -8, S.K2);
  for (const x of [-2, 1]) m.box(x, 1, -8, x + 1, 2, -7, S.GR); // main thrusters
  // funnel containers: two tall binders standing off the backpack, three funnel noses in each
  for (const side of [-1, 1]) {
    const x0 = side > 0 ? 2 : -5;
    m.box(x0, 5, -9, x0 + 3, 13, -8, S.K);
    m.box(x0, 6, -10, x0 + 3, 12, -10, S.K2);
    m.box(x0, 14, -9, x0 + 3, 14, -8, S.R2);
    for (let i = 0; i < 3; i++) m.set(x0 + (side > 0 ? i + 1 : i), 13, -10, S.R3);
  }
  return m;
}

function szHead() {
  const m = M();
  m.box(-2, 0, -2, 1, 4, 2, S.R); // helmet
  m.box(-3, 0, -1, -3, 3, 1, S.R2); // cheek guards
  m.box(2, 0, -1, 2, 3, 1, S.R2);
  m.box(-2, 1, 3, 1, 2, 3, S.K); // visor slit
  m.set(-1, 2, 3, 0x6aff8a, EYE); // mono-eye
  m.box(-1, 0, 3, 0, 0, 3, S.GR); // mouth grille
  m.box(-2, 3, 3, 1, 3, 3, S.R);
  m.box(-1, 5, -2, 0, 5, 1, S.R); // crest: a tall, swept-back blade
  for (let i = 0; i < 5; i++) m.box(-1, 6 + i, -1 - Math.floor(i / 2), 0, 6 + i, -Math.floor(i / 2), i > 2 ? S.R2 : S.R);
  m.box(-1, 4, 3, 0, 4, 3, S.Y); // brow ornament
  return m;
}

// Right upper arm: a huge rounded pauldron over a black upper arm.
function szUpperArmR() {
  const m = M();
  m.ellipsoid(-0.5, 0.5, 0, 3.6, 3.2, 3.6, S.R);
  m.box(-3, -2, -2, 2, -2, 1, S.R3); // pauldron rim
  m.box(-4, 0, -1, -4, 1, 0, S.Y); // vernier vent on the outside
  m.box(-1, -6, -1, 0, -2, 0, S.K2);
  m.box(-2, -4, -2, 1, -3, 1, S.K);
  return m;
}
function szForeArmR() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, S.GR); // elbow
  m.box(-2, -6, -2, 1, -1, 2, S.R);
  m.box(-3, -5, -2, -3, -2, 1, S.R2); // outer armor flare
  m.box(-2, -6, -2, 1, -6, 2, S.R3); // cuff
  m.box(-1, -8, -1, 0, -7, 1, S.K); // fist
  return m;
}
function szThigh() {
  const m = M();
  m.box(-1, -1, -1, 0, 0, 0, S.GR);
  m.sbox(2, -7, -2, -1, 2, S.K2);
  m.sbox(3, -6, -2, -3, 2, S.R); // thigh armor
  return m;
}
function szShin() {
  const m = M();
  m.sbox(2, -1, -1, 0, 0, S.GR); // knee joint
  m.sbox(3, -6, -2, 0, 2, S.R);
  m.box(-2, -3, 3, 1, 1, 3, S.R2); // knee armor, pointed
  m.box(-1, 2, 3, 0, 2, 3, S.R2);
  m.sbox(4, -7, -3, -4, 2, S.R); // flared calf
  m.box(-4, -6, -3, -4, -4, 1, S.R3);
  m.box(3, -6, -3, 3, -4, 1, S.R3);
  m.sbox(3, -9, -3, -8, 4, S.R2); // big foot
  m.sbox(2, -9, 5, -9, 5, S.R2);
  m.sbox(3, -9, -3, -9, 4, S.K); // sole
  m.sbox(1, -6, -4, -5, -4, S.GR); // heel thruster
  return m;
}

// Shield: a long crimson kite, black centre panel with the gold crest, flat in the YZ plane facing +x.
function szShield() {
  const m = M();
  for (let y = -13; y <= 4; y++) {
    let hz = 4;
    if (y >= 3) hz = 3;
    if (y < -6) hz = Math.max(1, 4 - Math.ceil((-6 - y) * 0.5));
    m.box(0, y, -hz, 0, y, hz - 1, S.R2);
    m.box(1, y, -hz, 1, y, hz - 1, S.R);
  }
  m.box(1, -10, -1, 1, 2, 0, S.K);
  m.box(1, -4, -2, 1, 1, 1, S.K);
  for (const [y, z] of [[0, 0], [-1, 0], [-2, 0], [-3, 0], [-4, 0], [-5, 0], [-6, 0], [0, -2], [0, 1], [-1, -1], [-1, 1], [1, -2], [1, 2]]) {
    m.set(2, y, z, S.Y);
    m.set(2, y, z - 1, S.Y);
  }
  return m;
}

export function sazabiWeapons() {
  const hawk = M(); // beam tomahawk grip, with a gold emitter head
  hawk.box(-1, -1, -3, 0, 0, 2, S.K2);
  hawk.box(-1, -1, 3, 0, 1, 4, S.Y2);
  const rifle = M(); // beam shot rifle: long, boxy, a drum magazine underneath
  rifle.box(-1, -1, -3, 0, 1, 5, S.K2);
  rifle.box(-1, -3, 0, 0, -2, 1, S.K); // grip
  rifle.box(-1, -3, 2, 0, -2, 3, S.GR); // magazine
  rifle.box(0, 0, 5, 0, 0, 10, S.GR); // barrel
  rifle.box(-1, 1, 1, 0, 2, 3, S.K); // sight
  rifle.set(-1, 0, 4, 0x6aff8a, { glow: 2, jitter: 0 });
  const funnel = M(); // one funnel: a black cone with a red collar and a glowing muzzle
  funnel.box(-1, -1, -2, 0, 0, 1, S.K);
  funnel.box(-2, -2, -3, 1, 1, -3, S.R2);
  funnel.box(-1, -1, 2, 0, 0, 2, S.K2);
  funnel.set(0, 0, 3, 0xffc050, { glow: 2.4, jitter: 0 });
  return { hawk, rifle, funnel };
}

export function sazabiDef() {
  const uR = szUpperArmR(), fR = szForeArmR();
  const uL = uR.clone().flipX(), fL = fR.clone().flipX();
  const thigh = szThigh(), shin = szShin();
  return {
    scale: 0.11,
    hipHeight: 17,
    parts: {
      hips: { parent: null, pivot: [0, 0, 0], model: szHips() },
      torso: { parent: 'hips', pivot: [0, 2, 0], model: szTorso() },
      head: { parent: 'torso', pivot: [0, 10, 0.5], model: szHead() },
      uArmR: { parent: 'torso', pivot: [-8, 6.5, 0], model: uR },
      fArmR: { parent: 'uArmR', pivot: [0, -6, 0], model: fR },
      hand: { parent: 'fArmR', pivot: [0, -7, 0], model: null },
      uArmL: { parent: 'torso', pivot: [8, 6.5, 0], model: uL },
      fArmL: { parent: 'uArmL', pivot: [0, -6, 0], model: fL },
      handL: { parent: 'fArmL', pivot: [3, -3, 0], model: szShield() },
      thighR: { parent: 'hips', pivot: [-2.6, -1, 0], model: thigh },
      shinR: { parent: 'thighR', pivot: [0, -7, 0], model: shin },
      thighL: { parent: 'hips', pivot: [2.6, -1, 0], model: thigh.clone() },
      shinL: { parent: 'thighL', pivot: [0, -7, 0], model: shin.clone() },
    },
  };
}
