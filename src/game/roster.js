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
  },
];

export const suitInfo = (id) => ROSTER.find((r) => r.id === id) || ROSTER[0];
