// Mission 01: Side 7. Clear the plaza, take the three Zeon landing zones, then face the officers and Char.
// Enemies come as squads posted around the colony (the landing yards most of all). A squad holds its post until a
// pilot comes near, fights, and falls back to its post if the pilots move on.
import { commanderDef, charDef, captainDef, CMD_COLORS, CHAR_COLORS, CAPT_COLORS } from '../models/suits.js';
import { rand, randi } from '../core/util.js';
import { ARENA, ROADS, fieldAt } from '../world/world.js';
import { LZ_SITES } from './bases.js';
import { suitInfo } from './roster.js';

// Radio chatter that depends on who is flying: Amuro in the Gundam, Kai in the Guncannon, or the Ball squad's leader.
// `wing` is what a pilot says dropping in beside someone else in co-op ({lead} is the host's pilot).
const LINES = {
  amuro: {
    order: 'Zeon mobile suits are inside the colony! Amuro, get that Gundam moving!',
    launch: 'I can pilot it. I know I can. Gundam, launching!',
    wing: "Gundam, moving out! I'll back you up, {lead}!",
    bases: 'Three of them... Right. One at a time.',
    denim: 'It moved just like the manual said. I did it!',
    zone: 'Good work, Amuro! Their supply line is cracking. Keep moving!',
    warn: 'Amuro! A red mobile suit is closing fast. Three times faster than the others!',
    char: "So this is the Federation's new mobile suit. Show me what it can do.",
    meet: "A red one... it's fast! I can't let it get past me!",
    kit: "Amuro, we've dropped you a repair kit. Finish this!",
    bye: "Hmph. The pilot learns fast. We'll meet again, Gundam.",
  },
  kai: {
    order: 'Zeon mobile suits are inside the colony! Kai, get the Guncannon out there!',
    launch: "Yeah, yeah, I'm going. Guncannon, heading out!",
    wing: "Fine, fine, I'm coming too. Don't make me regret this, {lead}.",
    bases: 'Three landing zones? You have got to be kidding me...',
    denim: 'Heh. Not bad for a guy who never wanted to be here.',
    zone: 'Good work, Kai! Their supply line is cracking. Keep moving!',
    warn: 'Kai! A red mobile suit is closing fast. Three times faster than the others!',
    char: 'A Federation artillery suit... Let us see what it can do.',
    meet: 'The Red Comet?! Great. Just great... Fine. Eat 240 millimeters!',
    kit: "Kai, we've dropped you a repair kit. Finish this!",
    bye: "Hmph. The Federation has more than one good pilot. We'll meet again.",
  },
  ball: {
    order: "Zeon mobile suits are inside the colony! Ball squad, you're all we've got. Get out there!",
    launch: "A Ball against Zaku... Orders are orders. Ball, launching!",
    wing: "Ball, moving up! Don't laugh, {lead}. It's got a cannon.",
    bases: 'Three landing zones. For one Ball. Sure. Why not.',
    denim: 'I took down a commander-type. In a Ball! Nobody back at base is going to believe this.',
    zone: 'Good work, Ball Leader! Their supply line is cracking. Keep moving!',
    warn: 'Ball Leader! A red mobile suit is closing fast. Three times faster than the others!',
    char: 'A Ball? The Federation sends a space pod to stop me? How amusing.',
    meet: "The Red Comet?! In a Ball?! ...Mass-produced or not, I'm not running!",
    kit: "Ball Leader, we've dropped you a repair kit. Finish this!",
    bye: "Hmph. Beaten back by a Ball... I'll remember this.",
  },
  riddhe: {
    order: "Zeon mobile suits are inside the colony! Riddhe, that machine isn't even supposed to exist yet - get it moving!",
    launch: "This is going to raise some very awkward questions later. Delta Plus, launching!",
    wing: "Riddhe Marcenas, moving up! Don't ask how I got this thing here, {lead}!",
    bases: 'Three landing zones, one very anachronistic mobile suit. Understood.',
    denim: "Sorry - wrong side, wrong decade, and I'm still winning.",
    zone: 'Good work, Riddhe! Their supply line is cracking. Keep moving!',
    warn: 'Riddhe! A red mobile suit is closing fast. Three times faster than the others!',
    char: "A machine I don't recognize... and years ahead of anything we have. Federation, explain yourself.",
    meet: "The Red Comet, in the flesh - well, this is a history lesson I did not expect. Delta Plus, engaging!",
    kit: "Riddhe, we've dropped you a repair kit. Finish this!",
    bye: "Hmph. Whatever that suit is, remember this name: Char Aznable.",
  },
  hayato: {
    wing: "Guntank's rolling out too! I'll cover you from the back, {lead}!",
  },
};

