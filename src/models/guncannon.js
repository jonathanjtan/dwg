// RX-77-2 Guncannon, sculpted from reference renders (see core/sculpt.js). What makes it read: a small pale helmet
// with a green goggle visor, sunk between two long dark 240mm cannons that stand up off the backpack; a big square red
// chest with an amber stripe along its hem; dark teal dome shoulders, teal elbows and hands; a gold lamp on the belt;
// heavy red legs with huge rounded knee plates, long shins and dark feet. Bulkier and blunter than the Gundam, with a
// smaller head. The cannons are their own node so they can swing down over the shoulders to fire.
import { Sculpt, box, rbox, ell, cyl, hull, half, and, or, both, rot, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const GUNCANNON_R = 2;
const SCALE = 0.1;
export const GUNCANNON_VOXEL = SCALE / GUNCANNON_R;
// cannons node: barrels either side of the head, muzzles at this height above the mount (world units)
export const GC_CANNON_X = 0.34, GC_CANNON_TOP = 1.0;

const GC = {
  R: 0xd23b2c, R2: 0xa42b20, R3: 0x7a1e18, T: 0x4a8784, T2: 0x33605e, T3: 0x5a7c7d,
  K: 0x3e4450, K2: 0x2c313b, K3: 0x1e2128, C: 0xe4e1d8, C2: 0xb8b4a8, A: 0xf0a42a, GOLD: 0xf2c640,
};
const vbox = (x0, y0, z0, x1, y1, z1) => box(x0, y0, z0, x1 + 1, y1 + 1, z1 + 1);

function gcHead(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('y', 0, -0.1, 0.9, -0.6, 0.6), GC.T2); // neck
  s.add(rbox(-1.7, 0.2, -1.8, 1.7, 3.5, 1.6, 0.8), GC.C); // round helmet
  s.add(both(cyl('x', 1.0, -0.2, 0.75, 1.4, 2.0)), GC.C2); // ear pods
  s.add(box(-1.45, 0.3, 0.9, 1.45, 1.4, 1.9), GC.K2); // mouth grille
  for (const x of [-0.8, 0, 0.8]) s.paint(box(x - 0.15, 0.3, 1.2, x + 0.15, 1.4, 2), GC.K);
  s.add(box(-1.6, 1.5, 0.6, 1.6, 2.4, 1.9), 0x6affb4, { glow: 1.6, jitter: 0 }); // the goggle
  s.paint(box(-1.7, 1.5, 0.5, -1.2, 2.4, 2), GC.T2);
  s.paint(box(1.2, 1.5, 0.5, 1.7, 2.4, 2), GC.T2);
  s.add(box(-0.3, 3.2, -1.5, 0.3, 3.9, 1.2), GC.R); // red crest along the crown
  s.add(cyl('y', -1.25, -0.6, 0.18, 3.0, 5.4), GC.C2); // antenna
  return s.model;
}

function gcTorso(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.8, -0.3, -2.4, 3.8, 2.8, 2.2, 0.5), GC.R2); // abdomen
  for (const y of [0.5, 1.5]) s.paint(box(-3.9, y, -2.5, 3.9, y + 0.3, 2.4), GC.R3);
  // chest: a big square block, the upper chest standing a little proud
  const chest = hull([[-4.2, 2.4], [4.2, 2.4], [4.7, 5], [4.7, 9.6], [-4.7, 9.6], [-4.7, 5]], [[-3.0, 2.4], [2.6, 2.4], [3.0, 4.8], [3.0, 9.0], [2.4, 9.6], [-3.0, 9.6]]);
  s.add(and(chest, rbox(-4.8, 2.3, -3.1, 4.8, 9.7, 3.1, 0.5)), GC.R);
  s.paint(box(-5, 2.3, -3.2, 5, 3.1, 3.2), GC.R2); // hem
  s.paint(box(-5, 3.1, 2.2, 5, 3.5, 3.2), GC.A); // amber stripe
  s.paint(box(-0.2, 3.5, 2.6, 0.2, 9.6, 3.2), GC.R3); // centre seam
  s.paint(both(box(1.4, 6.4, 2.6, 3.6, 7.8, 3.2)), GC.R2); // intake panels with dark slots
  for (const y of [6.7, 7.3]) s.paint(both(box(1.6, y, 2.6, 3.4, y + 0.25, 3.2)), GC.K3);
  s.add(box(-2, 9.2, -2.2, 2, 10.2, 2.0), GC.T2); // collar
  s.add(both(hull([[1.8, 9.2], [3.4, 9.2], [3.0, 10.6], [1.8, 10.8]], [[-2.4, 9.2], [2.2, 9.2], [1.8, 10.6], [-2.4, 10.8]])), GC.R);
  // backpack that carries the cannons
  s.add(rbox(-3.6, 2.8, -5.0, 3.6, 8.8, -2.8, 0.5), GC.K2);
  s.paint(box(-3.7, 2.7, -5.1, 3.7, 3.3, -2.7), GC.K3);
  s.add(both(cyl('y', 1.6, -4.2, 0.8, 2.9, 1.8, 1.05)), GC.K3);
  return s.model;
}

