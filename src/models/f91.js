// Gundam F91: Seabook Arno's compact Formula-project Gundam (U.C. 0123), sculpted from reference renders with
// core/sculpt.js. What makes it read: big angular white shoulders lettered in red, "F" on the right and "91" on the
// left; a compact blue chest over a dark belly; a small head under a tall gold V-fin with a white inner blade, the
// mouth slotted for the face-open vents; two long white VSBRs (variable-speed beam rifles) racked on the back, which
// swing down over the shoulders to fire (the Guncannon's cannon mechanic); long white legs, red toes. About 0.85x the
// RX-78's height.
import { Sculpt, box, rbox, ell, cyl, hull, half, fn, and, both, rot, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const F91_R = 2;
const SCALE = 0.1;
export const F91_VOXEL = SCALE / F91_R;

const F = {
  W: 0xf2f4f7, W2: 0xd3d8e0, W3: 0xa9afbb, B: 0x3a68c0, B2: 0x1f3f78, R: 0xd8342a, R2: 0x9e2018, Y: 0xf0c419,
  GR: 0x6a707e, DK: 0x262a33,
};
const EYE_G = { glow: 1.7, jitter: 0 };
export const VSBR_BEAM = 0xfff2a0; // gold beam colour: the rifle, the VSBR, the beam launcher
export const SHIELD_GLOW = 0x9fd8ff; // beam shield: pale blue disc off the left forearm
const vbox = (x0, y0, z0, x1, y1, z1) => box(x0, y0, z0, x1 + 1, y1 + 1, z1 + 1);

function f91Hips(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-2.8, -1.0, -1.7, 2.8, 1.8, 1.6, 0.4), F.W);
  s.add(box(-2.9, 1.0, -1.8, 2.9, 1.8, 1.7), F.B); // belt line
  s.add(hull([[-0.9, 1.2], [0.9, 1.2], [0.9, -2.0], [0, -2.6], [-0.9, -2.0]], [[0.6, 1.2], [2.2, 1.2], [2.2, -2.6], [0.6, -2.6]]), F.R); // crotch
  const skirt = hull([[1.0, 1.2], [2.9, 1.2], [3.2, -2.2], [1.2, -2.4]], [[1.0, 1.2], [1.9, 1.2], [2.5, -2.4], [1.6, -2.4]]);
  s.add(both(skirt), F.W);
  s.paint(both(and(skirt, half(0, 1, 0, -1.9))), F.B);
  s.paint(both(and(skirt, box(1.6, 0.2, 0, 2.3, 0.8, 4))), F.Y);
  s.add(both(hull([[2.8, 1.2], [3.5, 1.2], [3.8, -2.0], [3.1, -2.0]], [[-1.4, 1.2], [1.4, 1.2], [1.4, -2.0], [-1.4, -2.0]])), F.W); // side skirts
  s.add(hull([[-2.5, 1.2], [2.5, 1.2], [2.7, -2.2], [-2.7, -2.2]], [[-1.5, 1.2], [-2.1, 1.2], [-2.5, -2.2], [-1.9, -2.2]]), F.W); // rear skirt
  return s.model;
}

function f91Torso(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-2.4, -0.3, -1.6, 2.4, 2.2, 1.5, 0.4), F.B2); // dark belly
  for (const x of [-1.3, -0.45, 0.45, 1.3]) s.paint(box(x - 0.2, 0.2, 1, x + 0.2, 1.9, 2), F.DK);
  // chest: compact and blue, standing a little proud in the middle
  const chest = hull(
    [[-3.0, 2.0], [3.0, 2.0], [3.6, 3.6], [3.7, 6.8], [-3.7, 6.8], [-3.6, 3.6]],
    [[-2.1, 2.0], [1.8, 2.0], [2.4, 3.8], [2.2, 6.8], [-2.1, 6.8]],
  );
  s.add(and(chest, rbox(-3.8, 1.9, -2.2, 3.8, 6.9, 2.5, 0.4)), F.B);
  s.paint(box(-3.9, 1.9, -2.3, 3.9, 2.5, 2.6), F.B2);
  s.add(both(cyl('z', 1.9, 5.0, 0.45, 2.1, 2.6)), F.Y); // two round ports
  s.add(box(-0.6, 2.3, 1.9, 0.6, 5.8, 2.6), F.W2); // hatch
  s.paint(box(-0.6, 5.2, 2.2, 0.6, 5.8, 2.7), F.R);
  s.add(box(-1.7, 6.6, -1.5, 1.7, 7.4, 1.4), F.W); // collar
  s.add(both(box(1.7, 6.4, -1.8, 2.9, 7.2, 1.7)), F.W);
  // backpack: a compact white pack, two thrusters
  s.add(rbox(-2.3, 2.2, -3.8, 2.3, 6.6, -2.0, 0.4), F.W2);
  s.add(both(cyl('y', 1.2, -2.9, 0.6, 2.3, 1.2, 0.85)), F.DK);
  return s.model;
}

