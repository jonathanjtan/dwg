// MSN-04 Sazabi: Char's Neo Zeon flagship suit from Char's Counterattack, sculpted from reference renders. The read
// that makes it a Sazabi: a small head sunk between enormous rounded shoulders, a tall fin crest over the mono-eye, two
// slate funnel racks standing up behind the head with red funnel caps, a gold pipe collar slung under a prow-shaped
// chest over the belly mega particle cannon, a bell of skirt armour with the gold Neo Zeon crest, huge flared shins,
// slate joints and hands, and a long curved shield with the crest on its black centre.
// A 25m suit against the Gundam's 18m: 0.11 world units per design unit against the Gundam's 0.1, built at R voxels
// per design unit (see core/sculpt.js).
import { Sculpt, box, rbox, ell, cyl, prism, hull, half, fn, and, or, sub, both, rot, move, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const SAZABI_R = 2;
const SCALE = 0.11;
// weapons and funnels are meshed apart from the rig: this is their voxel size
export const SAZABI_VOXEL = SCALE / SAZABI_R;

const S = {
  R: 0xd21f27, R2: 0xa3141e, R3: 0x6e0d15,
  SL: 0x4a5064, SL2: 0x2e323f, K: 0x17181d, FC: 0x505a78,
  Y: 0xecb52e, Y2: 0x9a6f12,
};
const EYE = { glow: 2.4, jitter: 0 };
const LENS = { glow: 1.8, jitter: 0 };

// Neo Zeon crest, 7 voxels wide: a bird with its wings swept up over a stem.
const CREST = [
  'y.......y',
  'yy.....yy',
  '.yy.y.yy.',
  '..yyyyy..',
  '...yyy...',
  '..y.y.y..',
  '....y....',
  '...yyy...',
];

function szHead(R) {
  const s = new Sculpt(pal, R);
  // helmet: domed, its brim jutting forward into a beak over a recessed face
  s.add(and(
    hull([[-2.4, 0.6], [2.4, 0.6], [2.5, 3.4], [1.4, 4.7], [-1.4, 4.7], [-2.5, 3.4]],
      [[-2.9, 0.4], [-2.9, 3.2], [-1.6, 4.7], [1.4, 4.7], [3.5, 2.9], [3.7, 2.2], [1.2, 2.1], [1.2, 0.6]]),
    rbox(-2.6, 0.3, -3, 2.6, 4.8, 3.8, [1.1, 1.1, 0.8]),
  ), S.R);
  s.add(rbox(-1.6, -0.4, -1.8, 1.6, 1.2, 1.4, 0.5), S.SL); // neck
  s.add(box(-1.9, 0.8, 0.6, 1.9, 2.2, 2.7), S.K); // the face under the brim: a dark mono-eye rail
  s.add(box(-0.5, 1.2, 2.2, 0.5, 2.0, 2.8), 0xff4f8e, EYE);
  s.add(hull([[-1.3, 0.1], [1.3, 0.1], [1.7, 1.0], [-1.7, 1.0]], [[0.6, 0.1], [2.5, 0.4], [2.7, 1.0], [0.6, 1.0]]), S.SL); // chin
  s.paint(box(-1.4, 0.35, 2.1, 1.4, 0.6, 3), S.SL2);
  s.paint(box(-2.6, 2.1, 1.3, 2.6, 2.6, 4), S.R2); // underside of the brim
  // cheek guards sweeping down and forward beside the face
  s.add(both(hull([[2.0, 0.4], [2.9, 0.8], [2.9, 3.0], [2.0, 3.2]], [[-1.6, 0.8], [2.6, 0.2], [3.0, 1.0], [2.0, 2.6], [-1.6, 3.2]])), S.R);
  s.paint(both(box(2.5, 0.2, 0.8, 3.1, 1.0, 3.2)), S.R2);
  // crest: one tall narrow fin from the top of the brim, leaning back a touch
  s.add(hull([[-0.5, 3.6], [0.5, 3.6], [0.5, 11.4], [-0.5, 11.4]], [[2.5, 3.9], [1.2, 7.4], [0.4, 11.4], [-0.2, 11.4], [-0.7, 7.4], [-0.9, 4.2]]), S.R);
  s.paint(box(-1, 9.4, -2, 1, 11.5, 3), S.R2);
  return s.model;
}

function szTorso(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-3.6, -0.6, -2.8, 3.6, 3.2, 2.2, 0.8), S.SL); // abdomen frame
  // belly mega particle cannon: a hexagonal housing with a pink lens
  const hex = [...Array(6)].map((_, i) => [Math.cos(i * Math.PI / 3) * 1.8, 1.4 + Math.sin(i * Math.PI / 3) * 1.6]);
  s.add(prism('z', hex, 1.6, 3.0), S.SL2);
  s.add(cyl('z', 0, 1.4, 0.95, 2.6, 3.4), 0xff6a9c, LENS);
  // chest: a prow, wide at the shoulders and pointed at the front, over the belly
  const chest = and(
    hull(
      [[-4.6, 2.8], [4.6, 2.8], [6.2, 5.2], [6.9, 8.8], [-6.9, 8.8], [-6.2, 5.2]],
      [[-3.9, 2.8], [2.2, 2.8], [3.6, 4.4], [4.1, 6.4], [3.2, 8.8], [-3.9, 8.8]],
      [[-6.9, -3.9], [6.9, -3.9], [6.9, 1.4], [3, 3.6], [0, 4.3], [-3, 3.6], [-6.9, 1.4]],
    ),
    or(ell(0, 6.2, -1.2, 7.6, 4.6, 5.4), box(-8, 2.8, -4, 8, 8.8, -1.2)),
  );
  s.add(chest, S.R);
  s.paint(box(-7, 2.7, -4, 7, 3.4, 5), S.R2); // lower rim
  // panel lines in a V from the collar down to the point of the prow, and the ridge between them
  s.paint(and(chest, fn([-7, 3, 0], [7, 9, 5], (x, y) => Math.abs(Math.abs(x) - (y - 3.2) * 0.62) < 0.3)), S.R3);
  s.paint(box(-0.25, 3.4, 3.6, 0.25, 7, 5), S.R2);
  s.cut(rbox(-2.8, 7.6, -2.2, 2.8, 9.5, 2.6, 0.6)); // neck well
  s.add(box(-2.8, 7.4, -2.2, 2.8, 7.9, 2.6), S.SL2);
  s.paint(both(box(3.6, 6.9, 1.8, 5.6, 7.5, 4)), S.Y); // vents on the upper chest
  s.paint(both(box(3.6, 6.3, 1.8, 5.6, 6.6, 4)), S.K);
  // gold pipe collar: ribbed pipes slung in a U under the chest
  const rx = 4.3, rz = 2.7, cz = 0.1;
  s.add(fn([-5.5, 0, 0], [5.5, 4, 4.4], (x, y, z) => {
    const rho = Math.hypot(x / rx, (z - cz) / rz);
    const yc = 1.5 + 1.0 * (x / rx) ** 2;
    return z > cz - 0.6 && Math.abs(x) > 1.4 && ((rho - 1) * 3.2) ** 2 + (y - yc) ** 2 <= 0.5;
  }), S.Y);
  s.paint(fn([-5.5, 0, 0], [5.5, 4, 4.4], (x, y, z) => Math.floor((Math.atan2(z - cz, x) * 9) / Math.PI) % 2 === 0), S.Y2);
  // collar ring and neck guards
  s.add(box(-3, 8.2, -2.4, 3, 9.8, 2.2), S.SL);
  s.add(both(hull([[2.6, 8.4], [4.4, 8.4], [4.0, 10.4], [2.6, 10.6]], [[-2.4, 8.4], [2.6, 8.4], [2.2, 10.4], [-2.4, 10.6]])), S.R);
  s.paint(both(box(2.5, 10, -3, 4.5, 11, 3)), S.R2);
  // backpack with twin thrusters under it
  s.add(rbox(-4.6, 2.2, -7.0, 4.6, 8.6, -3.4, 1), S.R);
  s.paint(box(-4.7, 2.1, -7.1, 4.7, 2.9, -3.3), S.R2);
  s.add(both(cyl('y', 2.2, -5.4, 1.0, 2.4, 0.6, 1.5)), S.SL2);
  s.add(both(cyl('y', 2.2, -5.4, 0.6, 1.2, 0.6, 1.1)), S.K);
  // funnel racks: two slate containers standing up behind the head, splayed a little, three funnel caps each
  const splay = (sh) => both(rot(sh, [-0.08, 0, -0.1], [4.5, 3.5, -7.7]));
  const CAPS = [11.0, 13.6, 16.2];
  const caps = or(...CAPS.map((y) => cyl('z', 4.5, y, 1.05, -6.4, -5.4)));
  s.add(splay(or(rbox(2.9, 3.5, -9.2, 6.1, 17.6, -6.2, 0.7), caps)), S.FC);
  s.paint(splay(caps), S.R);
  s.paint(splay(or(...CAPS.map((y) => cyl('z', 4.5, y, 0.5, -5.7, -5.3)))), S.R3);
  return s.model;
}

