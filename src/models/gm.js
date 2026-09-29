// RGM-79 GM, the Federation's mass-produced mobile suit, sculpted from reference renders (Reborn's select screen, a
// low-poly and a Nanoblock GM off Sketchfab). What makes it read: a round white helmet with one wide green goggle
// across the face over a grey mouth grille, no V-fin; a red chest whose lower edge comes to a V over the belly, with
// two yellow vents either side of a dark hatch; big red shoulder blocks, flat on top, wider than the chest; pale grey
// arms and legs, dark fists, blocky knees and red feet; flat front skirts; one beam saber hilt standing up off the
// backpack's left side. It carries the beam spray gun (a short, chunky gun) and a long red shield with a white rim and
// a thin yellow cross; its beam saber burns pink.
// Proportions off the low-poly front view (H ~ 34 units): shoulder span ~0.44 H, the chest's V point at ~0.64 H,
// knees at ~0.35 H, the hands hanging at the crotch.
//
// One def serves the playable suit (R = 2) and, like zakuDef, an instanced crowd of allied GMs (R = 1): every part
// keeps at least one voxel centre at R = 1. The weapons are rig parts under `hand` with InstancedRig hide bits: the
// saber hilt and a short glowing blade are bit 1, the spray gun bit 2 (the Zaku's hawk / gun convention). The
// goggle and the blade are glow voxels, meshed apart as each part's glow geometry.
import { Sculpt, box, rbox, ell, cyl, hull, half, fn, and, both, rot, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const GM_R = 2;
const SCALE = 0.1;
export const GM_VOXEL = SCALE / GM_R;
export const GM_MUZZLE = 0.8; // spray gun muzzle: this far along the hand's +Z (world units)
export const GM_CROWD_BLADE = 3.0; // the glowing blade part's length (world units); the hero draws its own

// Colours. Keep every value above 0xffff: VoxelModel reads small numbers as palette ids.
export const GM = {
  W: 0xe4e3da, W2: 0xc2c1b8, W3: 0x96968f, R: 0xc8302a, R2: 0x92211c, Y: 0xf0bf2c,
  DK: 0x2b2e35, GR: 0x676b74, SH: 0x3a3d44, VIS: 0x86ff6e, BEAM: 0xff7ad8,
};

const GLOW = { glow: 1.8, jitter: 0 };

function gmHead(c, R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('y', 0, -0.1, 0.9, -0.5, 0.6), c.GR); // neck
  // helmet: round-topped, a little taller than wide
  s.add(and(rbox(-1.8, 0.3, -1.9, 1.8, 4.3, 1.6, [0.8, 1.2, 0.9]), half(0, 1, 0, 4.3)), c.W);
  s.add(both(cyl('x', 2.0, -0.1, 0.8, 1.55, 2.1)), c.W2); // ear discs
  s.paint(both(cyl('x', 2.0, -0.1, 0.4, 1.9, 2.15)), c.W3);
  // the goggle: one wide green band across the face under a pale brow
  s.add(box(-1.65, 1.8, 0.6, 1.65, 3.05, 2.05), c.VIS, GLOW);
  s.add(box(-1.75, 3.05, 0.4, 1.75, 3.4, 1.9), c.W); // brow over it
  // mouth grille under the goggle, dark slots
  s.add(box(-1.15, 0.35, 0.8, 1.15, 1.8, 1.95), c.W2);
  for (const x of [-0.55, 0.55]) s.paint(box(x - 0.25, 0.5, 1.3, x + 0.25, 1.6, 2.0), c.GR);
  s.add(box(-0.35, 3.8, -1.4, 0.35, 4.6, 1.0), c.W2); // crest along the crown
  return s.model;
}