const TAU = Math.PI * 2;
const PLAZA_KOS = 50;

// Officer loadouts, shared with co-op guests (who rebuild commander puppets by name).
export function officerCfg(which) {
  const cfgs = {
    denim: { name: 'denim', kind: 'officer', title: 'DENIM · ZAKU II', jp: 'デニム', unit: 'zaku2c', def: commanderDef, colors: CMD_COLORS, hp: 1100, speed: 6.2, dmg: 44, strafe: 1 },
    gene: { name: 'gene', kind: 'officer', title: 'GENE · ZAKU II', jp: 'ジーン', unit: 'zaku2', def: commanderDef, colors: CMD_COLORS, hp: 1250, speed: 6.8, dmg: 48, strafe: -1 },
    char: { name: 'char', kind: 'char', title: 'CHAR AZNABLE · ZAKU II S', jp: 'シャア・アズナブル', unit: 'zaku2s', def: charDef, colors: CHAR_COLORS, hp: 3000, speed: 11, dmg: 46, trail: 0xff4a3a, strafe: 1 },
    captain: { name: 'captain', kind: 'captain', title: 'SQUAD LEADER', jp: '小隊長', unit: 'zaku2', def: captainDef, colors: CAPT_COLORS, hp: 420, speed: 5.4, dmg: 30, strafe: 1, leash: 30 },
  };
  const c = cfgs[which];
  return { ...c, def: c.def() };
}

// Posts: where Zeon squads stand guard around the colony. The three landing yards hold the most troops; the
// boulevard crossings each hold a squad some of the time. Squads stay at their post until a pilot comes near
// (and fall back to it once the pilots leave), so the pilots run into the enemy rather than being chased by it.
const POSTS = [
  ...LZ_SITES.map((s) => ({ x: s.x, z: s.z, yard: s.name, squads: 2, size: 8, spread: 14 })),
  ...ROADS.flatMap((x) => ROADS.map((z) => ({ x, z, squads: 1, size: 0, spread: 0 })))
    .filter((p) => Math.abs(p.x) < ARENA - 10 && Math.abs(p.z) < ARENA - 10 && !fieldAt(p.x, p.z, 4)),
];
// Posts are manned while a pilot is between these distances (restocked only out of the camera's view),
// and squads left idle past RECYCLE are quietly stood down to free their numbers for posts nearer the pilots.
const STOCK_MIN = 50, STOCK_MAX = 160, RECYCLE = 190;

export class Stage {
  constructor(game) {
    this.game = game;
    this.reset();
  }

  reset() {
    this.phase = 'idle';
    this.t = 0;
    this.officersDown = 0;
    this.char = null;
    this.flags = {};
    this.squads = [];
    this.leashT = 0;
    this.postT = 0;
    this.posts = POSTS.map((p) => ({ ...p, cool: 0, dead: false }));
    this.dropMeter = 0;
    this.plazaKos = 0;
    this.zonesTaken = 0;
  }

  // The pilot's radio lines and name card for the current suit.
  get lines() {
    return LINES[this.game.hero.suit.pilot] || LINES.amuro;
  }

  pilotSay(key, dur) {
    const g = this.game, info = suitInfo(g.hero.suit.id);
    g.hud.say(info.pilot, info.pilotName, this.lines[key], dur);
  }

  // A co-op wingman's radio call as they drop in.
  wingmanSay(unit) {
    const g = this.game, info = suitInfo(unit.suit.id), lead = suitInfo(g.hero.suit.id);
    const line = LINES[info.pilot]?.wing;
    if (!line || info.pilot === lead.pilot) return;
    const first = lead.pilotName.split(' ')[0];
    g.hud.say(info.pilot, info.pilotName, line.replace('{lead}', first[0] + first.slice(1).toLowerCase()), 3.2);
  }

