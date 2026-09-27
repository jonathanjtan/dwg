// RX-78-2 Gundam, sculpted from reference renders (see core/sculpt.js). What makes it read: a narrow white head with
// the gold V-fin over a red forehead camera, yellow-green eyes and a red chin; a blue chest with two yellow slatted
// vents over a red belly, the blue cockpit strip running down between; white hips with yellow blocks on the front
// skirts and the red crotch with its yellow V; boxy white shoulders and arms, dark fists; long white legs on red feet;
// two beam saber hilts standing up off the backpack; the red shield with its white rim and yellow star.
// Long in the leg against the old model: knees at a third of the height, the crotch just past half.
import { Sculpt, box, rbox, ell, cyl, hull, half, fn, and, or, both, rot, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const GUNDAM_R = 2;
const SCALE = 0.1;
export const GUNDAM_VOXEL = SCALE / GUNDAM_R; // for the weapons, meshed apart from the rig

const G = {
  W: 0xeceef3, W2: 0xc9cdd8, W3: 0x9ca2b0, B: 0x2452b8, B2: 0x193c8c, R: 0xcf2330, R2: 0x9a1822,
  Y: 0xf4c21e, Y2: 0xb88a0e, GR: 0x6a707e, DK: 0x2a2e38,
};
const EYE = { glow: 1.8, jitter: 0 };
// An old integer voxel box, inclusive, as design-space bounds: lets the weapons keep their coordinates.
const vbox = (x0, y0, z0, x1, y1, z1) => box(x0, y0, z0, x1 + 1, y1 + 1, z1 + 1);

function gHead(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-1.3, 0.3, -1.6, 1.3, 3.3, 1.4, 0.5), G.W); // helmet
  s.add(cyl('y', 0, -0.1, 0.9, -0.5, 0.6), G.GR); // neck
  s.add(both(rbox(1.1, 0.8, -1.2, 1.8, 2.6, 0.9, 0.3)), G.W); // ear blocks
  s.paint(both(cyl('x', 1.6, -0.1, 0.45, 1.6, 1.9)), G.W3);
  s.add(both(cyl('z', 1.05, 2.75, 0.22, 0.4, 1.8)), G.Y); // vulcans
  // face: grey plate, eyes either side of a white ridge, a red chin
  s.add(box(-1.1, 0.5, 1.1, 1.1, 2.2, 1.7), G.W3);
  s.add(both(box(0.25, 1.5, 1.4, 1.05, 2.0, 1.8)), 0xd8ff50, EYE);
  s.add(box(-0.25, 0.9, 1.4, 0.25, 2.3, 1.8), G.W);
  s.add(hull([[-0.8, 0.2], [0.8, 0.2], [0.8, 1.0], [-0.8, 1.0]], [[1.0, 0.2], [1.9, 0.5], [1.8, 1.0], [1.0, 1.0]]), G.R);
  s.add(box(-1.3, 2.2, 1.2, 1.3, 2.6, 1.7), G.W); // brow
  s.add(box(-0.35, 2.4, 1.3, 0.35, 3.2, 1.9), G.R); // forehead camera
  s.add(box(-0.2, 2.6, 1.6, 0.2, 3.0, 2.0), 0x8affff, { glow: 1.2, jitter: 0 });
  // V-fin: two gold blades from the forehead, out and up past the ears
  s.add(both(rot(box(0.1, 2.9, 1.4, 2.7, 3.35, 1.9), [0, 0, 0.55], [0.1, 2.9, 1.6])), G.Y);
  s.add(box(-0.4, 2.8, 1.4, 0.4, 3.3, 2.0), G.Y);
  s.add(box(-0.3, 3.3, -0.4, 0.3, 3.6, 1.2), G.W); // crest ridge
  return s.model;
}

