// XM-X1 Crossbone Gundam X1 Kai: the Crossbone Vanguard's space-pirate Gundam, sculpted from reference renders with
// core/sculpt.js. What makes it read: the big X of four thruster booms on the back (white arms from a navy hub,
// dark thruster bells at the tips; its own node, so it can spin up for the screw whip's vortex), a navy chest with the
// skull and crossbones between yellow vents, a white head under a big gold V-fin with a skull on the forehead and a
// slotted jaw, navy shoulders, dark brand-marker units on the forearms, heat daggers along the shins, red toes, and
// the ABC mantle's tattered cloak hanging off the back. Runs ~0.88x the Gundam (16m vs 18m): 0.088 world units per
// design unit against the Gundam's 0.1, with the Gundam's proportions.
import { Sculpt, box, rbox, ell, cyl, hull, half, fn, and, or, both, rot, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const X1_R = 2;
const SCALE = 0.088;
export const X1_WEAPON_VOXEL = 0.1 / X1_R; // the weapons keep the size they had

const X = {
  W: 0xe6eaf2, W2: 0xc4c9d6, W3: 0x9aa0ae, N: 0x1c3f78, N2: 0x122c58, R: 0xc41f2c, R2: 0x8e1620,
  Y: 0xf0c020, Y2: 0xb88a0e, K: 0x1a1a20, K2: 0x0e0e12, GR: 0x565c6a, DK: 0x2a2e38,
};
const EYE = { glow: 1.8, jitter: 0 };
const HOT = { glow: 1.6, jitter: 0 };
const vbox = (x0, y0, z0, x1, y1, z1) => box(x0, y0, z0, x1 + 1, y1 + 1, z1 + 1);
// skull and crossbones, 7 voxels wide
const SKULL = [
  'w.....w',
  '.w.w.w.',
  '..wwww.',
  '..k.kw.',
  '..wwww.',
  '.w.w.w.',
  'w.....w',
];

function x1Hips(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.0, -1.0, -1.8, 3.0, 2.0, 1.7, 0.4), X.W);
  s.add(box(-3.1, 1.2, -1.9, 3.1, 2.0, 1.8), X.GR); // belt
  s.add(hull([[-0.9, 1.4], [0.9, 1.4], [0.9, -2.2], [0, -2.8], [-0.9, -2.2]], [[0.6, 1.4], [2.3, 1.4], [2.4, -2.8], [0.6, -2.8]]), X.R); // crotch
  s.paint(box(-0.5, -0.9, 2, 0.5, -0.4, 3), X.Y);
  // front skirts, longer and pointed, navy edged
  const skirt = hull([[1.0, 1.4], [3.1, 1.4], [3.4, -2.6], [2.2, -3.6], [1.2, -2.8]], [[1.0, 1.4], [2.0, 1.4], [2.8, -3.6], [1.8, -3.6]]);
  s.add(both(skirt), X.W);
  s.paint(both(and(skirt, fn([0, -4, 0], [4, 2, 4], (x, y) => y < -1.8 - (x - 2) * 0.4))), X.N);
  s.add(both(hull([[3.0, 1.4], [3.7, 1.4], [4.1, -2.4], [3.3, -2.4]], [[-1.6, 1.4], [1.5, 1.4], [1.5, -2.4], [-1.6, -2.4]])), X.N); // side skirts
  s.add(hull([[-2.7, 1.4], [2.7, 1.4], [2.9, -2.6], [-2.9, -2.6]], [[-1.6, 1.4], [-2.3, 1.4], [-2.7, -2.6], [-2.0, -2.6]]), X.W); // rear skirt
  return s.model;
}

