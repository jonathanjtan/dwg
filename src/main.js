import * as THREE from 'three';
import { Post } from './post.js';
import { Input, lockPointer } from './core/input.js';
import { World } from './world/world.js';
import { FX } from './fx/fx.js';
import { Hero } from './game/hero.js';
import { Crowd } from './game/crowd.js';
import { Commanders } from './game/commander.js';
import { Combat } from './game/combat.js';
import { Projectiles } from './game/projectiles.js';
import { Items } from './game/items.js';
import { Stage } from './game/stage.js';
import { CameraRig } from './camera.js';
import { HUD } from './ui/hud.js';
import { Audio } from './audio/audio.js';
import { rand } from './core/util.js';

const DIFFICULTY = {
  easy: { dmgTaken: 0.55, dmgDealt: 1.25, enemyHp: 0.85, aggression: 0.7, speed: 0.85, maxAlive: 130 },
  normal: { dmgTaken: 1, dmgDealt: 1, enemyHp: 1, aggression: 1, speed: 1, maxAlive: 180 },
  hard: { dmgTaken: 1.6, dmgDealt: 0.9, enemyHp: 1.3, aggression: 1.5, speed: 1.2, maxAlive: 230 },
};

class Game {
  constructor() {
    const canvas = document.getElementById('game');
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.pixelRatio = Math.min(devicePixelRatio, 1.5);
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
    this.commanders = new Commanders(this);
    this.crowd = new Crowd(this);
    this.hero = new Hero(this);
    this.hud = new HUD(this);
    this.stage = new Stage(this);
    this.stats = this.freshStats();
    this.combo = { count: 0, timer: 0, max: 0 };
    this.mode = 'title';
    this.stopT = 0;
    this.slowT = 0;
    this.slowScale = 1;
    this.worldSlowT = 0;
    this.titleT = 0;
    this.frameTimes = [];
    this._focus = new THREE.Vector3();
    this._near = [];

    addEventListener('resize', () => this.resize());
    document.addEventListener('pointerlockchange', () => {
      if (!this.input.locked && this.mode === 'play' && !this.ignoreUnlock) this.pause(true);
      this.ignoreUnlock = false;
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.mode === 'play') this.pause(true);
    });
    this.bindUI();
    this.setupTitle();
    document.getElementById('loading').classList.add('hidden');
    if (matchMedia('(pointer: coarse)').matches) document.getElementById('touch-warn').classList.remove('hidden');
    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  freshStats() {
    return { kos: 0, time: 0, maxCombo: 0, damageTaken: 0, officers: 0 };
  }

