// MS-06 Zaku II, sculpted from reference renders with core/sculpt.js. What makes it read: a round dome head, the
// mono-eye glowing in a dark slit that wraps across the front, a snout feeding ribbed power pipes; a barrel chest over
// ribbed belly pipes; the curved shield on the right shoulder and the spiked pauldron on the left; a pleated front
// skirt; bulbous lower legs. Light tone on the head, shoulders, forearms and lower legs, dark on the chest, skirt and
// thighs. Commanders carry an antenna on the left of the head; Char's red Zaku a tall blade horn on the brow.
// The crowd builds it at R = 1 (up to 300 of them are drawn at once); commanders and Char at R = 2, the same shapes
// with twice the detail.
import { Sculpt, box, rbox, ell, cyl, hull, half, fn, and, or, sub, both, rot, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const Z = {
  DG: 0x3e6a3c, LG: 0x78a85a, J: 0x4b5049, P: 0x676f64, P2: 0x3a4039, SL: 0x151716,
  SP: 0xb8bcb0, EYE: 0xff2f6e,
};
const vbox = (x0, y0, z0, x1, y1, z1) => box(x0, y0, z0, x1 + 1, y1 + 1, z1 + 1);
// ribbed pipe: alternate the two pipe tones along y
const ribs = (s, sh, c) => { s.add(sh, c.P2); s.paint(and(sh, fn(sh.lo, sh.hi, (x, y) => Math.floor(y * 2) % 2 === 0)), c.P); };

function zakuHead(c, horn, R) {
  const s = new Sculpt(pal, R);
  const dome = and(ell(0, 2.3, 0, 2.9, 2.9, 3.1), half(0, -1, 0, -0.1));
  s.add(dome, c.LG);
  s.add(cyl('y', 0, 0, 1.6, -0.6, 0.4), c.J); // neck ring
  // the mono-eye slit wraps across the front
  s.paint(and(dome, fn([-3, 1.8, 0.4], [3, 3.1, 4], (x, y, z) => z > 0.9 - Math.abs(x) * 0.1)), c.SL);
  s.cut(and(sub(dome, ell(0, 2.3, 0, 2.5, 2.5, 2.7)), fn([-3, 2.0, 1.0], [3, 2.9, 4], (x, y, z) => z > 1.2)));
  s.add(and(ell(0, 2.3, 0, 2.6, 2.6, 2.8), fn([-3, 2.0, 1.0], [3, 2.9, 4], (x, y, z) => z > 1.2)), c.SL);
  s.add(box(-0.5, 2.0, 2.3, 0.5, 2.9, 2.9), Z.EYE, { glow: 3.2, jitter: 0 });
  s.add(box(-0.2, 5.0, -2.2, 0.2, 5.4, 1.4), c.LG); // crest ridge along the dome
  // snout under the eye, a grille in front, and ribbed pipes looping back from its sides
  s.add(rbox(-0.9, 0.3, 1.7, 0.9, 1.6, 3.5, 0.3), c.LG);
  s.paint(box(-0.7, 0.4, 3.2, 0.7, 1.3, 3.6), c.J);
  for (const sx of [-1, 1]) ribs(s, rot(cyl('y', sx * 1.4, 2.2, 0.42, -0.4, 1.2), [0.9, 0, sx * -0.5], [sx * 1.4, 1.0, 2.2]), c);
  if (horn === 'char') { // a tall blade horn up from the brow
    s.add(hull([[-0.35, 3.8], [0.35, 3.8], [0.35, 9.6], [-0.35, 9.6]], [[3.0, 3.6], [2.0, 6.5], [1.2, 9.6], [0.8, 9.4], [0.9, 6], [0.6, 4.4]]), c.LG);
  } else if (horn === 'cmd') { // commander's antenna on the left of the head
    s.add(box(2.5, 2.4, -0.6, 3.1, 3.4, 0.6), c.P2);
    s.add(rot(box(2.5, 3.2, -0.45, 3.4, 7.4, 0.55), [0, 0, -0.18], [2.9, 3.2, 0]), c.SP); // one voxel thick even at R = 1
  }
  return s.model;
}

function zakuTorso(c, R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.2, -0.6, -2.2, 3.2, 2.4, 2.0, 0.5), c.J); // belly
  // barrel chest, the cockpit panel darker down its front
  const chest = and(rbox(-5.4, 1.8, -3.6, 5.4, 8.8, 3.2, 1.4), ell(0, 4.8, -0.3, 6.8, 6.4, 5.0));
  s.add(chest, c.DG);
  s.paint(and(chest, fn([-2, 2, 1], [2, 5.6, 5], (x, y) => Math.abs(x) < 1.2 - (y - 2) * 0.08)), c.J);
  s.paint(and(chest, box(-6, 1.8, -4, 6, 2.4, 4)), c.P2);
  // ribbed pipes looping from the chest down into the belly
  for (const sx of [-1, 1]) ribs(s, cyl('y', sx * 2.9, 2.3, 0.6, -0.4, 2.6), c);
  s.add(rbox(-2.8, 8.2, -2.4, 2.8, 9.6, 2.2, 0.5), c.DG); // collar
  // backpack, two thruster bells under it
  s.add(rbox(-4.0, 2.2, -6.4, 4.0, 8.2, -3.0, 0.8), c.DG);
  s.paint(box(-4.1, 2.1, -6.5, 4.1, 2.8, -2.9), c.J);
  s.add(both(cyl('y', 2.0, -5.0, 0.8, 2.3, 1.0, 1.1)), c.SL);
  return s.model;
}