function x1Torso(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-2.5, -0.3, -1.7, 2.5, 2.4, 1.6, 0.5), X.W); // abdomen
  for (const y of [0.5, 1.3]) s.paint(both(box(1.0, y, 1, 2.6, y + 0.3, 2)), X.W3);
  // chest: navy, a prow down the middle
  const chest = hull(
    [[-3.4, 2.2], [3.4, 2.2], [4.0, 3.8], [4.1, 7.0], [-4.1, 7.0], [-4.0, 3.8]],
    [[-2.3, 2.2], [1.9, 2.2], [2.6, 4.0], [2.3, 7.0], [-2.3, 7.0]],
    [[-4.1, -2.3], [4.1, -2.3], [4.1, 1.6], [1.2, 2.5], [0, 2.7], [-1.2, 2.5], [-4.1, 1.6]],
  );
  s.add(chest, X.N);
  s.paint(box(-4.2, 2.1, -2.4, 4.2, 2.7, 3), X.N2);
  s.add(both(box(1.4, 4.4, 1.9, 3.6, 5.9, 2.5)), X.Y); // yellow vents either side of the skull
  s.paint(both(box(1.5, 4.9, 2.1, 3.5, 5.3, 2.7)), X.Y2);
  s.add(and(ell(0, 4.6, 1.4, 1.9, 2.2, 1.6), half(0, 0, -1, -1.8)), X.N2); // the rounded cockpit block
  s.project(SKULL, [-3.5 / R, 6.4, 4], { w: X.W, k: X.K2 });
  s.add(box(-1.8, 6.8, -1.6, 1.8, 7.6, 1.5), X.W); // collar
  s.add(both(box(1.8, 6.6, -2.0, 3.2, 7.4, 1.8)), X.W);
  s.paint(both(box(1.8, 7.1, 1.4, 3.3, 7.5, 1.9)), X.Y);
  // backpack base the X booms mount on, saber racks under it
  s.add(rbox(-2.6, 2.4, -3.6, 2.6, 7.2, -2.0, 0.5), X.W2);
  s.add(both(box(1.2, 1.4, -3.4, 2.2, 2.6, -2.4)), X.DK);
  return s.model;
}

function x1Head(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('y', 0, -0.1, 0.85, -0.5, 0.6), X.GR); // neck
  s.add(rbox(-1.25, 0.3, -1.5, 1.25, 3.1, 1.3, 0.5), X.W); // helmet
  s.add(both(rbox(1.0, 0.7, -1.2, 1.7, 2.4, 0.7, 0.25)), X.N); // ear blocks, navy
  s.add(box(-1.0, 0.4, 1.0, 1.0, 2.1, 1.6), X.W2); // face
  s.add(both(box(0.2, 1.4, 1.3, 0.95, 1.9, 1.7)), 0x8affc0, EYE);
  s.add(box(-0.8, 0.2, 1.2, 0.8, 1.2, 1.7), X.K); // the jaw, slotted
  for (const x of [-0.45, 0, 0.45]) s.paint(box(x - 0.1, 0.2, 1.3, x + 0.1, 1.2, 1.8), X.W3);
  s.add(box(-0.45, 2.1, 1.0, 0.45, 3.0, 1.7), X.W); // forehead block with the skull
  s.decal(['w.w', '.w.', 'w.w'], [-1.5 / R, 2.8, 1.7], { w: X.K });
  // the big gold V-fin
  s.add(both(rot(box(0.1, 2.6, 1.1, 3.4, 3.0, 1.55), [0, 0, 0.72], [0.1, 2.6, 1.3])), X.Y);
  s.add(box(-0.3, 3.0, -1.0, 0.3, 3.5, 0.9), X.W); // crown ridge
  return s.model;
}

// Right upper arm (outside toward -x): a navy shoulder with a white rim over a white upper arm. The left mirrors it.
function x1UpperArmR(R) {
  const s = new Sculpt(pal, R);
  const shell = and(hull([[1.2, -2.0], [1.2, 1.8], [0.2, 2.3], [-1.8, 2.3], [-2.3, 1.4], [-2.2, -2.0]], [[-1.8, -2.0], [-1.9, 1.6], [-1.2, 2.3], [1.2, 2.3], [1.9, 1.6], [1.8, -2.0]]), rbox(-2.4, -2.1, -1.9, 1.3, 2.4, 1.9, 0.6));
  s.add(shell, X.N);
  s.paint(and(shell, box(-3, 1.8, -3, 2, 2.5, 3)), X.W); // white rim along the top
  s.paint(and(shell, box(-3, -0.2, 1.4, -1.6, 0.8, 3)), X.Y);
  s.add(rbox(-0.95, -5.4, -0.95, 0.95, -2.2, 0.95, 0.3), X.W); // upper arm
  s.paint(box(-1, -3.2, -1, 1, -2.8, 1), X.W3);
  return s.model;
}

function x1ForeArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 0.85, -1.0, 1.0), X.GR); // elbow
  s.add(hull([[1.2, -0.6], [1.3, -4.8], [-1.4, -4.8], [-1.3, -0.6]], [[-1.2, -0.6], [1.2, -0.6], [1.4, -4.8], [-1.4, -4.8]]), X.W);
  s.paint(box(-2, -4.9, -2, 2, -4.3, 2), X.R); // wrist trim
  s.add(rbox(-2.0, -4.2, -1.0, -1.1, -1.2, 1.2, 0.25), X.DK); // brand marker unit on the outer forearm
  s.add(box(-2.1, -2.2, 1.0, -1.3, -1.6, 1.3), 0xffa0e0, { glow: 1.4, jitter: 0 });
  s.add(rbox(-0.85, -6.5, -0.8, 0.85, -4.7, 1.0, 0.3), X.GR); // fist
  return s.model;
}

