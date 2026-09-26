// Playable mobile suits: what the select screen shows (Reborn's spec sheet, loadout, a few moves) and the class that
// pilots each one.
import { Gundam } from './gundam.js';
import { Guncannon } from './guncannon.js';

export const ROSTER = [
  {
    id: 'gundam', cls: Gundam, pilot: 'amuro',
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
    id: 'guncannon', cls: Guncannon, pilot: 'kai',
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
];

export const suitInfo = (id) => ROSTER.find((r) => r.id === id) || ROSTER[0];
