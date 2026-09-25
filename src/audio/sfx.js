// Offline-rendered sound bank. Every effect is synthesized once per variant at load (OfflineAudioContext), then
// played back as samples: each trigger gets a different take instead of the same synth patch, and the takes can
// afford layers that would be too costly live (saturation, metal resonance banks, debris crackle, pan sweeps).
// Voice: heavy mech. Transients, a saturated body, ringing armour and a sub push under everything that hits.
import { mulberry32 } from '../core/util.js';

let NOISE = null;
function noiseBuffer(rate) {
  if (NOISE && NOISE.sampleRate === rate) return NOISE;
  const len = rate * 2;
  NOISE = new AudioBuffer({ length: len, sampleRate: rate, numberOfChannels: 1 });
  const d = NOISE.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return NOISE;
}
const curves = new Map();
function driveCurve(k) {
  if (!curves.has(k)) {
    const c = new Float32Array(2048), n = Math.tanh(k);
    for (let i = 0; i < 2048; i++) c[i] = Math.tanh(k * ((i / 2047) * 2 - 1)) / n;
    curves.set(k, c);
  }
  return curves.get(k);
}

class Synth {
  constructor(ctx, seed) {
    this.ctx = ctx;
    this.rnd = mulberry32(seed);
    this.noiseBuf = noiseBuffer(ctx.sampleRate);
    this.out = ctx.destination;
    // every take is tuned a little differently, so even the tonal layers never line up twice
    this.tune = this.r(0.88, 1.12);
  }
  r(a, b) { return a + (b - a) * this.rnd(); }

  // A gain stage feeding optional saturation and a (swept) stereo position into dest.
  bus({ dest = this.out, drive = 0, pan = null, panAt = null, gain = 1 } = {}) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.value = gain;
    let node = g;
    if (drive) {
      const ws = ctx.createWaveShaper();
      ws.curve = driveCurve(drive);
      ws.oversample = '2x';
      node.connect(ws);
      node = ws;
    }
    if (pan !== null) {
      const p = ctx.createStereoPanner();
      if (Array.isArray(pan)) {
        p.pan.setValueAtTime(pan[0], 0);
        for (let i = 1; i < pan.length; i++) p.pan.linearRampToValueAtTime(pan[i], panAt[i - 1]);
      } else p.pan.value = pan;
      node.connect(p);
      node = p;
    }
    node.connect(dest);
    return g;
  }
  filter(type, f, q = 1, dest = this.out) {
    const b = this.ctx.createBiquadFilter();
    b.type = type;
    b.frequency.value = f;
    b.Q.value = q;
    b.connect(dest);
    return b;
  }
  env(param, t, a, peak, dur, hold = 0) {
    param.setValueAtTime(0.0001, t);
    param.exponentialRampToValueAtTime(peak, t + a);
    if (hold) param.setValueAtTime(peak, t + a + hold);
    param.exponentialRampToValueAtTime(0.0001, t + a + hold + dur);
  }
  tone(type, f0, f1, t, dur, vol, { a = 0.004, hold = 0, dest = this.out, detune = 0, glide = null } = {}) {
    const o = this.ctx.createOscillator();
    o.type = type;
    f0 *= this.tune;
    f1 *= this.tune;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + (glide ?? a + hold + dur));
    o.detune.value = detune;
    const g = this.ctx.createGain();
    this.env(g.gain, t, a, vol, dur, hold);
    o.connect(g).connect(dest);
    o.start(t);
    o.stop(t + a + hold + dur + 0.02);
  }
  // Filtered noise; the filter can sweep f0 -> fm (at t + tm) -> f1.
  noise(t, dur, vol, { type = 'lowpass', f0 = 2000, f1 = f0, fm = null, tm = 0.05, q = 0.8, a = 0.003, hold = 0, dest = this.out } = {}) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f0 *= this.tune;
    f1 *= this.tune;
    if (fm) fm *= this.tune;
    f.frequency.setValueAtTime(f0, t);
    const end = t + a + hold + dur;
    if (fm) {
      f.frequency.exponentialRampToValueAtTime(fm, t + tm);
      f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), end);
    } else if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), end);
    const g = ctx.createGain();
    this.env(g.gain, t, a, vol, dur, hold);
    s.connect(f).connect(g).connect(dest);
    s.start(t, this.r(0, 1.9));
    s.stop(end + 0.02);
  }
  click(t, vol, dest = this.out) {
    this.noise(t, 0.007, vol, { type: 'highpass', f0: 1200, a: 0.0005, dest });
  }
  // Struck metal: noise ringing through narrow resonances at inharmonic ratios.
  metal(t, base, dur, vol, { n = 5, q = 28, dest = this.out } = {}) {
    const R = [1, 1.593, 2.136, 2.296, 2.653, 2.918, 3.598, 4.06];
    for (let i = 0; i < n; i++) {
      const f = base * R[i] * this.r(0.97, 1.03);
      this.noise(t, (dur * this.r(0.6, 1.1)) / (1 + i * 0.15), (vol * this.r(0.5, 1)) / (1 + i * 0.25), { type: 'bandpass', f0: f, q, a: 0.001, dest });
    }
  }
  // Scattered ticks: plasma crackle, falling debris.
  crackle(t, span, n, vol, { f0 = 1500, f1 = 5000, dest = this.out } = {}) {
    for (let i = 0; i < n; i++) {
      const tt = t + this.rnd() * this.rnd() * span;
      this.noise(tt, this.r(0.008, 0.035), vol * this.r(0.4, 1), { type: 'bandpass', f0: this.r(f0, f1), q: 1.6, a: 0.0008, dest });
    }
  }
  // FM whine: servos, charging capacitors.
  fm(fc0, fc1, ratio, index, t, dur, vol, { dest = this.out, a = 0.01 } = {}) {
    const ctx = this.ctx;
    const c = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain();
    fc0 *= this.tune;
    fc1 *= this.tune;
    c.frequency.setValueAtTime(fc0, t);
    c.frequency.exponentialRampToValueAtTime(fc1, t + a + dur);
    m.frequency.setValueAtTime(fc0 * ratio, t);
    m.frequency.exponentialRampToValueAtTime(fc1 * ratio, t + a + dur);
    mg.gain.value = fc0 * index;
    m.connect(mg).connect(c.frequency);
    const g = ctx.createGain();
    this.env(g.gain, t, a, vol, dur);
    c.connect(g).connect(dest);
    c.start(t);
    m.start(t);
    c.stop(t + a + dur + 0.02);
    m.stop(t + a + dur + 0.02);
  }
}