function x1Thigh(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, -0.3, 0, 1.1), X.GR);
  s.add(and(hull([[-1.4, -1.0], [1.4, -1.0], [1.5, -5], [1.3, -8], [-1.3, -8], [-1.5, -5]], [[-1.5, -1.0], [1.5, -1.0], [1.6, -5], [1.4, -8], [-1.4, -8]]), rbox(-1.6, -8.1, -1.7, 1.6, -0.8, 1.7, 0.45)), X.W);
  s.paint(box(-1.7, -2.2, -1.8, 1.7, -1.8, 1.8), X.N2);
  return s.model;
}

// Shin: a navy knee cap, the long white lower leg with a heat dagger stowed flush on its front, red toes. Shared.
function x1Shin(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.0, -1.2, 1.2), X.GR);
  s.add(and(hull(
    [[-1.5, 0.2], [1.5, 0.2], [1.8, -4.5], [1.7, -9.2], [-1.7, -9.2], [-1.8, -4.5]],
    [[-1.5, 0.2], [1.4, 0.4], [1.6, -5], [1.4, -9.2], [-1.8, -9.2], [-2.4, -4.8]],
  ), rbox(-1.9, -9.3, -2.5, 1.9, 0.4, 1.8, 0.45)), X.W);
  s.add(hull([[-1.1, 1.2], [1.1, 1.2], [1.2, -2.0], [-1.2, -2.0]], [[0.8, 1.2], [1.8, 0.8], [2.1, -1.0], [1.5, -2.2], [0.8, -2.2]]), X.N); // knee cap
  s.paint(both(box(1.4, -7.0, -1.2, 2.0, -3.4, 0.6)), X.Y); // side vents
  s.add(box(-0.6, -7.4, 1.4, 0.6, -2.8, 1.9), X.W3); // heat dagger along the shin front
  s.add(box(-0.6, -7.6, 1.5, 0.6, -7.2, 1.9), 0xff8a30, HOT);
  s.paint(box(-2, -9.3, -2.6, 2, -8.8, 1.9), X.W2);
  s.add(cyl('y', 0, -0.3, 0.9, -9.3, -10.0), X.GR); // ankle
  s.add(hull(null, [[-2.4, -12], [3.6, -12], [3.6, -11.4], [1.8, -10.4], [0.4, -9.4], [-1.8, -9.4], [-2.4, -10.6]], [[-1.4, -2.4], [1.4, -2.4], [1.5, 2.2], [0.8, 3.6], [-0.8, 3.6], [-1.5, 2.2]]), X.W);
  s.paint(box(-1.6, -12.1, 1.8, 1.6, -9.4, 3.8), X.R); // toes
  s.paint(box(-1.6, -12.1, -2.6, 1.6, -11.7, 3.8), X.GR);
  return s.model;
}

// The X-shaped thruster booms: four arms from a navy hub, white with navy roots and dark thruster bells at the tips,
// the upper pair longer. Its own node (see x1kaiDef), spun up for the screw whip's vortex.
export const X1_BOOMS = [[0.64, 0.77, 15], [-0.64, 0.77, 15], [0.72, -0.69, 13.5], [-0.72, -0.69, 13.5]]; // [dx, dy, length]
function x1Thrusters(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, 0, 0, 1.9, 1.9, 1.4), X.N2); // hub
  for (const [dx, dy, len] of X1_BOOMS) {
    const ang = Math.atan2(dy, dx) - Math.PI / 2; // turn the +y boom onto its diagonal
    const tilt = (sh) => rot(sh, [0, 0, ang], [0, 0, 0]);
    s.add(tilt(rbox(-0.95, 0.8, -0.9, 0.95, len - 1.4, 0.8, 0.35)), X.W);
    s.paint(tilt(box(-1.2, 0.8, -1.2, 1.2, 4.4, 1.2)), X.N);
    s.paint(tilt(box(-1.2, len - 4.2, -1.2, 1.2, len - 3.6, 1.2)), X.Y);
    s.add(tilt(box(-1.2, len - 6.4, -1.1, 1.2, len - 4.6, 1.0)), X.W2); // vernier block
    s.add(tilt(cyl('y', 0, -0.05, 1.05, len - 1.6, len, 1.35)), X.DK); // thruster bell
    s.add(tilt(cyl('y', 0, -0.05, 0.6, len - 0.3, len + 0.1)), 0xff8a40, { glow: 2, jitter: 0.1 });
  }
  return s.model;
}

