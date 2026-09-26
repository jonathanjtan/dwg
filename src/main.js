import * as THREE from 'three';
import { Post } from './post.js';
import { Input, lockPointer } from './core/input.js';
import { isTouch, isStandalone, isFullscreen, fullscreenAvailable, enterFullscreen, toggleFullscreen } from './core/touch.js';
import { World } from './world/world.js';
import { FX } from './fx/fx.js';
import { ROSTER, SOLO_ROSTER, suitInfo } from './game/roster.js';
import { Crowd } from './game/crowd.js';
import { Commanders } from './game/commander.js';
import { Combat } from './game/combat.js';
import { Projectiles } from './game/projectiles.js';
import { Items } from './game/items.js';
import { LandingZones } from './game/bases.js';
import { Stage, officerCfg } from './game/stage.js';
import { Net, RemoteInput, GRUNT_STATES, GF, LOCALNET, MAX_PLAYERS } from './net/net.js';
import { CameraRig } from './camera.js';
import { HUD } from './ui/hud.js';
import { SuitSelect } from './ui/select.js';
import { Audio } from './audio/audio.js';
import { rand, wrapAngle } from './core/util.js';
import { unitSprite } from './ui/units.js';
import { portrait, renderingFor } from './ui/portraits.js';

// maxPress: engaged Zaku allowed to close in and swing at once (the rest ring you from further out)
// dropEvery: KOs per repair kit / E-cap (halved when hurt); recover: share of damage that heals back if you avoid hits
// reinforce: multiplier on the time between reinforcement squads
const DIFFICULTY = {
  easy: { dmgTaken: 0.6, dmgDealt: 1.2, enemyHp: 0.85, aggression: 0.7, speed: 0.9, maxAlive: 90, maxPress: 10, dropEvery: 20, recover: 0.65, reinforce: 1.3 },
  normal: { dmgTaken: 1, dmgDealt: 1, enemyHp: 1, aggression: 1, speed: 1, maxAlive: 120, maxPress: 14, dropEvery: 28, recover: 0.5, reinforce: 1 },
  hard: { dmgTaken: 1.5, dmgDealt: 0.9, enemyHp: 1.25, aggression: 1.4, speed: 1.15, maxAlive: 150, maxPress: 18, dropEvery: 40, recover: 0.3, reinforce: 0.75 },
};
const NO_INPUT = { move: { x: 0, y: 0 }, key: () => false };
const saved = (key, roster) => {
  let id = null;
  try { id = localStorage.getItem(key); } catch (e) { /* private mode */ }
  return roster.some((r) => r.id === id) ? id : roster[0].id;
};
const savedSuit = () => saved('gmusou.suit', SOLO_ROSTER);
const $ = (id) => document.getElementById(id);

class Game {
  constructor() {
    const canvas = document.getElementById('game');
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.isTouch = isTouch();
    if (this.isTouch) {
      document.body.classList.add('touch');
      document.getElementById('sp-ready').textContent = 'SP READY'; // no key to name
    }
    // A phone GPU running a 3x display would render nine times the pixels a laptop does; cap it and let
    // adaptQuality trim further from there.
    this.maxPixelRatio = Math.min(devicePixelRatio, this.isTouch ? 1 : 1.5);
    this.minPixelRatio = this.isTouch ? 0.5 : 0.75; // a phone gets one more step down before it stutters
    this.pixelRatio = this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // tone mapping + sRGB happen in the post chain's final pass

    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 3000);

    this.post = new Post(this.renderer, Math.round(innerWidth * this.pixelRatio), Math.round(innerHeight * this.pixelRatio));

    this.time = 0;
    this.timers = [];
    this.difficultyName = 'normal';
    this.difficulty = DIFFICULTY.normal;
    this.input = new Input(canvas);
    this.audio = new Audio();
    this.world = new World(this.scene);
    this.fx = new FX(this.scene);
    this.fx.smokeSources = this.world.smokeSources;
    this.camera = new CameraRig(this.cam, this.world);
    this.combat = new Combat(this);
    this.projectiles = new Projectiles(this);
    this.items = new Items(this);
    this.lz = new LandingZones(this);
    this.commanders = new Commanders(this);
    this.crowd = new Crowd(this);
    this.heroes = {};
    this.players = []; // every suit in the fight; the host's own is players[0]
    // Co-op, host side: slots[n] is guest n (the host is slot 0 and flies this.hero). Guest side: puppets[n] mirrors
    // player n from the host's snapshots, and this.local is the guest's own.
    this.slots = [];
    this.puppets = [];
    this.setSuit(savedSuit());
    this.net = new Net(this);
    this.netEvent = (...e) => this.net.event(...e);
    this.guestSuit = saved('gmusou.coopSuit', ROSTER);
    this.guestPicked = false;
    this.localSpT = 0;
    this.hud = new HUD(this);
    this.hud.setPilot(this.hero.suit.id);
    this.select = new SuitSelect(this);
    this.stage = new Stage(this);
    this.stats = this.freshStats();
    this.combo = { count: 0, timer: 0, max: 0 };
    this.mode = 'title';
    this.slowT = 0;
    this.slowScale = 1;
    this.worldSlowT = 0;
    this.cutsceneT = 0;
    this.lowHpT = 0;
    this.ambT = 4;
    this.titleT = 0;
    this.frameTimes = [];
    this._focus = new THREE.Vector3();
    this._near = [];

    addEventListener('resize', () => this.resize());
    addEventListener('orientationchange', () => setTimeout(() => this.resize(), 120));
    visualViewport?.addEventListener('resize', () => this.resize());
    document.addEventListener('fullscreenchange', () => { this.resize(); this.syncFullscreenUI(); });
    document.addEventListener('webkitfullscreenchange', () => { this.resize(); this.syncFullscreenUI(); });
    this.resize();
    document.addEventListener('pointerlockchange', () => {
      if (!this.input.locked && this.mode === 'play' && !this.ignoreUnlock) this.pause(true);
      this.ignoreUnlock = false;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.pause(true);
    });
    this.bindUI();
    this.setupTitle();
    const join = new URLSearchParams(location.search).get('join');
    if (join) this.startGuest(join);
    document.getElementById('loading').classList.add('hidden');
    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  freshStats() {
    return { kos: 0, time: 0, maxCombo: 0, damageTaken: 0, officers: 0 };
  }

