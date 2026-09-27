// MSN-001A1 Delta Plus: Riddhe Marcenas's transformable Zeta-lineage suit (Gundam Unicorn / Reborn's "ALL MOVES"
// footage), sculpted with core/sculpt.js. White-grey armour over indigo joints with gold accents (the footage's
// colours); the silhouette from its G Generation render: a Zeta-style head with a long thin gold V-fin, angular
// pauldrons that flare up at the outer edge, two tall indigo stabilizer fins standing up off the backpack behind the
// shoulders (the waverider's tail), and a long pointed shield (the waverider's nose) with a grenade launcher along its
// lower edge. About 1.1x the RX-78's height, slimmer, with more leg.
import { Sculpt, box, rbox, ell, cyl, hull, half, fn, and, or, both, rot, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const DELTAPLUS_R = 2;
const SCALE = 0.1;
export const DELTAPLUS_VOXEL = SCALE / DELTAPLUS_R;

const D = {
  W: 0xe8ebf2, W2: 0xc4c9d6, W3: 0x9ea4b2, B: 0x364683, B2: 0x232c52, Y: 0xf0c63c, Y2: 0xb88a0e,
  R: 0xb02a3c, R2: 0x7a1420, GR: 0x767c8a, DK: 0x2a2e38,
};
const EYE = { glow: 1.9, jitter: 0 };
const vbox = (x0, y0, z0, x1, y1, z1) => box(x0, y0, z0, x1 + 1, y1 + 1, z1 + 1);

function dpHead(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('y', 0, -0.1, 0.9, -0.5, 0.6), D.GR); // neck
  s.add(hull([[-1.3, 0.3], [1.3, 0.3], [1.4, 2.6], [0.6, 3.6], [-0.6, 3.6], [-1.4, 2.6]], [[-1.6, 0.3], [-1.7, 2.8], [-0.8, 3.6], [0.8, 3.6], [1.5, 2.6], [1.5, 0.3]]), D.W); // helmet
  s.add(box(-0.3, 3.2, -1.2, 0.3, 4.1, 1.2), D.W2); // crest ridge
  s.add(both(hull([[1.1, 0.6], [1.9, 0.9], [1.8, 2.8], [1.1, 3.0]], [[-1.2, 0.8], [1.2, 0.6], [1.5, 2.4], [-1.2, 2.9]])), D.W); // cheek guards
  s.add(both(cyl('z', 1.35, 2.6, 0.2, 0.2, 1.6)), D.Y); // vulcans
  s.add(box(-1.1, 0.5, 1.0, 1.1, 2.2, 1.6), D.GR); // face
  s.add(both(box(0.25, 1.45, 1.3, 1.05, 1.95, 1.7)), 0x9fe8ff, EYE);
  s.add(box(-0.25, 0.8, 1.3, 0.25, 2.3, 1.75), D.W);
  s.add(hull([[-0.7, 0.2], [0.7, 0.2], [0.7, 0.9], [-0.7, 0.9]], [[1.0, 0.2], [1.8, 0.5], [1.7, 0.9], [1.0, 0.9]]), D.B); // chin
  s.add(box(-0.35, 2.3, 1.2, 0.35, 3.0, 1.8), D.B); // forehead camera
  s.add(box(-0.2, 2.5, 1.5, 0.2, 2.8, 1.9), 0x9fe8ff, { glow: 1.2, jitter: 0 });
  // long thin V-fin, swept higher than the Gundam's
  s.add(both(rot(box(0.1, 2.7, 1.3, 3.8, 3.1, 1.75), [0, 0, 0.78], [0.1, 2.7, 1.5])), D.Y);
  s.add(box(-0.4, 2.6, 1.3, 0.4, 3.1, 1.9), D.Y);
  return s.model;
}