// ABC Mantle: a tattered cloak hanging off the back, jagged uneven hem.
function x1Mantle(R) {
  const s = new Sculpt(pal, R);
  const HEM = [6, 4.2, 7.2, 3.4, 6.4, 5.2, 7, 4.2, 6.2];
  s.add(fn([-4.5, -8, -2.4], [4.5, 2.4, -1.4], (x, y, z) => {
    const i = Math.min(8, Math.max(0, Math.floor(x + 4.5)));
    return y >= -HEM[i] + Math.abs(x) * 0.1;
  }), X.K);
  s.paint(fn([-4.5, -8, -3], [4.5, 2.4, 0], (x) => Math.floor(x + 4.5) % 2 === 1), X.K2);
  return s.model;
}

export function x1kaiWeapons(R = X1_R) {
  const S = () => new Sculpt(pal, R);
  const zanberHilt = S();
  zanberHilt.add(vbox(-1, -1, -1, 0, 0, 2), X.N2);
  zanberHilt.add(vbox(-1, -1, 3, 0, 0, 3), X.GR);
  const saberHilt = S();
  saberHilt.add(vbox(-1, -1, -1, 0, 0, 1), X.GR);
  const buster = S();
  buster.add(vbox(-1, -1, -2, 0, 1, 4), X.DK); // body
  buster.add(vbox(-1, -3, 0, 0, -2, 1), X.DK); // grip
  buster.add(cyl('z', 0.5, 0, 0.5, 5, 8), X.GR); // barrel
  buster.add(vbox(-1, 1, 2, -1, 1, 2), 0x8affff, { glow: 2, jitter: 0 });
  const whipHead = S();
  whipHead.add(ell(0, 0, 0, 1.6), X.GR);
  whipHead.add(vbox(-1, -1, 1, 0, 0, 3), X.N2); // claw prongs
  whipHead.add(vbox(-1, 1, 1, 0, 1, 3), X.N2);
  whipHead.add(vbox(-1, -2, 1, 0, -1, 3), X.N2);
  const whipLink = S();
  whipLink.add(vbox(0, 0, 0, 0, 0, 1), X.DK);
  const shieldPanel = S();
  shieldPanel.add(fn([0, -6, -3], [1, 5, 3], (x, y, z) => Math.abs(z + 0.5) <= (y < -3 ? 2 : 3)), X.N);
  shieldPanel.paint(fn([0, -6, -3], [1, 5, 3], (x, y, z) => Math.abs(z + 0.5) > (y < -3 ? 1.5 : 2.5)), 0x8ad8ff, { glow: 1.6, jitter: 0 });
  return { zanberHilt: zanberHilt.model, saberHilt: saberHilt.model, buster: buster.model, whipHead: whipHead.model, whipLink: whipLink.model, shieldPanel: shieldPanel.model };
}

export function x1kaiDef(R = X1_R) {
  const uR = x1UpperArmR(R), fR = x1ForeArmR(R), thigh = x1Thigh(R), shin = x1Shin(R);
  return rigDef(R, SCALE, 21, {
    hips: { parent: null, pivot: [0, 0, 0], model: x1Hips(R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: x1Torso(R) },
    head: { parent: 'torso', pivot: [0, 7.3, 0.1], model: x1Head(R) },
    uArmR: { parent: 'torso', pivot: [-5.4, 5.2, 0], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -5.6, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -5.8, 0], model: null },
    uArmL: { parent: 'torso', pivot: [5.4, 5.2, 0], model: uR.clone().flipX() },
    fArmL: { parent: 'uArmL', pivot: [0, -5.6, 0], model: fR.clone().flipX() },
    handL: { parent: 'fArmL', pivot: [0, -5.8, 0], model: null },
    thighR: { parent: 'hips', pivot: [-2.0, -1, 0], model: thigh },
    shinR: { parent: 'thighR', pivot: [0, -8, 0], model: shin },
    thighL: { parent: 'hips', pivot: [2.0, -1, 0], model: thigh.clone() },
    shinL: { parent: 'thighL', pivot: [0, -8, 0], model: shin.clone() },
    thrusters: { parent: 'torso', pivot: [0, 5.2, -3.8], model: x1Thrusters(R) },
    mantle: { parent: 'torso', pivot: [0, 3.2, -2.2], model: x1Mantle(R) },
  });
}