// ---------------------------------------------------------------- beam saber
// Ignition snap, a saturated "vwom" of detuned saws through a resonant filter that opens and closes with the
// blade, the air it cuts, plasma crackle, and for heavy swings a sub push. The stereo position follows the arc.
function blade(o) {
  return (s, v) => {
    const t0 = 0.005;
    const pan = o.pan === 'alt' ? (v % 2 ? [0.5, -0.5] : [-0.5, 0.5]) : o.pan;
    const main = s.bus({ pan, panAt: o.panAt || [o.dur * 0.6] });
    const heavy = o.heavy || 0;
    const base = o.base * s.r(0.92, 1.08);
    s.click(t0, 0.45, main);
    s.noise(t0, 0.035, 0.3, { type: 'highpass', f0: 5000, dest: main });
    // saturate first, then sweep: the resonant filter opening and closing on the driven saws is the "vwom"
    const lp = s.filter('lowpass', 260, o.q || 7, main);
    const hot = s.bus({ dest: lp, drive: 2.5 + heavy * 3, gain: 0.8 });
    const peakT = t0 + (o.peak || 0.07) * s.r(0.85, 1.15);
    lp.frequency.setValueAtTime(260, t0);
    lp.frequency.exponentialRampToValueAtTime((o.bright || 2600) * s.r(0.85, 1.15), peakT);
    lp.frequency.exponentialRampToValueAtTime(300, t0 + o.dur * 0.85);
    for (const det of [-10, 0, 12]) s.tone('sawtooth', base * 1.35, base * 0.7, t0, o.dur * 0.8, 0.2, { dest: hot, detune: det + s.r(-5, 5), a: 0.015 });
    s.tone('square', base * 0.6, base * 0.38, t0, o.dur * 0.6, 0.12, { dest: hot, a: 0.015 });
    s.noise(t0, o.dur * 0.55, 0.5 * (o.air ?? 1), { type: 'bandpass', f0: 600, fm: (o.airTop || 3400) * s.r(0.85, 1.15), tm: o.peak || 0.07, f1: 800, q: 1.2, a: 0.02, dest: main });
    s.crackle(t0 + 0.02, o.dur * 0.55, 5 + Math.round(heavy * 6), 0.16, { f0: 3500, f1: 9000, dest: main });
    if (heavy) {
      s.tone('sine', 130, 40, t0 + 0.02, 0.25 + heavy * 0.25, 0.35 + heavy * 0.45, { dest: main, a: 0.01 });
      s.noise(t0 + 0.02, 0.25 + heavy * 0.2, 0.3 * heavy, { type: 'lowpass', f0: 500, f1: 120, dest: main, a: 0.01 });
    }
  };
}