function dpTorso(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-2.4, -0.3, -1.7, 2.4, 2.4, 1.6, 0.5), D.B); // abdomen
  for (const y of [0.5, 1.3]) s.paint(box(-2.5, y, -1.8, 2.5, y + 0.3, 1.7), D.B2);
  // chest: white, a prow down the middle, red Zeta-lineage intakes either side of the hatch
  const chest = hull(
    [[-3.4, 2.2], [3.4, 2.2], [4.0, 4], [4.2, 8.0], [-4.2, 8.0], [-4.0, 4]],
    [[-2.3, 2.2], [1.9, 2.2], [2.6, 4.2], [2.4, 8.0], [-2.3, 8.0]],
    [[-4.2, -2.3], [4.2, -2.3], [4.2, 1.6], [1.2, 2.6], [0, 2.8], [-1.2, 2.6], [-4.2, 1.6]],
  );
  s.add(chest, D.W);
  s.paint(box(-4.3, 2.1, -2.4, 4.3, 2.7, 3), D.W2);
  s.add(both(hull([[1.2, 4.6], [3.4, 5.0], [3.4, 6.6], [1.2, 6.8]], [[1.8, 4.6], [2.9, 4.6], [2.9, 6.8], [1.8, 6.8]])), D.R);
  for (const y of [5.2, 5.9]) s.paint(both(box(1.2, y, 2.4, 3.5, y + 0.3, 3.2)), D.R2);
  s.add(box(-0.7, 2.6, 2.2, 0.7, 7.4, 3.0), D.B); // cockpit hatch
  s.add(box(-0.5, 6.8, 2.8, 0.5, 7.3, 3.2), D.Y); // hatch camera light
  s.add(box(-1.8, 7.8, -1.6, 1.8, 8.6, 1.5), D.W2); // collar
  s.add(both(box(1.8, 7.6, -2.0, 3.2, 8.4, 1.8)), D.W);
  // backpack, thrusters, and the two tall stabilizer fins standing up behind the shoulders
  s.add(rbox(-2.8, 2.4, -4.2, 2.8, 7.6, -2.2, 0.5), D.W);
  s.paint(box(-2.9, 2.3, -4.3, 2.9, 2.9, -2.1), D.W2);
  s.add(both(cyl('y', 1.4, -3.3, 0.7, 2.4, 1.2, 1.0)), D.DK);
  const fin = rot(hull([[0.9, 4.0], [3.3, 4.0], [2.6, 13], [1.8, 15.8]], [[-6.2, 4.0], [-3.0, 4.0], [-3.3, 12], [-4.6, 15.8]]), [0, 0, -0.34], [2, 5, -4]);
  s.add(both(fin), D.B);
  s.paint(both(and(fin, fn([0, 0, -7], [9, 20, -2], (x, y, z) => z > -3.9))), D.W2); // their leading edges
  s.paint(both(rot(box(1.0, 9, -6, 2.6, 9.6, -2.8), [0, 0, -0.34], [2, 5, -4])), D.Y);
  return s.model;
}

// Right upper arm (outside toward -x): an angular pauldron flaring up at its outer edge, indigo trim. Left mirrors it.
function dpUpperArmR(R) {
  const s = new Sculpt(pal, R);
  const shell = hull([[1.3, -2.6], [1.3, 1.9], [0.2, 2.4], [-2.6, 3.4], [-2.9, 1.4], [-2.6, -2.6]], [[-2.1, -2.6], [-2.2, 1.6], [-1.5, 2.8], [1.6, 2.8], [2.2, 1.6], [2.1, -2.6]]);
  s.add(shell, D.W);
  s.paint(and(shell, box(-3, -2.7, -3, 2, -2.1, 3)), D.B);
  s.paint(and(shell, box(-3, 1.4, 1.6, -2.0, 3.5, 3)), D.Y);
  s.add(rbox(-1.0, -5.4, -1.0, 1.0, -2.5, 1.0, 0.3), D.GR); // upper arm
  s.add(box(-1.1, -4.6, -1.1, 1.1, -3.4, 1.1), D.W);
  return s.model;
}

function dpForeArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 0.85, -1.0, 1.0), D.GR); // elbow
  s.add(hull([[1.2, -0.6], [1.3, -4.8], [-1.4, -4.8], [-1.3, -0.6]], [[-1.2, -0.6], [1.2, -0.6], [1.4, -4.8], [-1.4, -4.8]]), D.W);
  s.paint(box(-2, -4.9, -2, 2, -4.3, 2), D.W2);
  s.paint(box(-1.5, -3.2, -1.3, -1.2, -1.6, 0.4), D.Y); // saber mount stripe
  s.add(rbox(-0.9, -6.6, -0.85, 0.9, -4.7, 1.05, 0.35), D.GR); // fist
  return s.model;
}