function gTorso(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.0, -0.2, -1.8, 3.0, 2.4, 1.7, 0.5), G.R); // belly
  s.add(box(-0.7, -0.2, 1.3, 0.7, 2.4, 1.9), G.B); // the cockpit strip runs down it
  for (const y of [0.4, 1.2]) s.paint(both(box(1.2, y, 1, 2.8, y + 0.35, 2)), G.R2); // belly ribs
  // chest: blue, wider at the shoulders, the hatch standing proud in the middle
  const chest = hull(
    [[-3.5, 2.2], [3.5, 2.2], [4.1, 3.4], [4.1, 7], [-4.1, 7], [-4.1, 3.4]],
    [[-2.3, 2.2], [2.0, 2.2], [2.5, 3.6], [2.3, 7], [-2.3, 7]],
  );
  s.add(and(chest, rbox(-4.2, 2.1, -2.4, 4.2, 7.1, 2.6, 0.5)), G.B);
  s.add(box(-0.8, 2.2, 1.9, 0.8, 6.8, 2.8), G.B); // cockpit hatch
  s.paint(box(-0.8, 2.2, 2.3, 0.8, 2.7, 3), G.B2);
  // yellow slatted vents on the upper chest
  s.add(both(box(0.95, 4.9, 2.1, 3.0, 6.6, 2.7)), G.Y);
  for (const y of [5.4, 6.0]) s.paint(both(box(1.1, y, 2.2, 2.9, y + 0.3, 3)), G.DK);
  s.add(box(-1.9, 6.8, -1.6, 1.9, 7.6, 1.5), G.W); // collar
  s.add(both(box(1.9, 6.6, -2.0, 3.4, 7.4, 1.9)), G.W);
  // backpack, two thrusters under it and the beam saber hilts standing up behind the shoulders
  s.add(rbox(-2.5, 2.2, -4.0, 2.5, 6.8, -2.2, 0.4), G.W2);
  s.paint(box(-2.6, 2.1, -4.1, 2.6, 2.7, -2.1), G.W3);
  s.add(both(cyl('y', 1.3, -3.2, 0.7, 2.2, 1.0, 0.95)), G.GR);
  s.add(both(cyl('y', 1.3, -3.2, 0.4, 1.6, 1.0, 0.7)), G.DK);
  const lean = (sh) => both(rot(sh, [-0.1, 0, -0.3], [1.7, 5.4, -3.4]));
  s.add(lean(or(cyl('y', 1.7, -3.4, 0.5, 5.2, 11.6), cyl('y', 1.7, -3.4, 0.62, 5.0, 6.4))), G.W2);
  s.paint(lean(box(0.9, 10.6, -4.4, 2.5, 11.8, -2.4)), G.GR);
  return s.model;
}

// Right upper arm (outside toward -x): a boxy shoulder over a white upper arm. The left mirrors it.
function gUpperArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(and(hull([[1.3, -3.0], [1.3, 1.6], [0.4, 2.2], [-1.8, 2.2], [-2.2, 1.6], [-2.2, -3.0]], [[-2.0, -3.0], [-2.0, 1.8], [-1.5, 2.2], [1.5, 2.2], [2.0, 1.8], [2.0, -3.0]]), rbox(-2.3, -3.1, -2.1, 1.4, 2.3, 2.1, [0.6, 0.6, 0.4])), G.W);
  s.paint(box(-3, 1.4, -3, 2, 1.8, 3), G.W2); // shoulder seam
  s.paint(box(-3, -3.1, -3, 2, -2.6, 3), G.W2);
  s.add(rbox(-1.1, -5.6, -1.1, 1.1, -2.8, 1.1, 0.3), G.W); // upper arm
  s.add(box(-1.2, -5.0, -1.2, 1.2, -4.6, 1.2), G.W2);
  return s.model;
}

function gForeArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 0.9, -1.1, 1.1), G.GR); // elbow
  s.add(hull([[1.3, -0.6], [1.4, -4.9], [-1.5, -4.9], [-1.4, -0.6]], [[-1.3, -0.6], [1.3, -0.6], [1.5, -4.9], [-1.5, -4.9]]), G.W);
  s.paint(box(-2, -5, -2, 2, -4.4, 2), G.W2); // cuff
  s.paint(box(-2, -0.8, 1.2, 2, -0.5, 2), G.W2);
  s.add(rbox(-0.95, -6.8, -0.9, 0.95, -4.8, 1.1, 0.35), G.DK); // fist
  return s.model;
}