// Right upper arm: the curved shield standing off the outside of the shoulder.
function zakuUpperArmR(c, R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-2.4, -1.2, -1.4, 1.2, 1.4, 1.2, 0.4), c.J); // shoulder joint block
  s.add(cyl('y', 0, 0, 1.1, -1.0, -5.4), c.J);
  const plate = fn([-5, -5, -3.8], [-2, 4.4, 3.8], (x, y, z) => {
    const hz = y > 3.2 ? 3.4 - (y - 3.2) * 1.4 : y < -3.9 ? 3.4 - (-3.9 - y) * 1.6 : 3.4; // rounded top and bottom corners
    const face = -3.2 - 0.6 * (1 - (z / 3.6) ** 2); // bows outward
    return Math.abs(z) <= hz && x >= face - 0.9 && x <= face && y <= 4.2 && y >= -4.6;
  });
  s.add(plate, c.LG);
  s.paint(and(plate, fn([-5, -5, -4], [-2, 5, 4], (x, y, z) => Math.abs(z) > 2.8 || y > 3.3 || y < -4.1)), c.DG); // rim
  return s.model;
}
// Left upper arm: the rounded pauldron studded with spikes.
function zakuUpperArmL(c, R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-1.2, -1.2, -1.4, 2.4, 1.4, 1.2, 0.4), c.J);
  s.add(cyl('y', 0, 0, 1.1, -1.0, -5.4), c.J);
  const shell = and(ell(0.9, 0.6, -0.2, 3.3, 3.2, 3.5), half(0, -1, 0, 1.6), half(-1, 0, 0, 1.4));
  s.add(shell, c.LG);
  s.paint(and(shell, half(0, 1, 0, -1.0)), c.DG);
  for (const [y, z] of [[0.6, -1.9], [0.6, 1.5], [2.4, -0.2]]) s.add(cyl('x', y, z, 0.75, 3.6, 6.2, 0.05), c.SP); // spikes out
  s.add(cyl('y', 1.6, -0.2, 0.75, 3.4, 5.8, 0.05), c.SP); // and one up
  return s.model;
}

function zakuForeArmR(c, R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 0.9, -1.1, 1.1), c.J); // elbow
  s.add(and(rbox(-1.8, -5.2, -1.8, 1.6, -0.7, 1.7, 0.5), ell(-0.1, -2.6, 0, 2.3, 3.8, 2.3)), c.LG);
  s.paint(box(-2, -5.3, -2, 2, -4.6, 2), c.DG); // cuff
  s.add(rbox(-1.0, -7.2, -0.9, 0.9, -5.0, 1.1, 0.35), c.J); // fist
  return s.model;
}

function zakuHips(c, R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.8, -1.6, -2.2, 3.8, 1.6, 2.0, 0.5), c.DG); // waist
  s.add(hull([[-1.0, 0.8], [1.0, 0.8], [1.0, -2.4], [0, -3.0], [-1.0, -2.4]], [[0.8, 0.8], [2.5, 0.8], [2.5, -3.0], [0.8, -3.0]]), c.J); // crotch
  // front skirt: two big plates, pleated, flaring forward toward the hem
  const plate = hull([[0.6, 1.4], [3.9, 1.4], [4.4, -4.0], [0.8, -4.2]], [[1.6, 1.4], [2.8, 1.4], [3.8, -4.2], [2.6, -4.2]]);
  s.add(both(plate), c.DG);
  s.paint(both(and(plate, fn([0, -5, 0], [5, 2, 5], (x) => Math.floor(x * 1.4) % 2 === 0))), c.J);
  s.paint(both(and(plate, half(0, 1, 0, -3.6))), c.P2);
  s.add(both(hull([[3.9, 1.2], [4.8, 1.2], [5.3, -3.8], [4.2, -3.8]], [[-2.2, 1.2], [1.8, 1.2], [1.8, -3.8], [-2.4, -3.8]])), c.DG); // side skirts
  s.add(hull([[-3.6, 1.2], [3.6, 1.2], [3.9, -3.8], [-3.9, -3.8]], [[-1.8, 1.2], [-2.8, 1.2], [-3.4, -3.8], [-2.4, -3.8]]), c.DG); // rear skirt
  return s.model;
}