// Twin 240mm cannons standing up from the mount (the node's pivot), either side of the head.
function gcCannons(R) {
  const s = new Sculpt(pal, R);
  const X = GC_CANNON_X * 10, TOP = GC_CANNON_TOP * 10;
  s.add(box(-X - 1, -0.8, -0.9, X + 1, 0.8, 0.9), GC.K3); // cross mount
  for (const x of [-X, X]) {
    s.add(rbox(x - 1.3, -1.4, -1.5, x + 1.3, 2.6, 1.4, 0.4), GC.K2); // breech
    s.add(cyl('y', x, -0.1, 1.0, 2.4, TOP), GC.K); // barrel
    s.add(cyl('y', x, -0.1, 1.12, 4.6, 5.2), GC.K2); // barrel band
    s.add(cyl('y', x, -0.1, 1.2, TOP - 1.3, TOP), GC.K2); // muzzle
    s.cut(cyl('y', x, -0.1, 0.62, TOP - 0.8, TOP + 0.1));
  }
  return s.model;
}

// Right upper arm (outside toward -x): a dark teal dome over a red upper arm. The left mirrors it.
function gcUpperArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(and(ell(-0.6, 0.4, 0, 3.2, 3.1, 3.2), half(0, -1, 0, 2.0)), GC.T); // the dome
  s.paint(and(ell(-0.6, 0.4, 0, 3.3, 3.2, 3.3), half(0, 1, 0, -1.4)), GC.T2);
  s.add(rbox(-1.5, -5.6, -1.5, 1.4, -1.5, 1.5, 0.4), GC.R); // upper arm
  s.paint(box(-1.6, -5.7, -1.6, 1.5, -5.1, 1.6), GC.R2);
  return s.model;
}

function gcForeArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.05, -1.3, 1.3), GC.T); // elbow
  s.add(and(hull([[1.5, -0.7], [1.6, -5.3], [-1.7, -5.3], [-1.6, -0.7]], [[-1.6, -0.7], [1.6, -0.7], [1.7, -5.3], [-1.7, -5.3]]), rbox(-1.8, -5.4, -1.8, 1.7, -0.6, 1.8, 0.4)), GC.R);
  s.paint(box(-1.9, -5.4, -1.9, 1.8, -4.8, 1.9), GC.R2); // cuff
  s.add(rbox(-1.2, -7.6, -1.1, 1.1, -5.2, 1.3, 0.4), GC.T); // fist
  s.paint(box(-1.3, -6.2, 0.9, 1.2, -5.8, 1.4), GC.T2);
  return s.model;
}

function gcHips(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-4.4, -1.2, -2.4, 4.4, 1.6, 2.3, 0.5), GC.R); // waist
  s.add(box(-4.5, 1.0, -2.5, 4.5, 2.0, 2.4), GC.T2); // belt
  s.add(cyl('z', 0, 1.5, 0.55, 2.2, 2.6), GC.GOLD, { glow: 0.9, jitter: 0 }); // the belt lamp
  s.add(hull([[-1.1, 1], [1.1, 1], [1.1, -2.4], [0, -3.0], [-1.1, -2.4]], [[0.8, 1], [2.5, 1], [2.5, -3.0], [0.8, -3.0]]), GC.R2); // crotch
  const skirt = hull([[1.1, 1.0], [4.3, 1.0], [4.7, -3.0], [1.3, -3.0]], [[1.2, 1.0], [2.6, 1.0], [3.1, -3.0], [1.8, -3.0]]);
  s.add(both(skirt), GC.R);
  s.paint(both(and(skirt, half(0, 1, 0, -2.4))), GC.R2);
  s.add(both(hull([[4.3, 1.0], [5.1, 1.0], [5.5, -2.4], [4.6, -2.4]], [[-2.0, 1.0], [1.8, 1.0], [1.8, -2.4], [-2.0, -2.4]])), GC.R); // side skirts
  s.add(hull([[-4.0, 1.0], [4.0, 1.0], [4.2, -2.6], [-4.2, -2.6]], [[-1.8, 1.0], [-2.8, 1.0], [-3.2, -2.6], [-2.2, -2.6]]), GC.R); // rear skirt
  return s.model;
}