// The VSBR rack: two long white barrels resting up along the back, swung forward over the shoulders to fire.
function f91Vsbr(R) {
  const s = new Sculpt(pal, R);
  s.add(box(-2.0, -0.9, -2.1, 2.0, 0.6, -0.9), F.DK); // cross mount
  for (const x of [-2.5, 2.5]) {
    s.add(rbox(x - 0.8, -1.2, -2.2, x + 0.8, 2.4, 0.6, 0.3), F.W2); // mount block
    s.add(rbox(x - 0.55, 0, -1.2, x + 0.55, 9.8, 0.2, 0.2), F.W); // barrel
    s.paint(box(x - 0.7, 5.6, -1.4, x + 0.7, 6.1, 0.4), F.W3);
    s.add(cyl('y', x, -0.5, 0.65, 9.6, 10.5), F.DK); // muzzle
    s.add(cyl('y', x, -0.5, 0.35, 10.3, 10.6), VSBR_BEAM, { glow: 1.8, jitter: 0 });
  }
  return s.model;
}

function f91Head(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('y', 0, -0.1, 0.8, -0.5, 0.6), F.GR); // neck
  s.add(rbox(-1.2, 0.3, -1.4, 1.2, 2.9, 1.2, 0.45), F.W); // helmet
  s.add(both(rbox(1.0, 0.7, -1.1, 1.6, 2.3, 0.7, 0.25)), F.W); // ear blocks
  s.add(both(cyl('z', 1.25, 2.4, 0.18, 0.2, 1.4)), F.Y); // vulcans
  s.add(box(-1.0, 0.4, 0.9, 1.0, 2.0, 1.5), F.W2); // face
  s.add(both(box(0.2, 1.35, 1.2, 0.95, 1.8, 1.6)), 0x7affea, EYE_G);
  s.add(box(-0.7, 0.3, 1.2, 0.7, 1.1, 1.55), F.DK); // the mouth, slotted for the face-open vents
  for (const x of [-0.45, 0, 0.45]) s.paint(box(x - 0.1, 0.3, 1.2, x + 0.1, 1.1, 1.7), F.W2);
  s.add(box(-0.3, 2.0, 1.0, 0.3, 2.7, 1.6), F.R); // forehead sensor
  // the tri-blade V-fin: a tall gold V with a white blade inside it
  s.add(both(rot(box(0.1, 2.5, 1.1, 3.0, 2.85, 1.5), [0, 0, 0.9], [0.1, 2.5, 1.3])), F.Y);
  s.add(both(rot(box(0.1, 2.4, 0.9, 1.9, 2.7, 1.2), [0, 0, 0.55], [0.1, 2.4, 1.0])), F.W);
  s.add(box(-0.35, 2.4, 1.0, 0.35, 2.9, 1.6), F.Y);
  return s.model;
}