function gmTorso(c, R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-2.7, -0.3, -1.7, 2.7, 2.4, 1.5, 0.5), c.W2); // belly, mostly behind the chest's V
  // chest: red, broad at the shoulders, the lower edge a V over the belly
  const chest = hull(
    [[-3.9, 7.2], [3.9, 7.2], [3.6, 2.6], [2.5, 1.1], [0.9, -0.6], [-0.9, -0.6], [-2.5, 1.1], [-3.6, 2.6]],
    [[-2.3, 7.2], [2.2, 7.2], [2.7, 4.2], [2.5, 0.6], [1.6, -0.6], [-2.3, -0.6]],
  );
  s.add(and(chest, rbox(-4.0, -0.7, -2.4, 4.0, 7.3, 2.8, 0.45)), c.R);
  s.paint(and(chest, half(0, 0, -1, -2.1), half(0, 1, 0, 1.2)), c.R2); // shadowed hem of the V
  // dark hatch at the bottom of the V, the two yellow vents either side above it
  s.add(box(-0.9, -0.5, 1.9, 0.9, 1.4, 2.9), c.DK);
  s.add(both(box(1.0, 1.5, 1.9, 3.1, 2.7, 2.9)), c.Y);
  s.paint(both(box(1.2, 2.0, 2.4, 2.9, 2.2, 3.0)), c.DK);
  // collar: a pale V notched into the top of the chest round the neck
  const collar = hull([[-2.0, 7.6], [2.0, 7.6], [0.9, 5.4], [-0.9, 5.4]], [[-1.6, 5.4], [2.4, 5.4], [2.4, 7.6], [-1.6, 7.6]]);
  s.cut(collar);
  s.add(and(collar, half(0, 0, 1, 2.1)), c.W2);
  s.add(box(-1.5, 6.6, -1.5, 1.5, 7.7, 1.6), c.W);
  // backpack: two thrusters under it and the one beam saber hilt standing up behind the left shoulder
  s.add(rbox(-2.5, 1.8, -4.0, 2.5, 6.6, -2.2, 0.4), c.W2);
  s.paint(box(-2.6, 1.7, -4.1, 2.6, 2.3, -2.1), c.W3);
  s.add(both(cyl('y', 1.3, -3.2, 0.75, 2.0, 0.9, 1.0)), c.GR);
  s.add(both(cyl('y', 1.3, -3.2, 0.45, 1.5, 0.9, 0.7)), c.DK);
  const lean = (sh) => rot(sh, [-0.12, 0, -0.28], [1.8, 5.8, -3.4]);
  s.add(lean(cyl('y', 1.8, -3.4, 0.55, 5.4, 11.0)), c.W2);
  s.paint(lean(box(0.9, 10.0, -4.4, 2.7, 11.2, -2.4)), c.GR);
  return s.model;
}

// Right upper arm (outside toward -x): the big red shoulder block, flat on top and flaring out over a pale upper arm.
function gmUpperArmR(c, R) {
  const s = new Sculpt(pal, R);
  const sh = and(
    hull([[0.9, 2.2], [-2.0, 2.5], [-3.0, 1.7], [-2.8, -2.2], [0.9, -2.2]], [[-2.1, -2.2], [-2.1, 1.9], [-1.6, 2.5], [1.6, 2.5], [2.1, 1.9], [2.1, -2.2]]),
    rbox(-3.1, -2.3, -2.2, 1.0, 2.6, 2.2, [0.5, 0.5, 0.4]),
  );
  s.add(sh, c.R);
  s.paint(and(sh, half(0, 1, 0, -1.7)), c.R2); // lower rim
  s.paint(and(sh, box(-3.1, 0.2, -2.3, -2.6, 0.6, 2.3)), c.R2); // seam down the outer face
  s.add(rbox(-1.1, -5.6, -1.1, 1.1, -2.6, 1.1, 0.3), c.W); // upper arm
  s.add(box(-1.2, -4.9, -1.2, 1.2, -4.5, 1.2), c.W2);
  return s.model;
}

function gmForeArmR(c, R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 0.9, -1.1, 1.1), c.GR); // elbow
  s.add(rbox(-1.45, -4.9, -1.45, 1.45, -0.5, 1.45, 0.35), c.W);
  s.paint(box(-2, -5, -2, 2, -4.3, 2), c.W2); // cuff
  s.paint(box(-2, -1.0, 1.1, 2, -0.6, 2), c.W3);
  s.add(rbox(-0.95, -6.8, -0.9, 0.95, -4.8, 1.1, 0.35), c.DK); // fist
  return s.model;
}