  begin() {
    const g = this.game;
    this.reset();
    this.phase = 'launch';
    g.hud.say('bright', 'BRIGHT NOA', this.lines.order, 3.4);
    this.pilotSay('launch', 3.0);
    // the plaza garrison: four squads spread around the fountain ring
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + 0.45;
      this.garrison(Math.sin(a) * 26, Math.cos(a) * 26, 11, null);
    }
    // the yards and streets beyond are already held (nothing is on screen yet, so any post may be manned)
    for (let i = 0; i < 12; i++) if (!this.tendPosts(false)) break;
  }

  nearestPilot(x, z) {
    let d = Infinity;
    for (const p of this.game.players) d = Math.min(d, Math.hypot(p.pos.x - x, p.pos.z - z));
    return d;
  }

  // In front of the local camera (within ~50 degrees either side), where a squad appearing would be seen.
  inView(x, z) {
    const g = this.game, h = g.local.pos;
    return Math.cos(Math.atan2(x - h.x, z - h.z) - g.camera.yaw) > 0.3;
  }

  // Man one empty post near the pilots (yards first, then the nearest crossing), and stand down idle squads the
  // pilots have left far behind. Returns false when there was nothing to do.
  tendPosts(hidden = true) {
    const g = this.game, crowd = g.crowd;
    for (const sq of this.squads) {
      if (sq.engaged || sq.base || sq.n === 0 || this.nearestPilot(sq.x, sq.z) < RECYCLE || this.inView(sq.x, sq.z)) continue;
      for (let i = crowd.list.length - 1; i >= 0; i--) if (crowd.list[i].squad === sq) crowd.remove(crowd.list[i]);
      if (sq.post) sq.post.cool = 0;
    }
    if (crowd.count > g.difficulty.maxAlive - 16) return false;
    let best = null, bestD = Infinity;
    for (const p of this.posts) {
      if (p.dead || g.time < p.cool) continue;
      if (this.squads.some((sq) => sq.post === p && sq.n > 0)) continue;
      const d = this.nearestPilot(p.x, p.z);
      if (d < STOCK_MIN || (d > STOCK_MAX && !p.yard) || (hidden && this.inView(p.x, p.z))) continue;
      const rank = p.yard ? d - 1000 : d; // yards are always manned first, wherever the pilots are
      if (rank < bestD) { bestD = rank; best = p; }
    }
    if (!best) return false;
    // a crossing is manned about half the time, so each stretch of street plays out differently
    if (!best.yard && Math.random() < 0.45) { best.cool = g.time + 40; return true; }
    for (let i = 0; i < best.squads; i++) {
      const a = rand(0, TAU), r = best.spread ? rand(best.spread * 0.4, best.spread) : 0;
      this.garrison(best.x + Math.sin(a) * r, best.z + Math.cos(a) * r, best.size || randi(6, 10), null).post = best;
    }
    // once wiped out, a post stays empty for a while
    best.cool = g.time + 45;
    return true;
  }

  newSquad(x, z, o = {}) {
    const sq = { x, z, engaged: false, n: 0, base: null, post: null, ...o };
    this.squads.push(sq);
    return sq;
  }

  // A garrison squad in loose formation around (x, z); `base` ties it to a landing zone.
  garrison(x, z, n, base, drop = false) {
    const g = this.game;
    const sq = this.newSquad(x, z, { base });
    const gunners = n >= 5 ? 1 + (n >= 9 && Math.random() < 0.4 ? 1 : 0) : 0;
    let made = 0;
    for (let i = 0; i < n * 3 && made < n; i++) {
      const a = rand(0, TAU), r = rand(1.5, 4 + n * 0.35);
      const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r;
      if (g.world.blocked(px, pz, 1.2)) continue;
      if (g.crowd.spawn(px, pz, { gun: made < gunners, drop, yaw: a, squad: sq })) made++;
    }
    return sq;
  }

  addOfficer(which, at = null) {
    const g = this.game;
    const hero = g.hero.pos;
    let x, z;
    if (at) { x = at.x; z = at.z; }
    else {
      const a = rand(0, TAU);
      x = hero.x + Math.sin(a) * 14;
      z = hero.z + Math.cos(a) * 14;
    }
    x = Math.max(-ARENA + 6, Math.min(ARENA - 6, x));
    z = Math.max(-ARENA + 6, Math.min(ARENA - 6, z));
    const cfg = { ...officerCfg(which), x, z, drop: true, yaw: Math.atan2(hero.x - x, hero.z - z) };
    if (at) cfg.home = { x, z };
    const c = g.commanders.add(cfg);
    if (which !== 'captain') {
      g.showcase(c);
      this.rally(which === 'char' ? 14 : 20);
    }
    return c;
  }

  // A named officer has arrived: the nearest squads leave their posts to back him up, until about `want`
  // soldiers are in the fight. Rallied squads keep fighting wherever the pilots go.
  rally(want) {
    let n = 0;
    for (const sq of this.squads) if (sq.engaged && this.nearestPilot(sq.x, sq.z) < 60) n += sq.n;
    const idle = this.squads.filter((sq) => !sq.engaged && !sq.base && sq.n > 0 && this.nearestPilot(sq.x, sq.z) < 130);
    idle.sort((a, b) => this.nearestPilot(a.x, a.z) - this.nearestPilot(b.x, b.z));
    for (const sq of idle) {
      if (n >= want) break;
      sq.engaged = sq.rally = true;
      n += sq.n;
    }
  }

  onHeroLanded() {
    const g = this.game;
    if (this.phase !== 'launch') return;
    for (const p of g.players) if (p !== g.hero) this.wingmanSay(p);
    this.phase = 'plaza';
    // only the plaza garrison sees the Gundam come down; the rest of the colony holds its posts
    for (const sq of this.squads) if (Math.hypot(sq.x - g.hero.pos.x, sq.z - g.hero.pos.z) < 45) sq.engaged = true;
    g.hud.announce('MISSION START', 'SECURE THE PLAZA');
    g.hud.setObjective(`Clear the plaza · 0/${PLAZA_KOS}`);
    g.audio.playMusic('battle');
  }

  onKill(e) {
    const g = this.game;
    const k = g.stats.kos;
    if (this.phase === 'plaza') {
      this.plazaKos++;
      g.hud.setObjective(`Clear the plaza · ${Math.min(PLAZA_KOS, this.plazaKos)}/${PLAZA_KOS}`);
      if (this.plazaKos >= PLAZA_KOS) this.startBases();
    }
    if (k === 100 || k === 200 || k === 300 || k === 500 || k === 1000) g.hud.announce(`${k} KO`, '', false);
    // a repair kit or E-cap every so often, sooner when a pilot is hurting
    this.dropMeter++;
    let worst = 1;
    for (const p of g.players) if (p.alive) worst = Math.min(worst, p.hp / p.maxHp);
    const need = g.difficulty.dropEvery * (worst < 0.4 ? 0.45 : worst < 0.7 ? 0.75 : 1);
    if (this.dropMeter >= need) {
      this.dropMeter = 0;
      g.items.drop(worst > 0.8 && Math.random() < 0.6 ? 'sp' : 'hp', e.x, e.z);
    }
  }

  startBases() {
    const g = this.game;
    this.phase = 'bases';
    g.audio.play('alarm');
    g.hud.announce('ZEON LANDING ZONES', 'DEFEAT THEIR SQUAD LEADERS', true);
    g.hud.setObjective(`Capture the landing zones · 0/${LZ_SITES.length}`);
    g.hud.say('bright', 'BRIGHT NOA', "They're dropping supply pods all over Side 7! Take out each squad leader and the landing zone falls.", 4.0);
    this.pilotSay('bases', 2.6);
    const zones = LZ_SITES.map((site, i) => g.lz.add(site, 0.6 + i * 0.7));
    // watch the nearest pod come down out of the colony sky
    const h = g.hero.pos;
    const near = zones.reduce((a, b) => (Math.hypot(a.x - h.x, a.z - h.z) < Math.hypot(b.x - h.x, b.z - h.z) ? a : b));
    near.delay = 0.3;
    g.showcasePoint(near.focus, 2.6);
  }

  // A pod has touched down: its garrison and squad leader take position.
  onZoneLanded(lz) {
    // the yard's standing guard joins the pod's garrison, which fills out around them
    let have = 0;
    for (const sq of this.squads) {
      if (sq.base || Math.hypot(sq.x - lz.x, sq.z - lz.z) > 30) continue;
      sq.base = lz;
      have += sq.n;
    }
    for (let i = 0; i < 3 && have < 27; i++) {
      const a = (i / 3) * TAU + rand(-0.3, 0.3);
      have += this.garrison(lz.x + Math.sin(a) * 10, lz.z + Math.cos(a) * 10, 9, lz).n;
    }
    for (const p of this.posts) if (p.yard === lz.name) p.dead = true;
    lz.captain = this.addOfficer('captain', { x: lz.x + 3.5, z: lz.z + 3.5 });
    lz.captain.lz = lz;
    lz.reinforceT = 10;
  }

  onCommanderDefeated(c) {
    const g = this.game;
    if (c.kind === 'captain') return this.onZoneTaken(c.lz);
    if (c.name === 'denim') {
      g.hud.say('denim', 'DENIM', "Impossible! Its armor shrugged off my heat hawk...", 2.6);
      this.pilotSay('denim', 2.6);
    } else if (c.name === 'gene') {
      g.hud.say('gene', 'GENE', 'No... not like this!', 2.2);
    } else if (c.name === 'char') {
      g.hud.say('char', 'CHAR AZNABLE', this.lines.bye, 3.4);
    }
  }

  onZoneTaken(lz) {
    const g = this.game;
    if (!lz || lz.captured) return;
    g.lz.capture(lz);
    this.zonesTaken++;
    // the garrison fights on but no more pods come for it
    for (const sq of this.squads) if (sq.base === lz) sq.base = null;
    const left = LZ_SITES.length - this.zonesTaken;
    g.audio.play('capture');
    g.hud.announce(`LANDING ZONE ${lz.name} SECURED`, left ? `${left} REMAINING` : 'ALL ZONES CAPTURED');
    g.hud.setObjective(`Capture the landing zones · ${this.zonesTaken}/${LZ_SITES.length}`);
    if (this.zonesTaken === 1) g.hud.say('bright', 'BRIGHT NOA', this.lines.zone, 3.0);
    if (left === 0) {
      this.phase = 'predenim';
      this.t = 0;
      g.hud.setObjective('Hold position');
      g.hud.say('bright', 'BRIGHT NOA', "That's all of them... wait. Two commander-type Zaku inbound!", 3.2);
      setTimeoutGame(g, 5, () => this.startDenim());
    }
  }

  startDenim() {
    const g = this.game;
    if (this.phase !== 'predenim') return;
    this.phase = 'denim';
    this.t = 0;
    g.audio.play('alarm');
    g.hud.setObjective('Defeat Denim');
    this.addOfficer('denim');
    g.hud.say('denim', 'DENIM', "A Federation mobile suit? Gene, hold position. I'll deal with it.", 3.4);
  }

  onCommanderExploded(c) {
    const g = this.game;
    if (c.kind === 'captain') return;
    this.officersDown++;
    if (c.name === 'denim') {
      this.phase = 'gene';
      this.t = 0;
      setTimeoutGame(g, 2.5, () => {
        if (this.phase !== 'gene') return;
        g.audio.play('alarm');
        g.hud.setObjective('Defeat Gene');
        const gene = this.addOfficer('gene');
        g.hud.say('gene', 'GENE', "Sergeant Denim?! You'll pay for that! This one's mine!", 3.2);
        // his escort drops in behind him, on the far side from the pilot
        const h = g.hero.pos, a = Math.atan2(gene.pos.x - h.x, gene.pos.z - h.z);
        for (const s of [-0.5, 0.5]) this.garrison(gene.pos.x + Math.sin(a + s) * 10, gene.pos.z + Math.cos(a + s) * 10, 8, null, true);
      });
    } else if (c.name === 'gene') {
      this.phase = 'prechar';
      this.t = 0;
      g.hud.setObjective('Hold the plaza');
      g.hud.say('bright', 'BRIGHT NOA', this.lines.warn, 3.4);
      setTimeoutGame(g, 4.2, () => this.startChar());
    }
  }

  startChar() {
    const g = this.game;
    if (this.phase !== 'prechar') return;
    this.phase = 'char';
    this.t = 0;
    g.audio.play('alarm');
    g.hud.setObjective('Drive off Char Aznable');
    g.audio.playMusic('boss');
    this.char = this.addOfficer('char');
    g.hud.say('char', 'CHAR AZNABLE', this.lines.char, 3.6);
    this.pilotSay('meet', 3.0);
  }

  onCharRetreated() {
    const g = this.game;
    if (this.phase === 'win') return;
    this.phase = 'win';
    this.t = 0;
    g.hud.announce('MISSION COMPLETE', 'THE RED COMET WITHDRAWS');
    g.hud.setObjective('Side 7 secured');
    g.audio.stinger('victory');
    g.netEvent('stinger', 'victory');
    for (const p of g.players) p.invuln = 99;
    // with their ace gone the remaining Zaku go up in a chain of explosions
    const left = [...g.crowd.list].sort((a, b) => Math.hypot(a.x - g.hero.pos.x, a.z - g.hero.pos.z) - Math.hypot(b.x - g.hero.pos.x, b.z - g.hero.pos.z));
    left.forEach((e, i) => setTimeoutGame(g, 1.2 + i * 0.05, () => { if (e.alive && e.state !== 'dying') g.crowd.kill(e); }));
    for (const c of g.commanders.list) if (c.alive && c.kind === 'captain') c.damage(99999, 6, 6, c.pos.x, c.pos.z, 0, { sp: true });
    setTimeoutGame(g, 5.5, () => g.finish(true));
  }

  update(dt) {
    const g = this.game;
    this.t += dt;
    if (this.phase === 'idle' || this.phase === 'win' || this.phase === 'lose') return;
    const D = g.difficulty;
    this.leashT -= dt;
    if (this.leashT <= 0) {
      this.leashT = 0.5;
      this.squads = this.squads.filter((s) => s.n > 0);
      g.crowd.leash(this.squads, g.players);
    }
    // man the posts around the pilots as they move through the colony
    this.postT -= dt;
    if (this.postT <= 0) {
      this.postT = 1.5;
      this.tendPosts();
    }
    // landing zones drop reinforcements onto their garrison until they are taken
    if (this.phase === 'bases') {
      for (const lz of g.lz.list) {
        if (lz.captured || lz.landing || !lz.captain) continue;
        lz.reinforceT -= dt;
        if (lz.reinforceT > 0) continue;
        lz.reinforceT = 11 * D.reinforce;
        let garrison = 0;
        for (const sq of this.squads) if (sq.base === lz) garrison += sq.n;
        if (garrison < 24 && g.crowd.count < D.maxAlive) {
          const sq = this.garrison(lz.x + rand(-7, 7), lz.z + rand(-7, 7), 8, lz, true);
          sq.engaged = this.squads.some((s) => s.base === lz && s.engaged);
        }
      }
    }
    if (this.phase === 'char' && this.char) {
      const f = this.char.hp / this.char.maxHp;
      if (!this.flags.charKit && f < 0.5) {
        this.flags.charKit = true;
        g.hud.say('char', 'CHAR AZNABLE', "Not bad... but a mobile suit's worth isn't decided by its performance alone!", 3.4);
        g.items.drop('hpL', g.hero.pos.x + 4, g.hero.pos.z + 4);
      }
      if (!this.flags.charKit2 && f < 0.22) {
        this.flags.charKit2 = true;
        g.hud.say('bright', 'BRIGHT NOA', this.lines.kit, 2.8);
        g.items.drop('hpL', g.hero.pos.x - 4, g.hero.pos.z + 3);
      }
    }
  }
}

// Game-time timeouts (respect pause).
export function setTimeoutGame(game, secs, fn) {
  game.timers.push({ t: secs, fn });
}