// Right upper arm, the outside toward -x: the huge pauldron over a slate upper arm. The left is its mirror image.
function szUpperArmR(R) {
  const s = new Sculpt(pal, R);
  // the pauldron is blocked out level, then tipped so its outer end rides up like a fender
  const shell = and(
    hull(
      [[2.4, -2.8], [2.4, 2.8], [0.6, 3.9], [-3.6, 4.4], [-5.8, 3.4], [-6.0, -0.4], [-4.6, -2.8]],
      [[-4.8, -2.6], [-5.2, 2.2], [-3.6, 4.4], [3.2, 4.4], [5.0, 2.2], [4.8, -2.0], [3.2, -2.8]],
    ),
    rbox(-6.1, -2.9, -5.3, 2.5, 4.5, 5.1, 1.4),
  );
  const tip = (sh) => rot(sh, [0, 0, -0.28], [0, 0, 0]);
  s.add(tip(shell), S.R);
  s.paint(tip(box(-7, -3.2, -6, 3, -2.0, 6)), S.R2); // rim
  s.paint(tip(sub(box(-7, 1.2, -6, 3, 1.7, 6), box(1.4, -4, -6, 3, 6, 6))), S.R3); // seam between the upper and lower shells
  s.paint(tip(box(-2.4, -1.6, 3.6, -0.4, -0.2, 6)), S.Y); // marker and vent on the front
  s.paint(tip(box(-4.6, -1.6, 3.6, -3.0, -0.2, 6)), S.K);
  s.add(cyl('y', 0, 0, 1.5, -2.0, -6.2), S.SL); // upper arm
  s.add(cyl('y', 0, 0, 1.8, -4.6, -6.0), S.R2);
  return s.model;
}

function szForeArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.3, -1.4, 1.4), S.SL); // elbow
  const arm = and(
    hull([[1.7, -0.6], [1.7, -5.9], [-2.2, -6.0], [-2.9, -1.8], [-2.0, -0.6]], [[-2.1, -0.6], [2.2, -0.6], [2.4, -5.9], [-2.2, -5.9]]),
    rbox(-3, -6.1, -2.3, 1.8, -0.5, 2.5, 0.7),
  );
  s.add(arm, S.R);
  s.paint(box(-3.1, -6.2, -2.5, 1.9, -5.3, 2.6), S.R2); // cuff
  s.paint(box(-3.1, -2.2, -1.2, -2.2, -1.4, 1.2), S.Y);
  s.add(rbox(-1.3, -8.1, -1.2, 1.1, -5.8, 1.4, 0.5), S.SL); // fist
  s.paint(box(-1.4, -6.6, 1.0, 1.2, -6.1, 1.5), S.SL2);
  return s.model;
}

function szHips(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-4.2, -2.2, -2.8, 4.2, 1.4, 2.4, 0.6), S.SL); // waist
  s.add(box(-4.8, 0.4, -3.2, 4.8, 2.0, 2.8), S.R2); // belt
  s.add(hull([[-1.5, 0.6], [1.5, 0.6], [1.2, -3.0], [0, -3.6], [-1.2, -3.0]], [[1.0, 0.6], [3.0, 0.6], [2.6, -3.4], [1.0, -3.4]]), S.SL2); // crotch
  // front skirt: a centre plate carrying the crest, flanked by two flared plates, all slanting out into a bell
  const centre = hull([[-2.5, 1.6], [2.5, 1.6], [3.0, -4.6], [2.1, -5.6], [-2.1, -5.6], [-3.0, -4.6]], [[2.2, 1.6], [3.3, 1.6], [4.8, -5.6], [3.7, -5.6]]);
  s.add(centre, S.R);
  s.paint(and(centre, half(0, 1, 0, -4.8)), S.R2);
  const flank = hull([[3.1, 1.6], [5.9, 1.6], [7.3, -4.2], [3.8, -5.0]], [[1.4, 1.6], [2.8, 1.6], [4.3, -4.8], [2.9, -4.8]]);
  s.add(both(flank), S.R);
  s.paint(both(and(flank, half(0, 1, 0, -4.0))), S.R2);
  s.paint(both(box(4.2, -1.2, 2, 5.4, -0.4, 5)), S.Y);
  // side skirts and the rear skirt
  const side = hull([[6.4, 1.4], [7.6, 1.4], [8.8, -4.2], [7.7, -4.2]], [[-3.0, 1.4], [2.5, 1.4], [2.8, -4.2], [-3.5, -4.2]]);
  s.add(both(side), S.R);
  s.paint(both(and(side, half(0, 1, 0, -3.5))), S.R2);
  const rear = hull([[-4.6, 1.4], [4.6, 1.4], [5.2, -4.6], [-5.2, -4.6]], [[-2.6, 1.4], [-3.8, 1.4], [-5.3, -4.6], [-4.1, -4.6]]);
  s.add(rear, S.R);
  s.paint(and(rear, half(0, 1, 0, -3.9)), S.R2);
  s.project(CREST, [-4.5 / R, -0.4, 6], { y: S.Y });
  return s.model;
}