// Straight thrust: a metallic "shink" riding a short energy stab and a forward push.
function thrust(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 4 });
  s.click(0.005, 0.7, main);
  s.noise(0.005, 0.13, 0.6, { type: 'bandpass', f0: 2200 * s.r(0.9, 1.1), f1: 7500, q: 6, dest: hot, a: 0.004 });
  s.noise(0.005, 0.3, 0.45, { type: 'bandpass', f0: 900, fm: 2800, tm: 0.05, f1: 700, q: 1.2, dest: main, a: 0.01 });
  const lp = s.filter('lowpass', 1800, 5, main);
  lp.frequency.setValueAtTime(2200, 0.005);
  lp.frequency.exponentialRampToValueAtTime(300, 0.35);
  const stab = s.bus({ dest: lp, drive: 3 });
  for (const d of [-8, 9]) s.tone('sawtooth', 130 * s.r(0.92, 1.08), 70, 0.005, 0.3, 0.2, { dest: stab, detune: d });
  s.tone('sine', 150, 48, 0.01, 0.24, 0.55, { dest: main });
  s.crackle(0.03, 0.3, 6, 0.15, { f0: 4000, f1: 9000, dest: main });
}

// Rising cut (launcher, jump slash wind-up): the blade charges as it climbs, then tears upward.
function rise(s) {
  const main = s.bus({ pan: [0.3, -0.3], panAt: [0.4] });
  const lp = s.filter('lowpass', 300, 6, main);
  const hot = s.bus({ dest: lp, drive: 3 });
  lp.frequency.setValueAtTime(300, 0);
  lp.frequency.exponentialRampToValueAtTime(3200 * s.r(0.85, 1.1), 0.18);
  lp.frequency.exponentialRampToValueAtTime(400, 0.7);
  for (const d of [-10, 0, 12]) s.tone('sawtooth', 50, 170 * s.r(0.9, 1.1), 0.005, 0.45, 0.2, { dest: hot, detune: d, glide: 0.18, a: 0.03 });
  s.noise(0.01, 0.45, 0.55, { type: 'bandpass', f0: 400, fm: 4000, tm: 0.16, f1: 1200, q: 1.1, dest: main, a: 0.05 });
  s.click(0.14, 0.4, main);
  s.tone('sine', 60, 110, 0, 0.3, 0.35, { dest: main, a: 0.05 });
  s.crackle(0.1, 0.45, 8, 0.16, { f0: 3500, f1: 9000, dest: main });
}