function dpHips(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.0, -1.0, -1.8, 3.0, 2.0, 1.7, 0.4), D.W);
  s.add(box(-3.1, 1.2, -1.9, 3.1, 2.0, 1.8), D.GR); // belt line
  s.add(hull([[-0.9, 1.4], [0.9, 1.4], [0.9, -2.2], [0, -2.9], [-0.9, -2.2]], [[0.6, 1.4], [2.3, 1.4], [2.4, -2.9], [0.6, -2.9]]), D.B); // crotch
  s.paint(box(-0.6, -0.6, 2, 0.6, 0.2, 3), D.Y);
  // front skirts, longer than the Gundam's, gold studs at their tops
  const skirt = hull([[1.0, 1.4], [3.1, 1.4], [3.5, -3.2], [1.2, -3.4]], [[1.0, 1.4], [2.0, 1.4], [2.8, -3.4], [1.8, -3.4]]);
  s.add(both(skirt), D.W);
  s.paint(both(and(skirt, half(0, 1, 0, -2.8))), D.W2);
  s.paint(both(and(skirt, box(2.0, 0.4, 0, 2.6, 1.0, 4))), D.Y);
  s.add(both(hull([[3.0, 1.4], [3.7, 1.4], [4.1, -2.4], [3.3, -2.4]], [[-1.6, 1.4], [1.5, 1.4], [1.5, -2.4], [-1.6, -2.4]])), D.W); // side skirts
  s.add(hull([[-2.7, 1.4], [2.7, 1.4], [2.9, -2.6], [-2.9, -2.6]], [[-1.6, 1.4], [-2.3, 1.4], [-2.7, -2.6], [-2.0, -2.6]]), D.W); // rear skirt
  return s.model;
}

function dpThigh(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, -0.3, 0, 1.1), D.GR);
  s.add(and(hull([[-1.4, -1.0], [1.4, -1.0], [1.5, -5], [1.3, -8.5], [-1.3, -8.5], [-1.5, -5]], [[-1.5, -1.0], [1.5, -1.0], [1.6, -5], [1.4, -8.5], [-1.4, -8.5]]), rbox(-1.6, -8.6, -1.7, 1.6, -0.8, 1.7, 0.45)), D.W);
  s.paint(box(-1.7, -5.4, -1.8, 1.7, -4.9, 1.8), D.W2);
  return s.model;
}

// Shin: gold-capped knee, a long white lower leg flaring into heavy calf thrusters, white feet. Both legs share it.
function dpShin(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.0, -1.2, 1.2), D.GR);
  s.add(and(hull(
    [[-1.4, 0.2], [1.4, 0.2], [1.8, -6], [2.0, -10.4], [-2.0, -10.4], [-1.8, -6]],
    [[-1.4, 0.2], [1.4, 0.4], [1.6, -6], [1.5, -10.4], [-2.6, -10.4], [-2.8, -7], [-1.8, -3]],
  ), rbox(-2.1, -10.5, -2.9, 2.1, 0.4, 1.7, 0.45)), D.W);
  s.add(hull([[-1.1, 1.2], [1.1, 1.2], [1.2, -2.2], [-1.2, -2.2]], [[0.8, 1.2], [1.8, 0.8], [2.1, -1.2], [1.5, -2.4], [0.8, -2.4]]), D.W); // knee cap
  s.paint(box(-1.3, 0.4, 1.3, 1.3, 1.3, 2.3), D.Y);
  s.paint(box(-2.2, -10.5, -3, 2.2, -9.9, 2), D.W2);
  s.add(cyl('z', 0, -8.2, 1.2, -3.4, -2.6, 1.5), D.B2); // calf thruster bell
  s.paint(both(box(1.6, -8.0, -1.2, 2.1, -4.0, 0.8)), D.W2);
  s.add(cyl('y', 0, -0.3, 0.9, -10.4, -11.1), D.GR); // ankle
  s.add(hull(null, [[-2.4, -13.5], [3.8, -13.5], [3.8, -12.9], [1.8, -11.6], [0.4, -10.8], [-1.8, -10.8], [-2.4, -12]], [[-1.4, -2.4], [1.4, -2.4], [1.5, 2.4], [0.8, 3.8], [-0.8, 3.8], [-1.5, 2.4]]), D.W);
  s.paint(box(-1.6, -13.6, -2.6, 1.6, -13.1, 4), D.GR);
  return s.model;
}