function gHips(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.2, -1.0, -1.9, 3.2, 2.0, 1.8, 0.4), G.W); // waist
  s.add(box(-3.3, 1.2, -2.0, 3.3, 2.0, 1.9), G.W2);
  // crotch: white, a red panel with a yellow V
  s.add(hull([[-1.0, 1.4], [1.0, 1.4], [1.0, -2.2], [0, -2.8], [-1.0, -2.2]], [[0.6, 1.4], [2.4, 1.4], [2.5, -2.8], [0.6, -2.8]]), G.W);
  s.paint(box(-0.8, -1.6, 1.8, 0.8, 0.9, 3), G.R);
  s.project(['y..y', '.yy.'], [-2 / R, 0.4, 4], { y: G.Y });
  // front skirts, flared a little, yellow blocks across their tops
  const skirt = hull([[1.1, 1.4], [3.3, 1.4], [3.6, -2.4], [1.2, -2.6]], [[1.0, 1.4], [2.1, 1.4], [2.7, -2.6], [1.6, -2.6]]);
  s.add(both(skirt), G.W);
  s.paint(both(and(skirt, box(1.3, -0.9, 0, 3.2, 1.1, 4))), G.Y);
  s.paint(both(and(skirt, half(0, 1, 0, -2.1))), G.W2);
  s.add(both(hull([[3.2, 1.4], [3.9, 1.4], [4.3, -2.2], [3.5, -2.2]], [[-1.8, 1.4], [1.6, 1.4], [1.6, -2.2], [-1.8, -2.2]])), G.W); // side skirts
  s.add(hull([[-2.8, 1.4], [2.8, 1.4], [3.0, -2.4], [-3.0, -2.4]], [[-1.7, 1.4], [-2.4, 1.4], [-2.8, -2.4], [-2.1, -2.4]]), G.W); // rear skirt
  return s.model;
}

function gThigh(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, -0.3, 0, 1.2), G.GR);
  s.add(and(hull([[-1.5, -1.0], [1.5, -1.0], [1.6, -5], [1.4, -8], [-1.4, -8], [-1.6, -5]], [[-1.6, -1.0], [1.6, -1.0], [1.8, -5], [1.5, -8], [-1.5, -8]]), rbox(-1.7, -8.1, -1.9, 1.7, -0.8, 1.9, 0.45)), G.W);
  s.paint(box(-2, -2.2, -2, 2, -1.8, 2), G.W2);
  return s.model;
}

// Shin: knee pad, a long white lower leg swelling at the calf, grey ankle, red foot. Symmetric, so both legs share it.
function gShin(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.1, -1.2, 1.2), G.GR);
  s.add(and(hull(
    [[-1.6, 0.2], [1.6, 0.2], [1.9, -4.5], [1.7, -7.6], [2.0, -9.2], [-2.0, -9.2], [-1.7, -7.6], [-1.9, -4.5]],
    [[-1.6, 0.2], [1.5, 0.4], [1.7, -5], [1.5, -7.6], [1.8, -9.2], [-2.0, -9.2], [-1.8, -7.6], [-2.3, -4.6]],
  ), rbox(-2.1, -9.3, -2.4, 2.1, 0.4, 1.9, 0.45)), G.W);
  s.paint(box(-2.2, -9.3, -2.5, 2.2, -8.8, 2), G.W2); // the ankle guard's rim
  // knee pad: a block standing proud of the shin
  s.add(hull([[-1.2, 1.3], [1.2, 1.3], [1.3, -2.3], [-1.3, -2.3]], [[0.8, 1.3], [2.0, 0.9], [2.3, -1.2], [1.7, -2.5], [0.8, -2.5]]), G.W);
  s.paint(box(-1.3, -2.6, 1.5, 1.3, -2.1, 2.5), G.W3);
  s.paint(box(-1.3, 0.5, 1.4, 1.3, 0.9, 2.5), G.W2);
  s.paint(both(box(0.3, -8.4, 0.9, 1.2, -7.6, 2.0)), G.W3); // intakes low on the shin
  s.paint(box(-2, -6, -1.2, 2, -5.6, 1.2), G.W2);
  s.paint(both(box(1.5, -4.4, -1.4, 2.2, -2.2, 0.4)), G.W2); // side panels
  s.add(cyl('y', 0, -0.3, 1.0, -9.4, -10.2), G.GR); // ankle
  // foot: red, the toe running long and low, the heel short
  s.add(hull(null, [[-2.5, -12], [3.8, -12], [3.8, -11.3], [2.0, -10.3], [0.6, -9.2], [-1.8, -9.2], [-2.5, -10.4]], [[-1.5, -2.5], [1.5, -2.5], [1.7, 2.4], [1.0, 3.8], [-1.0, 3.8], [-1.7, 2.4]]), G.R);
  s.paint(box(-2, -12.1, -3, 2, -11.7, 4.5), G.R2);
  return s.model;
}