// Whirlwind: one continuous voice for the whole spin, with blade passes circling the listener and a closing cut.
// Pass spacing matches the move's hits at the hero's attack rate (0.14 s of move time / 0.86).
const WHIRL_STEP = 0.163, WHIRL_END = 1.08;
function whirl(s) {
  const ctx = s.ctx;
  const pans = [], at = [];
  for (let i = 0; i < 7; i++) { pans.push(i % 2 ? 0.7 : -0.7); at.push(0.12 + i * WHIRL_STEP); }
  const main = s.bus({ pan: [0, ...pans, 0], panAt: [...at, WHIRL_END + 0.1] });
  const lp = s.filter('lowpass', 1300, 6, main);
  const hot = s.bus({ dest: lp, drive: 3 });
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 1 / WHIRL_STEP;
  const lg = ctx.createGain();
  lg.gain.value = 1000;
  lfo.connect(lg).connect(lp.frequency);
  lfo.start(0);
  lfo.stop(WHIRL_END + 0.3);
  for (const d of [-10, 0, 12]) s.tone('sawtooth', 72, 62, 0.01, 0.25, 0.16, { dest: hot, detune: d, a: 0.06, hold: WHIRL_END - 0.1 });
  for (let i = 0; i < 6; i++) s.noise(0.1 + i * WHIRL_STEP, 0.13, 0.42 * s.r(0.8, 1.1), { type: 'bandpass', f0: 700, fm: 3200 * s.r(0.85, 1.15), tm: 0.05, f1: 900, q: 1.3, dest: main, a: 0.01 });
  s.crackle(0.05, WHIRL_END, 18, 0.14, { f0: 3500, f1: 9000, dest: main });
  s.noise(WHIRL_END, 0.35, 0.6, { type: 'bandpass', f0: 500, fm: 2600, tm: 0.06, f1: 600, q: 1, dest: main, a: 0.01 });
  s.tone('sine', 120, 38, WHIRL_END + 0.01, 0.35, 0.6, { dest: main });
  s.click(WHIRL_END, 0.5, main);
}

// Laser blade ignition.
function ignite(s) {
  const main = s.bus();
  const lp = s.filter('lowpass', 200, 5, main);
  const hot = s.bus({ dest: lp, drive: 3 });
  lp.frequency.setValueAtTime(200, 0);
  lp.frequency.exponentialRampToValueAtTime(3000, 0.12);
  lp.frequency.exponentialRampToValueAtTime(600, 0.5);
  for (const d of [-9, 0, 11]) s.tone('sawtooth', 40, 140, 0.005, 0.45, 0.2, { dest: hot, detune: d, glide: 0.15, a: 0.02 });
  s.noise(0.005, 0.25, 0.35, { type: 'bandpass', f0: 800, fm: 5000, tm: 0.1, f1: 2000, q: 2, dest: main });
  s.crackle(0.02, 0.35, 8, 0.15, { f0: 3500, f1: 9000, dest: main });
  s.click(0.005, 0.4, main);
}

// ---------------------------------------------------------------- impacts
// Beam saber through Zaku armour.
function hit(s) {
  const main = s.bus({ pan: s.r(-0.15, 0.15) });
  const crunch = s.bus({ dest: main, drive: 5, gain: 0.7 });
  s.click(0, 0.9, main);
  s.tone('square', 110 * s.r(0.9, 1.1), 42, 0, 0.1, 0.6, { dest: crunch });
  s.noise(0, 0.07, 0.8, { type: 'lowpass', f0: 3000, f1: 400, dest: crunch });
  s.metal(0.002, s.r(380, 620), 0.28, 0.9, { n: 5, q: 28, dest: main });
  s.noise(0.01, 0.2, 0.45, { type: 'bandpass', f0: 4200, f1: 2000, q: 2.2, dest: main });
  s.crackle(0.02, 0.3, 7, 0.2, { f0: 3000, f1: 8000, dest: main });
  s.tone('sine', 75, 35, 0, 0.22, 0.9, { dest: main });
}

// Finishers and commander hits: the same, bigger, with armour plates shearing off.
function hitHeavy(s) {
  const main = s.bus({ pan: s.r(-0.1, 0.1) });
  const crunch = s.bus({ dest: main, drive: 6, gain: 0.8 });
  s.click(0, 1, main);
  s.tone('square', 85 * s.r(0.9, 1.1), 30, 0, 0.16, 0.7, { dest: crunch });
  s.noise(0, 0.25, 0.9, { type: 'lowpass', f0: 2400, f1: 200, dest: crunch });
  s.metal(0.003, s.r(220, 360), 0.6, 1, { n: 6, q: 24, dest: main });
  s.noise(0.01, 0.3, 0.45, { type: 'bandpass', f0: 3800, f1: 1500, q: 2, dest: main });
  s.tone('sine', 62, 26, 0, 0.5, 1, { dest: main });
  s.noise(0.05, 0.7, 0.4, { type: 'lowpass', f0: 600, f1: 80, dest: main, a: 0.02 });
  s.crackle(0.05, 0.8, 12, 0.28, { f0: 600, f1: 3000, dest: main });
}

