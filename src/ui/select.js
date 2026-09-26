// Mobile suit select: a card per suit (pilot portrait, unit, pilot), and for the highlighted one Reborn's spec sheet,
// its loadout and a few moves. The suit itself stands in the 3D scene behind the panel.
import { ROSTER } from '../game/roster.js';
import { portrait, renderingFor } from './portraits.js';
import { isTouch } from '../core/touch.js';

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
    this.cardEls = ROSTER.map((s, i) => {
      const b = document.createElement('button');
      b.className = 'sel-card';
      b.innerHTML = `<img alt=""><span class="sc-text"><span class="sc-jp">${s.unitJp}</span><span class="sc-unit">${s.unit}</span><span class="sc-pilot">${s.pilotJp} · ${s.pilotName}</span></span>`;
      b.addEventListener('click', () => (this.idx === i ? this.confirm() : this.pick(i)));
      b.addEventListener('mouseenter', () => this.pick(i));
      this.cards.appendChild(b);
      return b;
    });
    $('sel-go').addEventListener('click', () => this.confirm());
    $('sel-back').addEventListener('click', () => this.game.closeSelect());
  }

  get open() {
    return !this.el.classList.contains('hidden');
  }

  show() {
    this.refreshPortraits();
    this.el.classList.remove('hidden');
    const cur = ROSTER.findIndex((s) => s.id === this.game.hero.suit.id);
    this.pick(Math.max(0, cur), true);
  }

  hide() {
    this.el.classList.add('hidden');
  }

  // Portrait sheets load asynchronously; re-read them whenever the screen opens.
  refreshPortraits() {
    ROSTER.forEach((s, i) => {
      const img = this.cardEls[i].querySelector('img');
      img.src = portrait(s.pilot, '#0b1424', 'idle');
      img.style.imageRendering = renderingFor(s.pilot);
    });
  }

  pick(i, quiet = false) {
    if (i === this.idx && !quiet && this.rendered) return;
    this.idx = (i + ROSTER.length) % ROSTER.length;
    const s = ROSTER[this.idx];
    this.cardEls.forEach((c, k) => c.classList.toggle('on', k === this.idx));
    this.game.setSuit(s.id);
    if (!quiet) { this.game.audio.resume(); this.game.audio.play('ui'); }
    const bars = Object.entries(s.stats).map(([k, v]) => {
      const pct = Math.min(100, (v / (STAT_MAX[k] || 1000)) * 100);
      return `<div class="st-k">${k}</div><div class="st-bar"><div style="width:${pct}%"></div></div><div class="st-v">${v}</div>`;
    }).join('');
    const moves = s.moves.map(([k, v]) => `<div class="mv-k">${comboKeys(k)}</div><div class="mv-v">${v}</div>`).join('');
    this.detail.innerHTML = `
      <div class="sd-role">${s.role}</div>
      <div class="sd-stats">${bars}</div>
      <div class="sd-equip">${s.equipment.map((e) => `<span>${e}</span>`).join('')}</div>
      <div class="sd-moves">${moves}</div>`;
    this.rendered = true;
  }

  move(d) {
    this.pick(this.idx + d);
  }

  confirm() {
    this.game.start();
  }

  // Keyboard: A/D or the arrows choose, Enter / J / Space sorties, Esc goes back. Gamepad: stick or d-pad, A, B.
  key(code) {
    if (code === 'ArrowLeft' || code === 'KeyA' || code === 'ArrowUp' || code === 'KeyW') this.move(-1);
    else if (code === 'ArrowRight' || code === 'KeyD' || code === 'ArrowDown' || code === 'KeyS') this.move(1);
    else if (code === 'Enter' || code === 'KeyJ' || code === 'Space') this.confirm();
    else if (code === 'Escape' || code === 'Backspace') this.game.closeSelect();
  }

  pad(act, mx, dt) {
    this.padT -= dt;
    if (Math.abs(mx) > 0.6 && this.padT <= 0) { this.move(Math.sign(mx)); this.padT = 0.28; }
    if (Math.abs(mx) < 0.3) this.padT = 0;
    if (this.game.input.usingPad && (act.attack || act.jump)) this.confirm();
    else if (this.game.input.usingPad && act.dodge) this.game.closeSelect();
  }
}
