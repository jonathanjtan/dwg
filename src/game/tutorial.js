// Training: a short run of drills that walks a pilot through every essential control, one at a time, on the plaza.
// It stands in for the mission script (same hooks as Stage), so everything else in the game runs as normal. Each drill
// watches what the suit is actually doing (its state and the move it is playing), fills a bar, and clears with a stamp.
import { officerCfg } from './stage.js';
import { suitInfo } from './roster.js';
import { rand, wrapAngle } from '../core/util.js';

const TAU = Math.PI * 2;
const $ = (id) => document.getElementById(id);

// How each control is named on each kind of input: [cap, alternative]. On a keyboard the alternative is a second key
// cap (the mouse, or the other key bound to it), shown as a whole second sequence after the keyboard-only one; on a
// phone it is a note under the caps.
const CAPS = {
  kb: {
    move: ['W A S D'], look: ['Q / E', 'MOUSE'], jump: ['SPACE'], boost: ['SHIFT', 'L'],
    atk: ['J', 'LMB'], chg: ['K', 'RMB'], sp: ['I', 'F'], lock: ['R', 'MMB'],
  },
  pad: {
    move: ['L-STICK'], look: ['R-STICK'], jump: ['A'], boost: ['B'], atk: ['X'], chg: ['Y'], sp: ['RB'], lock: ['R3'],
  },
  touch: {
    move: ['LEFT THUMB', 'drag anywhere'], look: ['RIGHT THUMB', 'drag'], jump: ['JUMP'], boost: ['BOOST'],
    atk: ['ATK'], chg: ['CHG'], sp: ['SP'], lock: ['LOCK'],
  },
};
// the on-screen button each control lights up on a phone
const TOUCH_BTN = { jump: 'jump', boost: 'dodge', atk: 'attack', chg: 'charge', sp: 'musou', lock: 'lock' };

// The drills, in order. `keys` is what to press: a control name, `name+` for a hold, `name*` for "keep pressing".
const DRILLS = [
  { id: 'move', jp: '移動', name: 'MOVE', keys: ['move'], text: 'Walk the {unit} around the plaza.' },
  { id: 'look', jp: '視点', name: 'LOOK', keys: ['look'], text: 'Turn the camera and take a look around.' },
  { id: 'jump', jp: '跳躍', name: 'JUMP & HOVER', keys: ['jump+'], text: 'Jump, and keep holding to hover on your thrusters.' },
  { id: 'boost', jp: 'ブースト', name: 'BOOST', keys: ['boost+'], text: 'Hold to dash. Keep holding once the gauge runs dry to sprint.', tip: 'Dashing burns the BOOST gauge under your armor. Sprinting is free, and lets it refill.' },
  { id: 'combo', jp: '通常攻撃', name: 'ATTACK', keys: ['atk*'], text: 'Targets inbound! Keep pressing to chain a 4-hit string.', tip: 'Six presses make the full string, ending in a launcher.' },
  { id: 'charge', jp: 'チャージ攻撃', name: 'CHARGE ATTACK', keys: ['atk', 'atk', 'chg'], text: 'Cap a string with a charge attack.', tip: 'The more hits before it, the bigger the charge attack. Try them all later.' },
  { id: 'shot', jp: 'チャージショット', name: 'CHARGE SHOT', keys: ['chg+'], text: 'Hold it down on its own for a charge shot.' },
  { id: 'dash', jp: 'ダッシュ攻撃', name: 'DASH ATTACK', keys: ['boost', 'atk*'], text: 'Boost in, then attack out of the dash.', tip: 'Keep pressing to rush through the whole squad.' },
  { id: 'air', jp: '空中攻撃', name: 'AIR ATTACK', keys: ['jump', 'atk'], text: 'Attack in mid-air.' },
  { id: 'sp', jp: '必殺技', name: 'SP ATTACK', keys: ['sp'], text: 'All three SP stocks are full. Each SP spends one. Unleash it!', tip: 'Hold it through the burst for a charge SP: every stock you hold on for makes it last longer. In the air, it becomes an aerial SP.' },
  { id: 'lock', jp: 'ロックオン', name: 'LOCK ON', keys: ['lock'], text: 'A squad leader! Lock on to keep him in your sights.', tip: 'Press again to let go.' },
  { id: 'boss', jp: '撃破', name: 'TAKE HIM DOWN', keys: ['atk*', 'chg'], text: 'Defeat the squad leader with everything you have learned.' },
];