// The Gundam's own hull taking a blow: lower, heavier, and a jolt through the cockpit.
function hurt(s) {
  const main = s.bus();
  const crunch = s.bus({ dest: main, drive: 5, gain: 0.8 });
  s.click(0, 0.9, main);
  s.tone('square', 90 * s.r(0.9, 1.1), 35, 0, 0.14, 0.6, { dest: crunch });
  s.noise(0, 0.12, 0.8, { type: 'lowpass', f0: 2500, f1: 300, dest: crunch });
  s.metal(0.002, s.r(170, 260), 0.55, 1, { n: 6, q: 22, dest: main });
  s.tone('sine', 55, 25, 0, 0.4, 1, { dest: main });
  s.tone('square', 60, 58, 0.03, 0.12, 0.07, { dest: main });
  s.noise(0.03, 0.1, 0.15, { type: 'highpass', f0: 5000, dest: main });
  s.crackle(0.03, 0.4, 7, 0.22, { f0: 500, f1: 2500, dest: main });
}

// Machine-gun rounds pinging off the armour: small, bright, and not in the way of the real blows.
function ping(s) {
  const main = s.bus({ pan: s.r(-0.4, 0.4) });
  s.click(0, 0.7, main);
  s.metal(0.001, s.r(900, 1500), 0.18, 0.7, { n: 4, q: 35, dest: main });
  s.tone('sine', 220, 90, 0, 0.06, 0.4, { dest: main });
  s.noise(0, 0.04, 0.3, { type: 'bandpass', f0: 3000, q: 1, dest: main });
}

// Heat hawk glancing off a raised guard.
function clang(s) {
  const main = s.bus({ pan: s.r(-0.2, 0.2) });
  s.click(0, 0.9, main);
  s.metal(0.001, s.r(700, 1000), 0.6, 1, { n: 6, q: 45, dest: main });
  s.noise(0, 0.06, 0.5, { type: 'highpass', f0: 3000, dest: main });
  s.crackle(0.01, 0.2, 6, 0.2, { f0: 4000, f1: 9000, dest: main });
  s.tone('sine', 140, 70, 0, 0.12, 0.45, { dest: main });
}

// A mobile suit's weight hitting the ground: slams, commander landings, pod drops.
function slam(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 3 });
  s.click(0, 1, main);
  s.noise(0, 0.05, 0.7, { type: 'highpass', f0: 2500, dest: main });
  s.tone('sine', 72, 22, 0, 0.9, 1, { dest: hot });
  s.noise(0, 0.9, 0.9, { type: 'lowpass', f0: 1200, f1: 80, dest: hot, a: 0.005 });
  s.metal(0.01, s.r(130, 180), 0.3, 0.4, { n: 4, q: 18, dest: main });
  s.crackle(0.05, 1.0, 16, 0.28, { f0: 400, f1: 2500, dest: main });
  s.noise(0.1, 0.9, 0.35, { type: 'lowpass', f0: 180, dest: main, a: 0.1, hold: 0.3 });
}

// Zaku going up: crack, saturated fireball, sub thump, debris raining back down, a few metal clinks.
function boom(s) {
  const main = s.bus({ pan: s.r(-0.2, 0.2) });
  const hot = s.bus({ dest: main, drive: 3 });
  s.click(0, 0.9, main);
  s.noise(0, 0.05, 0.8, { type: 'highpass', f0: 2500, dest: main });
  s.noise(0, 0.9, 1, { type: 'lowpass', f0: 2200 * s.r(0.8, 1.2), f1: 120, dest: hot, a: 0.004 });
  s.noise(0.02, 0.6, 0.5, { type: 'bandpass', f0: 400, f1: 150, q: 0.8, dest: hot });
  s.tone('sine', 70 * s.r(0.85, 1.15), 24, 0, 0.8, 1, { dest: main });
  s.crackle(0.06, 0.9, 12, 0.3, { f0: 800, f1: 4000, dest: main });
  for (let i = 0; i < 3; i++) s.metal(s.r(0.2, 0.9), s.r(1500, 2500), 0.08, 0.12, { n: 3, q: 40, dest: main });
  s.noise(0.15, 0.8, 0.3, { type: 'lowpass', f0: 300, dest: main, a: 0.1, hold: 0.3 });
}