function szThigh(R) {
  const s = new Sculpt(pal, R);
  s.add(ell(0, 0, 0, 1.6), S.SL); // hip ball
  s.add(cyl('y', 0, 0, 1.7, -1, -8), S.SL);
  s.add(and(hull([[-2.6, -1.4], [2.6, -1.4], [2.3, -7.6], [-2.3, -7.6]], [[-2.2, -1.4], [2.6, -1.4], [2.3, -7.6], [-1.8, -7.6]]), rbox(-2.7, -7.7, -2.3, 2.7, -1.3, 2.7, 0.8)), S.R);
  s.paint(box(-3, -7.8, -3, 3, -7.0, 3), S.R2);
  s.paint(box(-0.3, -6.4, 2.2, 0.3, -2, 3), S.R2);
  return s.model;
}

// Right shin: narrow under the knee, belling out toward the foot, the flare swelling outward (-x) and back so the two
// legs clear each other. The left is its mirror image.
function szShinR(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.5, -1.8, 1.8), S.SL); // knee joint
  const shin = hull(
    [[1.7, -0.6], [-2.0, -0.6], [-2.4, -3.8], [-4.8, -8.2], [-4.8, -9.3], [2.6, -9.3], [2.6, -7.0], [1.9, -3.8]],
    [[-2.2, -0.6], [2.1, -0.8], [2.4, -4.6], [3.3, -9.3], [-4.6, -9.3], [-4.3, -6.8], [-2.8, -2.8]],
  );
  s.add(and(shin, rbox(-5, -9.4, -4.7, 2.7, -0.5, 3.5, 1)), S.R);
  s.paint(box(-5.1, -9.4, -5, 2.8, -8.5, 4), S.R2); // hem
  for (const x of [-3.6, -1.6]) s.paint(box(x - 0.25, -8.5, -5, x + 0.25, -4.5, 4), S.R2); // flare panel lines
  // knee armour: a slate cap with a point
  s.add(hull([[-1.9, 1.6], [1.9, 1.6], [2.1, -2.4], [-2.1, -2.4]], [[0.6, 1.6], [2.3, 0.8], [3.2, -0.9], [2.6, -2.4], [0.6, -2.4]]), S.SL);
  s.paint(box(-2.2, -2.5, 2.4, 2.2, -1.2, 3.4), S.SL2);
  // foot: long and pointed, slate sole, heel thruster
  s.add(hull(null, [[-3.8, -10], [5.6, -10], [5.6, -9.5], [2.2, -8.2], [-3.8, -8.2]], [[-2.4, -3.8], [2.4, -3.8], [2.5, 3.0], [0, 5.6], [-2.5, 3.0]]), S.R);
  s.paint(box(-3, -10.1, -4, 3, -9.6, 6), S.SL2);
  s.add(cyl('z', 0, -7.0, 1.1, -4.9, -4.2, 1.4), S.SL2);
  return s.model;
}