  // Switch the host's mobile suit (the select screen; on a guest, the preview standing behind its select screen).
  // Each suit is built once and kept; only the chosen one is in the scene.
  setSuit(id) {
    const info = suitInfo(id);
    if (info.coop) return; // nothing to preview for the co-op-only suits
    const next = this.heroes[info.id] || (this.heroes[info.id] = new info.cls(this));
    const prev = this.hero;
    if (prev === next) return;
    if (prev) {
      next.reset();
      next.pos.copy(prev.pos);
      next.heading = prev.heading;
      prev.attach(false);
    }
    next.attach(true);
    this.hero = next;
    if (this.net?.role === 'guest') return;
    this.players = this.players.length ? this.players.map((p) => (p === prev ? next : p)) : [next];
    this.local = next;
    this.hud?.setPilot(info.id);
    try { localStorage.setItem('gmusou.suit', info.id); } catch (e) { /* private mode */ }
  }

  // The visible area on a phone is whatever the browser's chrome leaves behind, and it changes as the
  // address bar slides away, on rotation, and on entering fullscreen. visualViewport reports that area;
  // innerWidth/Height is the fallback everywhere else.
  viewport() {
    const w = Math.round(visualViewport?.width || innerWidth);
    const h = Math.round(visualViewport?.height || innerHeight);
    // a backgrounded or not-yet-laid-out tab can report nothing; don't build a zero-sized frame buffer
    return w > 0 && h > 0 ? [w, h] : null;
  }

  resize() {
    const size = this.viewport();
    if (!size) return;
    const [w, h] = size;
    document.getElementById('app').style.height = `${h}px`;
    this.cam.aspect = w / h;
    this.cam.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.post.setSize(Math.round(w * this.pixelRatio), Math.round(h * this.pixelRatio));
  }