function bigboom(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 3.5 });
  s.click(0, 1, main);
  s.noise(0, 0.06, 0.8, { type: 'highpass', f0: 2000, dest: main });
  s.noise(0, 1.4, 1, { type: 'lowpass', f0: 2400, f1: 70, dest: hot, a: 0.004 });
  s.noise(0.12, 1.2, 0.7, { type: 'lowpass', f0: 1400, f1: 60, dest: hot, a: 0.01 });
  s.tone('sine', 55, 18, 0, 1.5, 1, { dest: main });
  s.tone('triangle', 130, 38, 0, 0.8, 0.35, { dest: main });
  s.crackle(0.08, 2, 26, 0.3, { f0: 600, f1: 4000, dest: main });
  for (let i = 0; i < 5; i++) s.metal(s.r(0.3, 1.6), s.r(1200, 2400), 0.1, 0.12, { n: 3, q: 40, dest: main });
  s.noise(0.2, 1.8, 0.4, { type: 'lowpass', f0: 220, dest: main, a: 0.15, hold: 0.4 });
}

// ---------------------------------------------------------------- weapons
// Beam rifle: a hard crack, a saturated zap that falls away, a recoil punch and electric crackle trailing off.
function rifle(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 4, gain: 0.8 });
  s.click(0, 0.8, main);
  s.tone('sawtooth', 2200 * s.r(0.9, 1.1), 180, 0, 0.2, 0.35, { dest: hot, glide: 0.18 });
  s.tone('sine', 900, 120, 0, 0.3, 0.3, { dest: main });
  s.noise(0, 0.05, 0.6, { type: 'highpass', f0: 3000, dest: main });
  s.noise(0, 0.4, 0.5, { type: 'bandpass', f0: 3000, f1: 500, q: 1, dest: main });
  s.tone('sine', 130, 40, 0, 0.3, 0.85, { dest: main });
  s.crackle(0.08, 0.55, 10, 0.18, { f0: 3000, f1: 9000, dest: main });
}

function mega(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 4, gain: 0.8 });
  s.click(0, 1, main);
  for (let i = 0; i < 3; i++) s.tone('sawtooth', 420 + i * 7, 60, 0, 1.2, 0.22, { dest: hot, detune: i * 12, a: 0.01 });
  s.noise(0, 1.2, 0.7, { type: 'bandpass', f0: 3000, f1: 300, q: 0.8, dest: hot });
  s.tone('sine', 55, 24, 0, 1.2, 1, { dest: main });
  s.tone('sine', 3200, 500, 0, 0.3, 0.2, { dest: main });
  s.crackle(0.05, 1.4, 24, 0.2, { f0: 3000, f1: 9000, dest: main });
}

// Zaku 120mm machine gun.
function mg(s) {
  const main = s.bus({ pan: s.r(-0.1, 0.1) });
  const hot = s.bus({ dest: main, drive: 4 });
  s.click(0, 0.8, main);
  s.noise(0, 0.03, 0.8, { type: 'highpass', f0: 2500, dest: main });
  s.tone('sine', 140 * s.r(0.9, 1.1), 50, 0, 0.1, 0.8, { dest: hot });
  s.noise(0, 0.12, 0.6, { type: 'lowpass', f0: 2500, f1: 300, dest: hot });
  s.noise(0.02, 0.2, 0.15, { type: 'bandpass', f0: 800, dest: main });
}

