// RX-75 Guntank (co-op only), sculpted from reference renders with core/sculpt.js. What makes it read: two wide dark
// tread units under a low hull, a red waist with a yellow lamp, a boxy blue chest, the glass-dome cockpit head in a
// white frame, twin dark 120mm cannons running long off the shoulders, and grey four-tube missile launchers for
// forearms, their tubes capped red. The hips node is the tread base; the torso turns on it.
import { Sculpt, box, rbox, ell, cyl, hull, half, fn, and, or, sub, both, rigDef } from '../core/sculpt.js';
import { pal } from './suits.js';

export const GUNTANK_R = 2;
const T = {
  B: 0x2f55b0, B2: 0x23408a, W: 0xdde2ea, W2: 0xb9c0cc, N: 0x1e2a48, N2: 0x2c3a5e, TR: 0x2a2c30, TR2: 0x3c3f45,
  GR: 0x6a707e, GR2: 0x4e5460, DK: 0x22252c, R: 0xc8302e, R2: 0x962220, Y: 0xe8b820,
};

function tankBase(R) {
  const s = new Sculpt(pal, R);
  // two tread units: a rounded-end belt with raised links, road wheels and a skirt along the outside
  for (const sx of [-1, 1]) {
    const x0 = sx < 0 ? -8.4 : 3.6, x1 = x0 + 4.8;
    const belt = and(box(x0, -11, -8.4, x1, -5.6, 8.4), or(box(x0, -11, -6, x1, -5.6, 6), cyl('x', -8.3, 6, 2.7, x0, x1), cyl('x', -8.3, -6, 2.7, x0, x1)));
    s.add(belt, T.TR);
    s.paint(and(belt, fn([x0, -12, -9], [x1, -5, 9], (x, y, z) => Math.floor((z + y) * 1.2) % 2 === 0)), T.TR2); // tread links
    const out = sx < 0 ? x0 - 0.6 : x1 + 0.6;
    for (const z of [-4.8, -1.6, 1.6, 4.8]) s.add(cyl('x', -8.6, z, 1.4, Math.min(out, sx < 0 ? x0 : x1), Math.max(out, sx < 0 ? x0 : x1)), T.GR); // road wheels
    s.add(box(Math.min(out, sx < 0 ? x0 : x1), -7.0, -7.4, Math.max(out, sx < 0 ? x0 : x1), -5.6, 7.4), T.N); // track skirt
  }
  // low hull between the treads, a sloped glacis with a lamp, and the waist ring the torso turns on
  s.add(hull([[-3.8, -9.4], [3.8, -9.4], [3.8, -2.2], [-3.8, -2.2]], [[-6.6, -9.4], [5.4, -9.4], [7.2, -6.4], [5.6, -2.2], [-6.6, -2.2]]), T.N);
  s.paint(box(-3, -8.8, 5.6, 3, -4.6, 8), T.N2);
  s.add(box(-1.6, -7.4, 6.4, 1.6, -5.8, 7.4), T.Y);
  s.add(cyl('y', 0, -0.4, 4.8, -2.4, 0.6), T.GR);
  s.add(cyl('y', 0, -0.4, 4.0, 0.6, 1.2), T.DK);
  return s.model;
}

