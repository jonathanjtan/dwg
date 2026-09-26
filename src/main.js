import * as THREE from 'three';
import { Post } from './post.js';
import { Input, lockPointer } from './core/input.js';
import { isTouch, isStandalone, isFullscreen, fullscreenAvailable, enterFullscreen, toggleFullscreen } from './core/touch.js';
import { World } from './world/world.js';
import { FX } from './fx/fx.js';
import { ROSTER, suitInfo } from './game/roster.js';
import { Crowd } from './game/crowd.js';
import { Commanders } from './game/commander.js';
import { Combat } from './game/combat.js';
import { Projectiles } from './game/projectiles.js';
import { Items } from './game/items.js';
import { LandingZones } from './game/bases.js';
import { Stage, officerCfg } from './game/stage.js';
import { Tank } from './game/tank.js';
import { Net, GRUNT_STATES, GF, LOCALNET } from './net/net.js';
import { CameraRig } from './camera.js';
import { HUD } from './ui/hud.js';
import { SuitSelect } from './ui/select.js';
import { Audio } from './audio/audio.js';
import { rand, wrapAngle } from './core/util.js';

// maxPress: engaged Zaku allowed to close in and swing at once (the rest ring you from further out)
// dropEvery: KOs per repair kit / E-cap (halved when hurt); recover: share of damage that heals back if you avoid hits
// reinforce: multiplier on the time between reinforcement squads
const DIFFICULTY = {
  easy: { dmgTaken: 0.6, dmgDealt: 1.2, enemyHp: 0.85, aggression: 0.7, speed: 0.9, maxAlive: 90, maxPress: 10, dropEvery: 20, recover: 0.65, reinforce: 1.3 },
  normal: { dmgTaken: 1, dmgDealt: 1, enemyHp: 1, aggression: 1, speed: 1, maxAlive: 120, maxPress: 14, dropEvery: 28, recover: 0.5, reinforce: 1 },
  hard: { dmgTaken: 1.5, dmgDealt: 0.9, enemyHp: 1.25, aggression: 1.4, speed: 1.15, maxAlive: 150, maxPress: 18, dropEvery: 40, recover: 0.3, reinforce: 0.75 },
};
const NO_INPUT = { move: { x: 0, y: 0 }, key: () => false };
const savedSuit = () => {
  try { return localStorage.getItem('gmusou.suit') || ROSTER[0].id; } catch (e) { return ROSTER[0].id; }
};

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
    this.players = [];
    this.setSuit(savedSuit());
    this.tank = new Tank(this);
    this.remoteInput = { x: 0, z: 0, mag: 0, edges: 0 };
    this.net = new Net(this);
    this.netEvent = (...e) => this.net.event(...e);
    this.localSpT = 0;
    this.hud = new HUD(this);
    this.hud.setPilot(this.hero.suit.pilot);
    this.select = new SuitSelect(this);
    this.stage = new Stage(this);
    this.stats = this.freshStats();
    this.combo = { count: 0, timer: 0, max: 0 };
    this.mode = 'title';
    this.stopT = 0;
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

  // Switch the player's mobile suit (select screen, or a co-op guest following the host's pick). Each suit is built
  // once and kept; only the chosen one is in the scene.
  setSuit(id) {
    const info = suitInfo(id);
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
    this.players = this.players.length ? this.players.map((p) => (p === prev ? next : p)) : [next];
    if (!this.local || this.local === prev) {
      this.local = next;
      this.hud?.setPilot(info.pilot);
    }
    if (this.net?.role !== 'guest') { try { localStorage.setItem('gmusou.suit', info.id); } catch (e) { /* private mode */ } }
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
    $('mute-btn').addEventListener('click', () => {
      const m = this.audio.toggleMute();
      $('mute-btn').textContent = m ? 'SOUND: OFF' : 'SOUND: ON';
    });
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
    this.tank.hp = this.tank.maxHp;
    this.tank.sp = 30;
    if (this.net.role === 'host' && this.net.connected) {
      this.players = [this.hero, this.tank];
      this.tank.spawn(5, -20);
      this.net.send({ y: 'start' });
    } else {
      this.tank.remove();
      this.players = [this.hero];
    }
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
    this.tank.remove();
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
  // Hit-stop freezes the hero only; victims shudder a few frames and the world keeps moving.
  hitstop(d) {
    this.stopT = Math.max(this.stopT, d);
  }
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

  // Where the local pilot's attacks aim while locked on (the hero asks through Hero.aimAt).
  lockTarget(who) {
    const c = this.lock;
    if (!c || who !== this.local || !this.lockable(c)) return null;
    return { x: c.pos.x, y: c.pos.y, z: c.pos.z };
  }

  onHeroDeath() {
    this.hud.announce('MISSION FAILED', `THE ${suitInfo(this.hero.suit.id).unitShort} HAS FALLEN`, true);
    this.audio.stinger('defeat');
    this.netEvent('stinger', 'defeat');
    this.slowmo(0.25, 1.5);
    this.stage.phase = 'lose';
    this.timers.push({ t: 3.5, fn: () => this.finish(false) });
  }
  onHeroLanded() {
    this.stage.onHeroLanded();
  }
  onMusou(who = this.hero) {
    if (who === this.local) this.localMusou(who === this.tank ? 'hayato' : who.suit.pilot);
    else this.hud.toast(who === this.tank ? 'HAYATO: FULL BURST!' : `${suitInfo(who.suit.id).pilotName.split(' ')[0]}: SP ATTACK!`, '#ffd1f1');
    // freezing the world only makes sense solo
    if (who === this.hero && this.players.length === 1) this.worldSlowT = 1.0;
    this.audio.duckMusic(0.35, 0.8);
    this.netEvent('sp', who === this.tank ? 'tank' : 'hero');
  }

  localMusou(pilot) {
    this.hud.cutin(pilot);
    this.hud.whiteFlash(0.35);
    this.localSpT = 1.0;
    this.camera.cinematic({ dur: 1.1, yaw: 2.3, pitch: 0.22, dist: 7.5, fov: 46 });
  }

  // ---------- co-op ----------
  async hostCoop() {
    const $ = (id) => document.getElementById(id);
    this.audio.resume();
    $('coop-panel').classList.remove('hidden');
    $('host-btn').disabled = true;
    $('coop-status').className = '';
    $('coop-status').textContent = 'Opening a room…';
    try {
      const code = await this.net.host();
      $('coop-link').value = `${location.origin}${location.pathname}?join=${code}${LOCALNET ? '&localnet' : ''}`;
      $('coop-status').textContent = `Room ${code} is open. Waiting for the Guntank pilot…`;
    } catch (e) {
      $('coop-status').textContent = `Couldn't open a room (${e.type || e.message}). Try again.`;
      $('host-btn').disabled = false;
    }
  }

  onGuestJoined() {
    const $ = (id) => document.getElementById(id);
    $('coop-status').textContent = 'Hayato is in the Guntank. Press LAUNCH when ready.';
    $('coop-status').className = 'ok';
    this.players = [this.hero, this.tank];
    this.audio.play('pickup');
    if (this.mode === 'play' || this.mode === 'paused') {
      const h = this.hero.pos;
      this.tank.hp = this.tank.maxHp;
      this.tank.spawn(h.x + 5, h.z - 4);
      this.hud.announce('REINFORCEMENTS', 'RX-75 GUNTANK INBOUND');
      this.net.send({ y: 'start' });
    }
  }

  onGuestLeft() {
    const $ = (id) => document.getElementById(id);
    this.tank.remove();
    this.players = [this.hero];
    $('coop-status').textContent = 'The Guntank pilot left. Waiting for someone to join…';
    $('coop-status').className = '';
    if (this.mode !== 'title') this.hud.toast('GUNTANK DISCONNECTED', '#ff8a8a');
  }

  async startGuest(code) {
    const $ = (id) => document.getElementById(id);
    this.mode = 'lobby';
    this.local = this.tank;
    this.players = [this.hero, this.tank];
    this.crowd.clear();
    $('title').classList.add('hidden');
    $('lobby').classList.remove('hidden');
    $('lobby-portrait').src = this.hud.portraitFor('hayato');
    $('lobby-status').textContent = `Joining room ${code.toUpperCase()}…`;
    this.hud.setPilot('hayato');
    try {
      await this.net.join(code);
      $('lobby-status').textContent = 'Connected. Waiting for the host to launch…';
    } catch (e) {
      $('lobby-status').textContent = e.type === 'peer-unavailable' ? "That room doesn't exist (or the host closed it)." : `Couldn't connect (${e.type || e.message}).`;
    }
  }

  leaveCoop() {
    this.net.close();
    this.local = this.hero;
    this.players = [this.hero];
    this.tank.remove();
    this.hud.setPilot(this.hero.suit.pilot);
    this.select = new SuitSelect(this);
    history.replaceState(null, '', location.pathname);
    document.getElementById('lobby').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden');
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
    this.leaveCoop();
    this.hud.toast('HOST DISCONNECTED', '#ff8a8a');
  }

  enterGuestPlay() {
    const $ = (id) => document.getElementById(id);
    this.audio.resume();
    $('lobby').classList.add('hidden');
    $('results').classList.add('hidden');
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
    const $ = (id) => document.getElementById(id);
    switch (d.y) {
      case 'hello': this.difficultyName = d.difficulty; break;
      case 'full': $('lobby-status').textContent = 'That room already has a Guntank pilot.'; break;
      case 'start': this.enterGuestPlay(); break;
      case 'title':
        this.mode = 'lobby';
        this.hud.show(false);
        this.audio.stopMusic();
        $('results').classList.add('hidden');
        $('lobby').classList.remove('hidden');
        $('lobby-status').textContent = 'The host is back at the title screen. Waiting for launch…';
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
    if (d.mode === 'play' && this.mode === 'lobby') this.enterGuestPlay();
    if (d.hero.suit && d.hero.suit !== this.hero.suit.id) this.setSuit(d.hero.suit);
    this.netAge = 0;
    const stash = (obj, s) => {
      obj.net = obj.net || { pose: new Float32Array(s.pose.length), npose: new Float32Array(s.pose.length) };
      const n = obj.net;
      if (n.init) { n.px = obj.pos.x; n.py = obj.pos.y; n.pz = obj.pos.z; n.ph = n.h; n.pose.set(n.cur || s.pose); }
      else { n.px = s.x; n.py = s.y; n.pz = s.z; n.ph = s.h; n.pose.set(s.pose); n.init = true; }
      n.nx = s.x; n.ny = s.y; n.nz = s.z; n.h = s.h; n.npose.set(s.pose); n.s = s;
    };
    stash(this.hero, d.hero);
    stash(this.tank, d.tank);
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
      if (tag === 'f') this.fx[name](...args);
      else if (tag === 'h') this.hud[name](...args);
      else if (tag === 'a') this.audio.play(name, { vol: args[0], pitch: args[1], at: args[2] !== null ? { x: args[2], z: args[3] } : null });
      else if (tag === 'toast') this.hud.toast(name, args[0]);
      else if (tag === 'hurt') this.hud.hurt();
      else if (tag === 'shake') this.camera.shake(name);
      else if (tag === 'sp') {
        if (name === 'tank') this.localMusou('hayato');
        else this.hud.toast(`${suitInfo(this.hero.suit.id).pilotName.split(' ')[0]}: SP ATTACK!`, '#ffd1f1');
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
    if (act.pause && performance.now() - (this.pausedAt || 0) > 350) {
      const p = document.getElementById('pause');
      const open = p.classList.contains('hidden');
      p.classList.toggle('hidden', !open);
      document.getElementById('restart').classList.add('hidden');
      this.pausedAt = performance.now();
      if (open) { this.ignoreUnlock = true; document.exitPointerLock?.(); } else lockPointer(this.canvas);
    }
    if (act.mute) document.getElementById('mute-btn').textContent = this.audio.toggleMute() ? 'SOUND: OFF' : 'SOUND: ON';
    if (act.recenter) this.camera.recenter(this.tank.heading);
    if (act.lock) this.toggleLock();
    this.updateLock();
    this.time += rdt;
    this.localSpT = Math.max(0, this.localSpT - rdt);
    const menuOpen = !document.getElementById('pause').classList.contains('hidden');
    const dir = menuOpen ? null : this.hero.inputDir(this.input, this.camera.forward());
    this.net.guestTick(rdt, menuOpen ? {} : act, dir);
    this.netAge = (this.netAge || 0) + rdt;
    const k = Math.min(1, this.netAge / 0.05);
    const place = (obj) => {
      const n = obj.net;
      if (!n) return null;
      obj.pos.set(n.px + (n.nx - n.px) * k, n.py + (n.ny - n.py) * k, n.pz + (n.nz - n.pz) * k);
      n.cur = n.cur || new Float32Array(n.pose.length);
      for (let i = 0; i < n.cur.length; i++) n.cur[i] = n.pose[i] + (n.npose[i] - n.pose[i]) * k;
      return { ...n.s, h: n.ph + wrapAngle(n.h - n.ph) * k, pose: n.cur };
    };
    const hs = place(this.hero);
    if (hs) this.hero.applyNet(hs, rdt);
    const ts = place(this.tank);
    if (ts) this.tank.applyNet(ts, rdt);
    for (const c of this.commanders.list) {
      const cs = place(c);
      if (cs) c.applyNet(cs, rdt);
    }
    this.crowd.netInterp(rdt);
    this.projectiles.guestAdvance(rdt);
    this.items.netAnimate(rdt);
    this.lz.guestAnimate(rdt);
    this.fx.update(rdt);
    const t = this.tank;
    const crowdN = this.crowd.grid.query(t.pos.x, t.pos.z, 12, this._near).length;
    this.camera.yFollow = 0.7;
    this.camera.update(rdt, rdt, t.pos, t.heading, menuOpen ? null : this.input, Math.hypot(t.vel.x, t.vel.z) > 2, crowdN);
    this.world.follow(t.pos);
    this.world.fadeNear(this.cam.position);
    this.audio.listener = t.pos;
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

    // time scaling: hit-stop, slow-mo, SP cut-in freeze for the world
    let scale = 1, heroScale = 1;
    if (this.stopT > 0) { this.stopT -= rdt; heroScale = 0.04; }
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
    this.hero.update(dt * heroScale, heroCtl ? act : {}, heroCtl ? this.input : NO_INPUT);
    if (this.players.length > 1) {
      const ri = this.remoteInput;
      const tAct = playable ? { attack: !!(ri.edges & 1), charge: !!(ri.edges & 2), jump: !!(ri.edges & 4), dodge: !!(ri.edges & 8), musou: !!(ri.edges & 16) } : {};
      ri.edges = 0;
      this.tank.update(dt, tAct, playable && ri.mag > 0.05 ? { x: ri.x, z: ri.z, mag: ri.mag } : null);
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