// Right upper arm (outside toward -x): the big angular shoulder, its top ramping up to the outer edge. The left arm
// is its mirror image; the lettering goes on each separately.
function f91UpperArmR(R) {
  const s = new Sculpt(pal, R);
  const shell = hull(
    [[1.2, -2.8], [1.2, 2.0], [0.3, 2.6], [-2.8, 3.8], [-3.4, 2.6], [-3.3, -2.8]],
    [[-2.0, -2.8], [-2.2, 2.2], [-1.4, 3.4], [1.9, 3.0], [2.5, 1.8], [2.4, -2.8]],
  );
  s.add(shell, F.W);
  s.paint(and(shell, box(-4, -2.9, -3, 2, -2.3, 3)), F.W2);
  s.paint(and(shell, fn([-4, 2.2, -3], [2, 4, 3], (x, y) => y > 2.4 - x * 0.35)), F.B); // blue cap along the ridge
  s.add(rbox(-0.9, -5.2, -0.9, 0.9, -2.2, 0.9, 0.3), F.GR); // upper arm
  s.add(box(-1.0, -4.4, -1.0, 1.0, -3.4, 1.0), F.W);
  return s.model;
}
const LETTER_F = ['rrrr', 'r...', 'rrr.', 'r...', 'r...'];
const LETTER_91 = ['rrr..r', 'r.r.rr', 'rrr..r', '..r..r', 'rrr..r'];

function f91ForeArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 0.8, -1.0, 1.0), F.GR); // elbow
  s.add(hull([[1.1, -0.6], [1.2, -4.6], [-1.3, -4.6], [-1.2, -0.6]], [[-1.1, -0.6], [1.1, -0.6], [1.3, -4.6], [-1.3, -4.6]]), F.W);
  s.paint(box(-2, -4.7, -2, 2, -4.1, 2), F.W2);
  s.add(rbox(-0.85, -6.3, -0.8, 0.85, -4.5, 1.0, 0.3), F.GR); // fist
  s.paint(box(-0.9, -5.4, 0.8, 0.9, -5.0, 1.2), F.R); // knuckle accent
  return s.model;
}

function f91Thigh(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, -0.3, 0, 1.0), F.GR);
  s.add(and(hull([[-1.3, -1.0], [1.3, -1.0], [1.4, -4.5], [1.2, -7], [-1.2, -7], [-1.4, -4.5]], [[-1.3, -1.0], [1.3, -1.0], [1.5, -4.5], [1.3, -7], [-1.3, -7]]), rbox(-1.5, -7.1, -1.6, 1.5, -0.8, 1.6, 0.4)), F.W);
  s.paint(box(-1.6, -2.6, -1.7, 1.6, -2.2, 1.7), F.B);
  return s.model;
}

// Shin: a pointed knee, the long white lower leg flaring at the calf, white feet with red toe caps. Shared by both.
function f91Shin(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 0.95, -1.1, 1.1), F.GR);
  s.add(and(hull(
    [[-1.3, 0.2], [1.3, 0.2], [1.6, -4.4], [1.5, -7.4], [-1.5, -7.4], [-1.6, -4.4]],
    [[-1.3, 0.2], [1.3, 0.4], [1.4, -4.6], [1.3, -7.4], [-1.6, -7.4], [-2.2, -4.2]],
  ), rbox(-1.7, -7.5, -2.3, 1.7, 0.4, 1.5, 0.4)), F.W);
  s.add(hull([[-1.0, 1.1], [1.0, 1.1], [1.1, -2.0], [-1.1, -2.0]], [[0.7, 1.1], [1.7, 0.6], [2.0, -1.0], [1.4, -2.2], [0.7, -2.2]]), F.W); // knee
  s.paint(both(box(1.2, -5.8, -1.0, 1.8, -3.0, 0.6)), F.Y); // side vents
  s.paint(box(-1.8, -7.5, -2.4, 1.8, -7.0, 1.6), F.W2);
  s.add(cyl('y', 0, -0.3, 0.85, -7.4, -8.0), F.GR); // ankle
  s.add(hull(null, [[-2.2, -9.5], [3.4, -9.5], [3.4, -8.9], [1.6, -8.1], [-1.6, -7.8], [-2.2, -8.6]], [[-1.3, -2.2], [1.3, -2.2], [1.4, 2.0], [0.8, 3.4], [-0.8, 3.4], [-1.4, 2.0]]), F.W);
  s.paint(box(-1.5, -9.6, 1.8, 1.5, -7.5, 3.6), F.R); // toe caps
  s.paint(box(-1.5, -9.6, -2.4, 1.5, -9.2, 3.6), F.R2); // soles
  return s.model;
}