// Shield: red face bowing out toward +x, white rim, a white band across the top with a sight slot, the yellow star.
function gShield(R) {
  const s = new Sculpt(pal, R);
  const hz = (y) => (y > 3 ? Math.max(0, 2.9 - (y - 3) * 1.4) : y < -6 ? Math.max(0, 2.9 - (-6 - y) * 0.48) : 2.9);
  const face = (y, z) => 0.2 + 0.9 * (1 - (z / 3.1) ** 2);
  const plate = fn([-1, -13, -3.1], [1.3, 5, 3.1], (x, y, z) => Math.abs(z) <= hz(y) && x <= face(y, z) && x >= face(y, z) - 0.9);
  s.add(plate, G.W);
  const inner = fn([-1, -12, -2.6], [1.3, 2.4, 2.6], (x, y, z) => Math.abs(z) <= hz(y) - 0.5 && y < 2.2);
  s.paint(and(plate, inner), G.R);
  s.paint(and(plate, box(-1, 2.2, -0.9, 2, 3.4, 0.9)), G.DK); // sight slot in the top band
  // the star: a long vertical bar crossed by a short one, points tapering
  const star = fn([0, -7.6, -2], [2, 0.6, 2], (x, y, z) => {
    const cy = -3.2;
    return Math.abs(z) <= 0.5 * (1 - Math.abs(y - cy) / 4.4) + 0.05 || (Math.abs(y - cy) <= 0.5 * (1 - Math.abs(z) / 2.2) + 0.05 && Math.abs(z) < 2.2);
  });
  s.paint(and(plate, star), G.Y);
  return s.model;
}