// Training handicap: soft, slow Zaku that are there to be hit.
export const TRAINING = { dmgTaken: 0.25, dmgDealt: 1.2, enemyHp: 0.7, aggression: 0.35, speed: 0.85, maxAlive: 40, maxPress: 4, dropEvery: 999, recover: 0.8, reinforce: 1 };

export class Tutorial {
  constructor(game) {
    this.game = game;
    this.el = {
      root: $('drill'), step: $('dr-step'), dots: $('dr-dots'), jp: $('dr-jp'), name: $('dr-name'),
      keys: $('dr-keys'), text: $('dr-text'), tip: $('dr-tip'), fill: $('dr-fill'), card: $('dr-card'),
    };
    this.reset();
  }

  reset() {
    this.phase = 'idle';
    this.i = -1;
    this.t = 0;
    this.squads = [];
    this.mode = '';
    this.leader = null;
    this.el?.root.classList.add('hidden');
    this.glow(null);
  }

  get drill() {
    return DRILLS[this.i];
  }

  get count() {
    return DRILLS.length;
  }

  begin() {
    const g = this.game;
    this.reset();
    this.phase = 'launch';
    g.hud.setObjective('Training · get to the plaza');
    this.el.dots.innerHTML = DRILLS.map(() => '<i></i>').join('');
    g.hud.say('bright', 'BRIGHT NOA', `This is a drill, ${this.first}. Learn the controls before the real thing.`, 3.4);
  }

  get first() {
    const n = suitInfo(this.game.hero.suit.id).pilotName.split(' ')[0];
    return n[0] + n.slice(1).toLowerCase();
  }

  onHeroLanded() {
    if (this.phase !== 'launch') return;
    const g = this.game;
    this.phase = 'drills';
    g.hud.announce('TRAINING', 'LEARN THE CONTROLS');
    g.audio.playMusic('battle');
    this.el.root.classList.remove('hidden');
    this.next(0.9);
  }

  // ---------- drills ----------
  next(delay = 0) {
    this.i++;
    this.wait = delay;
    this.progress = 0;
    this.shown = 0;
    this.ticks = 0;
    this.done = false;
    this.s = {}; // scratch for the drill's own counters
    this.el.fill.style.width = '0%';
    if (this.i >= DRILLS.length) return this.complete();
    this.render(true);
  }

  // The card for the current drill. Rebuilt when the pilot switches between keyboard, pad and touch.
  render(fresh) {
    const g = this.game, d = this.drill;
    const mode = g.isTouch ? 'touch' : g.input.usingPad ? 'pad' : 'kb';
    this.mode = mode;
    const caps = CAPS[mode];
    this.el.step.textContent = `DRILL ${this.i + 1} / ${DRILLS.length}`;
    this.el.jp.textContent = d.jp;
    this.el.name.textContent = d.name;
    // one sequence of caps; `alt` swaps in each key's alternative where it has one
    const seq = (alt) => `<span class="dr-seq">${d.keys.map((k, n) => {
      const [cap, other] = caps[k.replace(/[+*]$/, '')];
      const tag = k.endsWith('+') ? '<em>HOLD</em>' : k.endsWith('*') ? '<em>× MASH</em>' : '';
      return `${n ? '<span class="dr-then">›</span>' : ''}<kbd>${alt && other ? other : cap}</kbd>${tag}`;
    }).join('')}</span>`;
    const hasAlt = d.keys.some((k) => caps[k.replace(/[+*]$/, '')][1]);
    let html = seq(false);
    if (hasAlt && mode === 'kb') html += `<span class="dr-or">or</span>${seq(true)}`;
    else if (hasAlt && mode === 'touch') html += `<span class="dr-alt">${[...new Set(d.keys.map((k) => caps[k.replace(/[+*]$/, '')][1]).filter(Boolean))].join(' · ')}</span>`;
    this.el.keys.innerHTML = html;
    this.el.text.textContent = d.text.replace('{unit}', suitInfo(g.hero.suit.id).unitShort);
    this.el.tip.textContent = d.tip || '';
    this.el.tip.classList.toggle('hidden', !d.tip);
    const dots = this.el.dots.children;
    for (let k = 0; k < dots.length; k++) {
      dots[k].className = k < this.i ? 'done' : k === this.i ? 'cur' : '';
    }
    g.hud.setObjective(`Training · ${d.name.toLowerCase()}`);
    if (fresh) {
      const c = this.el.card;
      c.classList.remove('in', 'clear');
      void c.offsetWidth;
      c.classList.add('in');
      g.audio.play('ui', { pitch: 1.2 });
    }
    this.glow(mode === 'touch' ? d.keys.map((k) => TOUCH_BTN[k.replace(/[+*]$/, '')]).filter(Boolean) : null);
  }

