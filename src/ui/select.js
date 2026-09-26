// Mobile suit select: a card per suit (pilot portrait, unit, pilot, SD unit render), and for the highlighted one Reborn's spec sheet,
// its loadout and a few moves. The suit itself stands in the 3D scene behind the panel. The host picks from the solo
// roster before a sortie; a co-op guest picks from the whole roster on joining, and again from the lobby.
import { SOLO_ROSTER } from '../game/roster.js';
import { portrait, renderingFor } from './portraits.js';
import { isTouch } from '../core/touch.js';
import { unitImg } from './units.js';

const $ = (id) => document.getElementById(id);
const STAT_MAX = { ARMOR: 10000 };
// The roster writes its combos in keys. On a phone those are buttons with names on them.
const comboKeys = (k) => (isTouch() ? k.replace(/\bJ\b/g, 'ATK').replace(/\bK\b/g, 'CHG') : k);

export class SuitSelect {
  constructor(game) {
    this.game = game;
    this.el = $('select');
    this.cards = $('sel-cards');
    this.detail = $('sel-detail');
    this.idx = 0;
    this.padT = 0;
    this.opts = null;
    this.cardEls = [];
    $('sel-go').addEventListener('click', () => this.confirm());
    $('sel-back').addEventListener('click', () => this.back());
  }

  // opts: { roster, current (suit id), onPick(id), onGo(), onBack(), go (button label), hint }
  // Defaults: the host's pre-sortie select.
  configure(opts = {}) {
    const g = this.game;
    this.opts = {
      roster: SOLO_ROSTER, current: g.hero.suit.id, onPick: (id) => g.setSuit(id), onGo: () => g.start(), onBack: () => g.closeSelect(),
      go: 'SORTIE', hint: 'A / D or ← → to choose · Enter to sortie · Esc to go back', ...opts,
    };
    this.roster = this.opts.roster;
    $('sel-go').textContent = this.opts.go;
    this.el.querySelector('.hint').textContent = this.opts.hint;
    this.cards.innerHTML = '';
    this.cardEls = this.roster.map((s, i) => {
      const b = document.createElement('button');
      b.className = 'sel-card';
      b.innerHTML = `<img alt=""><span class="sc-text"><span class="sc-jp">${s.unitJp}</span><span class="sc-unit">${s.unit}</span><span class="sc-pilot">${s.pilotJp} · ${s.pilotName}</span></span>${unitImg(s.id, 'sc-suit')}`;
      b.addEventListener('click', () => (this.idx === i ? this.confirm() : this.pick(i)));
      b.addEventListener('mouseenter', () => this.pick(i));
      this.cards.appendChild(b);
      return b;
    });
    this.rendered = false;
  }

  get open() {
    return !this.el.classList.contains('hidden');
  }

  show(opts) {
    this.configure(opts);
    this.refreshPortraits();
    this.el.classList.remove('hidden');
    const cur = this.roster.findIndex((s) => s.id === this.opts.current);
    this.pick(Math.max(0, cur), true);
  }

  hide() {
    this.el.classList.add('hidden');
  }

  // Portrait sheets load asynchronously; re-read them whenever the screen opens.
  refreshPortraits() {
    this.roster.forEach((s, i) => {
      const img = this.cardEls[i].querySelector('img:not(.sc-suit)');
      img.src = portrait(s.pilot, '#0b1424', 'idle');
      img.style.imageRendering = renderingFor(s.pilot);
    });
  }

  pick(i, quiet = false) {
    if (i === this.idx && !quiet && this.rendered) return;
    this.idx = (i + this.roster.length) % this.roster.length;
    const s = this.roster[this.idx];
    this.cardEls.forEach((c, k) => c.classList.toggle('on', k === this.idx));
    this.opts.onPick(s.id);
    if (!quiet) { this.game.audio.resume(); this.game.audio.play('ui'); }
    const bars = Object.entries(s.stats).map(([k, v]) => {
      const pct = Math.min(100, (v / (STAT_MAX[k] || 1000)) * 100);
      return `<div class="st-k">${k}</div><div class="st-bar"><div style="width:${pct}%"></div></div><div class="st-v">${v}</div>`;
    }).join('');
    const moves = s.moves.map(([k, v]) => `<div class="mv-k">${comboKeys(k)}</div><div class="mv-v">${v}</div>`).join('');
    this.detail.innerHTML = `
      <div class="sd-head"><div class="sd-role">${s.role}</div>${unitImg(s.id, 'sd-unit')}</div>
      <div class="sd-stats">${bars}</div>
      <div class="sd-equip">${s.equipment.map((e) => `<span>${e}</span>`).join('')}</div>
      <div class="sd-moves">${moves}</div>`;
    this.rendered = true;
  }

  move(d) {
    this.pick(this.idx + d);
  }

  confirm() {
    this.opts.onGo(this.roster[this.idx].id);
  }

  back() {
    this.opts.onBack();
  }

  // Keyboard: A/D or the arrows choose, Enter / J / Space sorties, Esc goes back. Gamepad: stick or d-pad, A, B.
  key(code) {
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') this.move(-1);
    else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') this.move(1);
    else if (code === 'Enter' || code === 'KeyJ' || code === 'Space') this.confirm();
    else if (code === 'Escape' || code === 'Backspace') this.back();
  }

  pad(act, mx, dt) {
    this.padT -= dt;
    if (Math.abs(mx) > 0.6 && this.padT <= 0) { this.move(Math.sign(mx)); this.padT = 0.28; }
    if (Math.abs(mx) < 0.3) this.padT = 0;
    if (this.game.input.usingPad && (act.attack || act.jump)) this.confirm();
    else if (this.game.input.usingPad && act.dodge) this.back();
  }
}