function gmHips(c, R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.1, -1.0, -1.9, 3.1, 2.0, 1.8, 0.4), c.W); // waist
  s.add(box(-3.2, 1.3, -2.0, 3.2, 2.0, 1.9), c.W2);
  // crotch: pale, a grey block down its front
  s.add(hull([[-1.0, 1.4], [1.0, 1.4], [1.0, -2.2], [0, -2.8], [-1.0, -2.2]], [[0.6, 1.4], [2.4, 1.4], [2.5, -2.8], [0.6, -2.8]]), c.W);
  s.paint(box(-0.7, -1.8, 1.9, 0.7, 0.9, 3), c.W3);
  // front skirts: two big flat plates, a seam across each
  const skirt = hull([[1.0, 1.4], [3.4, 1.4], [3.6, -2.9], [1.1, -3.0]], [[1.1, 1.4], [2.1, 1.4], [2.6, -3.0], [1.7, -3.0]]);
  s.add(both(skirt), c.W);
  s.paint(both(and(skirt, box(0.8, -0.4, 0, 3.8, 0.0, 4))), c.W2);
  s.paint(both(and(skirt, half(0, 1, 0, -2.5))), c.W2);
  s.add(both(hull([[3.2, 1.4], [3.9, 1.4], [4.2, -2.3], [3.5, -2.3]], [[-1.8, 1.4], [1.6, 1.4], [1.6, -2.3], [-1.8, -2.3]])), c.W); // side skirts
  s.add(hull([[-2.8, 1.4], [2.8, 1.4], [3.0, -2.4], [-3.0, -2.4]], [[-1.7, 1.4], [-2.4, 1.4], [-2.8, -2.4], [-2.1, -2.4]]), c.W); // rear skirt
  return s.model;
}

function gmThigh(c, R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, -0.3, 0, 1.2), c.GR);
  s.add(rbox(-1.6, -8.1, -1.8, 1.6, -0.8, 1.8, 0.45), c.W);
  s.paint(box(-2, -2.2, -2, 2, -1.8, 2), c.W2);
  return s.model;
}

// Shin: a squared-off knee block, a straight boxy lower leg, a grey ankle and a red foot. Both legs share it.
function gmShin(c, R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.1, -1.2, 1.2), c.GR);
  s.add(and(hull(
    [[-1.7, 0.2], [1.7, 0.2], [1.9, -4.5], [2.0, -9.2], [-2.0, -9.2], [-1.9, -4.5]],
    [[-1.7, 0.2], [1.5, 0.4], [1.7, -5], [1.7, -9.2], [-2.0, -9.2], [-2.2, -4.6]],
  ), rbox(-2.1, -9.3, -2.3, 2.1, 0.4, 1.9, 0.4)), c.W);
  s.paint(box(-2.2, -9.3, -2.4, 2.2, -8.7, 2), c.W2); // the ankle guard's rim
  // knee block standing proud of the shin
  s.add(hull([[-1.3, 1.3], [1.3, 1.3], [1.4, -2.2], [-1.4, -2.2]], [[0.8, 1.3], [2.1, 0.9], [2.3, -1.3], [1.8, -2.4], [0.8, -2.4]]), c.W);
  s.paint(box(-1.4, -2.5, 1.5, 1.4, -2.0, 2.5), c.W3);
  s.paint(both(box(1.6, -6.4, -1.2, 2.2, -3.0, 0.6)), c.W2); // side panels
  s.paint(box(-1.2, -7.2, 1.4, 1.2, -6.8, 2.2), c.W3);
  s.add(cyl('y', 0, -0.3, 1.0, -9.4, -10.2), c.GR); // ankle
  // foot: red, blunt toe
  s.add(hull(null, [[-2.5, -12], [3.6, -12], [3.6, -11.2], [2.0, -10.3], [0.6, -9.3], [-1.8, -9.3], [-2.5, -10.4]], [[-1.6, -2.5], [1.6, -2.5], [1.8, 2.4], [1.2, 3.6], [-1.2, 3.6], [-1.8, 2.4]]), c.R);
  s.paint(box(-2, -12.1, -3, 2, -11.6, 4.5), c.R2);
  return s.model;
}

// Shield on the left forearm: a long rounded plate, bowed out toward +x, tapering to a blunt point at the foot. Red
// face, white rim, a thin yellow cross; the back is dark.
function gmShield(c, R) {
  const s = new Sculpt(pal, R);
  const hz = (y) => (y > 3.2 ? Math.max(0, 2.8 - (y - 3.2) * 1.6) : y < -8 ? Math.max(0, 2.8 - (-8 - y) * 0.7) : 2.8);
  const face = (y, z) => 0.3 + 0.6 * (1 - (z / 3) ** 2);
  const plate = fn([-1.5, -12.2, -3], [1.3, 5, 3], (x, y, z) => Math.abs(z) <= hz(y) && x <= face(y, z) && x >= face(y, z) - 1.3);
  s.add(plate, c.W);
  s.paint(and(plate, fn([-2, -11.5, -2.4], [2, 3.4, 2.4], (x, y, z) => Math.abs(z) <= hz(y) - 0.5)), c.R);
  s.paint(and(plate, fn([-2, -13, -3], [2, 5, 3], (x, y, z) => x < face(y, z) - 0.55)), c.SH); // the back
  // the cross: a long upright bar and a short crossbar high up
  const cross = fn([-2, -9, -2.5], [2, 2.4, 2.5], (x, y, z) => (Math.abs(z) < 0.3 && y > -8.6) || (Math.abs(y + 0.6) < 0.3 && Math.abs(z) < 1.9));
  s.paint(and(plate, cross, fn([-2, -13, -3], [2, 5, 3], (x, y, z) => x >= face(y, z) - 0.55)), c.Y);
  return s.model;
}