  // On a phone, ring the buttons the drill wants pressed.
  glow(names) {
    for (const b of document.querySelectorAll('.tc-btn.tut')) b.classList.remove('tut');
    for (const n of names || []) document.querySelector(`.tc-btn[data-a="${n}"]`)?.classList.add('tut');
  }

  // Add to the drill's progress (0..1). Each quarter gets a rising blip.
  advance(p) {
    if (this.done) return;
    this.progress = Math.min(1, Math.max(this.progress, p));
    const q = Math.floor(this.progress * 4);
    if (q > this.ticks && this.progress < 1) {
      this.ticks = q;
      this.game.audio.play('tick', { pitch: 1 + q * 0.12 });
    }
    if (this.progress >= 1) this.clear();
  }

  clear() {
    const g = this.game;
    this.done = true;
    this.progress = 1;
    this.el.fill.style.width = '100%';
    const c = this.el.card;
    c.classList.remove('clear');
    void c.offsetWidth;
    c.classList.add('clear');
    this.el.dots.children[this.i]?.classList.add('done', 'pop');
    g.audio.play('drill');
    g.hud.toast(`${this.drill.name} · CLEAR`, '#ffd070');
    this.glow(null);
    const i = this.i;
    g.timers.push({ t: 1.25, fn: () => { if (this.phase === 'drills' && this.i === i) this.next(); } });
  }

  complete() {
    const g = this.game;
    this.phase = 'win';
    this.el.root.classList.add('hidden');
    try { localStorage.setItem('gmusou.trained', '1'); } catch (e) { /* private mode */ }
    g.hud.announce('TRAINING COMPLETE', 'YOU ARE CLEARED TO SORTIE');
    g.hud.setObjective('Training complete');
    g.hud.say('bright', 'BRIGHT NOA', `Good work, ${this.first}. You're ready for the real thing.`, 3.2);
    this.pilotSay();
    g.audio.stinger('victory');
    for (const p of g.players) p.invuln = 99;
    const left = [...g.crowd.list];
    left.forEach((e, n) => g.timers.push({ t: 0.8 + n * 0.07, fn: () => { if (e.alive && e.state !== 'dying') g.crowd.kill(e); } }));
    g.timers.push({ t: 5, fn: () => g.finishTraining() });
  }

  pilotSay() {
    const g = this.game, info = suitInfo(g.hero.suit.id);
    g.hud.say(info.pilot, info.pilotName, "Got it. I think I can do this.", 2.6);
  }

  // A squad of targets in front of the pilot, already coming at them.
  squad(n = 7) {
    const g = this.game, h = g.hero, a = g.camera.yaw + rand(-0.5, 0.5);
    const cx = h.pos.x + Math.sin(a) * 16, cz = h.pos.z + Math.cos(a) * 16;
    const sq = { x: cx, z: cz, engaged: true, rally: true, n: 0, base: null, post: null };
    this.squads.push(sq);
    for (let k = 0, made = 0; k < n * 3 && made < n; k++) {
      const b = rand(0, TAU), r = rand(1.5, 5);
      const x = cx + Math.sin(b) * r, z = cz + Math.cos(b) * r;
      if (g.world.blocked(x, z, 1.2)) continue;
      if (g.crowd.spawn(x, z, { gun: made === 0, drop: true, yaw: a + Math.PI, squad: sq })) made++;
    }
  }