  bindUI() {
    const $ = (id) => document.getElementById(id);
    for (const b of document.querySelectorAll('#diff button')) {
      b.addEventListener('click', () => {
        for (const o of document.querySelectorAll('#diff button')) o.classList.remove('on');
        b.classList.add('on');
        this.difficultyName = b.dataset.d;
        this.difficulty = DIFFICULTY[b.dataset.d];
        this.audio.resume();
        this.audio.play('ui');
      });
    }
    $('launch').addEventListener('click', () => this.openSelect());
    $('resume').addEventListener('click', () => this.pause(false));
    $('restart').addEventListener('click', () => { this.pause(false); this.start(); });
    $('to-title').addEventListener('click', () => this.toTitle());
    $('retry').addEventListener('click', () => this.start());
    $('res-title-btn').addEventListener('click', () => this.toTitle());
    $('host-btn').addEventListener('click', () => this.hostCoop());
    $('coop-copy').addEventListener('click', () => {
      navigator.clipboard?.writeText($('coop-link').value);
      $('coop-copy').textContent = 'COPIED';
      setTimeout(() => ($('coop-copy').textContent = 'COPY LINK'), 1500);
    });
    $('lobby-leave').addEventListener('click', () => this.leaveCoop());
    $('lobby-suit').addEventListener('click', () => this.openGuestSelect());
    $('mute-btn').addEventListener('click', () => {
      const m = this.audio.toggleMute();
      $('mute-btn').textContent = m ? 'SOUND: OFF' : 'SOUND: ON';
    });
    $('guide-btn').addEventListener('click', () => this.hud.toggleGuide());
    for (const id of ['fs-btn', 'fs-btn-pause']) $(id).addEventListener('click', () => toggleFullscreen());
    this.setupFullscreenUI();
    // title theme starts on the first gesture (browsers block audio before one)
    const titleMusic = () => {
      if (this.mode !== 'title') return;
      this.audio.resume();
      this.audio.playMusic('title');
    };
    addEventListener('pointerdown', titleMusic);
    addEventListener('keydown', titleMusic);
    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (this.mode === 'select') this.select.key(e.code);
      else if (e.code === 'Enter' && this.mode === 'title') this.openSelect();
      else if (e.code === 'Enter' && this.mode === 'results') this.start();
    });
  }

  // Fullscreen is worth a button on a desktop too, but on a phone it is the difference between a
  // playable screen and a letterbox between the address bar and the tab strip.
  setupFullscreenUI() {
    const $ = (id) => document.getElementById(id);
    const can = fullscreenAvailable() && !isStandalone();
    // the title button lives in the touch-only help block; the pause one is for everybody
    $('fs-btn').classList.toggle('hidden', !can);
    $('fs-btn-pause').classList.toggle('hidden', !can);
    // iPhone Safari has no Fullscreen API. Launched from the home screen it runs chrome-less anyway.
    $('a2hs').classList.toggle('hidden', can || !this.isTouch || isStandalone());
    this.syncFullscreenUI();
  }

  syncFullscreenUI() {
    const on = isFullscreen();
    const label = on ? 'EXIT FULLSCREEN' : 'FULLSCREEN';
    document.getElementById('fs-btn').firstChild.textContent = label;
    document.getElementById('fs-btn-pause').textContent = label;
  }

  setupTitle() {
    this.mode = 'title';
    this.hud.show(false);
    document.getElementById('title').classList.remove('hidden');
    this.hero.reset();
    this.hero.pos.set(0, 0, 0);
    this.hero.heading = 0.4;
    this.crowd.clear();
    this.commanders.clear();
    // a Zaku formation facing the Gundam for the title shot
    for (let i = 0; i < 26; i++) {
      const row = Math.floor(i / 7), col = i % 7;
      this.crowd.spawn(-12 + col * 3.6 + (row % 2) * 1.8, 22 + row * 3.8, { gun: (i % 4) === 0, yaw: Math.PI });
    }
  }

  // Title -> mobile suit select (the chosen suit stands in the title scene behind the panel).
  openSelect() {
    if (this.mode !== 'title') return;
    this.audio.resume();
    this.audio.play('ui');
    this.mode = 'select';
    document.getElementById('title').classList.add('hidden');
    this.select.show();
  }

  closeSelect() {
    if (this.mode !== 'select') return;
    this.audio.play('ui');
    this.select.hide();
    this.mode = 'title';
    document.getElementById('title').classList.remove('hidden');
  }

  start() {
    this.audio.resume();
    this.audio.play('ui');
    this.audio.stopMusic();
    this.select.hide();
    document.getElementById('title').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden');
    this.crowd.clear();
    this.commanders.clear();
    this.projectiles.clear();
    this.items.clear();
    this.lz.clear();
    this.hud.reset();
    this.timers.length = 0;
    this.cutsceneT = 0;
    this.lock = null;
    this.stats = this.freshStats();
    this.combo = { count: 0, timer: 0, max: 0 };
    this.hero.reset();
    this.hero.startIntro();
    this.camera.yaw = 0;
    this.camera.pitch = 0.26;
    this.camera.show = null;
    this.camera.target.set(0, 3, -14);
    this.mode = 'play';
    this.hud.show(true);
    // guests who have picked a suit drop in on either side of the host
    this.players = [this.hero];
    this.slots.forEach((s, n) => {
      if (!s?.unit) return;
      s.unit.deploy(n % 2 ? 5 : -5, -20);
      s.input = new RemoteInput();
      this.players.push(s.unit);
    });
    if (this.net.role === 'host') this.net.send({ y: 'start' });
    this.stage.begin();
    this.canvas.focus();
    // sortie is a tap, so this is inside the gesture fullscreen needs
    if (this.isTouch && !isFullscreen()) enterFullscreen();
    if (!this.isTouch) lockPointer(this.canvas);
  }

  toTitle() {
    this.select.hide();
    this.lock = null;
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    this.audio.stopMusic();
    this.audio.playMusic('title');
    this.stage.reset();
    this.projectiles.clear();
    this.items.clear();
    this.lz.clear();
    this.hud.reset();
    this.ignoreUnlock = true;
    document.exitPointerLock?.();
    this.setupTitle();
    if (this.net.role === 'guest') this.leaveCoop();
    for (const s of this.slots) s?.unit?.attach(false);
    this.players = [this.hero];
    if (this.net.role === 'host') this.net.send({ y: 'title' });
  }

  pause(on) {
    if (on && this.mode !== 'play') return;
    if (!on && this.mode !== 'paused') return;
    this.mode = on ? 'paused' : 'play';
    this.pausedAt = performance.now();
    document.getElementById('pause').classList.toggle('hidden', !on);
    if (on) {
      this.audio.ctx?.suspend();
      if (this.input.locked) { this.ignoreUnlock = true; document.exitPointerLock(); }
    } else {
      this.audio.resume();
      lockPointer(this.canvas);
    }
  }

  finish(win) {
    if (this.mode === 'results') return;
    this.mode = 'results';
    this.ignoreUnlock = true;
    document.exitPointerLock?.();
    const s = this.stats;
    const $ = (id) => document.getElementById(id);
    $('res-title').textContent = win ? 'MISSION COMPLETE' : 'MISSION FAILED';
    // rank from KOs, commanders, combo, speed and damage taken
    let score = s.kos * 1.6 + s.maxCombo * 1.5 + s.officers * 50 - s.damageTaken * 0.1 - Math.max(0, s.time - 600) * 0.6;
    if (!win) score *= 0.4;
    const rank = score > 900 ? 'S' : score > 600 ? 'A' : score > 350 ? 'B' : score > 150 ? 'C' : 'D';
    $('res-rank').textContent = rank;
    const t = Math.floor(s.time);
    const rows = [
      ['K.O. COUNT', s.kos],
      ['MAX COMBO', s.maxCombo],
      ['COMMANDERS', s.officers],
      ['DAMAGE TAKEN', Math.round(s.damageTaken)],
      ['TIME', `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`],
      ['DIFFICULTY', this.difficultyName.toUpperCase()],
    ];
    $('res-stats').innerHTML = rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');
    $('res-buttons').classList.remove('hidden');
    $('res-wait').classList.add('hidden');
    $('results').classList.remove('hidden');
    if (this.net.role === 'host') this.net.send({ y: 'res', title: $('res-title').textContent, rank, rows });
  }

  // ---------- events ----------
  // chromatic aberration pulse (heavy blows, big impacts)
  aberr(v) {
    this.post.aberr = Math.max(this.post.aberr, v);
  }
  slowmo(scale, dur) {
    this.slowScale = scale;
    this.slowT = dur;
  }
  addCombo(n) {
    this.combo.count += n;
    this.combo.timer = 2.2;
    this.combo.max = Math.max(this.combo.max, this.combo.count);
    this.stats.maxCombo = this.combo.max;
  }
  onGruntKilled(g) {
    this.stats.kos++;
    this.stage.onKill(g);
  }
  onCommanderDefeated(c) {
    this.stats.officers++;
    this.stats.kos++;
    if (c.kind === 'captain') {
      // squad leader down: a beat of slow motion, a big kit, and the landing zone falls
      this.slowmo(0.3, 0.55);
      this.camera.shake(0.45);
      this.hud.toast('SQUAD LEADER DEFEATED', '#ffd070');
      this.items.drop('hpL', c.pos.x, c.pos.z);
      this.stage.onCommanderDefeated(c);
      return;
    }
    this.hud.whiteFlash(0.5);
    this.slowmo(0.2, 0.9);
    this.camera.shake(0.6);
    this.audio.play('bigboom');
    this.hud.announce(c.kind === 'char' ? 'CHAR REPELLED' : 'COMMANDER DEFEATED', c.cfg.title);
    this.stage.onCommanderDefeated(c);
    if (c.kind === 'char') this.stage.onCharRetreated();
    else this.items.drop('hpL', c.pos.x, c.pos.z);
    if (c.kind !== 'char') this.items.drop('sp', c.pos.x + 1.5, c.pos.z);
  }
  onCommanderExploded(c) {
    this.stage.onCommanderExploded(c);
  }
  // Officer arrival: the camera finds them over the hero's shoulder while their name card slides in.
  showcase(c, dur = 2.8) {
    if (this.mode !== 'play') return;
    this.cutsceneT = dur;
    this.localShowcase(c, dur);
    for (const p of this.players) p.invuln = Math.max(p.invuln, dur + 0.4);
    this.netEvent('show', c.netId, dur);
  }
  localShowcase(c, dur) {
    this.camera.showcase(c.pos, dur);
    this.hud.nameCard(c.cfg, dur);
  }
  // Same camera move without a name card (a landing pod coming down).
  showcasePoint(pos, dur) {
    if (this.mode !== 'play') return;
    this.cutsceneT = dur;
    this.camera.showcase(pos, dur);
    this.hud.cineT = dur;
    for (const p of this.players) p.invuln = Math.max(p.invuln, dur + 0.4);
    this.netEvent('showp', pos.x, pos.z, dur);
  }
  // ---------- lock-on (commanders only: squad leaders, named officers, Char) ----------
  lockable(c) {
    return c && c.alive && c.state !== 'drop' && c.state !== 'dead' && c.state !== 'retreat' && c.rig.root.visible;
  }

  // R / middle click / R3: lock on to the commander nearest the middle of the view, or let go. With nobody to lock
  // on to, it recentres the camera behind the pilot as before.
  toggleLock() {
    if (this.lock) { this.lock = null; this.audio.play('ui', { vol: 0.5, pitch: 0.8 }); return; }
    const L = this.local.pos, fwd = this.camera.forward();
    let best = null, bestScore = Infinity;
    for (const c of this.commanders.list) {
      if (!this.lockable(c)) continue;
      const dx = c.pos.x - L.x, dz = c.pos.z - L.z, d = Math.hypot(dx, dz);
      if (d > 60) continue;
      const off = Math.acos(Math.max(-1, Math.min(1, (dx * fwd.x + dz * fwd.z) / (d || 1))));
      const score = d * (1 + off * 1.5);
      if (score < bestScore) { bestScore = score; best = c; }
    }
    if (!best) { this.camera.recenter(this.local.heading); return; }
    this.lock = best;
    this.audio.play('ui', { pitch: 1.3 });
  }

  updateLock() {
    const c = this.lock;
    if (c && (!this.lockable(c) || Math.hypot(c.pos.x - this.local.pos.x, c.pos.z - this.local.pos.z) > 75)) this.lock = null;
    this.camera.lockOn = this.lock ? this.lock.pos : null;
  }

  // Where a pilot's attacks aim while locked on (the hero asks through Hero.aimAt). Guests send their lock-on target
  // with their input.
  lockTarget(who) {
    let c = this.lock;
    if (who !== this.local) {
      const id = this.slots[this.slotOf(who)]?.input.lock;
      c = id ? this.commanders.list.find((x) => x.netId === id) : null;
    }
    if (!c || !this.lockable(c)) return null;
    return { x: c.pos.x, y: c.pos.y, z: c.pos.z };
  }

  // A suit's armor is gone. The host's ends the mission; a guest redeploys (see Hero.updateDead, Tank.update).
  onHeroDeath(who = this.hero) {
    if (who !== this.hero) {
      this.hud.announce(`${suitInfo(who.suit.id).unitShort} DOWN`, `REDEPLOYING IN ${Math.round(who.respawnT)} SECONDS`, true);
      return;
    }
    this.hud.announce('MISSION FAILED', `THE ${suitInfo(this.hero.suit.id).unitShort} HAS FALLEN`, true);
    this.audio.stinger('defeat');
    this.netEvent('stinger', 'defeat');
    this.slowmo(0.25, 1.5);
    this.stage.phase = 'lose';
    this.timers.push({ t: 3.5, fn: () => this.finish(false) });
  }
  onRedeploy(who) {
    this.hud.toast(`${suitInfo(who.suit.id).unitShort} REDEPLOYED`, '#7fd6e8');
  }
  onHeroLanded(who) {
    if (who === this.hero) this.stage.onHeroLanded();
  }
  onMusou(who) {
    const slot = this.slotOf(who);
    if (who === this.local) this.localMusou(who.suit.pilot);
    else this.spToast(who.suit.id);
    // freezing the world only makes sense solo
    if (who === this.hero && this.players.length === 1) this.worldSlowT = 1.0;
    this.audio.duckMusic(0.35, 0.8);
    this.netEvent('sp', slot, who.suit.id);
  }

  // Someone else's SP: a line in the corner (the SP pilot gets the cut-in instead, so this isn't replicated).
  spToast(suitId) {
    const info = suitInfo(suitId);
    this.hud.noNet = true;
    this.hud.toast(`${info.pilotName.split(' ')[0]}: ${info.coop ? 'FULL BURST' : 'SP ATTACK'}!`, '#ffd1f1');
    this.hud.noNet = false;
  }

  // Which player a suit belongs to: 0 for the host's, n for guest n, -1 for none.
  slotOf(unit) {
    return unit === this.hero ? 0 : this.slots.findIndex((s) => s?.unit === unit);
  }

  // Camera shake / hurt flash / anything else only the pilot of `who` should feel: here if it's ours, else sent to
  // that guest.
  netEventFor(who, ...e) {
    const slot = this.slotOf(who);
    if (slot > 0 && this.net.role === 'host') this.net.eventFor(slot, ...e);
  }
  shakeFor(who, v) {
    if (who === this.local) this.camera.shake(v);
    else this.netEventFor(who, 'shake', v);
  }
  hurtFor(who) {
    if (who === this.local) this.hud.hurt();
    else this.netEventFor(who, 'hurt');
  }

  localMusou(pilot) {
    this.hud.cutin(pilot);
    this.hud.whiteFlash(0.35);
    this.localSpT = 1.0;
    this.camera.cinematic({ dur: 1.1, yaw: 2.3, pitch: 0.22, dist: 7.5, fov: 46 });
  }

  // ---------- co-op: host ----------
  async hostCoop() {
    this.audio.resume();
    $('coop-panel').classList.remove('hidden');
    $('host-btn').disabled = true;
    $('coop-status').className = '';
    $('coop-status').textContent = 'Opening a room…';
    try {
      const code = await this.net.host();
      $('coop-link').value = `${location.origin}${location.pathname}?join=${code}${LOCALNET ? '&localnet' : ''}`;
      this.coopStatus();
    } catch (e) {
      $('coop-status').textContent = `Couldn't open a room (${e.type || e.message}). Try again.`;
      $('host-btn').disabled = false;
    }
  }

  // Who is in the room and what they fly, under the co-op link.
  coopStatus() {
    const el = $('coop-status');
    const guests = this.slots.filter(Boolean);
    const free = MAX_PLAYERS - 1 - guests.length;
    if (!guests.length) {
      el.textContent = `Room ${this.net.code} is open. Waiting for up to ${free} pilots…`;
      el.className = '';
      return;
    }
    const names = guests.map((s) => {
      if (!s.suit) return 'someone choosing a suit';
      const info = suitInfo(s.suit);
      return `${info.pilotName.split(' ')[0]} (${info.unitShort})`;
    });
    el.textContent = `In the room: ${names.join(', ')}.${free ? ` Room for ${free} more.` : ''} Press LAUNCH when ready.`;
    el.className = 'ok';
  }

  onGuestJoined(n) {
    this.slots[n] = { input: new RemoteInput(), suit: null, units: {}, unit: null };
    this.audio.play('pickup');
    this.coopStatus();
  }

  // A guest picked (or changed) their suit. Mid-mission, they drop in right away.
  onGuestSuit(n, id) {
    const s = this.slots[n];
    if (!s) return;
    const info = suitInfo(id);
    const unit = s.units[info.id] || (s.units[info.id] = new info.cls(this));
    const prev = s.unit;
    s.suit = info.id;
    if (prev && prev !== unit) {
      prev.attach(false);
      this.players = this.players.filter((p) => p !== prev);
    }
    s.unit = unit;
    this.coopStatus();
    if (this.mode !== 'play' && this.mode !== 'paused') return;
    if (!this.players.includes(unit)) {
      const h = this.hero.pos;
      unit.deploy(h.x + (n % 2 ? 5 : -5), h.z - 4);
      s.input = new RemoteInput();
      this.players.push(unit);
      this.hud.announce('REINFORCEMENTS', `${info.unit} INBOUND`);
      this.stage.wingmanSay(unit);
    }
    this.net.sendTo(n, { y: 'start' });
  }

  onGuestLeft(n) {
    const s = this.slots[n];
    if (!s) return;
    this.slots[n] = null;
    if (s.unit) {
      s.unit.attach(false);
      this.players = this.players.filter((p) => p !== s.unit);
      if (this.mode !== 'title') this.hud.toast(`${suitInfo(s.unit.suit.id).unitShort} DISCONNECTED`, '#ff8a8a');
    }
    this.coopStatus();
  }

  // ---------- co-op: guest ----------
  async startGuest(code) {
    this.mode = 'lobby';
    this.players = [];
    this.crowd.clear();
    $('title').classList.add('hidden');
    $('lobby').classList.remove('hidden');
    $('lobby-suit').classList.add('hidden');
    this.lobbyArt();
    $('lobby-status').textContent = `Joining room ${code.toUpperCase()}…`;
    try {
      await this.net.join(code);
      if (this.roomFull) return;
      $('lobby-status').textContent = 'Connected.';
      this.openGuestSelect();
    } catch (e) {
      $('lobby-status').textContent = e.type === 'peer-unavailable' ? "That room doesn't exist (or the host closed it)." : `Couldn't connect (${e.type || e.message}).`;
    }
  }

  // The guest's suit select: the whole roster, the Guntank included. READY sends the pick to the host.
  openGuestSelect() {
    if (this.net.role !== 'guest' || this.mode === 'guest') return;
    this.mode = 'select';
    $('lobby').classList.add('hidden');
    this.select.show({
      roster: ROSTER,
      current: this.guestSuit,
      onPick: (id) => this.setSuit(id),
      onGo: (id) => this.pickGuestSuit(id),
      onBack: () => (this.guestPicked ? this.showLobby() : this.leaveCoop()),
      go: 'READY',
      hint: `A / D or ← → to choose · Enter when ready · Esc ${this.guestPicked ? 'to go back' : 'to leave'}`,
    });
  }

  pickGuestSuit(id) {
    this.guestSuit = id;
    this.guestPicked = true;
    try { localStorage.setItem('gmusou.coopSuit', id); } catch (e) { /* private mode */ }
    this.audio.resume();
    this.audio.play('ui');
    this.net.send({ y: 'suit', id });
    this.showLobby('Ready. Waiting for the host to launch…');
  }

  showLobby(status) {
    this.select.hide();
    this.mode = 'lobby';
    $('lobby').classList.remove('hidden');
    $('lobby-suit').classList.toggle('hidden', !this.net.connected);
    if (status) $('lobby-status').textContent = status;
    this.lobbyArt();
  }

  // The lobby card: the guest's pilot, suit and its controls.
  lobbyArt() {
    const info = suitInfo(this.guestSuit);
    const img = $('lobby-portrait');
    img.src = portrait(info.pilot);
    img.style.imageRendering = renderingFor(info.pilot);
    $('lobby-unit').src = unitSprite(info.id);
    $('lobby-name').textContent = `${info.unit} · ${info.pilotName}`;
    $('lobby-controls').innerHTML = info.moves.map(([k, v]) => `<div><b>${k}</b> ${v}</div>`).join('');
  }

  // The lobby's list of who else is in, from the host's snapshots: suit ids by slot (null: still choosing, false:
  // nobody there).
  lobbyTeam(ready) {
    const key = (ready || []).join('|');
    if (key === this.teamKey) return;
    this.teamKey = key;
    $('lobby-team').innerHTML = (ready || []).map((id, n) => {
      if (n === this.net.slot || id === false) return ''; // us, or an empty slot
      if (!id) return `<div>Player ${n + 1}: choosing a suit…</div>`;
      const info = suitInfo(id);
      return `<div>${n === 0 ? 'Host' : `Player ${n + 1}`}: <b>${info.pilotName}</b> · ${info.unit}</div>`;
    }).join('');
  }

  leaveCoop() {
    this.net.close();
    this.dropPuppets();
    this.select.hide();
    this.hero.attach(true);
    this.local = this.hero;
    this.players = [this.hero];
    this.guestPicked = false;
    this.hud.setPilot(this.hero.suit.id);
    history.replaceState(null, '', location.pathname);
    $('lobby').classList.add('hidden');
    $('results').classList.add('hidden');
    $('pause').classList.add('hidden');
    this.crowd.clear();
    this.commanders.clear();
    this.projectiles.clear();
    this.items.clear();
    this.lz.clear();
    this.hud.reset();
    this.audio.stopMusic();
    this.setupTitle();
  }

  onHostLeft() {
    if (this.net.role !== 'guest') return;
    if (this.roomFull) {
      // turned away: stay on the lobby card, which says why, until they leave
      this.roomFull = false;
      this.net.close();
      this.showLobby(`That room already has ${MAX_PLAYERS} pilots.`);
      return;
    }
    this.leaveCoop();
    this.hud.toast('HOST DISCONNECTED', '#ff8a8a');
  }

  dropPuppets() {
    for (const p of this.puppets) {
      if (!p) continue;
      p.unit?.attach(false);
      p.unit = null;
    }
  }

  enterGuestPlay() {
    if (!this.guestPicked) return; // still at the suit select; the host sends 'start' again once we pick
    this.audio.resume();
    this.select.hide();
    $('lobby').classList.add('hidden');
    $('results').classList.add('hidden');
    this.hero.attach(false); // the select-screen preview
    this.hud.reset();
    this.hud.show(true);
    this.mode = 'guest';
    this.camera.yaw = 0;
    this.camera.pitch = 0.26;
    this.canvas.focus();
    if (this.isTouch && !isFullscreen()) enterFullscreen();
    if (!this.isTouch) lockPointer(this.canvas);
  }

  // Guest: messages from the host.
  onNet(d) {
    switch (d.y) {
      case 'hello':
        this.difficultyName = d.difficulty;
        this.net.slot = d.slot;
        break;
      case 'full': this.roomFull = true; break;
      case 'start': this.enterGuestPlay(); break;
      case 'title':
        this.hud.show(false);
        this.audio.stopMusic();
        this.lock = null;
        this.dropPuppets();
        this.players = [];
        this.local = this.hero;
        this.hero.attach(true);
        $('results').classList.add('hidden');
        $('pause').classList.add('hidden');
        this.ignoreUnlock = true;
        document.exitPointerLock?.();
        if (this.mode === 'select') break;
        this.showLobby('The host is back at the title screen. Waiting for launch…');
        break;
      case 'res':
        $('res-title').textContent = d.title;
        $('res-rank').textContent = d.rank;
        $('res-stats').innerHTML = d.rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');
        $('res-buttons').classList.add('hidden');
        $('res-wait').classList.remove('hidden');
        $('results').classList.remove('hidden');
        this.ignoreUnlock = true;
        document.exitPointerLock?.();
        break;
      case 's': this.applySnapshot(d); break;
    }
  }

  applySnapshot(d) {
    if (this.mode === 'lobby' || this.mode === 'select') this.lobbyTeam(d.ready);
    // joined mid-mission and already picked: drop straight in
    if (this.mode === 'lobby' && d.mode === 'play' && d.pl.some((p) => p.slot === this.net.slot)) this.enterGuestPlay();
    if (this.mode !== 'guest') return;
    this.netAge = 0;
    const stash = (obj, s) => {
      obj.net = obj.net || { pose: new Float32Array(s.pose.length), npose: new Float32Array(s.pose.length) };
      const n = obj.net;
      if (n.init) { n.px = obj.pos.x; n.py = obj.pos.y; n.pz = obj.pos.z; n.ph = n.h; n.pose.set(n.cur || s.pose); }
      else { n.px = s.x; n.py = s.y; n.pz = s.z; n.ph = s.h; n.pose.set(s.pose); n.init = true; }
      n.nx = s.x; n.ny = s.y; n.nz = s.z; n.h = s.h; n.npose.set(s.pose); n.s = s;
    };
    // a puppet per player, rebuilt when they change suits
    const seen = new Set();
    for (const p of d.pl) {
      const pup = this.puppets[p.slot] || (this.puppets[p.slot] = { units: {}, unit: null });
      const info = suitInfo(p.suit);
      const unit = pup.units[info.id] || (pup.units[info.id] = new info.cls(this));
      if (pup.unit !== unit) {
        pup.unit?.attach(false);
        pup.unit = unit;
        unit.net = null;
        unit.attach(true);
      }
      seen.add(p.slot);
      stash(unit, p.s);
    }
    this.puppets.forEach((pup, n) => {
      if (pup?.unit && !seen.has(n)) { pup.unit.attach(false); pup.unit = null; }
    });
    this.players = this.puppets.filter((p) => p?.unit).map((p) => p.unit);
    const mine = this.puppets[this.net.slot]?.unit;
    if (mine && this.local !== mine) {
      this.local = mine;
      this.hud.setPilot(mine.suit.id);
    }
    this.commanders.applyNet(d.cmd, (n) => officerCfg(n));
    for (const c of this.commanders.list) if (c.netTarget) stash(c, c.netTarget);
    this.crowd.applyNet(Net.decodeCrowd(d.crowd), GRUNT_STATES, GF);
    this.projectiles.applyNet(d.pj);
    this.items.applyNet(d.it);
    this.lz.applyNet(d.bz || []);
    const st = d.st;
    this.stats.kos = st.kos;
    this.stats.time = st.time;
    this.stats.maxCombo = st.max;
    this.combo.count = st.combo;
    this.combo.timer = st.timer;
    if (st.obj && this.hud.el.objective.textContent !== st.obj) this.hud.setObjective(st.obj);
    if (st.music && st.music !== this.audio.current) this.audio.playMusic(st.music);
    for (const e of d.ev) this.replay(e);
  }

  replay(e) {
    const [tag, name, ...args] = e;
    try {
      if (tag === '@') { if (name === this.net.slot) this.replay(args); } // meant for one guest
      else if (tag === 'f') this.fx[name](...args);
      else if (tag === 'h') this.hud[name](...args);
      else if (tag === 'a') this.audio.play(name, { vol: args[0], pitch: args[1], at: args[2] !== null ? { x: args[2], z: args[3] } : null });
      else if (tag === 'toast') this.hud.toast(name, args[0]);
      else if (tag === 'hurt') this.hud.hurt();
      else if (tag === 'shake') this.camera.shake(name);
      else if (tag === 'sp') {
        if (name === this.net.slot) this.localMusou(suitInfo(args[0]).pilot);
        else this.spToast(args[0]);
      } else if (tag === 'stinger') this.audio.stinger(name);
      else if (tag === 'show') {
        const c = this.commanders.list.find((x) => x.netId === name);
        if (c) this.localShowcase(c, args[0]);
      } else if (tag === 'showp') {
        this.camera.showcase({ x: name, y: 30, z: args[0] }, args[1]);
        this.hud.cineT = args[1];
      }
    } catch (err) { /* a malformed event shouldn't stop the guest */ }
  }

  // Guest frame: no simulation, just interpolate the host's world and send input.
  guestFrame(rdt, act) {
    const L = this.local;
    if (act.pause && performance.now() - (this.pausedAt || 0) > 350) {
      const p = $('pause');
      const open = p.classList.contains('hidden');
      p.classList.toggle('hidden', !open);
      $('restart').classList.add('hidden');
      this.pausedAt = performance.now();
      if (open) { this.ignoreUnlock = true; document.exitPointerLock?.(); } else lockPointer(this.canvas);
    }
    if (act.mute) $('mute-btn').textContent = this.audio.toggleMute() ? 'SOUND: OFF' : 'SOUND: ON';
    if (act.help) this.hud.toggleKeys();
    if (act.guide) this.hud.toggleGuide();
    if (act.recenter) this.camera.recenter(L.heading);
    if (act.lock) this.toggleLock();
    this.updateLock();
    this.time += rdt;
    this.localSpT = Math.max(0, this.localSpT - rdt);
    const menuOpen = !$('pause').classList.contains('hidden');
    const dir = menuOpen ? null : this.hero.inputDir(this.input, this.camera.forward());
    this.net.guestTick(rdt, menuOpen ? {} : act, dir, menuOpen ? 0 : Net.heldBits(this.input, act), this.lock?.netId || 0);
    this.netAge = (this.netAge || 0) + rdt;
    const k = Math.min(1, this.netAge / 0.05);
    const place = (obj) => {
      const n = obj.net;
      if (!n) return null;
      obj.pos.set(n.px + (n.nx - n.px) * k, n.py + (n.ny - n.py) * k, n.pz + (n.nz - n.pz) * k);
      obj.netSpeed = Math.hypot(n.nx - n.px, n.nz - n.pz) * 20; // one snapshot is 1/20 s
      n.cur = n.cur || new Float32Array(n.pose.length);
      for (let i = 0; i < n.cur.length; i++) n.cur[i] = n.pose[i] + (n.npose[i] - n.pose[i]) * k;
      return { ...n.s, h: n.ph + wrapAngle(n.h - n.ph) * k, pose: n.cur };
    };
    for (const p of this.players) {
      const ps = place(p);
      if (ps) p.applyNet(ps, rdt);
    }
    for (const c of this.commanders.list) {
      const cs = place(c);
      if (cs) c.applyNet(cs, rdt);
    }
    this.crowd.netInterp(rdt);
    this.projectiles.guestAdvance(rdt);
    this.items.netAnimate(rdt);
    this.lz.guestAnimate(rdt);
    this.fx.update(rdt);
    const crowdN = this.crowd.grid.query(L.pos.x, L.pos.z, 12, this._near).length;
    this.camera.yFollow = L.state === 'intro' || L.state === 'drop' ? 0.95 : 0.7;
    this.camera.update(rdt, rdt, L.pos, L.heading, menuOpen ? null : this.input, (L.netSpeed || 0) > 2, crowdN);
    this.world.follow(L.pos);
    this.world.fadeNear(this.cam.position);
    this.audio.listener = L.pos;
    this.audio.listenerYaw = this.camera.yaw;
    this.audio.loops(0, 0, 0);
    this.crowd.render(rdt);
    this.projectiles.render();
    this.hud.update(rdt);
    this.render();
    this.input.endFrame();
  }

  // ---------- loop ----------
  frame() {
    const now = performance.now();
    let rdt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.adaptQuality(rdt);
    // the pad is only up while there is a suit to drive, and never over a menu
    this.input.touch?.update(
      (this.mode === 'play' || this.mode === 'guest') && document.getElementById('pause').classList.contains('hidden'),
      this.local
    );
    const act = this.input.poll();

    if (this.mode === 'guest') return this.guestFrame(rdt, act);
    if (this.mode === 'select') this.select.pad(act, this.input.move.x, rdt);
    if (this.mode === 'title' || this.mode === 'lobby' || this.mode === 'select') {
      if (this.net.role === 'host') this.net.hostTick(rdt);
      this.audio.loops(0, 0, 0);
      this.titleT += rdt;
      this.time += rdt;
      const a = this.titleT * 0.12;
      this.hero.locomotion(rdt, 0);
      this.hero.applyVisuals(rdt);
      this.crowd.render(rdt);
      this.fx.update(rdt);
      this.world.follow(this.hero.pos);
      // orbit, keeping the Gundam on the right third of the frame
      const r = 8.5;
      this.cam.position.set(Math.sin(a) * r, 2.4 + Math.sin(this.titleT * 0.3) * 0.4, Math.cos(a) * r);
      const side = new THREE.Vector3(-Math.cos(a), 0, Math.sin(a)).multiplyScalar(2.6);
      this.cam.lookAt(side.x, 2.1, side.z);
      this.render();
      this.input.endFrame();
      return;
    }

    // the Esc that releases pointer lock can also arrive as a key press; don't let it instantly unpause
    if (act.pause && performance.now() - (this.pausedAt || 0) > 350) {
      if (this.mode === 'play') this.pause(true);
      else if (this.mode === 'paused') this.pause(false);
    }
    if (act.mute) {
      const m = this.audio.toggleMute();
      document.getElementById('mute-btn').textContent = m ? 'SOUND: OFF' : 'SOUND: ON';
    }
    if (act.help) this.hud.toggleKeys();
    if (act.guide) this.hud.toggleGuide();
    if (act.recenter) this.camera.recenter(this.local.heading);
    if (act.lock && this.mode === 'play') this.toggleLock();
    this.updateLock();

    if (this.mode === 'paused' || this.mode === 'results') {
      if (this.net.role === 'host') this.net.hostTick(rdt);
    }
    if (this.mode === 'paused') {
      this.render();
      this.input.endFrame();
      return;
    }
    if (this.mode === 'results') this.audio.loops(0, 0, 0);

    // time scaling: slow-mo, SP cut-in freeze for the world (hit-stop is per suit, in Hero.update)
    let scale = 1;
    if (this.slowT > 0) { this.slowT -= rdt; scale = Math.min(scale, this.slowScale); }
    const dt = rdt * scale;
    let wdt = dt;
    if (this.worldSlowT > 0) { this.worldSlowT -= rdt; wdt = dt * 0.08; }

    this.time += dt;
    if (this.mode === 'play' && this.stage.phase !== 'win' && this.hero.alive) this.stats.time += rdt;
    for (let i = this.timers.length - 1; i >= 0; i--) {
      const tm = this.timers[i];
      tm.t -= dt;
      if (tm.t <= 0) { this.timers.splice(i, 1); tm.fn(); }
    }

    const playable = this.mode === 'play';
    this.cutsceneT = Math.max(0, this.cutsceneT - rdt);
    const heroCtl = playable && this.cutsceneT <= 0;
    this.hero.update(dt, heroCtl ? act : {}, heroCtl ? this.input : NO_INPUT);
    for (const s of this.slots) {
      if (!s?.unit || !this.players.includes(s.unit)) continue;
      s.unit.update(dt, s.input.take(heroCtl), heroCtl ? s.input : NO_INPUT);
    }
    this.localSpT = Math.max(0, this.localSpT - rdt);
    this.crowd.update(wdt);
    this.commanders.update(wdt);
    this.projectiles.update(wdt);
    this.items.update(dt);
    this.lz.update(wdt, (lz) => this.stage.onZoneLanded(lz));
    this.combat.update(dt);
    this.stage.update(dt);
    this.fx.update(dt);
    this.combo.timer -= dt;
    if (this.combo.timer <= 0) this.combo.count = 0;

    const moving = Math.hypot(this.hero.vel.x, this.hero.vel.z) > 2;
    this.camera.yFollow = this.hero.state === 'intro' ? 0.95 : 0.7;
    const crowdN = this.crowd.grid.query(this.hero.pos.x, this.hero.pos.z, 12, this._near).length;
    this.camera.update(dt, rdt, this.hero.pos, this.hero.heading, playable ? this.input : null, moving, crowdN);
    this.world.follow(this.hero.pos);
    this.world.fadeNear(this.cam.position);
    this.audio.listener = this.hero.pos;
    this.audio.listenerYaw = this.camera.yaw;
    this.updateSoundscape(rdt, playable);
    this.crowd.render(wdt);
    this.projectiles.render();
    this.hud.update(rdt);
    this.render();
    if (this.net.role === 'host') this.net.hostTick(rdt);
    this.input.endFrame();
  }

  // Continuous sounds and ambience: saber hum, thruster roar, low-armour warning, distant fighting.
  updateSoundscape(rdt, playable) {
    const h = this.hero;
    const live = playable && h.alive;
    const jet = h.state === 'boost' ? 1 : h.hovering ? 0.75 : h.state === 'sprint' ? 0.62 : Math.min(0.6, h.flameK * 0.5);
    this.audio.loops(live ? h.saberScale : 0, h.tipSpeed, live ? jet : 0);
    const L = this.local;
    this.lowHpT -= rdt;
    if (live && L.alive && L.hp < L.maxHp * 0.25 && this.lowHpT <= 0) { this.audio.play('lowhp'); this.lowHpT = 1.3; }
    // somewhere else in Side 7 the fighting goes on: a flash on the horizon, then its rumble arrives
    this.ambT -= rdt;
    if (playable && this.ambT <= 0 && !['idle', 'win', 'lose'].includes(this.stage.phase)) {
      this.ambT = rand(4, 9);
      const a = rand(0, Math.PI * 2), d = rand(140, 220);
      const p = new THREE.Vector3(h.pos.x + Math.sin(a) * d, rand(1, 6), h.pos.z + Math.cos(a) * d);
      this.fx.explode(p, rand(2.2, 3.4), [0x6f6c64, 0x3a3532, 0x8a867c]);
      const rx = -Math.cos(this.camera.yaw), rz = Math.sin(this.camera.yaw);
      const pan = Math.max(-0.9, Math.min(0.9, Math.sin(a) * rx + Math.cos(a) * rz));
      this.timers.push({ t: d / 340, fn: () => this.audio.play('distant', { vol: rand(0.3, 0.55), pitch: rand(0.8, 1.2), pan }) });
    }
  }

  render() {
    const h = this.local.pos;
    this.post.focus = Math.max(4, this.cam.position.distanceTo(this._focus.set(h.x, h.y + 2, h.z)));
    const sp = this.localSpT > 0 ? 1 : 0;
    this.post.musou += (sp - this.post.musou) * (sp ? 0.15 : 0.08);
    const L = this.local;
    const rad = this.mode === 'title' ? 0 : L.state === 'boost' ? 0.7 : L.state === 'sprint' ? 0.32 : L.state === 'musou' && L.move?.rushFx ? 0.45 : 0;
    this.post.radial += (rad - this.post.radial) * (rad > this.post.radial ? 0.18 : 0.1);
    this.post.aberr *= 0.88;
    this.post.render(this.scene, this.cam, this.time);
  }

  adaptQuality(rdt) {
    this.frameTimes.push(rdt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    let pr = this.pixelRatio;
    if (avg > 1 / 45 && pr > this.minPixelRatio) pr = Math.max(this.minPixelRatio, pr - 0.25);
    else if (avg < 1 / 58 && pr < this.maxPixelRatio) pr = Math.min(this.maxPixelRatio, pr + 0.25);
    if (pr !== this.pixelRatio) {
      this.pixelRatio = pr;
      this.renderer.setPixelRatio(pr);
      this.resize();
    }
  }
}

window.game = new Game();
