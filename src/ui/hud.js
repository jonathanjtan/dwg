import * as THREE from 'three';
import { portrait, loadPortraits, hasSheet, renderingFor, holdsTalk } from './portraits.js';

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
      ally: $('ally'), allyName: $('ally-name'), allyFill: $('ally-fill'), allyState: $('ally-state'),
      pilotJp: $('pilot-jp'), pilotEn: $('pilot-en'),
      hpRed: $('hp-red'), boostBar: $('boost-bar'), boostFill: $('boost-fill'), speedlines: $('speedlines'),
      letterbox: $('letterbox'), namecard: $('namecard'), ncJp: $('nc-jp'), ncEn: $('nc-en'), ncUnit: $('nc-unit'),
      marker: $('objmarker'), omLabel: $('om-label'), omDist: $('om-dist'),
      lock: $('lockon'), lockName: document.querySelector('#lockon .lk-name'),
    };
    this.pilot = 'amuro';
    this.el.portrait.src = portrait('amuro');
    this.el.cutinPortrait.src = portrait('amuro', null);
    this.faceExpr = 'idle';
    this.blinkT = 3;
    this.hurtFaceT = 0;
    loadPortraits().then((any) => {
      if (!any) return;
      this.setPilot(this.pilot);
      const lobby = document.getElementById('lobby-portrait');
      if (lobby) { lobby.src = portrait('hayato'); lobby.style.imageRendering = renderingFor('hayato'); }
      document.body.classList.toggle('sheet-portraits', hasSheet('amuro'));
    });
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
    this.speedK = 0;
    this.cineT = 0;
  }

  // Officer arrival: letterbox bars and a sliding name card.
  nameCard(cfg, dur = 2.6) {
    const [en, unit = ''] = cfg.title.split(' · ');
    this.el.ncJp.textContent = cfg.jp;
    this.el.ncEn.textContent = en;
    this.el.ncUnit.textContent = unit;
    this.el.namecard.querySelector('.nc-tag').textContent = cfg.kind === 'char' ? 'WARNING · THE RED COMET' : 'ENEMY COMMANDER';
    const c = this.el.namecard;
    c.classList.remove('hidden');
    c.classList.toggle('char', cfg.kind === 'char');
    for (const n of c.querySelectorAll('*')) { n.style.animation = 'none'; void n.offsetWidth; n.style.animation = ''; }
    clearTimeout(this.ncTimer);
    this.ncTimer = setTimeout(() => c.classList.add('hidden'), 2600);
    this.cineT = dur;
  }

  portraitFor(name, expr = 'idle') {
    return portrait(name, '#0b1424', expr);
  }

  setPilot(name) {
    this.pilot = name;
    const labels = {
      amuro: ['アムロ・レイ', 'AMURO RAY · RX-78-2'],
      kai: ['カイ・シデン', 'KAI SHIDEN · RX-77-2'],
      hayato: ['ハヤト・コバヤシ', 'HAYATO KOBAYASHI · RX-75'],
    };
    this.el.pilotJp.textContent = labels[name][0];
    this.el.pilotEn.textContent = labels[name][1];
    this.faceExpr = '';
    this.el.portrait.style.imageRendering = renderingFor(name);
    this.el.cutinPortrait.src = portrait(name, null, 'shout');
    this.el.cutinPortrait.style.imageRendering = renderingFor(name);
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
    this.hurtFaceT = 0.6;
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

  // speaker: amuro | kai | hayato | char | denim | gene | bright
  say(speaker, name, text, dur = 3.2) {
    this.dlgQueue.push({ speaker, name, text, dur });
  }

  clearDialogue() {
    this.dlgQueue.length = 0;
    this.dlgCur = null;
    this.el.dialogue.classList.add('hidden');
  }

  cutin(pilot = this.pilot) {
    this.el.cutinPortrait.src = portrait(pilot, null, 'shout');
    this.el.cutinPortrait.style.imageRendering = renderingFor(pilot);
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
    this.el.namecard.classList.add('hidden');
    this.el.marker.classList.add('hidden');
    this.cineT = 0;
  }

  update(dt) {
    const g = this.game;
    const h = g.local;
    // HP / SP
    const hpPct = Math.max(0, h.hp / h.maxHp);
    const redPct = Math.min(1, (h.hp + (h.hpRed || 0)) / h.maxHp);
    this.el.hpFill.style.width = hpPct * 100 + '%';
    this.el.hpRed.style.width = redPct * 100 + '%';
    this.el.hpLag.style.width = redPct * 100 + '%';
    this.el.hpRed.classList.toggle('regen', (h.hpRed || 0) > 1 && h.regenWait <= 0);
    // boost gauge (the Gundam only)
    const hasBoost = h.boost !== undefined;
    this.el.boostBar.style.display = hasBoost ? '' : 'none';
    if (hasBoost) {
      this.el.boostFill.style.width = Math.max(0, h.boost) * 100 + '%';
      this.el.boostBar.classList.toggle('low', h.boost < 0.25);
    }
    this.speedK += ((h.state === 'boost' ? 1 : 0) - this.speedK) * Math.min(1, dt * (h.state === 'boost' ? 8 : 5));
    this.el.speedlines.style.opacity = (this.speedK * 0.75).toFixed(3);
    this.cineT = Math.max(0, this.cineT - dt);
    this.el.letterbox.classList.toggle('on', this.cineT > 0);
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
    this.el.vignette.className = this.hurtT > 0 ? 'on' : hpPct < 0.25 && h.alive && h.state !== 'off' ? 'low' : '';
    this.flashT = Math.max(0, this.flashT - dt * 2.5);
    this.el.flash.style.opacity = this.flashT;

    this.updateAlly();
    this.updateFace(dt);
    this.updateDialogue(dt);
    this.updateBosses();
    this.updateTags();
    this.updateMarker();
    this.updateLock();
    this.mapT -= dt;
    if (this.mapT <= 0) { this.mapT = 1 / 20; this.drawMap(); }
  }

  // Teammate's health under your own bars in co-op.
  updateAlly() {
    const g = this.game;
    const coop = g.players.length > 1 && g.mode !== 'title';
    this.el.ally.classList.toggle('hidden', !coop);
    if (!coop) return;
    const a = g.local === g.hero ? g.tank : g.hero;
    this.el.allyName.textContent = a === g.tank ? 'GUNTANK · HAYATO' : a.suit.id === 'guncannon' ? 'GUNCANNON · KAI' : 'GUNDAM · AMURO';
    this.el.allyFill.style.width = Math.max(0, a.hp / a.maxHp) * 100 + '%';
    this.el.allyState.textContent = a.state === 'dead' ? `REDEPLOY ${Math.max(0, Math.ceil(a.respawnT || 0))}` : '';
  }

  // Player portrait: wince when hit, talk while the local pilot speaks, blink now and then.
  updateFace(dt) {
    this.hurtFaceT = Math.max(0, this.hurtFaceT - dt);
    this.blinkT -= dt;
    if (this.blinkT < -0.12) this.blinkT = 2 + Math.random() * 3;
    const d = this.dlgCur;
    const talking = d && d.speaker === this.pilot && this.dlgT * 55 < d.text.length;
    const flap = Math.floor(this.dlgT / 0.11) % 2 === 1;
    let expr = 'idle';
    if (this.game.local.state === 'musou') expr = 'shout';
    else if (this.hurtFaceT > 0) expr = talking && flap ? 'hurtTalk' : 'hurt';
    else if (talking && (flap || holdsTalk(this.pilot))) expr = 'talk';
    else if (this.blinkT < 0) expr = 'blink';
    if (expr !== this.faceExpr) {
      this.faceExpr = expr;
      this.el.portrait.src = portrait(this.pilot, '#0b1424', expr);
    }
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
      this.el.dlgPortrait.style.imageRendering = renderingFor(d.speaker);
      this.dlgExpr = 'idle';
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
      // mouth flaps while the line types out (sprite-sheet portraits only)
      const expr = holdsTalk(d.speaker) ? 'talk' : n < d.text.length && Math.floor(this.dlgT / 0.11) % 2 ? 'talk' : 'idle';
      if (expr !== this.dlgExpr) { this.dlgExpr = expr; this.el.dlgPortrait.src = portrait(d.speaker, '#0b1424', expr); }
      if (this.dlgT > d.dur) {
        this.dlgCur = null;
        if (!this.dlgQueue.length) this.el.dialogue.classList.add('hidden');
      }
    }
  }

  updateBosses() {
    const g = this.game;
    for (const c of g.commanders.list) {
      if (c.kind === 'captain') continue; // squad leaders only get a floating tag
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
        root.className = 'tag' + (c.kind === 'char' ? ' char' : c.kind === 'captain' ? ' captain' : '');
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

  // Points at the current objective: the nearest landing zone, else an officer who is off screen.
  updateMarker() {
    const g = this.game;
    const h = g.local;
    const el = this.el.marker;
    let tx = 0, ty = 0, tz = 0, label = '', found = false, always = false, best = Infinity;
    for (const lz of g.lz.list) {
      if (lz.captured || lz.y > 0) continue;
      const d = Math.hypot(lz.x - h.pos.x, lz.z - h.pos.z);
      if (d < best) { best = d; tx = lz.x; ty = 9; tz = lz.z; label = 'LZ ' + lz.name; found = always = true; }
    }
    if (!found) {
      for (const c of g.commanders.list) {
        if (!c.alive || c.kind === 'captain' || c.state === 'drop') continue;
        const d = Math.hypot(c.pos.x - h.pos.x, c.pos.z - h.pos.z);
        if (d < best) { best = d; tx = c.pos.x; ty = c.pos.y + 5.2; tz = c.pos.z; label = c.cfg.title.split(' · ')[0]; found = true; }
      }
    }
    // nothing to point at, a cut-scene, or already standing in the landing zone
    if (!found || g.mode === 'title' || this.cineT > 0 || (always && best < 10)) { el.classList.add('hidden'); return; }
    const cam = g.camera.cam;
    const v = this._v.set(tx, ty, tz).applyMatrix4(cam.matrixWorldInverse);
    const behind = v.z > 0;
    let sx, sy;
    if (behind) { sx = -v.x; sy = -v.y; if (Math.abs(sx) + Math.abs(sy) < 1e-3) sy = -1; }
    else { v.applyMatrix4(cam.projectionMatrix); sx = v.x; sy = v.y; }
    const onScreen = !behind && Math.abs(sx) < 0.92 && Math.abs(sy) < 0.8;
    if (!onScreen) {
      const m = Math.max(Math.abs(sx) / 0.9, Math.abs(sy) / 0.72, 1e-3);
      sx /= m; sy /= m;
    } else if (!always) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.classList.toggle('edge', !onScreen);
    el.style.left = ((sx + 1) / 2) * innerWidth + 'px';
    el.style.top = ((1 - sy) / 2) * innerHeight + 'px';
    const arrow = el.firstElementChild;
    arrow.style.transform = onScreen ? '' : `rotate(${Math.atan2(-sy, sx)}rad)`;
    arrow.style.animation = onScreen ? '' : 'none';
    this.el.omLabel.textContent = label;
    this.el.omDist.textContent = Math.round(best) + 'm';
  }

  // Lock-on reticle on the locked commander's chest, pinned to the screen edge when it's out of view.
  updateLock() {
    const g = this.game, c = g.lock, el = this.el.lock;
    if (!c || g.mode === 'title' || g.mode === 'select') { el.classList.add('hidden'); this.lockShown = null; return; }
    if (this.lockShown !== c) { this.lockShown = c; this.el.lockName.textContent = c.cfg.title.split(' · ')[0]; }
    const cam = g.camera.cam;
    const v = this._v.set(c.pos.x, c.pos.y + 2.3, c.pos.z).applyMatrix4(cam.matrixWorldInverse);
    const behind = v.z > 0;
    let sx, sy;
    if (behind) { sx = -v.x; sy = -v.y; if (Math.abs(sx) + Math.abs(sy) < 1e-3) sy = -1; }
    else { v.applyMatrix4(cam.projectionMatrix); sx = v.x; sy = v.y; }
    const edge = behind || Math.abs(sx) > 0.94 || Math.abs(sy) > 0.9;
    if (edge) { const m = Math.max(Math.abs(sx) / 0.92, Math.abs(sy) / 0.86, 1e-3); sx /= m; sy /= m; }
    el.classList.remove('hidden');
    el.classList.toggle('edge', edge);
    el.style.left = ((sx + 1) / 2) * innerWidth + 'px';
    el.style.top = ((1 - sy) / 2) * innerHeight + 'px';
  }

  drawMap() {
    const g = this.game;
    const ctx = this.mapCtx;
    const W = 200, S = 200 / 150; // show ~150 units across
    const hero = g.local;
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
    // landing zones: red while Zeon holds them, blue once taken
    for (const lz of g.lz.list) {
      if (lz.y > 0) continue;
      const x = tx(lz.x), z = tz(lz.z), r = 9 * S;
      ctx.fillStyle = lz.captured ? 'rgba(95,208,255,0.22)' : `rgba(255,60,70,${0.2 + 0.12 * Math.sin(performance.now() / 250)})`;
      ctx.strokeStyle = lz.captured ? '#5fd0ff' : '#ff4a5a';
      ctx.lineWidth = 2;
      ctx.fillRect(x - r, z - r, r * 2, r * 2);
      ctx.strokeRect(x - r, z - r, r * 2, r * 2);
      ctx.save();
      ctx.translate(x, z);
      ctx.rotate(-(yaw + Math.PI));
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Rajdhani, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(lz.name[0], 0, 0);
      ctx.restore();
    }
    // grunts
    ctx.fillStyle = '#ff5a4a';
    for (const e of g.crowd.list) {
      const x = tx(e.x), z = tz(e.z);
      if (Math.abs(x) > 150 || Math.abs(z) > 150) continue;
      ctx.fillRect(x - 1.25, z - 1.25, 2.5, 2.5);
    }
    // items
    ctx.fillStyle = '#5dff7a';
    for (const it of g.items.list) ctx.fillRect(tx(it.x) - 2.5, tz(it.z) - 2.5, 5, 5);
    // teammate
    if (g.players.length > 1) {
      const a = g.local === g.hero ? g.tank : g.hero;
      if (a.alive) {
        ctx.fillStyle = '#9fe6ff';
        ctx.beginPath();
        ctx.arc(tx(a.pos.x), tz(a.pos.z), 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0b1424';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
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