  update(dt) {
    const g = this.game, h = g.hero;
    this.t += dt;
    if (this.phase !== 'drills') return;
    // training armor: the suit can be knocked about but never falls
    if (h.alive) h.hp = Math.max(h.hp, h.maxHp * 0.5);
    this.squads = this.squads.filter((s) => s.n > 0);
    // the bar eases toward the drill's progress
    this.shown += (this.progress - this.shown) * Math.min(1, dt * 12);
    this.el.fill.style.width = `${(this.shown * 100).toFixed(1)}%`;
    const mode = g.isTouch ? 'touch' : g.input.usingPad ? 'pad' : 'kb';
    if (mode !== this.mode && !this.done) this.render(false);
    if (this.wait > 0) { this.wait -= dt; return; }
    if (this.done) return;
    const d = this.drill, s = this.s, st = h.state, mv = h.moveName;
    // from the attack drills on, there is always something to hit
    if (this.i >= 4 && this.i < 10 && g.crowd.count < 5) this.squad();
    switch (d.id) {
      case 'move': {
        if (s.px !== undefined && st === 'move') s.dist = (s.dist || 0) + Math.hypot(h.pos.x - s.px, h.pos.z - s.pz);
        s.px = h.pos.x; s.pz = h.pos.z;
        this.advance((s.dist || 0) / 28);
        break;
      }
      case 'look': {
        const inp = g.input;
        s.turn = (s.turn || 0) + Math.abs(inp.mouseDX) * 0.0026 + Math.abs(inp.mouseDY) * 0.0015 + Math.abs(inp.look.x) * 2.6 * dt + Math.abs(inp.look.y) * 1.2 * dt;
        this.advance(s.turn / 3);
        break;
      }
      case 'jump':
        if (st === 'air') s.jumped = true;
        if (h.hovering) s.hover = (s.hover || 0) + dt;
        this.advance((s.jumped ? 0.25 : 0) + ((s.hover || 0) / 1.1) * 0.75);
        break;
      case 'boost':
        // the dash runs the gauge down, then a held boost settles into the sprint
        if (st === 'boost') {
          s.b0 = s.b0 || Math.max(0.05, h.boost);
          this.advance(0.25 + 0.35 * (1 - h.boost / s.b0));
        }
        if (st === 'sprint') s.sprint = (s.sprint || 0) + dt;
        if (s.sprint) this.advance(0.6 + (s.sprint / 0.9) * 0.4);
        break;
      case 'combo': {
        const n = st === 'attack' && /^N\d$/.test(mv) ? +mv[1] : 0;
        this.advance(n / 4);
        if (!s.said) { s.said = true; g.hud.say('bright', 'BRIGHT NOA', 'Targets inbound. Show me what that suit can do!', 2.8); }
        break;
      }
      case 'charge': {
        const n = st === 'attack' && /^C\d$/.test(mv) ? +mv[1] : 0;
        if (n >= 2) this.advance(1);
        break;
      }
      case 'shot':
        if (mv === 'CS' && (st === 'attack' || st === 'musou')) this.advance(1);
        break;
      case 'dash':
        if (st === 'boost' || st === 'sprint') s.boosted = true;
        if (st === 'attack' && /^D/.test(mv)) this.advance(1);
        else if (s.boosted) this.advance(0.5);
        break;
      case 'air':
        if (st === 'air') s.up = true;
        if (st === 'attack' && (mv === 'JA' || mv === 'JC')) this.advance(1);
        else if (s.up) this.advance(0.5);
        break;
      case 'sp':
        if (!s.filled) {
          // pour all three stocks in so the SP READY light comes on in front of them (and a charge SP can use them)
          h.sp = Math.min(h.maxSp, h.sp + h.maxSp * dt * 1.6);
          if (h.sp >= h.maxSp) { s.filled = true; g.audio.play('pickup'); }
        }
        if (st === 'musou') this.advance(1);
        break;
      case 'lock':
        // he drops in once the SP has played out, so his entrance isn't lost under it
        if (!this.leader) { if (st !== 'musou') this.callLeader(); }
        else if (g.lock === this.leader) this.advance(1);
        break;
      case 'boss':
        if (this.leader && !this.leader.alive) this.advance(1);
        else this.advance(this.leader ? 1 - this.leader.hp / this.leader.maxHp : 0);
        break;
    }
  }

  callLeader() {
    const g = this.game, h = g.hero, a = g.camera.yaw;
    const x = h.pos.x + Math.sin(a) * 14, z = h.pos.z + Math.cos(a) * 14;
    const cfg = { ...officerCfg('captain'), hp: 360, x, z, drop: true, yaw: Math.atan2(h.pos.x - x, h.pos.z - z) };
    this.leader = g.commanders.add(cfg);
    g.audio.play('alarm');
    g.showcase(this.leader, 2.2);
    g.hud.say('bright', 'BRIGHT NOA', 'A squad leader just dropped in. Lock on and bring him down!', 3);
  }

  // Stage hooks the game calls; training only needs a few.
  onKill() {}
  onZoneLanded() {}
  onCharRetreated() {}
  onCommanderExploded() {}
  wingmanSay() {}
  onCommanderDefeated(c) {
    if (c === this.leader && this.drill?.id === 'lock') this.advance(1); // beaten before he was locked on to
  }
}