// Beam shield: a flat glowing disc projected off the left forearm.
function f91Shield(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 4.2, 0, 0.5), SHIELD_GLOW, { glow: 1.4, jitter: 0 });
  s.paint(fn([-1, -5, -5], [1, 5, 5], (x, y, z) => y * y + z * z > 3.5 * 3.5), SHIELD_GLOW, { glow: 2.2, jitter: 0 });
  return s.model;
}

export function f91Weapons(R = F91_R) {
  const S = () => new Sculpt(pal, R);
  const hilt = S();
  hilt.add(vbox(-1, -1, -1, 0, 0, 1), F.GR);
  hilt.add(vbox(-1, -1, 2, 0, 0, 2), F.DK);

  // Beam rifle: slimmer than the Gundam's, a small scope and a gold beam cell.
  const rifle = S();
  rifle.add(vbox(-1, -1, -2, 0, 1, 5), F.DK);
  rifle.add(vbox(-1, 2, -1, 0, 2, 3), F.GR);
  rifle.add(vbox(-2, 2, 1, -2, 3, 2), F.GR);
  rifle.add(vbox(-2, 3, 2, -2, 3, 2), VSBR_BEAM, { glow: 2, jitter: 0 });
  rifle.add(cyl('z', 0.5, 0, 0.55, 6, 11), F.GR);
  rifle.add(vbox(-1, -3, 0, 0, -2, 1), F.DK);
  rifle.add(vbox(-1, -1, 10, 0, 0, 10), F.DK);
  rifle.add(vbox(-1, 1, 5, 0, 1, 7), F.Y);

  // Beam launcher: a chunkier cannon with a glowing emitter instead of a physical muzzle flare.
  const launcher = S();
  launcher.add(vbox(-2, -1, -11, 1, 2, 9), 0x3a4458);
  launcher.add(vbox(-2, -2, -13, 1, 3, -11), 0x2a3040); // breech
  launcher.add(vbox(-1, -4, -1, 0, -2, 1), F.DK); // grip
  launcher.add(vbox(2, 2, -4, 3, 3, 2), F.GR); // sight
  launcher.add(vbox(3, 3, 2, 3, 3, 2), VSBR_BEAM, { glow: 2, jitter: 0 });
  launcher.add(vbox(-2, -2, 9, 1, 3, 11), VSBR_BEAM, { glow: 1.6, jitter: 0 }); // emitter collar
  launcher.add(vbox(0, 0, 12, 0, 0, 12), 0xffffff, { glow: 2.6, jitter: 0 });

  return { hilt: hilt.model, rifle: rifle.model, launcher: launcher.model };
}

export function f91Def(R = F91_R) {
  const uR = f91UpperArmR(R), fR = f91ForeArmR(R), thigh = f91Thigh(R), shin = f91Shin(R);
  const uL = uR.clone().flipX();
  // letters on the front faces of the shoulders: "F" on the right, "91" on the left
  Sculpt.on(uR, R).project(LETTER_F, [-2.6, 1.6, 4], { r: F.R });
  Sculpt.on(uL, R).project(LETTER_91, [0.2, 1.6, 4], { r: F.R });
  return rigDef(R, SCALE, 17.5, {
    hips: { parent: null, pivot: [0, 0, 0], model: f91Hips(R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: f91Torso(R) },
    vsbr: { parent: 'torso', pivot: [0, 5.4, -3.2], model: f91Vsbr(R) },
    head: { parent: 'torso', pivot: [0, 7.1, 0.1], model: f91Head(R) },
    uArmR: { parent: 'torso', pivot: [-4.9, 5.2, 0], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -5.0, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -5.4, 0], model: null },
    uArmL: { parent: 'torso', pivot: [4.9, 5.2, 0], model: uL },
    fArmL: { parent: 'uArmL', pivot: [0, -5.0, 0], model: fR.clone().flipX() },
    handL: { parent: 'fArmL', pivot: [2.4, -3, 0], model: f91Shield(R) },
    thighR: { parent: 'hips', pivot: [-1.8, -1, 0], model: thigh },
    shinR: { parent: 'thighR', pivot: [0, -7, 0], model: shin },
    thighL: { parent: 'hips', pivot: [1.8, -1, 0], model: thigh.clone() },
    shinL: { parent: 'thighL', pivot: [0, -7, 0], model: shin.clone() },
  });
}