function tankTorso(R) {
  const s = new Sculpt(pal, R);
  // the red waist, tapering down into the turret ring, a yellow lamp on its front
  s.add(hull([[-3.2, -0.8], [3.2, -0.8], [4.4, 2.6], [-4.4, 2.6]], [[-2.8, -0.8], [2.6, -0.8], [3.2, 2.6], [-3.2, 2.6]]), T.R);
  s.paint(box(-5, -0.9, -4, 5, -0.2, 4), T.R2);
  s.add(cyl('z', 0, 0.9, 0.9, 2.4, 3.3), T.Y, { glow: 0.5, jitter: 0 });
  // boxy blue chest
  s.add(rbox(-5.2, 2.4, -3.4, 5.2, 8.6, 3.6, 0.6), T.B);
  s.paint(box(-5.3, 2.3, -3.5, 5.3, 3.0, 3.7), T.B2);
  s.add(box(-2.2, 3.4, 3.2, 2.2, 6.2, 4.2), T.B2); // chest plate
  s.add(box(-1.6, 4.2, 3.8, 1.6, 5.4, 4.4), T.R); // intake
  for (const y of [4.5, 5.0]) s.paint(box(-1.5, y, 4.0, 1.5, y + 0.2, 4.6), T.R2);
  s.add(box(-3.0, 8.2, -2.6, 3.0, 9.2, 2.6), T.W); // collar
  // twin 120mm cannons: breech blocks on the shoulders, long dark barrels running forward
  for (const sx of [-1, 1]) {
    const x = sx * 6.0;
    s.add(rbox(x - 1.4, 6.0, -5.6, x + 1.4, 9.6, 1.6, 0.4), T.GR2); // breech
    s.add(cyl('z', x, 7.8, 0.75, 1.4, 15.6), T.DK); // barrel
    s.add(cyl('z', x, 7.8, 0.95, 8.4, 9.2), T.GR2);
    s.add(cyl('z', x, 7.8, 1.0, 15.0, 16.6), T.GR2); // muzzle
    s.cut(cyl('z', x, 7.8, 0.45, 15.8, 16.8));
  }
  // backpack ammo drums
  s.add(rbox(-3.6, 2.6, -6.2, 3.6, 7.8, -3.2, 0.5), T.W2);
  s.add(both(cyl('x', 5.4, -5.2, 1.4, 0.4, 3.4)), T.GR);
  return s.model;
}

// The cockpit: a glass dome on a white frame, the pilot's silhouette inside.
function tankHead(R) {
  const s = new Sculpt(pal, R);
  s.add(rbox(-2.4, -0.2, -2.4, 2.4, 0.8, 2.4, 0.4), T.W);
  s.add(and(ell(0, 0.8, 0, 2.4, 2.6, 2.4), half(0, -1, 0, -0.8)), 0x7fd6e8, { glow: 0.55, jitter: 0.02 });
  s.add(box(-0.5, 0.8, -0.3, 0.5, 2.4, 0.5), 0x2a2e38); // pilot silhouette
  s.add(both(box(2.3, 0.4, -0.8, 2.9, 2.0, 0.8)), T.W); // side sensors
  s.add(cyl('y', -1.4, -1.2, 0.2, 2.4, 4.6), T.R); // antenna
  return s.model;
}

// Right upper arm: a round blue shoulder pod. The left mirrors it.
function tankUpperArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(and(ell(-0.6, 0, 0, 2.4, 2.2, 2.4), half(0, -1, 0, 1.6)), T.B);
  s.add(cyl('y', 0, 0, 1.1, -1.6, -4.4), T.GR2);
  return s.model;
}
// Forearm: the four-tube missile launcher, tubes capped red, opening downward along the arm.
function tankForeArmR(R) {
  const s = new Sculpt(pal, R);
  s.add(cyl('x', 0, 0, 1.0, -1.2, 1.2), T.GR2); // elbow
  s.add(rbox(-2.0, -6.2, -2.0, 2.0, -0.8, 2.0, 0.5), T.GR);
  s.paint(box(-2.1, -3.6, -2.1, 2.1, -3.2, 2.1), T.GR2);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    s.add(cyl('y', x, z, 0.75, -7.2, -5.8), T.GR2);
    s.add(cyl('y', x, z, 0.5, -7.3, -6.8), T.R);
  }
  return s.model;
}

export function guntankDef(R = GUNTANK_R) {
  const uR = tankUpperArmR(R), fR = tankForeArmR(R);
  return rigDef(R, 0.1, 11, {
    hips: { parent: null, pivot: [0, 0, 0], model: tankBase(R) },
    torso: { parent: 'hips', pivot: [0, 2, 0], model: tankTorso(R) },
    head: { parent: 'torso', pivot: [0, 9.2, 0], model: tankHead(R) },
    uArmR: { parent: 'torso', pivot: [-6.6, 4.8, 0], model: uR },
    fArmR: { parent: 'uArmR', pivot: [0, -4.4, 0], model: fR },
    uArmL: { parent: 'torso', pivot: [6.6, 4.8, 0], model: uR.clone().flipX() },
    fArmL: { parent: 'uArmL', pivot: [0, -4.4, 0], model: fR.clone().flipX() },
  });
}
