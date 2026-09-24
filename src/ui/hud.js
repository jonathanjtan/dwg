import * as THREE from 'three';
import { portrait } from './portraits.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor(game) {
    this.game = game;
    this.el = {
      hud: $('hud'), hpFill: $('hp-fill'), hpLag: $('hp-lag'), hpText: $('hp-text'), spFill: $('sp-fill'),
      spBar: document.querySelector('.bar.sp'), ko: $('ko-count'), timer: $('timer'), combo: $('combo'),
      comboCount: $('combo-count'), map: $('minimap'), announce: $('announce'), dialogue: $('dialogue'),
      dlgPortrait: $('dlg-portrait'), dlgName: $('dlg-name'), dlgText: $('dlg-text'), bossBars: $('boss-bars'),
      tags: $('tags'), vignette: $('vignette'), flash: $('flash'), cutin: $('cutin'), cutinPortrait: $('cutin-portrait'),
      toasts: $('toasts'), objective: $('objective'), keys: $('keys'), portrait: $('portrait'),
    };
    this.el.portrait.src = portrait('amuro');
    this.el.cutinPortrait.src = portrait('amuro', null);
    this.mapCtx = this.el.map.getContext('2d');
    this.lastKo = -1;
    this.lastCombo = 0;
    this.dlgQueue = [];
    this.dlgT = 0;
    this.dlgCur = null;
    this.bossEls = new Map();
    this.tagEls = new Map();
    this.hurtT = 0;
    this.flashT = 0;
    this._v = new THREE.Vector3();
    this.mapT = 0;
  }

  show(on) {
    this.el.hud.classList.toggle('hidden', !on);
  }

  toggleKeys() {
    this.el.keys.classList.toggle('hidden');
  }

  setObjective(text) {
    this.el.objective.textContent = text;
  }

  hurt() {
    this.hurtT = 0.25;
  }

  whiteFlash(a = 0.8) {
    this.flashT = a;
  }

  announce(text, sub = '', warn = false) {
    const d = document.createElement('div');
    d.className = 'ann' + (warn ? ' warn' : '');
    d.innerHTML = text + (sub ? `<small>${sub}</small>` : '');
    this.el.announce.innerHTML = '';
    this.el.announce.appendChild(d);
  }

  toast(text, color = '#fff') {
    const d = document.createElement('div');
    d.className = 'toast';
    d.style.color = color;
    d.textContent = text;
    this.el.toasts.appendChild(d);
    setTimeout(() => d.remove(), 1400);
  }

  // speaker: amuro | char | denim | gene | bright
  say(speaker, name, text, dur = 3.2) {
    this.dlgQueue.push({ speaker, name, text, dur });
  }

  clearDialogue() {
    this.dlgQueue.length = 0;
    this.dlgCur = null;
    this.el.dialogue.classList.add('hidden');
  }

  cutin() {
    const c = this.el.cutin;
    c.classList.remove('hidden');
    // restart animations
    for (const n of c.querySelectorAll('*')) { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; }
    clearTimeout(this.cutinTimer);
    this.cutinTimer = setTimeout(() => c.classList.add('hidden'), 1100);
  }

  bossHit(c) {
    const e = this.bossEls.get(c);
    if (e) e.lastHit = performance.now();
  }

  reset() {
    this.clearDialogue();
    this.el.announce.innerHTML = '';
    for (const e of this.bossEls.values()) e.root.remove();
    this.bossEls.clear();
    for (const e of this.tagEls.values()) e.root.remove();
    this.tagEls.clear();
    this.lastKo = -1;
    this.el.combo.classList.add('hidden');
  }

  update(dt) {
    const g = this.game;
    const h = g.hero;
    // HP / SP
    const hpPct = Math.max(0, h.hp / h.maxHp);
    this.el.hpFill.style.width = hpPct * 100 + '%';
    this.el.hpLag.style.width = hpPct * 100 + '%';
    this.el.hpFill.className = hpPct < 0.25 ? 'low' : hpPct < 0.5 ? 'mid' : '';
    this.el.hpText.textContent = Math.ceil(h.hp);
    this.el.spFill.style.width = (h.sp / h.maxSp) * 100 + '%';
    this.el.spBar.classList.toggle('ready', h.sp >= h.maxSp);
    // KO
    if (g.stats.kos !== this.lastKo) {
      this.el.ko.textContent = g.stats.kos;
      if (this.lastKo >= 0) {
        this.el.ko.classList.remove('bump');
        void this.el.ko.offsetWidth;
        this.el.ko.classList.add('bump');
      }
      this.lastKo = g.stats.kos;
    }
    const s = Math.floor(g.stats.time);
    this.el.timer.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    // combo
    if (g.combo.count >= 2) {
      this.el.combo.classList.remove('hidden');
      if (g.combo.count !== this.lastCombo) {
        this.el.comboCount.textContent = g.combo.count;
        this.el.combo.classList.remove('pop');
        void this.el.combo.offsetWidth;
        this.el.combo.classList.add('pop');
        this.el.combo.classList.toggle('big', g.combo.count >= 50);
      }
      this.el.combo.style.opacity = Math.min(1, g.combo.timer / 0.5);
    } else this.el.combo.classList.add('hidden');
    this.lastCombo = g.combo.count;
    // vignette
    this.hurtT = Math.max(0, this.hurtT - dt);
    this.el.vignette.className = this.hurtT > 0 ? 'on' : hpPct < 0.25 && h.alive ? 'low' : '';
    this.flashT = Math.max(0, this.flashT - dt * 2.5);
    this.el.flash.style.opacity = this.flashT;

    this.updateDialogue(dt);
    this.updateBosses();
    this.updateTags();
    this.mapT -= dt;
    if (this.mapT <= 0) { this.mapT = 1 / 20; this.drawMap(); }
  }

  updateDialogue(dt) {
    if (!this.dlgCur && this.dlgQueue.length) {
      this.dlgCur = this.dlgQueue.shift();
      this.dlgT = 0;
      const d = this.dlgCur;
      this.el.dialogue.classList.remove('hidden', 'zeon', 'char');
      if (d.speaker === 'char') this.el.dialogue.classList.add('char');
      else if (d.speaker === 'denim' || d.speaker === 'gene') this.el.dialogue.classList.add('zeon');
      this.el.dlgPortrait.src = portrait(d.speaker);
      this.el.dlgName.textContent = d.name;
      this.el.dlgText.textContent = '';
      // restart slide-in animation
      this.el.dialogue.style.animation = 'none';
      void this.el.dialogue.offsetWidth;
      this.el.dialogue.style.animation = '';
    }
    if (this.dlgCur) {
      this.dlgT += dt;
      const d = this.dlgCur;
      const n = Math.min(d.text.length, Math.floor(this.dlgT * 55));
      this.el.dlgText.textContent = d.text.slice(0, n);
      if (this.dlgT > d.dur) {
        this.dlgCur = null;
        if (!this.dlgQueue.length) this.el.dialogue.classList.add('hidden');
      }
    }
  }

  updateBosses() {
    const g = this.game;
    for (const c of g.commanders.list) {
      let e = this.bossEls.get(c);
      const show = c.state !== 'dead' && c.state !== 'drop';
      if (!e && show) {
        const root = document.createElement('div');
        root.className = 'boss' + (c.kind === 'char' ? ' char' : '');
        root.innerHTML = `<div class="bname"><span>${c.cfg.title}</span><span class="jp">${c.cfg.jp}</span></div><div class="bbar"><div class="blag"></div><div class="bfill"></div></div>`;
        this.el.bossBars.appendChild(root);
        e = { root, fill: root.querySelector('.bfill'), lag: root.querySelector('.blag') };
        this.bossEls.set(c, e);
      }
      if (!e) continue;
      if (!show || c.hp <= 0 && c.state !== 'dying' && c.state !== 'retreat') {
        if (c.state === 'dead') { e.root.remove(); this.bossEls.delete(c); }
        continue;
      }
      const pct = Math.max(0, c.hp / c.maxHp);
      e.fill.style.transform = `scaleX(${pct})`;
      e.lag.style.transform = `scaleX(${pct})`;
    }
  }

  updateTags() {
    const g = this.game;
    const cam = g.camera.cam;
    const W = innerWidth, H = innerHeight;
    for (const c of g.commanders.list) {
      let e = this.tagEls.get(c);
      if (!e) {
        const root = document.createElement('div');
        root.className = 'tag' + (c.kind === 'char' ? ' char' : '');
        root.innerHTML = `<span class="tjp">${c.cfg.jp}</span>${c.cfg.title}<div class="tbar"><div></div></div>`;
        this.el.tags.appendChild(root);
        e = { root, bar: root.querySelector('.tbar div') };
        this.tagEls.set(c, e);
      }
      const visible = c.state !== 'dead' && c.rig.root.visible;
      const p = this._v.set(c.pos.x, c.pos.y + 4.1, c.pos.z).project(cam);
      if (!visible || p.z > 1 || Math.abs(p.x) > 1.1 || Math.abs(p.y) > 1.1) { e.root.style.display = 'none'; continue; }
      e.root.style.display = '';
      e.root.style.left = ((p.x + 1) / 2) * W + 'px';
      e.root.style.top = ((1 - p.y) / 2) * H + 'px';
      e.bar.style.width = Math.max(0, c.hp / c.maxHp) * 100 + '%';
    }
  }

  drawMap() {
    const g = this.game;
    const ctx = this.mapCtx;
    const W = 200, S = 200 / 110; // show ~110 units across
    const hero = g.hero;
    const yaw = g.camera.yaw;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.translate(W / 2, W / 2);
    // rotate so camera-forward is up and screen-right stays right
    ctx.rotate(yaw + Math.PI);
    const tx = (x) => (x - hero.pos.x) * S;
    const tz = (z) => (z - hero.pos.z) * S;
    // grid
    ctx.strokeStyle = 'rgba(95,208,255,0.07)';
    ctx.lineWidth = 1;
    for (let v = -100; v <= 100; v += 26) {
      ctx.beginPath(); ctx.moveTo(tx(v), tz(-104)); ctx.lineTo(tx(v), tz(104)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx(-104), tz(v)); ctx.lineTo(tx(104), tz(v)); ctx.stroke();
    }
    // buildings
    ctx.fillStyle = 'rgba(140,160,190,0.35)';
    for (const c of g.world.colliders) ctx.fillRect(tx(c.x0), tz(c.z0), (c.x1 - c.x0) * S, (c.z1 - c.z0) * S);
    // arena bound
    ctx.strokeStyle = 'rgba(255,90,90,0.5)';
    ctx.strokeRect(tx(-104), tz(-104), 208 * S, 208 * S);
    // grunts
    ctx.fillStyle = '#ff5a4a';
    for (const e of g.crowd.list) {
      const x = tx(e.x), z = tz(e.z);
      if (Math.abs(x) > 150 || Math.abs(z) > 150) continue;
      ctx.fillRect(x - 1.5, z - 1.5, 3, 3);
    }
    // items
    ctx.fillStyle = '#5dff7a';
    for (const it of g.items.list) ctx.fillRect(tx(it.x) - 2.5, tz(it.z) - 2.5, 5, 5);
    // commanders
    for (const c of g.commanders.list) {
      if (!c.alive) continue;
      const x = tx(c.pos.x), z = tz(c.pos.z);
      ctx.fillStyle = c.kind === 'char' ? '#ff2a4a' : '#ffb03a';
      ctx.beginPath();
      ctx.moveTo(x, z - 6); ctx.lineTo(x + 6, z); ctx.lineTo(x, z + 6); ctx.lineTo(x - 6, z);
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
    // hero arrow (always centre, rotated relative to camera)
    ctx.save();
    ctx.translate(W / 2, W / 2);
    ctx.rotate(-(hero.heading - yaw));
    ctx.fillStyle = '#5fd0ff';
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(0, 3); ctx.lineTo(-6, 6);
    ctx.fill();
    ctx.restore();
    // view cone
    ctx.fillStyle = 'rgba(95,208,255,0.08)';
    ctx.beginPath();
    ctx.moveTo(W / 2, W / 2);
    ctx.arc(W / 2, W / 2, 90, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5);
    ctx.fill();
  }
}
