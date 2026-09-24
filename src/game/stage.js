// Mission 01: Side 7. Scripted beats layered over an endless Zaku tide.
import * as THREE from 'three';
import { commanderDef, charDef, CMD_COLORS, CHAR_COLORS } from '../models/suits.js';
import { rand, pick } from '../core/util.js';
import { ARENA } from '../world/world.js';

export class Stage {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.phase = 'idle';
    this.t = 0;
    this.spawnT = 0;
    this.beat = 0;
    this.officersDown = 0;
    this.char = null;
    this.flags = {};
  }

  begin() {
    const g = this.game;
    this.reset();
    this.phase = 'launch';
    g.hud.say('bright', 'BRIGHT NOA', 'Zeon mobile suits are inside the colony! Amuro, get that Gundam moving!', 3.4);
    g.hud.say('amuro', 'AMURO RAY', 'I can pilot it. I know I can. Gundam, launching!', 3.0);
    // a first wave already marching on the plaza
    for (let i = 0; i < 6; i++) this.spawnSquad(true);
  }

  // Squads enter from the streets around the hero, or drop in from the colony sky.
  spawnSquad(far = false, drop = false) {
    const g = this.game;
    const hero = g.hero.pos;
    let x = 0, z = 0, ok = false;
    for (let tries = 0; tries < 12 && !ok; tries++) {
      const a = rand(0, Math.PI * 2);
      const r = drop ? rand(16, 30) : far ? rand(28, 60) : rand(42, 75);
      x = hero.x + Math.sin(a) * r;
      z = hero.z + Math.cos(a) * r;
      ok = Math.abs(x) < ARENA - 4 && Math.abs(z) < ARENA - 4 && !g.world.blocked(x, z, 3);
    }
    if (!ok) return 0;
    const n = Math.round(rand(5, 9));
    const gunners = Math.random() < 0.7 ? Math.round(rand(1, 3)) : 0;
    const face = Math.atan2(hero.x - x, hero.z - z);
    let made = 0;
    for (let i = 0; i < n; i++) {
      const ox = rand(-3.5, 3.5), oz = rand(-3.5, 3.5);
      if (g.world.blocked(x + ox, z + oz, 1)) continue;
      const e = g.crowd.spawn(x + ox, z + oz, { gun: i < gunners, drop, yaw: face });
      if (e) made++;
    }
    return made;
  }

  addOfficer(which) {
    const g = this.game;
    const hero = g.hero.pos;
    const a = rand(0, Math.PI * 2);
    let x = hero.x + Math.sin(a) * 14, z = hero.z + Math.cos(a) * 14;
    x = Math.max(-ARENA + 6, Math.min(ARENA - 6, x));
    z = Math.max(-ARENA + 6, Math.min(ARENA - 6, z));
    const cfgs = {
      denim: { name: 'denim', kind: 'officer', title: 'DENIM · ZAKU II', jp: 'デニム', def: commanderDef(), colors: CMD_COLORS, hp: 900, speed: 6.2, dmg: 44, strafe: 1 },
      gene: { name: 'gene', kind: 'officer', title: 'GENE · ZAKU II', jp: 'ジーン', def: commanderDef(), colors: CMD_COLORS, hp: 1050, speed: 6.8, dmg: 48, strafe: -1 },
      char: { name: 'char', kind: 'char', title: 'CHAR AZNABLE · ZAKU II S', jp: 'シャア・アズナブル', def: charDef(), colors: CHAR_COLORS, hp: 3000, speed: 11, dmg: 50, trail: 0xff4a3a, strafe: 1 },
    };
    const cfg = { ...cfgs[which], x, z, drop: true, yaw: Math.atan2(hero.x - x, hero.z - z) };
    const c = g.commanders.add(cfg);
    return c;
  }

  onHeroLanded() {
    const g = this.game;
    if (this.phase !== 'launch') return;
    this.phase = 'wave1';
    this.t = 0;
    g.hud.announce('MISSION START', 'REPEL THE ZEON RAID');
    g.hud.setObjective('Defeat 60 Zaku');
    g.audio.playMusic('battle');
  }

  onKill() {
    const g = this.game;
    const k = g.stats.kos;
    if (this.phase === 'wave1' && k >= 60) {
      this.phase = 'denim';
      this.t = 0;
      g.audio.play('alarm');
      g.hud.announce('ENEMY COMMANDER', 'DENIM HAS ENTERED THE FIELD', true);
      g.hud.setObjective('Defeat Denim');
      this.addOfficer('denim');
      g.hud.say('denim', 'DENIM', "A Federation mobile suit? Gene, hold position. I'll deal with it.", 3.4);
    }
    if (k === 100 || k === 250 || k === 500 || k === 1000) g.hud.announce(`${k} KO`, '', false);
  }

  onCommanderDefeated(c) {
    const g = this.game;
    if (c.name === 'denim') {
      g.hud.say('denim', 'DENIM', "Impossible! Its armor shrugged off my heat hawk...", 2.6);
      g.hud.say('amuro', 'AMURO RAY', 'It moved just like the manual said. I did it!', 2.6);
    } else if (c.name === 'gene') {
      g.hud.say('gene', 'GENE', 'No... not like this!', 2.2);
    } else if (c.name === 'char') {
      g.hud.say('char', 'CHAR AZNABLE', "Hmph. The pilot learns fast. We'll meet again, Gundam.", 3.4);
    }
  }

  onCommanderExploded(c) {
    const g = this.game;
    this.officersDown++;
    if (c.name === 'denim') {
      this.phase = 'gene';
      this.t = 0;
      setTimeoutGame(g, 2.5, () => {
        if (this.phase !== 'gene') return;
        g.audio.play('alarm');
        g.hud.announce('ENEMY COMMANDER', 'GENE IS ON THE ATTACK', true);
        g.hud.setObjective('Defeat Gene');
        this.addOfficer('gene');
        g.hud.say('gene', 'GENE', "Sergeant Denim?! You'll pay for that! This one's mine!", 3.2);
        for (let i = 0; i < 3; i++) this.spawnSquad(false, true);
      });
    } else if (c.name === 'gene') {
      this.phase = 'prechar';
      this.t = 0;
      g.hud.setObjective('Hold the plaza');
      g.hud.say('bright', 'BRIGHT NOA', 'Amuro! A red mobile suit is closing fast. Three times faster than the others!', 3.4);
      setTimeoutGame(g, 4.2, () => this.startChar());
    }
  }

  startChar() {
    const g = this.game;
    if (this.phase !== 'prechar') return;
    this.phase = 'char';
    this.t = 0;
    g.audio.play('alarm');
    g.hud.announce('WARNING', 'THE RED COMET APPROACHES', true);
    g.hud.setObjective('Drive off Char Aznable');
    g.audio.playMusic('boss');
    this.char = this.addOfficer('char');
    g.hud.say('char', 'CHAR AZNABLE', "So this is the Federation's new mobile suit. Show me what it can do.", 3.6);
    g.hud.say('amuro', 'AMURO RAY', "A red one... it's fast! I can't let it get past me!", 3.0);
  }

  onCharRetreated() {
    const g = this.game;
    if (this.phase === 'win') return;
    this.phase = 'win';
    this.t = 0;
    g.hud.announce('MISSION COMPLETE', 'THE RED COMET WITHDRAWS');
    g.hud.setObjective('Side 7 secured');
    g.audio.stopMusic();
    g.audio.play('victory');
    g.hero.invuln = 99;
    // with their ace gone the remaining Zaku go up in a chain of explosions
    const left = [...g.crowd.list].sort((a, b) => Math.hypot(a.x - g.hero.pos.x, a.z - g.hero.pos.z) - Math.hypot(b.x - g.hero.pos.x, b.z - g.hero.pos.z));
    left.forEach((e, i) => setTimeoutGame(g, 1.2 + i * 0.02, () => { if (e.alive && e.state !== 'dying') g.crowd.kill(e); }));
    setTimeoutGame(g, 5.5, () => g.finish(true));
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    if (this.phase === 'idle' || this.phase === 'win' || this.phase === 'lose') return;
    // keep the field full
    const target = g.difficulty.maxAlive * (this.phase === 'char' ? 0.6 : this.phase === 'launch' ? 0.5 : 1);
    this.spawnT -= dt;
    if (this.spawnT <= 0 && g.crowd.count < target) {
      this.spawnT = 0.35;
      const drop = Math.random() < 0.18;
      this.spawnSquad(false, drop);
    }
    // item drops over time near the hero when hurt
    if (this.phase === 'char' && !this.flags.charKit && this.char && this.char.hp < this.char.maxHp * 0.5) {
      this.flags.charKit = true;
      g.hud.say('char', 'CHAR AZNABLE', "Not bad... but a mobile suit's worth isn't decided by its performance alone!", 3.4);
      g.items.drop('hp', g.hero.pos.x + 4, g.hero.pos.z + 4);
    }
  }
}

// Game-time timeouts (respect pause).
export function setTimeoutGame(game, secs, fn) {
  game.timers.push({ t: secs, fn });
}