// Shield: a long curved kite, red rim round a black centre with the gold crest; its face bows out toward +x.
function szShield(R) {
  const s = new Sculpt(pal, R);
  const hz = (y) => (y > 3.6 ? 4.2 - (y - 3.6) * 1.8 : y < -6 ? Math.max(0, 4.2 - (-6 - y) * 0.52) : 4.2);
  const face = (y, z) => 0.2 + 1.3 * (1 - (z / 4.4) ** 2);
  const plate = fn([-1, -14, -4.4], [1.6, 5, 4.4], (x, y, z) => Math.abs(z) <= hz(y) && x <= face(y, z) && x >= face(y, z) - 1.1);
  s.add(plate, S.R);
  s.paint(and(plate, fn([-1, -12, -1.9], [2, 3.2, 1.9], (x, y, z) => Math.abs(z) <= Math.min(1.9, hz(y) - 1.4))), S.K);
  s.paint(and(plate, box(-1, 3.2, -5, 2, 5, 5)), S.R2);
  s.project(CREST, [3, 2.2, -3.5 / R], { y: S.Y }, 'zy');
  return s.model;
}

export function sazabiWeapons(R = SAZABI_R) {
  const hawk = new Sculpt(pal, R); // beam tomahawk grip, a gold emitter head
  hawk.add(box(-0.9, -0.9, -3, 0.9, 0.9, 2.4), S.SL2);
  hawk.add(box(-1.1, -1.1, 2.4, 1.1, 1.6, 4), S.Y2);
  const rifle = new Sculpt(pal, R); // beam shot rifle: a long slate box with a drum under it and a sight on top
  rifle.add(rbox(-1.1, -1.4, -3.5, 1.1, 1.4, 6, 0.4), S.SL);
  rifle.add(box(-0.7, -0.6, 6, 0.7, 0.8, 11), S.SL2); // barrel
  rifle.add(box(-0.9, -0.8, 10, 0.9, 1.0, 11.4), S.SL);
  rifle.add(box(-0.7, -3.4, -0.2, 0.7, -1.2, 1.2), S.SL2); // grip
  rifle.add(cyl('x', -2.6, 3.0, 1.5, -1.0, 1.0), S.SL2); // drum
  rifle.add(box(-0.6, 1.4, 0.6, 0.6, 2.4, 3.6), S.SL2); // sight
  rifle.add(box(-0.4, 1.7, 3.6, 0.4, 2.2, 3.9), 0xff4f8e, EYE);
  rifle.paint(box(-1.2, -1.5, 4.4, 1.2, 1.5, 4.9), S.R);
  const funnel = new Sculpt(pal, R); // a funnel: red body, slate fins, a glowing muzzle in the nose
  funnel.add(cyl('z', 0, 0, 0.9, -1.6, 2.2, 0.55), S.R);
  funnel.add(or(box(-2.2, -0.25, -2, 2.2, 0.25, -0.4), box(-0.25, -2.2, -2, 0.25, 2.2, -0.4)), S.SL);
  funnel.add(box(-0.3, -0.3, 2.2, 0.3, 0.3, 2.6), 0xffc050, { glow: 2.4, jitter: 0 });
  return { hawk: hawk.model, rifle: rifle.model, funnel: funnel.model };
}

export function sazabiDef(R = SAZABI_R) {
  const uR = szUpperArmR(R), fR = szForeArmR(R), shinR = szShinR(R), thigh = szThigh(R);
  return rigDef(R, SCALE, 19, {
    hips: { parent: null, pivot: [0, 0, 0], model: szHips(R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: szTorso(R) },
    head: { parent: 'torso', pivot: [0, 9.6, 0.4], model: szHead(R) },
    uArmR: { parent: 'torso', pivot: [-8.6, 7, 0], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -6.2, 0], model: fR },
    hand: { parent: 'fArmR', pivot: [0, -7, 0], model: null },
    uArmL: { parent: 'torso', pivot: [8.6, 7, 0], model: uR.clone().flipX() },
    fArmL: { parent: 'uArmL', pivot: [0, -6.2, 0], model: fR.clone().flipX() },
    handL: { parent: 'fArmL', pivot: [3.2, -3, 0], model: szShield(R) },
    thighR: { parent: 'hips', pivot: [-2.8, -1, 0], model: thigh },
    shinR: { parent: 'thighR', pivot: [0, -8, 0], model: shinR },
    thighL: { parent: 'hips', pivot: [2.8, -1, 0], model: thigh.clone() },
    shinL: { parent: 'thighL', pivot: [0, -8, 0], model: shinR.clone().flipX() },
  });
}
