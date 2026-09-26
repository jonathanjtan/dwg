// Fully synthesized SFX; the score lives in music.js.
// Positional sounds are panned against the camera and dulled with distance, big ones ring out through a
// shared colony-hall reverb, and the beam saber hum and thruster roar run as continuous loops.
import { Music } from './music.js';
import { renderBank } from './sfx.js';

// reverb send per sound (positional sounds also get wetter with distance)
const REV = {
  boom: 0.3, bigboom: 0.5, slam: 0.35, land: 0.18, rifle: 0.25, cshot: 0.35, clang: 0.35, hit: 0.08, hit_heavy: 0.25, hawk: 0.1,
  mg: 0.12, alarm: 0.2, capture: 0.25, distant: 0.9, eye: 0.25, step: 0.08, sp: 0.35, skid: 0.1, hurt: 0.15, jet: 0.12,
  qb: 0.2, slash_h: 0.12, slash_down: 0.15, bazooka: 0.25, bzboom: 0.4, shock: 0.35, lightning: 0.45, burst: 0.35,
  flash: 0.15, javelin: 0.15, spcharge: 0.2, hammer: 0.1,
  cannon: 0.35, cboom: 0.4, phit: 0.08, phit_heavy: 0.25, kick: 0.08, throw: 0.1, uppercut: 0.12, grab: 0.1,
  bcannon: 0.3, clawhit: 0.08, clawhit_heavy: 0.25, broll: 0.1,
};
// live-synth stand-ins used until the rendered bank is ready
const FALLBACK = {
  slash_a: 'swing', slash_b: 'swing', slash_h: 'swing', slash_spin: 'swing', slash_down: 'swing', slash_dash: 'swing',
  slash_fast: 'swing', slash_rise: 'swing', hit_heavy: 'hit', qb: 'boost', ping: 'hit',
  cshot: 'rifle', javelin: 'swing', hammer: 'swing', bazooka: 'boom', bzboom: 'boom', shock: 'slam', lightning: 'bigboom',
  flash: 'charge', spcharge: 'charge', burst: 'sp', draw: 'clang', bhit: 'hit',
  punch: 'swing', kick: 'swing', spin_gc: 'swing', uppercut: 'swing', throw: 'swing', phit: 'hit', phit_heavy: 'hit',
  grab: 'clang', cannon: 'boom', cboom: 'boom', punch_fast: 'swing',
  claw: 'swing', spin_ball: 'swing', bflail: 'swing', clawhit: 'hit', clawhit_heavy: 'hit', bcannon: 'boom', broll: 'slam',
};