// Weapons, all along the hand's +Z with no rotation of their own (the gun-aim layer takes that as the barrel).
function gmHilt(c, R) {
  const s = new Sculpt(pal, R);
  s.add(box(-0.5, -0.5, -1.0, 0.5, 0.5, 1.6), c.W2);
  s.add(box(-0.6, -0.6, 1.4, 0.6, 0.6, 1.9), c.GR);
  return s.model;
}
// The crowd's lit blade: the playable GM hides this and draws a longer additive blade instead.
function gmBlade(c, R) {
  const s = new Sculpt(pal, R);
  s.add(box(-0.4, -0.4, 2.0, 0.6, 0.6, 2.0 + GM_CROWD_BLADE * 10), c.BEAM, { glow: 2.4, jitter: 0 });
  return s.model;
}
// Beam spray gun: a short, chunky body, a thick stub of a barrel with a wider muzzle, a sight, grip and fore-grip.
function gmGun(c, R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-0.85, -0.9, -2.6, 0.85, 1.5, 4.6, 0.3), c.DK);
  s.add(box(-0.9, 0.9, -1.0, 0.9, 1.5, 3.5), c.GR); // top plate
  s.add(box(-0.45, 1.5, 0.2, 0.45, 2.1, 2.6), c.GR); // sight
  s.add(cyl('z', 0, 0, 0.65, 4.4, 7.4), c.GR); // barrel
  s.add(cyl('z', 0, 0, 0.9, 7.0, 8.0), c.DK); // muzzle
  s.add(box(-0.6, -3.4, 0.2, 0.6, -0.9, 1.6), c.DK); // grip
  s.add(box(-0.6, -2.2, 2.6, 0.6, -0.9, 4.2), c.GR); // fore-grip / energy cap
  return s.model;
}

// The rig. colors: GM (or a variant: every key of GM); R: voxels per design unit (2 for the playable suit, 1 for a
// crowd). Rig parts as in core/rig.js, plus saber / blade (hide bit 1) and gun (hide bit 2) under `hand`.
export function gmDef(colors = GM, R = GM_R) {
  const c = { ...GM, ...colors };
  const uR = gmUpperArmR(c, R), fR = gmForeArmR(c, R), thigh = gmThigh(c, R), shin = gmShin(c, R);
  return rigDef(R, SCALE, 21, {
    hips: { parent: null, pivot: [0, 0, 0], model: gmHips(c, R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: gmTorso(c, R) },
    head: { parent: 'torso', pivot: [0, 7.4, 0.1], model: gmHead(c, R) },
    uArmR: { parent: 'torso', pivot: [-5.4, 5, 0], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -5.6, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -5.9, 0], model: null },
    saber: { parent: 'hand', pivot: [0, 0, 0], model: gmHilt(c, R), bit: 1 },
    blade: { parent: 'hand', pivot: [0, 0, 0], model: gmBlade(c, R), bit: 1 },
    gun: { parent: 'hand', pivot: [0, 0, 0], model: gmGun(c, R), bit: 2 },
    uArmL: { parent: 'torso', pivot: [5.4, 5, 0], model: uR.clone().flipX() },
    fArmL: { parent: 'uArmL', pivot: [0, -5.6, 0], model: fR.clone().flipX() },
    handL: { parent: 'fArmL', pivot: [2.2, -3, 0], model: gmShield(c, R) },
    thighR: { parent: 'hips', pivot: [-2.1, -1, 0], model: thigh },
    shinR: { parent: 'thighR', pivot: [0, -8, 0], model: shin },
    thighL: { parent: 'hips', pivot: [2.1, -1, 0], model: thigh.clone() },
    shinL: { parent: 'thighL', pivot: [0, -8, 0], model: shin.clone() },
  });
}