// Heat hawk swing: a heavy whoosh around a hot, rumbling blade.
function hawk(s) {
  const main = s.bus({ pan: [0.3, -0.3], panAt: [0.3] });
  const hot = s.bus({ dest: main, drive: 3 });
  s.noise(0, 0.35, 0.65, { type: 'bandpass', f0: 400, fm: 1800 * s.r(0.85, 1.15), tm: 0.08, f1: 500, q: 1.1, a: 0.02, dest: main });
  s.noise(0, 0.3, 0.3, { type: 'lowpass', f0: 900, f1: 300, dest: hot, a: 0.03 });
  s.tone('sawtooth', 55, 45, 0, 0.3, 0.08, { dest: s.filter('lowpass', 400, 2, main), a: 0.03 });
  s.crackle(0.03, 0.3, 4, 0.1, { f0: 2000, f1: 5000, dest: main });
}

// ---------------------------------------------------------------- movement
// Footfall: sub thump, a knock of steel on concrete, a clank from the leg, crumbling ground, hydraulics and a servo.
function step(s, v) {
  const main = s.bus({ pan: v % 2 ? 0.12 : -0.12 });
  const hot = s.bus({ dest: main, drive: 2.5 });
  s.tone('sine', 62 * s.r(0.92, 1.08), 26, 0, 0.32, 1, { dest: main });
  s.noise(0, 0.09, 0.7, { type: 'bandpass', f0: 260 * s.r(0.85, 1.15), q: 1.2, dest: hot });
  s.metal(0.004, s.r(150, 220), 0.16, 0.35, { n: 4, q: 18, dest: main });
  s.crackle(0.02, 0.25, 4, 0.2, { f0: 300, f1: 1200, dest: main });
  s.noise(0.07, 0.16, 0.12, { type: 'highpass', f0: 4500, a: 0.02, dest: main });
  if (s.rnd() < 0.5) s.fm(280, 520, 0.5, 1.2, 0.08, 0.16, 0.06, { dest: main });
}

// Landing: the suspension takes the whole weight, then vents.
function land(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 3 });
  s.click(0, 0.8, main);
  s.tone('sine', 58, 22, 0, 0.5, 1, { dest: main });
  s.noise(0, 0.14, 0.8, { type: 'bandpass', f0: 220, q: 1, dest: hot });
  s.metal(0.005, s.r(120, 170), 0.3, 0.45, { n: 5, q: 18, dest: main });
  s.crackle(0.02, 0.45, 8, 0.24, { f0: 300, f1: 1500, dest: main });
  s.fm(200, 600, 0.5, 1, 0.1, 0.25, 0.07, { dest: main });
  s.noise(0.12, 0.35, 0.15, { type: 'highpass', f0: 4000, a: 0.03, dest: main });
}

// Quick boost ignition: a valve slams open, the exhaust detonates and roars off.
function qb(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 4 });
  s.click(0, 0.7, main);
  s.tone('square', 70, 35, 0, 0.08, 0.5, { dest: hot });
  s.noise(0, 0.35, 0.9, { type: 'lowpass', f0: 5000, f1: 500, dest: hot, a: 0.004 });
  s.noise(0.01, 0.5, 0.55, { type: 'bandpass', f0: 500, fm: 1800 * s.r(0.85, 1.15), tm: 0.08, f1: 700, q: 0.9, dest: main, a: 0.01 });
  s.tone('sine', 90, 35, 0, 0.3, 0.8, { dest: main });
  s.noise(0.1, 0.4, 0.12, { type: 'highpass', f0: 3500, dest: main, a: 0.05 });
  s.crackle(0.05, 0.4, 6, 0.15, { f0: 2000, f1: 6000, dest: main });
}

// Cutting a boost: feet grinding along the concrete.
function skid(s) {
  const main = s.bus();
  s.noise(0, 0.3, 0.4, { type: 'bandpass', f0: 1400, q: 3, dest: main, hold: 0.25, a: 0.02 });
  s.noise(0, 0.3, 0.3, { type: 'bandpass', f0: 2600, f1: 1800, q: 6, dest: main, hold: 0.2, a: 0.02 });
  s.noise(0, 0.3, 0.5, { type: 'lowpass', f0: 150, dest: main, hold: 0.25, a: 0.02 });
  s.metal(0.02, 900, 0.4, 0.2, { n: 3, q: 10, dest: main });
  s.crackle(0.02, 0.5, 10, 0.15, { f0: 500, f1: 2500, dest: main });
}