export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = true; // sound starts off; M or the pause menu turns it on
    this.musicOn = true;
    this.listener = null; // {x,z}
    this.listenerYaw = 0; // camera yaw: sounds pan against the camera's right vector
    this.throttle = new Map();
    this.lastTake = new Map();
    this.bank = null;
    // render the sample bank in the background (needs no user gesture); live synthesis covers the gap
    if (typeof OfflineAudioContext !== 'undefined') renderBank(48000).then((b) => { this.bank = b; }).catch(() => {});
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    // a little extra low end on everything that hits
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'lowshelf';
    shelf.frequency.value = 120;
    shelf.gain.value = 3;
    this.sfx.connect(shelf).connect(this.master);
    this.music = ctx.createGain();
    this.music.gain.value = 0.5;
    this.music.connect(this.master);
    // noise buffer
    const len = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // distortion curve for crunchy hits
    this.curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      this.curve[i] = Math.tanh(x * 3.5);
    }
    this.score = new Music(ctx, this.music, this.noise);
    this.current = null;
    // colony-hall reverb for the effects
    this.revIn = ctx.createGain();
    const conv = ctx.createConvolver();
    conv.buffer = this.impulse(2.4);
    const revLp = ctx.createBiquadFilter();
    revLp.type = 'lowpass';
    revLp.frequency.value = 4200;
    const revOut = ctx.createGain();
    revOut.gain.value = 0.6;
    this.revIn.connect(conv).connect(revLp).connect(revOut).connect(this.master);
    this.initLoops();
  }

  // Stereo impulse: a few early reflections off the buildings, then a long dark exponential tail.
  impulse(dur) {
    const ctx = this.ctx, rate = ctx.sampleRate, len = Math.floor(rate * dur);
    const buf = ctx.createBuffer(2, len, rate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.4) * Math.min(1, i / (rate * 0.015)) * 0.6;
      }
      for (const [ms, a] of [[23, 0.7], [41, 0.5], [67, 0.4], [97, 0.3]]) {
        const i = Math.floor(((ms + ch * 7) / 1000) * rate);
        if (i < len) d[i] += a * (Math.random() < 0.5 ? -1 : 1);
      }
    }
    return buf;
  }

  // Continuous voices: the beam saber hum and the backpack thruster roar.
  initLoops() {
    const ctx = this.ctx;
    const hum = (this.hum = { gain: ctx.createGain(), lp: ctx.createBiquadFilter(), oscs: [] });
    hum.gain.gain.value = 0;
    hum.lp.type = 'lowpass';
    hum.lp.frequency.value = 700;
    hum.lp.Q.value = 3;
    for (const [type, f, det] of [['sawtooth', 157, 0], ['sawtooth', 157, 13], ['square', 78.5, -7]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(hum.lp);
      o.start();
      hum.oscs.push(o);
    }
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 8.5;
    const lg = ctx.createGain();
    lg.gain.value = 9;
    lfo.connect(lg);
    for (const o of hum.oscs) lg.connect(o.detune);
    lfo.start();
    hum.lp.connect(hum.gain).connect(this.sfx);

    const jet = (this.jetLoop = { gain: ctx.createGain(), bp: ctx.createBiquadFilter(), lp: ctx.createBiquadFilter() });
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    jet.bp.type = 'bandpass';
    jet.bp.frequency.value = 1300;
    jet.bp.Q.value = 0.7;
    jet.lp.type = 'lowpass';
    jet.lp.frequency.value = 200;
    const low = ctx.createGain();
    low.gain.value = 1.8;
    src.connect(jet.bp).connect(jet.gain);
    src.connect(jet.lp).connect(low).connect(jet.gain);
    // hiss on top and a gritty engine rumble underneath
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4500;
    const hiss = ctx.createGain();
    hiss.gain.value = 0.35;
    src.connect(hp).connect(hiss).connect(jet.gain);
    const rlp = ctx.createBiquadFilter();
    rlp.type = 'lowpass';
    rlp.frequency.value = 130;
    const grit = ctx.createWaveShaper();
    grit.curve = this.curve;
    const rg = ctx.createGain();
    rg.gain.value = 0.5;
    for (const f of [37, 38.7]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = f;
      o.connect(rlp);
      o.start();
    }
    rlp.connect(grit).connect(rg).connect(jet.gain);
    jet.gain.gain.value = 0;
    jet.gain.connect(this.sfx);
    src.start();
  }

  // Per frame: saber 0..1 (blade lit), bladeSpeed in units/s, jet 0..1 (thruster output).
  loops(saber, bladeSpeed, jet) {
    if (!this.hum) return;
    const t = this.ctx.currentTime, h = this.hum;
    const sp = Math.min(1, bladeSpeed / 45);
    h.gain.gain.setTargetAtTime(saber * (0.035 + sp * 0.06), t, 0.04);
    h.lp.frequency.setTargetAtTime(600 + sp * 2000, t, 0.04);
    const f = 157 * (1 + sp * 0.15);
    h.oscs[0].frequency.setTargetAtTime(f, t, 0.04);
    h.oscs[1].frequency.setTargetAtTime(f, t, 0.04);
    h.oscs[2].frequency.setTargetAtTime(f / 2, t, 0.04);
    const j = this.jetLoop;
    j.gain.gain.setTargetAtTime(jet * 0.34, t, jet > 0.05 ? 0.05 : 0.15);
    j.bp.frequency.setTargetAtTime(900 + jet * 1000, t, 0.1);
  }

  // Scattered debris ticks after a blast.
  crackle(t, span, n, vol, out) {
    for (let i = 0; i < n; i++) {
      const tt = t + Math.random() * Math.random() * span;
      this.noiseBurst(tt, 0.015 + Math.random() * 0.03, vol * (0.4 + Math.random() * 0.6), out, { type: 'bandpass', f0: 1500 + Math.random() * 3500, q: 1.5 });
    }
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    return this.muted;
  }

  // ---------- building blocks ----------
  env(g, t, a, peak, dcy, sus = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dcy);
  }
  osc(type, f0, f1, t, dur, vol, out, { a = 0.005, detune = 0 } = {}) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    o.detune.value = detune;
    const g = ctx.createGain();
    this.env(g, t, a, vol, dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + a + 0.05);
    return o;
  }
  noiseBurst(t, dur, vol, out, { type = 'lowpass', f0 = 2000, f1 = f0, q = 0.8, a = 0.003 } = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    s.playbackRate.value = 1;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, a, vol, dur);
    s.connect(f).connect(g).connect(out);
    const off = Math.random() * 1.5;
    s.start(t, off);
    s.stop(t + dur + a + 0.05);
  }

  play(name, { vol = 1, pitch = 1, at = null, pan = null } = {}) {
    if (!this.ctx || this.muted) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    // throttle identical sounds
    const last = this.throttle.get(name) || 0;
    const minGap = { ping: 0.05, hit: 0.03, bhit: 0.03, hit_heavy: 0.05, boom: 0.04, bzboom: 0.05, mg: 0.03, step: 0.08, swing: 0.04, jet: 0.12, eye: 0.25, qb: 0.06, flash: 0.05, phit: 0.03, phit_heavy: 0.05, cannon: 0.04, cboom: 0.05, punch: 0.04, punch_fast: 0.04 }[name] ?? 0.015;
    if (now - last < minGap) return;
    this.throttle.set(name, now);
    let dist = 0;
    const L = this.listener;
    if (at && L) {
      dist = Math.hypot(at.x - L.x, at.z - L.z);
      vol *= Math.max(0, 1 - dist / 70);
      if (vol < 0.03) return;
    }
    const t = now + 0.005;
    const out = ctx.createGain();
    out.gain.value = vol;
    // far sounds lose their top end, then sit left or right of the camera
    let node = out;
    if (dist > 10) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900 + 17000 * Math.pow(1 - Math.min(1, dist / 70), 2.2);
      node.connect(lp);
      node = lp;
    }
    if (pan === null && at && L && dist > 2) {
      const rx = -Math.cos(this.listenerYaw), rz = Math.sin(this.listenerYaw);
      pan = Math.max(-1, Math.min(1, ((at.x - L.x) * rx + (at.z - L.z) * rz) / dist)) * Math.min(1, dist / 8) * 0.85;
    }
    if (pan) {
      const sp = ctx.createStereoPanner();
      sp.pan.value = pan;
      node.connect(sp);
      node = sp;
    }
    node.connect(this.sfx);
    const wet = (REV[name] || 0) + (at ? Math.min(0.35, dist / 120) : 0);
    if (wet > 0.01) {
      const send = ctx.createGain();
      send.gain.value = wet;
      node.connect(send).connect(this.revIn);
    }
    const p = pitch;
    // rendered takes: never the same one twice in a row, with a little pitch drift
    const takes = this.bank && this.bank[name];
    if (takes && takes.length) {
      let i = Math.floor(Math.random() * takes.length);
      if (takes.length > 1 && i === this.lastTake.get(name)) i = (i + 1) % takes.length;
      this.lastTake.set(name, i);
      const src = ctx.createBufferSource();
      src.buffer = takes[i];
      src.playbackRate.value = p * (1 + (Math.random() - 0.5) * 0.06);
      src.connect(out);
      src.start(t);
      return;
    }
    switch (FALLBACK[name] || name) {
      case 'ignite':
        this.osc('sawtooth', 70 * p, 240 * p, t, 0.35, 0.18, out);
        this.osc('sawtooth', 71 * p, 243 * p, t, 0.35, 0.12, out);
        this.noiseBurst(t, 0.25, 0.25, out, { type: 'bandpass', f0: 800, f1: 3000, q: 2 });
        break;
      case 'swing': {
        // beam saber "vwom": an air rip over a dropping buzz and a low sub swell
        this.noiseBurst(t, 0.2, 0.5, out, { type: 'bandpass', f0: 500 * p, f1: 2600 * p, q: 1.6 });
        this.osc('sawtooth', 150 * p, 70 * p, t, 0.22, 0.12, out);
        this.osc('sawtooth', 152 * p, 71 * p, t, 0.22, 0.08, out);
        this.osc('sine', 120 * p, 68 * p, t, 0.26, 0.2, out, { a: 0.03 });
        break;
      }
      case 'hit': {
        // saber on armour: a crunch, a beam sizzle and a short inharmonic metal ring
        const ws = ctx.createWaveShaper();
        ws.curve = this.curve;
        const g = ctx.createGain();
        g.gain.value = 0.5;
        ws.connect(g).connect(out);
        this.osc('square', 220 * p, 90 * p, t, 0.1, 0.3, ws);
        this.noiseBurst(t, 0.1, 0.45, out, { type: 'highpass', f0: 1800 * p, q: 0.7 });
        this.noiseBurst(t, 0.18, 0.4, out, { type: 'bandpass', f0: 4200 * p, f1: 2400 * p, q: 2.5 });
        for (const [f, v] of [[610, 0.08], [1490, 0.055], [2870, 0.035]]) this.osc('sine', f * p, f * p * 0.97, t, 0.24, v, out);
        this.osc('sine', 150 * p, 60, t, 0.12, 0.35, out);
        break;
      }
      case 'boom':
        // crack, fireball body, sub thump, then debris ticking down
        this.noiseBurst(t, 0.05, 0.6, out, { type: 'highpass', f0: 2500 });
        this.noiseBurst(t, 0.9, 0.95, out, { type: 'lowpass', f0: 1800 * p, f1: 110, q: 0.5 });
        this.osc('sine', 82 * p, 28, t, 0.7, 0.95, out);
        this.crackle(t + 0.08, 0.6, 6, 0.22, out);
        break;
      case 'bigboom':
        this.noiseBurst(t, 0.06, 0.75, out, { type: 'highpass', f0: 2000 });
        this.noiseBurst(t, 1.8, 1.0, out, { type: 'lowpass', f0: 2400, f1: 60, q: 0.4 });
        this.osc('sine', 62, 20, t, 1.4, 1.0, out);
        this.osc('triangle', 140, 40, t, 0.8, 0.35, out);
        this.noiseBurst(t + 0.15, 2.2, 0.55, out, { type: 'lowpass', f0: 700, f1: 60 });
        this.crackle(t + 0.1, 1.3, 14, 0.25, out);
        break;
      case 'rifle':
        // beam rifle: a buzzing discharge gliding down around 170 Hz, a falling whine and a sizzle
        this.osc('sawtooth', 185 * p, 160 * p, t, 0.26, 0.2, out);
        this.osc('sawtooth', 185 * p, 160 * p, t, 0.26, 0.14, out, { detune: 9 });
        this.osc('sine', 1400 * p, 460 * p, t, 0.14, 0.16, out);
        this.noiseBurst(t, 0.35, 0.4, out, { type: 'bandpass', f0: 2600, f1: 1100, q: 1.4 });
        break;
      case 'mg':
        this.noiseBurst(t, 0.06, 0.6, out, { type: 'lowpass', f0: 3500, q: 0.6 });
        this.osc('square', 160, 60, t, 0.05, 0.25, out);
        break;
      case 'hawk':
        this.noiseBurst(t, 0.25, 0.4, out, { type: 'bandpass', f0: 350 * p, f1: 1300 * p, q: 2.4 });
        this.noiseBurst(t, 0.3, 0.18, out, { type: 'highpass', f0: 5000 });
        break;
      case 'step':
        // heavy footfall: a low thump, a gritty scrape and a short metal clank from the joint
        this.osc('sine', 72, 30, t, 0.26, 0.7, out);
        this.osc('triangle', 150, 60, t, 0.12, 0.2, out);
        this.noiseBurst(t, 0.16, 0.3, out, { type: 'lowpass', f0: 600, f1: 140 });
        this.osc('square', 420, 300, t + 0.01, 0.05, 0.035, out);
        // hydraulics: a hiss and, now and then, a servo whine as the knee reloads
        this.noiseBurst(t + 0.03, 0.12, 0.05, out, { type: 'highpass', f0: 5000 });
        if (Math.random() < 0.45) this.osc('triangle', 260, 540, t + 0.05, 0.14, 0.035, out, { a: 0.03 });
        break;
      case 'jet':
        this.noiseBurst(t, 0.42, 0.32, out, { type: 'bandpass', f0: 900, f1: 1500, q: 0.9, a: 0.05 });
        this.noiseBurst(t, 0.42, 0.28, out, { type: 'lowpass', f0: 320, q: 1, a: 0.05 });
        break;
      case 'skid':
        this.noiseBurst(t, 0.45, 0.45, out, { type: 'bandpass', f0: 1800, f1: 400, q: 1.4 });
        this.osc('sine', 90, 40, t, 0.3, 0.4, out);
        break;
      case 'capture':
        [392, 523, 659, 784].forEach((f, i) => this.osc('square', f, f, t + i * 0.09, 0.3, 0.09, out));
        this.osc('sawtooth', 196, 196, t, 0.7, 0.08, out, { a: 0.02 });
        break;
      case 'land':
        this.osc('sine', 90, 30, t, 0.35, 0.8, out);
        this.noiseBurst(t, 0.3, 0.4, out, { type: 'lowpass', f0: 700, f1: 120 });
        this.osc('triangle', 260, 170, t + 0.02, 0.12, 0.12, out);
        this.noiseBurst(t + 0.05, 0.2, 0.06, out, { type: 'highpass', f0: 4500 });
        break;
      case 'slam':
        this.osc('sine', 110, 28, t, 0.55, 0.9, out);
        this.noiseBurst(t, 0.5, 0.7, out, { type: 'lowpass', f0: 1800, f1: 100 });
        this.noiseBurst(t, 0.06, 0.4, out, { type: 'highpass', f0: 2500 });
        this.crackle(t + 0.05, 0.4, 5, 0.18, out);
        break;
      case 'boost':
        this.noiseBurst(t, 0.45, 0.45, out, { type: 'highpass', f0: 600, f1: 2400, q: 0.7, a: 0.03 });
        this.noiseBurst(t, 0.4, 0.3, out, { type: 'lowpass', f0: 400, q: 1 });
        break;
      case 'hurt':
        // the Gundam's own armour taking a blow: a dull crunch and a ringing hull
        this.noiseBurst(t, 0.2, 0.55, out, { type: 'bandpass', f0: 1100, q: 1.2 });
        for (const [f, v] of [[420, 0.13], [1130, 0.08], [2210, 0.045]]) this.osc('sine', f, f * 0.96, t, 0.35, v, out);
        this.osc('square', 200, 80, t, 0.12, 0.12, out);
        this.osc('sine', 110, 45, t, 0.25, 0.55, out);
        break;
      case 'eye':
        // a Zaku's mono-eye swinging onto you: "pyuiin"
        this.osc('sine', 900, 2500, t, 0.16, 0.16, out, { a: 0.01 });
        this.osc('sine', 2500, 2350, t + 0.15, 0.32, 0.09, out);
        this.osc('triangle', 1800, 2200, t, 0.14, 0.05, out);
        break;
      case 'lowhp':
        // cockpit warning
        this.osc('square', 1320, 1320, t, 0.07, 0.05, out);
        this.osc('square', 990, 990, t + 0.12, 0.07, 0.05, out);
        break;
      case 'distant':
        // far-off fighting elsewhere in the colony
        this.noiseBurst(t, 1.8, 0.8, out, { type: 'lowpass', f0: 420 * p, f1: 60, q: 0.6 });
        this.osc('sine', 48 * p, 24, t, 1.3, 0.6, out);
        break;
      case 'clang':
        this.osc('triangle', 980, 940, t, 0.4, 0.3, out);
        this.osc('triangle', 1470, 1400, t, 0.3, 0.2, out);
        this.noiseBurst(t, 0.05, 0.4, out, { type: 'highpass', f0: 3000 });
        break;
      case 'charge':
        this.osc('sawtooth', 200, 800, t, 0.12, 0.1, out);
        break;
      case 'sp': {
        const notes = [220, 277, 330, 440, 554, 659];
        notes.forEach((f, i) => this.osc('sawtooth', f, f * 1.01, t + i * 0.05, 0.9, 0.09, out, { a: 0.02 }));
        this.noiseBurst(t, 1.0, 0.5, out, { type: 'bandpass', f0: 400, f1: 6000, q: 0.8, a: 0.3 });
        this.osc('sine', 55, 110, t, 1.0, 0.5, out);
        break;
      }
      case 'pickup':
        [660, 880, 1320].forEach((f, i) => this.osc('square', f, f, t + i * 0.06, 0.12, 0.12, out));
        break;
      case 'ui':
        this.osc('square', 880, 880, t, 0.05, 0.08, out);
        break;
      case 'alarm':
        for (let i = 0; i < 3; i++) {
          this.osc('square', 880, 880, t + i * 0.3, 0.12, 0.12, out);
          this.osc('square', 660, 660, t + i * 0.3 + 0.14, 0.12, 0.12, out);
        }
        break;
      case 'victory':
        [523, 659, 784, 1047].forEach((f, i) => this.osc('square', f, f, t + i * 0.12, 0.5, 0.1, out));
        break;
    }
  }

  // ---------- music ----------
  playMusic(name) {
    if (!this.ctx || this.current === name) return;
    this.current = name;
    this.score.play(name);
  }

  stopMusic() {
    this.current = null;
    this.score?.stop();
  }

  duckMusic(depth, hold) {
    this.score?.duck(depth, hold);
  }

  stinger(name) {
    if (!this.ctx) return;
    this.current = null;
    if (name === 'victory') this.score.victory();
    else this.score.defeat();
  }
}