export function gundamWeapons(R = GUNDAM_R) {
  const S = () => new Sculpt(pal, R);
  const hilt = S();
  hilt.add(vbox(-1, -1, -1, 0, 0, 1), G.W2);
  hilt.add(vbox(-1, -1, 2, 0, 0, 2), G.GR);
  const rifle = S(); // the beam rifle: a long dark body, sight on top, grip and magazine under it
  rifle.add(rbox(-0.9, -1, -3, 0.9, 1.6, 8, 0.3), G.DK);
  rifle.add(box(-0.9, 1.6, -1, 0.9, 2.2, 5), G.GR); // sight rail
  rifle.add(box(-2, 2.0, 2, -0.9, 3.4, 4.2), G.GR); // scope
  rifle.add(box(-1.9, 2.3, 4.2, -1.1, 3.1, 4.6), 0x8affff, { glow: 2, jitter: 0 });
  rifle.add(cyl('z', 0.2, 0.3, 0.55, 8, 14), G.GR); // barrel
  rifle.add(box(-0.8, -0.4, 13.2, 1.2, 1.0, 14.2), G.DK);
  rifle.add(box(-0.7, -4, 0.8, 0.7, -1, 2.6), G.DK); // grip / magazine
  rifle.add(box(-0.95, 1.2, 7, 0.95, 1.7, 9.2), G.Y);

  // Beam javelin: the extended shaft with a three-pronged beam head, gripped a third of the way up.
  const javelin = S();
  javelin.add(vbox(-1, -1, -18, 0, 0, 30), G.GR);
  javelin.add(vbox(-1, -1, -3, 0, 0, 2), G.DK); // grip
  javelin.add(vbox(-1, -1, -18, 0, 0, -17), G.W2);
  javelin.add(vbox(-2, -2, 28, 1, 1, 30), G.W2); // emitter collar
  const BEAM = { glow: 2.4, jitter: 0 };
  for (let z = 31; z <= 44; z++) {
    const w = z < 36 ? 1 : z < 41 ? 0 : -1; // spearhead tapers to a point
    if (w >= 0) javelin.add(vbox(-1 - w, -1 - w, z, w, w, z), 0xff8ad8, BEAM);
    else javelin.add(vbox(0, 0, z, 0, 0, z), 0xffc8f0, BEAM);
  }
  for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) { const x = sd > 0 ? 1 + i : -2 - i; javelin.add(vbox(x, 0, 31 + i * 2, x, 0, 31 + i * 2), 0xff8ad8, BEAM); } // side prongs

  // Hyper bazooka: a long dark tube shouldered over the right arm, flared muzzle, grip and sight.
  const bazooka = S();
  bazooka.add(cyl('z', 0, 0.5, 1.9, -14, 13), 0x3a4458);
  bazooka.add(cyl('z', 0, 0.5, 2.1, 10.5, 14, 2.6), 0x2a3040); // muzzle flare
  bazooka.add(cyl('z', 0, 0.5, 1.2, 13, 14.2), G.DK);
  bazooka.add(cyl('z', 0, 0.5, 2.3, -15, -12.6), 0x2a3040); // breech
  bazooka.add(vbox(-1, -4, -1, 0, -2, 1), G.DK); // grip
  bazooka.add(vbox(2, 2, -3, 3, 3, 3), G.GR); // sight
  bazooka.add(vbox(3, 3, 3, 3, 3, 3), 0x8affff, { glow: 2, jitter: 0 });
  bazooka.paint(box(-3, -2, -6, 3, 3, -2), G.Y);

  // Gundam hammer: a spiked iron ball on a chain; the grip sits in the fist.
  const ball = S();
  ball.add(ell(0, 0, 0, 4.2), 0x3a3f4c);
  for (const [x, y, z] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) {
    const a = x ? 'x' : y ? 'y' : 'z', sgn = x + y + z;
    ball.add(cyl(a, 0, 0, 1.2, sgn * 3.6, sgn * 6.6, 0.2), 0x6a707e);
  }
  const grip = S();
  grip.add(vbox(-1, -1, -3, 0, 0, 3), G.GR);
  grip.add(vbox(-1, -1, 4, 0, 0, 5), G.DK);
  const link = S();
  link.add(vbox(0, 0, 0, 0, 0, 1), G.DK);
  return { hilt: hilt.model, rifle: rifle.model, javelin: javelin.model, bazooka: bazooka.model, ball: ball.model, grip: grip.model, link: link.model };
}

export function gundamDef(R = GUNDAM_R) {
  const uR = gUpperArmR(R), fR = gForeArmR(R), thigh = gThigh(R), shin = gShin(R);
  return rigDef(R, SCALE, 21, {
    hips: { parent: null, pivot: [0, 0, 0], model: gHips(R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: gTorso(R) },
    head: { parent: 'torso', pivot: [0, 7.3, 0.1], model: gHead(R) },
    uArmR: { parent: 'torso', pivot: [-5.3, 5, 0], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -5.6, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -5.9, 0], model: null },
    uArmL: { parent: 'torso', pivot: [5.3, 5, 0], model: uR.clone().flipX() },
    fArmL: { parent: 'uArmL', pivot: [0, -5.6, 0], model: fR.clone().flipX() },
    handL: { parent: 'fArmL', pivot: [2.2, -3, 0], model: gShield(R) },
    thighR: { parent: 'hips', pivot: [-2.1, -1, 0], model: thigh },
    shinR: { parent: 'thighR', pivot: [0, -8, 0], model: shin },
    thighL: { parent: 'hips', pivot: [2.1, -1, 0], model: thigh.clone() },
    shinL: { parent: 'thighL', pivot: [0, -8, 0], model: shin.clone() },
  });
}
