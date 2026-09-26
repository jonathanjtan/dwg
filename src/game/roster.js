// Playable mobile suits: what the select screen shows (Reborn's spec sheet, loadout, a few moves) and the class that
// pilots each one. Every player picks from this list, host and co-op guests alike, and two players may fly the same
// suit. Entries marked `coop` are only offered to guests. To add a suit: a Hero subclass (see gundam.js) and an entry
// here (`cfg` is the suit's config, which the dev tools read its model and moves from); co-op picks it up from the id.
import { Gundam, GUNDAM } from './gundam.js';
import { Guncannon, GUNCANNON } from './guncannon.js';
import { Ball, BALL } from './ball.js';
import { DeltaPlus, DELTAPLUS } from './deltaplus.js';
import { F91, F91_SUIT } from './f91.js';
import { Tank } from './tank.js';

export const ROSTER = [
  {
    id: 'gundam', cls: Gundam, cfg: GUNDAM, pilot: 'amuro',
    unit: 'RX-78-2 GUNDAM', unitShort: 'GUNDAM', unitJp: 'ガンダム', pilotName: 'AMURO RAY', pilotJp: 'アムロ・レイ',
    stats: { MELEE: 600, SHOT: 600, DEFENSE: 485, ARMOR: 10000, MOBILITY: 800, THRUSTER: 1000 },
    equipment: ['Beam Saber', 'Beam Rifle', 'Beam Javelin', 'Hyper Bazooka', 'Gundam Hammer'],
    role: 'All-rounder. Long beam saber reach, a rifle for range, and a weapon for every charge attack.',
    moves: [
      ['J ×6', 'Beam saber string, ending in a launching spin'],
      ['K', 'Beam rifle: mash it, or hold for a charge shot'],
      ['J K', 'Launcher, then the beam javelin'],
      ['J J K', 'Hyper bazooka, four rounds'],
      ['J×5 K', 'Stab into the ground: shockwave'],
      ['SP (hold)', 'Gundam hammer'],
    ],
    // in-game combo guide: [inputs, what it does, move it starts]. J attack, K charge, B boost, U jump, S SP.
    guide: [
      ['J J J J J J', 'Saber string, launching spin', 'N'],
      ['K', 'Beam rifle · mash, or hold for charge shot', 'C1'],
      ['J K', 'Launcher into the beam javelin', 'C2'],
      ['J J K', 'Hyper bazooka, four rounds', 'C3'],
      ['J J J K', 'Flurry, then dash through', 'C4'],
      ['J J J J K', 'Rising crescent', 'C5'],
      ['J J J J J K', 'Ground stab shockwave', 'C6'],
      ['B J', 'Dash rush · keep pressing J', 'DA'],
      ['B K', 'Point-blank bazooka', 'DC'],
      ['U J', 'Air slash', 'JA'],
      ['U K', 'Plunging stab', 'JC'],
      ['S', 'Saber flurry and javelin · hold: hammer', 'SP'],
      ['U S', 'Bazooka barrage', 'SPA'],
    ],
  },
  {
    id: 'guncannon', cls: Guncannon, cfg: GUNCANNON, pilot: 'kai',
    unit: 'RX-77-2 GUNCANNON', unitShort: 'GUNCANNON', unitJp: 'ガンキャノン', pilotName: 'KAI SHIDEN', pilotJp: 'カイ・シデン',
    stats: { MELEE: 600, SHOT: 600, DEFENSE: 567, ARMOR: 8429, MOBILITY: 667, THRUSTER: 790 },
    equipment: ['Beam Rifle', '240mm Cannons'],
    role: 'Artillery brawler. Short fists and grabs up close, twin shoulder cannons that level anything in front of it.',
    moves: [
      ['J ×6', 'Hook, backhand, straight, two kicks and a launching spin'],
      ['K', 'Beam rifle: mash it, or hold for a twin-cannon salvo'],
      ['J J K', 'Hoist and hurl, then shell it in the air'],
      ['J J J K', 'Point-blank cannon barrage'],
      ['J×5 K', 'Giant swing'],
      ['SP (hold)', 'Shells in every direction'],
    ],
    guide: [
      ['J J J J J J', 'Punches, kicks, launching spin', 'N'],
      ['K', 'Beam rifle · mash, or hold for cannon salvo', 'C1'],
      ['J K', 'Thruster uppercut', 'C2'],
      ['J J K', 'Hoist, hurl and shell', 'C3'],
      ['J J J K', 'Point-blank cannons ×4', 'C4'],
      ['J J J J K', 'Juggling shell string', 'C5'],
      ['J J J J J K', 'Giant swing', 'C6'],
      ['B J', 'Punch rush · keep pressing J', 'DA'],
      ['B K', 'Launch and anti-air blast', 'DC'],
      ['U J', 'Air punch', 'JA'],
      ['U K', 'Cannons at the ground', 'JC'],
      ['S', 'Punch storm · hold: shells all around', 'SP'],
      ['U S', 'Hover and shell', 'SPA'],
    ],
  },
  {
    id: 'ball', cls: Ball, cfg: BALL, pilot: 'ball',
    unit: 'RB-79 BALL', unitShort: 'BALL', unitJp: 'ボール', pilotName: 'BALL LEADER', pilotJp: 'ボール隊長',
    stats: { MELEE: 600, SHOT: 600, DEFENSE: 506, ARMOR: 9087, MOBILITY: 240, THRUSTER: 904 },
    equipment: ['180mm Recoilless Cannon', 'Manipulator Arms'],
    role: 'Pride of mass production. A space pod that tumbles in claws first, shells everything else, and calls in its squadron.',
    moves: [
      ['J ×6', 'Tumbling claw swipes, ending in a launching backflip'],
      ['K', '180mm cannon: mash it, or hold for a heavy shell'],
      ['J K', 'Claw flurry into a rising launcher'],
      ['J J K', 'Tuck in and roll like a bowling ball'],
      ['J×5 K', 'Meteor drop'],
      ['SP (hold)', 'Call in the Ball squadron'],
    ],
    guide: [
      ['J J J J J J', 'Claw swipes, somersault, launching flip', 'N'],
      ['K', '180mm cannon · mash, or hold for heavy shell', 'C1'],
      ['J K', 'Claw flurry, rising launcher', 'C2'],
      ['J J K', 'Bowling-ball roll', 'C3'],
      ['J J J K', 'Spinning top', 'C4'],
      ['J J J J K', 'Launch and shell it ×3', 'C5'],
      ['J J J J J K', 'Meteor drop', 'C6'],
      ['B J', 'Spinning dash · keep pressing J', 'DA'],
      ['B K', 'Spin, then point-blank shell', 'DC'],
      ['U J', 'Air tumble', 'JA'],
      ['U K', 'Cannon at the ground', 'JC'],
      ['S', 'Claw frenzy, point-blank shell · hold: squadron', 'SP'],
      ['U S', 'Ram and blast', 'SPA'],
    ],
  },
  {
    id: 'deltaplus', cls: DeltaPlus, cfg: DELTAPLUS, pilot: 'riddhe',
    unit: 'MSN-001A1 DELTA PLUS', unitShort: 'DELTA PLUS', unitJp: 'デルタプラス', pilotName: 'RIDDHE MARCENAS', pilotJp: 'リディ・マーセナス',
    stats: { MELEE: 600, SHOT: 600, DEFENSE: 480, ARMOR: 10000, MOBILITY: 728, THRUSTER: 1000 },
    equipment: ['Beam Saber', 'Beam Rifle', 'Grenade Launcher'],
    role: 'Transformable ace machine. Taller and later than the rest of the field; folds into its waverider mode to ram straight through the line, then a shield-mounted grenade launcher for whatever is still standing.',
    moves: [
      ['J ×6', 'Beam saber string, ending in a launching spin'],
      ['K', 'Beam rifle: mash it, or hold for a charge shot'],
      ['J K', 'Rising cut into a full spin'],
      ['J J K', 'Saber flurry, then the grenade launcher point-blank'],
      ['J J J K', 'Folds into waverider mode and rams straight through'],
      ['SP (hold)', 'A field-length transformation run'],
    ],
    guide: [
      ['J J J J J J', 'Saber string, launching spin', 'N'],
      ['K', 'Beam rifle · mash, or hold for charge shot', 'C1'],
      ['J K', 'Rising cut into a full spin', 'C2'],
      ['J J K', 'Saber flurry, grenade launcher blast', 'C3'],
      ['J J J K', 'Transform and ram straight through', 'C4'],
      ['J J J J K', 'Rising crescent', 'C5'],
      ['J J J J J K', 'Shield bash, grenade launcher fan', 'C6'],
      ['B J', 'Dash rush · keep pressing J', 'DA'],
      ['B K', 'Spin, then point-blank grenade', 'DC'],
      ['U J', 'Air slash', 'JA'],
      ['U K', 'Plunging stab', 'JC'],
      ['S', 'Saber-and-rifle flurry, then a transform ram · hold: a longer run', 'SP'],
      ['U S', 'Grenade launcher barrage', 'SPA'],
    ],
  },
  {
    id: 'f91', cls: F91, cfg: F91_SUIT, pilot: 'seabook',
    unit: 'F91 GUNDAM F91', unitShort: 'GUNDAM F91', unitJp: 'ガンダムF91', pilotName: 'SEABOOK ARNO', pilotJp: 'シーブック・アノー',
    stats: { MELEE: 600, SHOT: 600, DEFENSE: 373, ARMOR: 8406, MOBILITY: 528, THRUSTER: 740 },
    equipment: ['Beam Saber', 'Beam Rifle', 'VSBR', 'Beam Launcher'],
    role: 'Formula-project speedster. Paper-thin armor, but a beam saber string, a rifle, a beam launcher and a twin VSBR whirlwind to match any Gundam.',
    moves: [
      ['J ×6', 'Beam saber string, ending in a launching spin'],
      ['K', 'Beam rifle: mash it, or hold for a charge shot'],
      ['J J J K', 'VSBR whirlwind: twin beams swing out from the back'],
      ['B K', 'Dash spin into the beam launcher, point-blank'],
      ['J×5 K', 'Dash-through slash, ground-erupting stab'],
      ['SP (hold)', 'Corkscrew VSBR drill, M.E.P.E. burst on landing'],
    ],
    guide: [
      ['J J J J J J', 'Saber string, launching spin', 'N'],
      ['K', 'Beam rifle · mash, or hold for charge shot', 'C1'],
      ['J K', 'Rising launcher, spin, stomp', 'C2'],
      ['J J K', 'Launcher into an aerial rifle barrage', 'C3'],
      ['J J J K', 'VSBR whirlwind', 'C4'],
      ['J J J J K', 'Dash-rush combo, spinning slam', 'C5'],
      ['J J J J J K', 'Dash-through, ground stab shockwave', 'C6'],
      ['B J', 'Dash rush · keep pressing J', 'DA'],
      ['B K', 'Spin into the beam launcher, point-blank', 'DC'],
      ['U J', 'Air slash', 'JA'],
      ['U K', 'Plunging stab', 'JC'],
      ['S', 'VSBR flurry and cross-slash · hold: corkscrew drill', 'SP'],
      ['U S', 'Hover in an M.E.P.E. afterimage vortex', 'SPA'],
    ],
  },
  {
    id: 'guntank', cls: Tank, pilot: 'hayato', coop: true,
    unit: 'RX-75 GUNTANK', unitShort: 'GUNTANK', unitJp: 'ガンタンク', pilotName: 'HAYATO KOBAYASHI', pilotJp: 'ハヤト・コバヤシ',
    stats: { MELEE: 300, SHOT: 700, DEFENSE: 600, ARMOR: 10000, MOBILITY: 450, THRUSTER: 500 },
    equipment: ['4-tube Missile Launchers', '120mm Cannons'],
    role: 'Co-op support. Missiles that find their own targets and cannon shells lobbed from the back line.',
    moves: [
      ['J', 'Four-missile burst (4th press: eight)'],
      ['K', 'Twin 120mm cannons'],
      ['J J K', 'Six-shell barrage'],
      ['Jump', 'Thruster hop'],
      ['Boost', 'Tread boost'],
      ['SP', 'Full burst: missiles and shells all round'],
    ],
  },
];

// Suits the host can fly (the select screen) and the ones a guest can (everything).
export const SOLO_ROSTER = ROSTER.filter((r) => !r.coop);

export const suitInfo = (id) => ROSTER.find((r) => r.id === id) || ROSTER[0];