// name: { n: takes, dur: seconds, level: normalized peak, build(synth, takeIndex) }
export const RECIPES = {
  slash_a: { n: 5, dur: 0.55, build: blade({ dur: 0.45, base: 82, pan: [-0.55, 0.55], heavy: 0.15 }) },
  slash_b: { n: 5, dur: 0.55, build: blade({ dur: 0.45, base: 74, pan: [0.55, -0.55], heavy: 0.2, airTop: 3000 }) },
  slash_h: { n: 4, dur: 0.8, build: blade({ dur: 0.62, base: 58, pan: [0.25, -0.15], heavy: 0.85, peak: 0.09, bright: 2200, airTop: 2600 }) },
  slash_spin: { n: 3, dur: 0.8, build: blade({ dur: 0.62, base: 66, pan: [-0.7, 0.7, -0.4], panAt: [0.2, 0.45], heavy: 0.4, peak: 0.16, bright: 2400 }) },
  slash_down: { n: 3, dur: 0.9, build: blade({ dur: 0.7, base: 50, pan: [0, 0], heavy: 1, peak: 0.1, bright: 2000, airTop: 2200 }) },
  slash_dash: { n: 3, dur: 0.6, build: blade({ dur: 0.5, base: 68, pan: [0.5, -0.6], heavy: 0.5, bright: 3000 }) },
  slash_fast: { n: 6, dur: 0.35, level: 0.7, build: blade({ dur: 0.26, base: 96, pan: 'alt' }) },
  slash_thrust: { n: 4, dur: 0.55, build: thrust },
  slash_rise: { n: 3, dur: 0.8, build: rise },
  whirl: { n: 2, dur: 1.6, level: 0.6, build: whirl },
  ignite: { n: 3, dur: 0.6, level: 0.6, build: ignite },
  hit: { n: 6, dur: 0.6, build: hit },
  hit_heavy: { n: 4, dur: 1.2, build: hitHeavy },
  hurt: { n: 4, dur: 0.9, build: hurt },
  ping: { n: 5, dur: 0.3, level: 0.6, build: ping },
  clang: { n: 3, dur: 0.8, build: clang },
  slam: { n: 3, dur: 1.6, level: 1, build: slam },
  boom: { n: 5, dur: 1.8, level: 1, build: boom },
  bigboom: { n: 2, dur: 3, level: 1, build: bigboom },
  rifle: { n: 3, dur: 1, level: 0.95, build: rifle },
  mega: { n: 1, dur: 1.9, build: mega },
  mg: { n: 4, dur: 0.35, level: 0.5, build: mg },
  hawk: { n: 3, dur: 0.55, level: 0.55, build: hawk },
  step: { n: 6, dur: 0.6, level: 0.75, build: step },
  land: { n: 3, dur: 1, build: land },
  qb: { n: 4, dur: 0.9, build: qb },
  skid: { n: 2, dur: 0.8, level: 0.6, build: skid },
};

const hashName = (s) => { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };

async function renderOne(name, R, v, rate) {
  const ctx = new OfflineAudioContext({ numberOfChannels: 2, length: Math.ceil(R.dur * rate), sampleRate: rate });
  R.build(new Synth(ctx, hashName(name) + v * 7919), v);
  const buf = await ctx.startRendering();
  // normalise each take to the recipe's peak so takes sit at a consistent level
  let peak = 0;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; }
  }
  const k = peak > 0 ? (R.level ?? 0.85) / peak : 1;
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }
  return buf;
}

// Render every take; resolves to { name: AudioBuffer[] }. A few at a time to keep the load light.
export async function renderBank(rate = 48000) {
  const bank = {};
  const jobs = [];
  for (const [name, R] of Object.entries(RECIPES)) for (let v = 0; v < R.n; v++) jobs.push([name, R, v]);
  for (let i = 0; i < jobs.length; i += 8) {
    const done = await Promise.all(jobs.slice(i, i + 8).map(([name, R, v]) => renderOne(name, R, v, rate).then((b) => [name, b])));
    for (const [name, b] of done) (bank[name] = bank[name] || []).push(b);
  }
  return bank;
}