// Shield: the waverider's nose, a long kite coming to a point, indigo face in a white rim with a gold diamond, its face
// bowing out toward +x, and the grenade launcher's stubby tube along the lower outer edge (muzzle toward +z).
function dpShield(R) {
  const s = new Sculpt(pal, R);
  const hz = (y) => (y > 3.8 ? Math.max(0, 2.8 - (y - 3.8) * 1.6) : y < -4 ? Math.max(0, 2.8 - (-4 - y) * 0.3) : 2.8);
  const face = (y, z) => 0.2 + 0.8 * (1 - (z / 3) ** 2);
  const plate = fn([-1, -14, -3], [1.2, 5.6, 3], (x, y, z) => Math.abs(z) <= hz(y) && x <= face(y, z) && x >= face(y, z) - 0.9);
  s.add(plate, D.W);
  s.paint(and(plate, fn([-1, -12, -2.4], [2, 3.4, 2.4], (x, y, z) => Math.abs(z) <= hz(y) - 0.55 && y < 3.2)), D.B);
  s.paint(and(plate, fn([0, -3, -1.5], [2, 1, 1.5], (x, y, z) => Math.abs(z) + Math.abs(y + 1) * 0.75 <= 1.3)), D.Y); // diamond badge
  s.add(rbox(1.6, -8.2, 2.6, 3.4, -6.6, 4.6, 0.3), D.DK); // grenade launcher
  s.add(cyl('z', 2.5, -7.4, 0.5, 4.4, 4.8), 0x14161a);
  return s.model;
}

export function deltaplusWeapons(R = DELTAPLUS_R) {
  const hilt = new Sculpt(pal, R);
  hilt.add(vbox(-1, -1, -1, 0, 0, 1), D.W2);
  hilt.add(vbox(-1, -1, 2, 0, 0, 2), D.GR);
  const rifle = new Sculpt(pal, R);
  rifle.add(rbox(-0.9, -1, -3, 0.9, 1.6, 8, 0.3), D.DK); // body
  rifle.add(box(-0.9, 1.6, -1, 0.9, 2.2, 5), D.GR); // sight rail
  rifle.add(box(-2, 2.0, 2, -0.9, 3.4, 4.2), D.GR); // scope
  rifle.add(box(-1.9, 2.3, 4.2, -1.1, 3.1, 4.6), 0x8affff, { glow: 2, jitter: 0 });
  rifle.add(cyl('z', 0.2, 0.3, 0.55, 8, 15), D.GR); // longer barrel than the Gundam's
  rifle.add(box(-0.8, -0.4, 14.2, 1.2, 1.0, 15.2), D.DK);
  rifle.add(box(-0.7, -4, 0.8, 0.7, -1, 2.6), D.DK); // magazine / grip
  rifle.add(box(-0.95, 1.2, 7, 0.95, 1.7, 9.2), D.Y);
  return { hilt: hilt.model, rifle: rifle.model };
}

export function deltaplusDef(R = DELTAPLUS_R) {
  const uR = dpUpperArmR(R), fR = dpForeArmR(R), thigh = dpThigh(R), shin = dpShin(R);
  return rigDef(R, SCALE, 23, {
    hips: { parent: null, pivot: [0, 0, 0], model: dpHips(R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: dpTorso(R) },
    head: { parent: 'torso', pivot: [0, 8.3, 0.1], model: dpHead(R) },
    uArmR: { parent: 'torso', pivot: [-5.4, 6.0, 0], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -5.4, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -5.8, 0], model: null },
    uArmL: { parent: 'torso', pivot: [5.4, 6.0, 0], model: uR.clone().flipX() },
    fArmL: { parent: 'uArmL', pivot: [0, -5.4, 0], model: fR.clone().flipX() },
    handL: { parent: 'fArmL', pivot: [2.2, -3, 0], model: dpShield(R) },
    thighR: { parent: 'hips', pivot: [-2.1, -1, 0], model: thigh },
    shinR: { parent: 'thighR', pivot: [0, -8.5, 0], model: shin },
    thighL: { parent: 'hips', pivot: [2.1, -1, 0], model: thigh.clone() },
    shinL: { parent: 'thighL', pivot: [0, -8.5, 0], model: shin.clone() },
  });
}