function zakuThigh(c, R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, -0.3, 0, 1.3), c.J);
  s.add(rbox(-1.9, -7.0, -1.9, 1.9, -0.8, 1.9, 0.6), c.DG);
  s.paint(box(-2, -5.4, -2, 2, -5.0, 2), c.P2);
  s.paint(box(-2, -3.4, -2, 2, -3.0, 2), c.P2);
  return s.model;
}
// Shin: the bulbous lower leg swelling over a flat foot. Both legs share it.
function zakuShin(c, R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.2, -1.5, 1.5), c.J); // knee
  s.add(and(ell(0, -3.3, -0.3, 3.1, 4.6, 3.3), half(0, 1, 0, 0.4), half(0, -1, 0, 6.6)), c.LG);
  s.paint(and(ell(0, -3.3, -0.3, 3.2, 4.7, 3.4), half(0, -1, 0, 1.4), half(0, 0, -1, -0.6)), c.DG); // knee guard
  s.add(rbox(-2.4, -6.9, -2.0, 2.4, -6.0, 2.0, 0.4), c.J); // ankle
  s.add(hull(null, [[-3.4, -8], [3.8, -8], [3.8, -7.4], [2.4, -6.6], [-2.8, -6.6], [-3.4, -7.2]], [[-2.4, -3.4], [2.4, -3.4], [2.6, 2.6], [1.6, 3.8], [-1.6, 3.8], [-2.6, 2.6]]), c.LG); // foot
  s.paint(box(-3, -8.1, -3.6, 3, -7.6, 4), c.DG);
  return s.model;
}

function heatHawk(R) {
  const s = new Sculpt(pal, R);
  s.add(vbox(0, -1, -2, 0, 0, 5), 0x5a5f58);
  s.add(vbox(0, -1, 3, 0, 0, 3), 0x2d302c);
  s.add(vbox(0, -4, 4, 0, -2, 7), 0xff7a24, { glow: 2.4, jitter: 0.08 });
  s.add(vbox(0, -5, 5, 0, -5, 7), 0xffb24a, { glow: 2.8, jitter: 0.05 });
  s.add(vbox(0, -1, 7, 0, -1, 7), 0xff7a24, { glow: 2.4 });
  return s.model;
}
function zakuMG(R) {
  const s = new Sculpt(pal, R);
  s.add(vbox(-1, -1, -3, 0, 1, 6), 0x353a36);
  s.add(cyl('z', 0.5, 0, 0.5, 7, 12), 0x5a5f58); // barrel
  s.add(cyl('x', 1.5, 1.5, 1.6, -3, -1), 0x454b45); // drum magazine
  s.add(vbox(-1, -3, 1, 0, -2, 2), 0x353a36);
  return s.model;
}

export function zakuDef(colors = Z, horn = null, R = 1) {
  const fR = zakuForeArmR(colors, R), thigh = zakuThigh(colors, R), shin = zakuShin(colors, R);
  return rigDef(R, 0.1, 16, {
    hips: { parent: null, pivot: [0, 0, 0], model: zakuHips(colors, R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: zakuTorso(colors, R) },
    head: { parent: 'torso', pivot: [0, 8.8, 0.3], model: zakuHead(colors, horn, R) },
    uArmR: { parent: 'torso', pivot: [-7, 6, 0], model: zakuUpperArmR(colors, R) },
    fArmR: { parent: 'uArmR', pivot: [0, -5, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -6, 0], model: null },
    hawk: { parent: 'hand', pivot: [0, 0, 0], model: heatHawk(R), bit: 1 },
    gun: { parent: 'hand', pivot: [0, 0, 0], model: zakuMG(R), bit: 2 },
    uArmL: { parent: 'torso', pivot: [7, 6, 0], model: zakuUpperArmL(colors, R) },
    fArmL: { parent: 'uArmL', pivot: [0, -5, 0], model: fR.clone().flipX() },
    thighR: { parent: 'hips', pivot: [-2.4, -1, 0], model: thigh },
    shinR: { parent: 'thighR', pivot: [0, -7, 0], model: shin },
    thighL: { parent: 'hips', pivot: [2.4, -1, 0], model: thigh.clone() },
    shinL: { parent: 'thighL', pivot: [0, -7, 0], model: shin.clone() },
  });
}

export const CHAR_COLORS = { ...Z, DG: 0xa82838, LG: 0xe8707e, J: 0x5a3a40, P: 0x7a5a60, P2: 0x4a2a30 };
export const CMD_COLORS = { ...Z, DG: 0x355e45, LG: 0x6e9e78 };
export const CAPT_COLORS = { ...Z, DG: 0x5a6440, LG: 0x9fae6c, J: 0x4a4a3e };

// Named officers are single rigs, so they get the finer build.
export function charDef() {
  return zakuDef(CHAR_COLORS, 'char', 2);
}
export function commanderDef() {
  return zakuDef(CMD_COLORS, 'cmd', 2);
}
export function captainDef() {
  return zakuDef(CAPT_COLORS, 'cmd', 2);
}