  resize() {
    this.cam.aspect = innerWidth / innerHeight;
    this.cam.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
    this.post.setSize(Math.round(innerWidth * this.pixelRatio), Math.round(innerHeight * this.pixelRatio));
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
    $('launch').addEventListener('click', () => this.start());
    $('resume').addEventListener('click', () => this.pause(false));
    $('restart').addEventListener('click', () => { this.pause(false); this.start(); });
    $('to-title').addEventListener('click', () => this.toTitle());
    $('retry').addEventListener('click', () => this.start());
    $('res-title-btn').addEventListener('click', () => this.toTitle());
    $('mute-btn').addEventListener('click', () => {
      const m = this.audio.toggleMute();
      $('mute-btn').textContent = m ? 'SOUND: OFF' : 'SOUND: ON';
    });
    // title theme starts on the first gesture (browsers block audio before one)
    const titleMusic = () => {
      if (this.mode !== 'title') return;
      this.audio.resume();
      this.audio.playMusic('title');
    };
    addEventListener('pointerdown', titleMusic);
    addEventListener('keydown', titleMusic);
    addEventListener('keydown', (e) => {
      if (e.code === 'Enter' && this.mode === 'title') this.start();
      else if (e.code === 'Enter' && this.mode === 'results') this.start();
    });
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

  start() {
    this.audio.resume();
    this.audio.play('ui');
    this.audio.stopMusic();
    document.getElementById('title').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    document.getElementById('pause').classList.add('hidden');
    this.crowd.clear();
    this.commanders.clear();
    this.projectiles.clear();
    this.items.clear();
    this.hud.reset();
    this.timers.length = 0;
    this.stats = this.freshStats();
    this.combo = { count: 0, timer: 0, max: 0 };
    this.hero.reset();
    this.hero.startIntro();
    this.camera.yaw = 0;
    this.camera.pitch = 0.3;
    this.camera.target.set(0, 3, -14);
    this.mode = 'play';
    this.hud.show(true);
    this.stage.begin();
    this.canvas.focus();
    if (!matchMedia('(pointer: coarse)').matches) lockPointer(this.canvas);
  }

  toTitle() {
    document.getElementById('pause').classList.add('hidden');
    document.getElementById('results').classList.add('hidden');
    this.audio.stopMusic();
    this.audio.playMusic('title');
    this.stage.reset();
    this.projectiles.clear();
    this.items.clear();
    this.hud.reset();
    this.ignoreUnlock = true;
    document.exitPointerLock?.();
    this.setupTitle();
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
    // rank from KOs, speed and damage taken
    let score = s.kos * 2 + s.maxCombo * 1.5 + s.officers * 60 - s.damageTaken * 0.12 - Math.max(0, s.time - 240) * 0.8;
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
    $('results').classList.remove('hidden');
  }

  // ---------- events ----------
  // Hit-stop freezes the hero only; victims shudder a few frames and the world keeps moving.
  hitstop(d) {
    this.stopT = Math.max(this.stopT, d);
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
    this.stage.onKill();
    if (Math.random() < 0.012) this.items.drop(Math.random() < 0.6 ? 'hp' : 'sp', g.x, g.z);
  }
  onCommanderDefeated(c) {
    this.stats.officers++;
    this.stats.kos++;
    this.hud.whiteFlash(0.5);
    this.slowmo(0.2, 0.9);
    this.camera.shake(0.6);
    this.audio.play('bigboom');
    this.hud.announce(c.kind === 'char' ? 'CHAR REPELLED' : 'COMMANDER DEFEATED', c.cfg.title);
    this.stage.onCommanderDefeated(c);
    if (c.kind === 'char') this.stage.onCharRetreated();
    else this.items.drop('hp', c.pos.x, c.pos.z);
    if (c.kind !== 'char') this.items.drop('sp', c.pos.x + 1.5, c.pos.z);
  }
  onCommanderExploded(c) {
    this.stage.onCommanderExploded(c);
  }
  onHeroDeath() {
    this.hud.announce('MISSION FAILED', 'THE GUNDAM HAS FALLEN', true);
    this.audio.stinger('defeat');
    this.slowmo(0.25, 1.5);
    this.stage.phase = 'lose';
    this.timers.push({ t: 3.5, fn: () => this.finish(false) });
  }
  onHeroLanded() {
    this.stage.onHeroLanded();
  }
  onMusou() {
    this.audio.duckMusic(0.25, 1.0);
    this.hud.cutin();
    this.hud.whiteFlash(0.35);
    this.worldSlowT = 1.0;
    this.camera.cinematic({ dur: 1.1, yaw: 2.3, pitch: 0.22, dist: 7.5, fov: 46 });
  }

  // ---------- loop ----------
  frame() {
    const now = performance.now();
    let rdt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.adaptQuality(rdt);
    const act = this.input.poll();

    if (this.mode === 'title') {
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
    if (act.recenter) this.camera.recenter(this.hero.heading);

    if (this.mode === 'paused') {
      this.render();
      this.input.endFrame();
      return;
    }

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
    const heroAct = playable ? act : {};
    this.hero.update(dt * heroScale, heroAct, this.input);
    this.crowd.update(wdt);
    this.commanders.update(wdt);
    this.projectiles.update(wdt);
    this.items.update(dt);
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
    this.crowd.render(wdt);
    this.projectiles.render();
    this.hud.update(rdt);
    this.render();
    this.input.endFrame();
  }

  render() {
    const h = this.hero.pos;
    this.post.focus = Math.max(4, this.cam.position.distanceTo(this._focus.set(h.x, h.y + 2, h.z)));
    const sp = this.hero.state === 'musou' && this.hero.spPhase === 0 ? 1 : 0;
    this.post.musou += (sp - this.post.musou) * (sp ? 0.15 : 0.08);
    this.post.render(this.scene, this.cam, this.time);
  }

  adaptQuality(rdt) {
    this.frameTimes.push(rdt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    let pr = this.pixelRatio;
    if (avg > 1 / 45 && pr > 0.75) pr = Math.max(0.75, pr - 0.25);
    else if (avg < 1 / 58 && pr < Math.min(devicePixelRatio, 1.5)) pr = Math.min(Math.min(devicePixelRatio, 1.5), pr + 0.25);
    if (pr !== this.pixelRatio) {
      this.pixelRatio = pr;
      this.renderer.setPixelRatio(pr);
      this.resize();
    }
  }
}

window.game = new Game();