function gcThigh(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, -0.3, 0, 1.3), GC.T2);
  s.add(rbox(-2.4, -6.2, -2.3, 2.4, -0.8, 2.3, 0.5), GC.R);
  s.paint(box(-2.5, -2.2, -2.4, 2.5, -1.8, 2.4), GC.R2);
  return s.model;
}

// Shin: the big rounded knee plate, a long red lower leg widening to the ankle, dark feet. Both legs share it.
function gcShin(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.2, -1.6, 1.6), GC.T2);
  s.add(and(hull(
    [[-2.5, 0.4], [2.5, 0.4], [2.8, -6], [3.1, -9.0], [-3.1, -9.0], [-2.8, -6]],
    [[-2.5, 0.4], [1.8, 0.4], [2.1, -6], [2.4, -9.0], [-2.8, -9.0], [-3.0, -4.5]],
  ), rbox(-3.2, -9.1, -3.1, 3.2, 0.5, 2.5, 0.5)), GC.R);
  s.paint(box(-3.3, -9.1, -3.2, 3.3, -8.4, 2.6), GC.R2); // ankle hem
  s.paint(both(box(2.6, -7.6, -1.8, 3.3, -2.4, 0.8)), GC.R2); // side panels
  // knee plate: a big rounded shell over the knee and upper shin
  s.add(and(ell(0, -1.0, 0.8, 2.7, 3.3, 2.5), half(0, 0, -1, -0.4)), GC.R);
  s.paint(and(ell(0, -1.0, 0.8, 2.8, 3.4, 2.6), half(0, 1, 0, -3.6)), GC.R2);
  // foot: dark, blunt and wide
  s.add(cyl('y', 0, -0.3, 1.2, -9.0, -9.7), GC.K2);
  s.add(hull(null, [[-3.0, -12], [3.9, -12], [3.9, -11.2], [2.4, -9.8], [-3.0, -9.4]], [[-2.4, -3.0], [2.4, -3.0], [2.5, 2.8], [1.7, 3.9], [-1.7, 3.9], [-2.5, 2.8]]), GC.T3);
  s.paint(box(-2.6, -12.1, -3.2, 2.6, -11.6, 4.2), GC.K2);
  return s.model;
}

export function guncannonWeapons(R = GUNCANNON_R) {
  const rifle = new Sculpt(pal, R); // the old rifle's blocks, rebuilt at the suit's density
  rifle.add(vbox(-1, -1, -3, 0, 1, 7), 0x363b46); // body
  rifle.add(vbox(-1, 2, -1, 0, 2, 4), 0x4a505c);
  rifle.add(cyl('z', 0.5, 0, 0.6, 8, 15), 0x4a505c); // barrel
  rifle.add(vbox(-1, -1, 14, 0, 0, 14), 0x24272d);
  rifle.add(vbox(-1, -4, 1, 0, -2, 2), 0x24272d); // grip
  rifle.add(vbox(-2, 2, 1, -2, 3, 2), 0x4a505c); // sensor
  rifle.add(vbox(-2, 3, 3, -2, 3, 3), 0xffa040, { glow: 2, jitter: 0 });
  return { rifle: rifle.model };
}

export function guncannonDef(R = GUNCANNON_R) {
  const uR = gcUpperArmR(R), fR = gcForeArmR(R), thigh = gcThigh(R), shin = gcShin(R);
  return rigDef(R, SCALE, 19, {
    hips: { parent: null, pivot: [0, 0, 0], model: gcHips(R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: gcTorso(R) },
    cannons: { parent: 'torso', pivot: [0, 6.8, -4.2], model: gcCannons(R) },
    head: { parent: 'torso', pivot: [0, 9.6, 0.2], model: gcHead(R) },
    uArmR: { parent: 'torso', pivot: [-6.6, 7.6, 0], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -5.6, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -6.6, 0], model: null },
    uArmL: { parent: 'torso', pivot: [6.6, 7.6, 0], model: uR.clone().flipX() },
    fArmL: { parent: 'uArmL', pivot: [0, -5.6, 0], model: fR.clone().flipX() },
    handL: { parent: 'fArmL', pivot: [0, -6.6, 0], model: null },
    thighR: { parent: 'hips', pivot: [-2.9, -1, 0], model: thigh },
    shinR: { parent: 'thighR', pivot: [0, -6, 0], model: shin },
    thighL: { parent: 'hips', pivot: [2.9, -1, 0], model: thigh.clone() },
    shinL: { parent: 'thighL', pivot: [0, -6, 0], model: shin.clone() },
  });
}
