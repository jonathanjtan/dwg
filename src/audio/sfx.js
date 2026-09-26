// Offline-rendered sound bank. Every effect is synthesized once per variant at load (OfflineAudioContext), then
// played back as samples: each trigger gets a different take instead of the same synth patch, and the takes can
// afford layers that would be too costly live (saturation, metal resonance banks, debris crackle, pan sweeps).
// Voice: after Dynasty Warriors: Gundam. Measured off gameplay audio, its effects sit in a 150-500 Hz body and a
// 1.5-3.5 kHz bite with little air above 6 kHz; beam weapons buzz around 160 Hz, and saber hits ring at inharmonic
// partials between 0.7 and 1.15 kHz. So: buzzy beams, crunchy mids, ringing armour, and less sub than a mech sim.
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
  // Ringing partials at explicit frequencies (the armour ring measured off DW:Gundam hits), each decaying on its own.
  bell(t, freqs, dur, vol, { dest = this.out, spread = 0.03 } = {}) {
    freqs.forEach((f, i) => {
      const ff = f * this.r(1 - spread, 1 + spread);
      this.tone('sine', ff, ff * 0.985, t, (dur * this.r(0.7, 1.1)) / (1 + i * 0.12), (vol * this.r(0.6, 1)) / (1 + i * 0.2), { a: 0.002, dest });
    });
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
// A buzzing beam (saws around 160 Hz, gliding down with the swing) through a resonant band that sweeps up into the
// 1.5-3 kHz bite and back, an airy whoosh riding the same arc, a few plasma ticks, and for heavy cuts a low swell.
// The stereo position follows the arc.
const HIT_RING = [727, 888, 1003, 1080, 1141];
function blade(o) {
  return (s, v) => {
    const t0 = 0.004;
    const pan = o.pan === 'alt' ? (v % 2 ? [0.5, -0.5] : [-0.5, 0.5]) : o.pan;
    const main = s.bus({ pan, panAt: o.panAt || [o.dur * 0.6] });
    const heavy = o.heavy || 0;
    const base = (o.base || 157) * s.r(0.94, 1.06);
    const peakT = t0 + (o.peak || 0.07) * s.r(0.85, 1.15);
    s.click(t0, 0.25, main);
    // the buzz: driven saws into a sweeping band-pass
    const lo = o.lo || 700;
    const bp = s.filter('bandpass', lo, o.q || 2.2, main);
    bp.frequency.setValueAtTime(lo, t0);
    bp.frequency.exponentialRampToValueAtTime((o.bright || 2600) * s.r(0.88, 1.12), peakT);
    bp.frequency.exponentialRampToValueAtTime(o.tail || 900, t0 + o.dur * 0.8);
    const hot = s.bus({ dest: s.filter('highpass', 320, 0.7, bp), drive: 2.2 + heavy * 1.5, gain: 0.9 });
    for (const det of [-9, 0, 11]) s.tone('sawtooth', base * 1.2, base * 0.85, t0, o.dur * 0.75, 0.22, { dest: hot, detune: det + s.r(-4, 4), a: 0.012 });
    // body of the swing: the buzz an octave up, band-passed around 330 Hz (the fundamental itself stays quiet)
    const body = s.filter('bandpass', 300, 1.3, main);
    for (const det of [-6, 7]) s.tone('sawtooth', base * 2.2, base * 1.5, t0, o.dur * 0.55, 0.075 * (o.body ?? 1), { dest: body, detune: det, a: 0.02 });
    // air
    s.noise(t0, o.dur * 0.6, 0.5 * (o.air ?? 1), { type: 'bandpass', f0: o.airLo || 420, fm: (o.airTop || 2300) * s.r(0.85, 1.15), tm: o.peak || 0.07, f1: o.tail || 600, q: 1.1, a: 0.02, dest: main });
    s.noise(t0, o.dur * 0.4, 0.22 * (o.body ?? 1), { type: 'bandpass', f0: 520, q: 1.2, a: 0.02, dest: main });
    s.crackle(t0 + 0.02, o.dur * 0.5, 3 + Math.round(heavy * 4), 0.12, { f0: 1500, f1: 4200, dest: main });
    if (heavy) {
      s.tone('sine', 220, 110, t0 + 0.02, 0.2 + heavy * 0.2, 0.45 * heavy, { dest: main, a: 0.012 });
      s.noise(t0 + 0.02, 0.2 + heavy * 0.2, 0.25 * heavy, { type: 'lowpass', f0: 700, f1: 180, dest: main, a: 0.01 });
    }
  };
}

// Rising cut (launcher, jump slash wind-up): the blade charges as it climbs, then tears upward.
function rise(s) {
  const main = s.bus({ pan: [0.3, -0.3], panAt: [0.4] });
  const lp = s.filter('lowpass', 300, 6, main);
  const hot = s.bus({ dest: lp, drive: 3 });
  lp.frequency.setValueAtTime(300, 0);
  lp.frequency.exponentialRampToValueAtTime(3200 * s.r(0.85, 1.1), 0.18);
  lp.frequency.exponentialRampToValueAtTime(400, 0.7);
  for (const d of [-10, 0, 12]) s.tone('sawtooth', 110, 200 * s.r(0.9, 1.1), 0.005, 0.45, 0.2, { dest: hot, detune: d, glide: 0.18, a: 0.03 });
  s.noise(0.01, 0.45, 0.55, { type: 'bandpass', f0: 400, fm: 4000, tm: 0.16, f1: 1200, q: 1.1, dest: main, a: 0.05 });
  s.click(0.14, 0.4, main);
  s.tone('sine', 90, 160, 0, 0.3, 0.3, { dest: main, a: 0.05 });
  s.crackle(0.1, 0.45, 6, 0.14, { f0: 1600, f1: 4500, dest: main });
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
// Beam saber through Zaku armour: a driven crunch centred near 2 kHz on top, the armour ringing at the partials
// measured off the game's hits (well under the crunch), a beam sizzle, and a short body thump (mid, not sub).
function hit(s) {
  const main = s.bus({ pan: s.r(-0.15, 0.15) });
  const crunch = s.bus({ dest: main, drive: 5, gain: 0.8 });
  s.click(0, 0.6, main);
  s.noise(0, 0.15, 1.3, { type: 'bandpass', f0: 2100 * s.r(0.9, 1.1), f1: 1600, q: 1.4, dest: crunch });
  s.noise(0, 0.08, 0.35, { type: 'bandpass', f0: 550, q: 1, dest: main });
  s.noise(0, 0.1, 0.8, { type: 'bandpass', f0: 2700, q: 1.4, dest: crunch });
  s.noise(0, 0.1, 0.4, { type: 'lowpass', f0: 500, f1: 200, dest: main });
  s.tone('square', 190 * s.r(0.9, 1.1), 95, 0, 0.08, 0.25, { dest: s.filter('lowpass', 380, 0.7, main) });
  const k = s.r(0.94, 1.06);
  s.bell(0.002, HIT_RING.map((f) => f * k), 0.26, 0.022, { dest: main });
  s.noise(0.01, 0.15, 0.35, { type: 'bandpass', f0: 2800, f1: 2000, q: 1.8, dest: main });
  s.crackle(0.02, 0.2, 5, 0.14, { f0: 1500, f1: 3500, dest: main });
  s.tone('sine', 150, 70, 0, 0.12, 0.4, { dest: main });
}

// Finishers and commander hits: the same, lower and longer, with armour plates shearing off.
function hitHeavy(s) {
  const main = s.bus({ pan: s.r(-0.1, 0.1) });
  const crunch = s.bus({ dest: main, drive: 6, gain: 0.8 });
  s.click(0, 0.8, main);
  s.noise(0, 0.22, 1.3, { type: 'bandpass', f0: 1800 * s.r(0.9, 1.1), f1: 1200, q: 0.9, dest: crunch });
  s.noise(0, 0.14, 0.8, { type: 'bandpass', f0: 2600, q: 1.3, dest: crunch });
  s.noise(0, 0.26, 0.7, { type: 'lowpass', f0: 600, f1: 160, dest: main });
  s.tone('square', 130 * s.r(0.9, 1.1), 55, 0, 0.14, 0.4, { dest: s.filter('lowpass', 320, 0.7, main) });
  const k = s.r(0.78, 0.86);
  s.bell(0.003, HIT_RING.map((f) => f * k), 0.5, 0.035, { dest: main });
  s.noise(0.01, 0.3, 0.4, { type: 'bandpass', f0: 2600, f1: 1400, q: 1.6, dest: main });
  s.tone('sine', 110, 45, 0, 0.35, 0.6, { dest: main });
  s.noise(0.05, 0.6, 0.3, { type: 'lowpass', f0: 600, f1: 120, dest: main, a: 0.02 });
  s.crackle(0.05, 0.7, 10, 0.24, { f0: 900, f1: 3200, dest: main });
}

// A beam shot connecting: crunch and sizzle without the saber's armour ring.
function bhit(s) {
  const main = s.filter('lowpass', 4000, 0.7, s.bus({ pan: s.r(-0.15, 0.15) }));
  const crunch = s.bus({ dest: main, drive: 4, gain: 0.8 });
  s.click(0, 0.5, main);
  s.noise(0, 0.09, 1, { type: 'bandpass', f0: 2200 * s.r(0.9, 1.1), f1: 1500, q: 1, dest: crunch });
  s.noise(0.005, 0.18, 0.4, { type: 'bandpass', f0: 3000, f1: 1800, q: 1.6, dest: main });
  s.tone('sine', 200, 110, 0, 0.1, 0.45, { dest: main });
  s.crackle(0.02, 0.2, 4, 0.12, { f0: 1500, f1: 3500, dest: main });
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
// Beam rifle: a buzzing discharge gliding from ~185 down to ~160 Hz (the tone the game's shots carry), pushed through
// a 2.2 kHz resonance, a descending "pew" whine on top, a snap of air and a sizzle that falls away.
function rifle(s) {
  const main = s.filter('lowpass', 3800, 0.7, s.filter('lowpass', 3800, 0.7, s.bus()));
  const bp = s.filter('bandpass', 2200 * s.r(0.9, 1.1), 1.6, main);
  const hot = s.bus({ dest: bp, drive: 4, gain: 0.9 });
  for (const d of [-8, 0, 9]) s.tone('sawtooth', 185, 160, 0, 0.26, 0.28, { dest: hot, detune: d, a: 0.003 });
  const lp = s.filter('lowpass', 700, 1, main);
  for (const d of [-5, 6]) s.tone('sawtooth', 185, 160, 0, 0.2, 0.16, { dest: lp, detune: d, a: 0.003 });
  s.tone('sine', 3200 * s.r(0.92, 1.08), 1300, 0, 0.14, 0.1, { dest: main, glide: 0.12 });
  s.tone('sine', 300, 180, 0, 0.12, 0.6, { dest: main });
  s.noise(0, 0.035, 0.6, { type: 'bandpass', f0: 3000, q: 1.2, dest: main, a: 0.001 });
  s.noise(0.01, 0.4, 0.35, { type: 'bandpass', f0: 2600, f1: 1100, q: 1.4, dest: main });
  s.crackle(0.05, 0.35, 5, 0.12, { f0: 1500, f1: 4000, dest: main });
}

// Charge shot: the rifle's buzz, fatter and longer, with a growl under it and a heavy report.
function cshot(s) {
  const main = s.bus();
  const bp = s.filter('bandpass', 3000, 1.3, main);
  bp.frequency.setValueAtTime(3000, 0);
  bp.frequency.exponentialRampToValueAtTime(1200, 0.6);
  const hot = s.bus({ dest: bp, drive: 5, gain: 0.9 });
  for (const d of [-14, -5, 5, 14]) s.tone('sawtooth', 178, 150, 0, 0.6, 0.22, { dest: hot, detune: d, a: 0.004 });
  const lp = s.filter('lowpass', 600, 1.2, main);
  for (const f of [90, 113]) s.tone('sawtooth', f * 1.1, f, 0, 0.5, 0.2, { dest: lp, a: 0.005 });
  s.click(0, 0.9, main);
  s.noise(0, 0.08, 0.8, { type: 'bandpass', f0: 2400, q: 0.7, dest: main, a: 0.001 });
  s.noise(0, 0.35, 0.7, { type: 'lowpass', f0: 1600, f1: 200, dest: s.bus({ dest: main, drive: 3 }) });
  s.tone('sine', 1800, 380, 0, 0.3, 0.2, { dest: main, glide: 0.25 });
  s.tone('sine', 150, 55, 0, 0.4, 0.6, { dest: main });
  s.noise(0.05, 0.7, 0.35, { type: 'bandpass', f0: 2200, f1: 900, q: 1.3, dest: main });
  s.crackle(0.08, 0.7, 10, 0.16, { f0: 1500, f1: 4500, dest: main });
}

// Beam javelin thrust: the beam head buzzes up in pitch as it drives forward, a hard "shk" and a servo extension.
function javelin(s) {
  const main = s.bus({ pan: [0.2, -0.1], panAt: [0.3] });
  const bp = s.filter('bandpass', 900, 2, main);
  bp.frequency.setValueAtTime(900, 0);
  bp.frequency.exponentialRampToValueAtTime(3000, 0.12);
  bp.frequency.exponentialRampToValueAtTime(1200, 0.45);
  const hot = s.bus({ dest: bp, drive: 3 });
  for (const d of [-8, 9]) s.tone('sawtooth', 140, 210, 0, 0.4, 0.22, { dest: hot, detune: d, glide: 0.1, a: 0.01 });
  s.noise(0.06, 0.12, 0.8, { type: 'bandpass', f0: 2000, f1: 3200, q: 3, dest: s.bus({ dest: main, drive: 3 }), a: 0.003 });
  s.noise(0, 0.3, 0.4, { type: 'bandpass', f0: 500, fm: 2400, tm: 0.1, f1: 700, q: 1.1, dest: main, a: 0.01 });
  s.fm(300, 700, 0.5, 1.4, 0, 0.14, 0.08, { dest: main });
  s.tone('sine', 190, 90, 0.06, 0.18, 0.4, { dest: main });
  s.crackle(0.08, 0.35, 5, 0.12, { f0: 1600, f1: 4200, dest: main });
}

// Hyper bazooka launch: a hollow "thoomp", a slap of exhaust and the round's motor hissing away.
function bazooka(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 4 });
  s.click(0, 0.8, main);
  s.tone('sine', 150, 55, 0, 0.22, 0.9, { dest: hot });
  s.noise(0, 0.28, 0.9, { type: 'lowpass', f0: 1200, f1: 200, dest: hot, a: 0.002 });
  s.noise(0, 0.06, 0.6, { type: 'bandpass', f0: 1800, q: 0.8, dest: main, a: 0.001 });
  s.noise(0.04, 0.5, 0.4, { type: 'bandpass', f0: 2800, f1: 1600, q: 2, dest: main, a: 0.02 });
  s.metal(0.005, s.r(420, 520), 0.2, 0.25, { n: 4, q: 20, dest: main });
}

// Bazooka round detonating: a crack, a mid-heavy fireball roar, a body thump and debris crackling in the 1-4 kHz bite.
function bzboom(s) {
  const main = s.bus({ pan: s.r(-0.2, 0.2) });
  const hot = s.bus({ dest: main, drive: 3.5 });
  s.click(0, 0.9, main);
  s.noise(0, 0.05, 0.8, { type: 'bandpass', f0: 3000, q: 0.7, dest: main, a: 0.001 });
  s.noise(0, 0.8, 1, { type: 'lowpass', f0: 480 * s.r(0.85, 1.15), f1: 100, dest: hot, a: 0.004 });
  s.noise(0.01, 0.5, 0.7, { type: 'bandpass', f0: 200, f1: 110, q: 0.9, dest: hot });
  s.noise(0, 0.35, 1.4, { type: 'bandpass', f0: 3200, f1: 2300, q: 0.8, dest: main, a: 0.002 });
  s.tone('sine', 120 * s.r(0.9, 1.1), 40, 0, 0.5, 0.8, { dest: main });
  s.crackle(0.04, 0.8, 18, 0.34, { f0: 1800, f1: 4500, dest: main });
  s.noise(0.1, 0.7, 0.3, { type: 'lowpass', f0: 300, dest: main, a: 0.08, hold: 0.2 });
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

// ---------------------------------------------------------------- specials
// Charge-attack swirl: a bright rising "shing" with a shimmer of partials and an air swell.
function flash(s) {
  const main = s.bus();
  const bp = s.filter('bandpass', 800, 3, main);
  bp.frequency.setValueAtTime(800, 0);
  bp.frequency.exponentialRampToValueAtTime(3200, 0.16);
  bp.frequency.exponentialRampToValueAtTime(1600, 0.45);
  const hot = s.bus({ dest: bp, drive: 2.5 });
  for (const d of [-7, 8]) s.tone('sawtooth', 300, 620, 0, 0.35, 0.2, { dest: hot, detune: d, glide: 0.16, a: 0.01 });
  s.bell(0.05, [1210, 1890, 2530, 3180], 0.45, 0.12, { dest: main, spread: 0.01 });
  s.noise(0, 0.35, 0.45, { type: 'bandpass', f0: 900, fm: 3400, tm: 0.15, f1: 1500, q: 1.3, dest: main, a: 0.05 });
}

// SP starburst: an air swell into a bright bloom and a falling low thrum.
function burst(s) {
  const main = s.bus();
  s.noise(0, 0.6, 0.7, { type: 'bandpass', f0: 600, fm: 3600, tm: 0.12, f1: 1200, q: 0.9, dest: main, a: 0.03 });
  s.bell(0.02, [880, 1320, 1760, 2640, 3520], 0.8, 0.12, { dest: main, spread: 0.005 });
  s.tone('sine', 240, 60, 0, 0.6, 0.6, { dest: main });
  const lp = s.filter('lowpass', 900, 1.5, main);
  for (const d of [-12, 0, 12]) s.tone('sawtooth', 157, 110, 0, 0.6, 0.12, { dest: lp, detune: d, a: 0.02 });
  s.click(0, 0.6, main);
}

// Weapon off the rack: a latch, a clank of the mount and a short servo.
function draw(s) {
  const main = s.bus({ pan: s.r(-0.2, 0.2) });
  s.click(0, 0.8, main);
  s.metal(0.004, s.r(520, 680), 0.25, 0.5, { n: 5, q: 26, dest: main });
  s.noise(0, 0.05, 0.4, { type: 'bandpass', f0: 2200, q: 1, dest: main });
  s.fm(320, 620, 0.5, 1.2, 0.04, 0.16, 0.08, { dest: main });
  s.tone('sine', 160, 90, 0, 0.08, 0.3, { dest: main });
}

// C6 ground shockwave: a mid "whoom" centred near 500-800 Hz (as in the game), a crack and debris.
function shock(s) {
  const main = s.filter('lowpass', 4000, 0.7, s.bus());
  s.click(0, 0.6, main);
  s.noise(0, 0.05, 0.3, { type: 'bandpass', f0: 2200, q: 1.6, dest: main, a: 0.001 });
  s.noise(0, 0.75, 3, { type: 'bandpass', f0: 650, f1: 470, q: 2, dest: main, a: 0.005 });
  for (const d of [-10, 10]) s.tone('triangle', 500, 360, 0, 0.6, 0.2, { dest: main, detune: d, a: 0.01 });
  s.tone('sine', 110, 40, 0, 0.7, 0.6, { dest: main });
  s.crackle(0.05, 0.9, 14, 0.12, { f0: 1500, f1: 3200, dest: main });
  s.noise(0.1, 0.8, 0.2, { type: 'lowpass', f0: 200, dest: main, a: 0.1, hold: 0.2 });
}

// SP finisher: an electric blast. A crackle storm in the 1.5-6 kHz band over a buzzing arc and a big low boom.
function lightning(s) {
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 3.5 });
  s.click(0, 1, main);
  s.noise(0, 1.2, 1, { type: 'lowpass', f0: 1500, f1: 90, dest: hot, a: 0.004 });
  s.tone('sine', 90, 28, 0, 1.2, 0.9, { dest: main });
  const arc = s.filter('bandpass', 2400, 1.2, main);
  for (const d of [-15, 0, 15]) s.tone('sawtooth', 120, 95, 0, 0.9, 0.14, { dest: s.bus({ dest: arc, drive: 4 }), detune: d, a: 0.01 });
  for (let i = 0; i < 46; i++) {
    const t = s.rnd() * s.rnd() * 1.2;
    s.noise(t, s.r(0.01, 0.05), s.r(0.3, 0.7), { type: 'bandpass', f0: s.r(2000, 7000), q: 2.5, a: 0.0006, dest: main });
  }
  s.noise(0, 0.9, 0.3, { type: 'highpass', f0: 3500, dest: main, a: 0.01 });
  s.noise(0, 0.5, 0.8, { type: 'bandpass', f0: 2300, f1: 1800, q: 1.2, dest: main, a: 0.003 });
  s.noise(0.2, 1.2, 0.3, { type: 'lowpass', f0: 250, dest: main, a: 0.15, hold: 0.3 });
}

// Charge SP build-up: a rising buzz and swell under the cyan aura.
function spcharge(s) {
  const main = s.bus();
  const bp = s.filter('bandpass', 500, 2, main);
  bp.frequency.setValueAtTime(500, 0);
  bp.frequency.exponentialRampToValueAtTime(3000, 1.1);
  for (const d of [-10, 0, 10]) s.tone('sawtooth', 110, 330, 0, 0.2, 0.16, { dest: s.bus({ dest: bp, drive: 2.5 }), detune: d, glide: 1.1, a: 0.3, hold: 0.8 });
  s.noise(0, 0.3, 0.4, { type: 'bandpass', f0: 400, f1: 3000, q: 1, dest: main, a: 0.8 });
  s.fm(200, 900, 0.5, 1.5, 0, 1.0, 0.06, { dest: main, a: 0.5 });
  s.crackle(0.3, 0.9, 12, 0.12, { f0: 2000, f1: 5000, dest: main });
}

// Gundam hammer pass: a heavy whoosh sweeping past and the chain rattling behind it.
function hammer(s, v) {
  const main = s.bus({ pan: v % 2 ? [-0.6, 0.6] : [0.6, -0.6], panAt: [0.3] });
  s.noise(0, 0.32, 0.8, { type: 'bandpass', f0: 800, fm: 2200 * s.r(0.85, 1.15), tm: 0.14, f1: 1000, q: 1.3, dest: main, a: 0.04 });
  s.noise(0, 0.3, 0.35, { type: 'lowpass', f0: 500, f1: 200, dest: s.bus({ dest: main, drive: 2.5 }), a: 0.05 });
  for (let i = 0; i < 7; i++) s.metal(0.05 + i * 0.03 + s.r(0, 0.02), s.r(1500, 2600), 0.05, 0.12, { n: 2, q: 30, dest: main });
}

// ---------------------------------------------------------------- Guncannon
// Measured off the Guncannon's gameplay audio: its blows are a 300-400 Hz thump with a 1.3-6 kHz swish well under
// it, and the 240mm cannons are boomier than the bazooka: a 100-200 Hz report under the same 1.5-4 kHz blast.
// A fist or foot through the air: a heavy servo-driven swing. Air band-passed through a sweep (lower than a beam
// saber's), a high swish riding it, the low "woomp" of the limb's mass and a hydraulic tick as it starts.
function swingGC(o) {
  return (s, v) => {
    const pan = o.pan === 'alt' ? (v % 2 ? [0.4, -0.4] : [-0.4, 0.4]) : o.pan ?? [0.3, -0.3];
    const main = s.bus({ pan, panAt: o.panAt || [o.dur * 0.6] });
    const peak = (o.peak ?? 0.08) * s.r(0.85, 1.15);
    const w = o.weight ?? 1;
    // the swish is thin and high; the weight of the swing lives in the 300-400 Hz thump below
    s.noise(0, o.dur, 0.07 * (o.air ?? 1), { type: 'bandpass', f0: o.lo ?? 1400, fm: (o.top ?? 3000) * s.r(0.88, 1.12), tm: peak, f1: o.tail ?? 1700, q: 1.6, a: 0.02, dest: main });
    s.tone('sine', 115 * (o.low ?? 1), 60, 0, o.dur * 0.7, 0.18 * w, { a: 0.03, dest: main });
    s.noise(0, o.dur * 0.6, 0.6 * w, { type: 'bandpass', f0: 360, f1: 260, q: 1, a: 0.02, dest: main });
    s.fm(260, 540, 0.5, 1.1, 0, 0.12, 0.05, { dest: main });
  };
}

// Uppercut / launcher: the swing plus the thrusters kicking in underneath it.
function uppercut(s) {
  swingGC({ dur: 0.45, lo: 320, top: 2400, tail: 800, weight: 1.3, peak: 0.12, pan: [0.1, -0.1] })(s, 0);
  const main = s.bus();
  const hot = s.bus({ dest: main, drive: 3 });
  s.noise(0.04, 0.45, 0.55, { type: 'lowpass', f0: 3500, f1: 600, dest: hot, a: 0.01 });
  s.tone('sine', 80, 45, 0.04, 0.35, 0.5, { dest: main });
  s.crackle(0.06, 0.35, 6, 0.12, { f0: 2000, f1: 5000, dest: main });
}

// Fist on armour: a heavy metallic thud (the 300-400 Hz body is the loudest part), a dry crunch near 2 kHz, a short
// low knock and the dull ring of a plate.
function phit(s) {
  const main = s.bus({ pan: s.r(-0.15, 0.15) });
  const crunch = s.bus({ dest: main, drive: 5, gain: 0.8 });
  s.click(0, 0.8, main);
  s.noise(0, 0.13, 1.5, { type: 'bandpass', f0: 360 * s.r(0.9, 1.1), f1: 250, q: 1.3, dest: crunch });
  s.noise(0, 0.08, 0.2, { type: 'bandpass', f0: 1900 * s.r(0.9, 1.1), f1: 1400, q: 1.1, dest: crunch });
  s.noise(0, 0.05, 0.1, { type: 'bandpass', f0: 3200, q: 1, dest: main });
  s.tone('sine', 170 * s.r(0.9, 1.1), 70, 0, 0.14, 0.5, { dest: main });
  s.metal(0.003, s.r(380, 460), 0.2, 0.22, { n: 4, q: 18, dest: main });
  s.crackle(0.02, 0.18, 4, 0.1, { f0: 1200, f1: 2400, dest: main });
}

// Finishers, grabs landing on officers: the same, lower and longer, with plates shearing off.
function phitHeavy(s) {
  const main = s.bus({ pan: s.r(-0.1, 0.1) });
  const crunch = s.bus({ dest: main, drive: 6, gain: 0.8 });
  s.click(0, 1, main);
  s.noise(0, 0.22, 1.2, { type: 'bandpass', f0: 300 * s.r(0.9, 1.1), f1: 190, q: 1.1, dest: crunch });
  s.noise(0, 0.12, 0.6, { type: 'bandpass', f0: 1700, f1: 1100, q: 0.9, dest: crunch });
  s.tone('sine', 130 * s.r(0.9, 1.1), 45, 0, 0.35, 0.8, { dest: main });
  s.metal(0.004, s.r(300, 360), 0.45, 0.3, { n: 5, q: 16, dest: main });
  s.noise(0.03, 0.5, 0.3, { type: 'lowpass', f0: 700, f1: 150, dest: main, a: 0.02 });
  s.crackle(0.04, 0.6, 9, 0.2, { f0: 900, f1: 3200, dest: main });
}

// 240mm cannon report: a hard crack, a boomy body centred on 120-160 Hz over a 250-400 Hz punch, a gritty blast of gas
// at 1.5-4 kHz, the breech clanking back and a short rolling tail.
function cannon(s) {
  const main = s.filter('lowpass', 5500, 0.7, s.bus({ pan: s.r(-0.1, 0.1) }));
  const hot = s.bus({ dest: main, drive: 4 });
  s.click(0, 1, main);
  s.noise(0, 0.06, 0.9, { type: 'bandpass', f0: 3000, q: 0.6, dest: main, a: 0.0008 });
  s.tone('sine', 150 * s.r(0.92, 1.08), 55, 0, 0.45, 1, { dest: hot });
  s.noise(0, 0.5, 1, { type: 'lowpass', f0: 500, f1: 120, dest: hot, a: 0.002 });
  s.noise(0.005, 0.35, 0.6, { type: 'bandpass', f0: 330, f1: 220, q: 1.1, dest: hot });
  s.noise(0, 0.35, 1.9, { type: 'bandpass', f0: 2400, f1: 1700, q: 0.8, dest: main, a: 0.002 });
  s.metal(0.03, s.r(300, 380), 0.3, 0.28, { n: 4, q: 16, dest: main });
  s.noise(0.08, 0.6, 0.25, { type: 'lowpass', f0: 400, dest: main, a: 0.05 });
  s.crackle(0.04, 0.6, 12, 0.3, { f0: 1500, f1: 4000, dest: main });
}

// 240mm shell bursting: bigger at the bottom than a bazooka round (a 100-200 Hz roar) with the same bright 2-3 kHz
// blast and debris crackle on top.
function cboom(s) {
  const main = s.filter('lowpass', 5500, 0.7, s.bus({ pan: s.r(-0.2, 0.2) }));
  const hot = s.bus({ dest: main, drive: 3.5 });
  s.click(0, 0.9, main);
  s.noise(0, 0.06, 0.9, { type: 'bandpass', f0: 2500, q: 0.8, dest: main, a: 0.001 });
  s.noise(0, 0.8, 1, { type: 'lowpass', f0: 320 * s.r(0.85, 1.15), f1: 90, dest: hot, a: 0.004 });
  s.tone('sine', 110 * s.r(0.9, 1.1), 40, 0, 0.6, 0.9, { dest: main });
  s.noise(0.01, 0.5, 0.5, { type: 'bandpass', f0: 280, f1: 180, q: 1.2, dest: hot });
  s.noise(0, 0.5, 2.4, { type: 'bandpass', f0: 2400, f1: 1900, q: 0.8, dest: main, a: 0.002 });
  s.crackle(0.04, 0.9, 24, 0.4, { f0: 1400, f1: 3400, dest: main });
  s.noise(0.1, 0.7, 0.3, { type: 'lowpass', f0: 300, dest: main, a: 0.08, hold: 0.2 });
}

// Grab: hands clamp shut on armour: a latch click, a heavy clank and a creak of strained metal.
function grab(s) {
  const main = s.bus({ pan: s.r(-0.15, 0.15) });
  s.click(0, 0.9, main);
  s.metal(0.002, s.r(480, 620), 0.35, 0.6, { n: 5, q: 22, dest: main });
  s.noise(0, 0.1, 0.8, { type: 'bandpass', f0: 380, f1: 260, q: 1.2, dest: s.bus({ dest: main, drive: 4 }) });
  s.tone('sine', 150, 70, 0, 0.12, 0.5, { dest: main });
  s.fm(180, 120, 0.5, 2, 0.05, 0.25, 0.05, { dest: main });
}

// ---------------------------------------------------------------- Ball
// Measured off the Ball's gameplay audio: its claw blows are a 55-170 Hz body with 340-490 Hz mids and a clank ringing
// near 1 kHz, the bite at 1.5-2.2 kHz; the SP flurry is brighter (a quarter of it at 1.5-6 kHz). The 180mm recoilless
// cannon sits low: most of a shot is under 300 Hz (peaks near 90 and 165 Hz) with a crack at 2-3 kHz.
// A claw swipe: a small, quick arm, so the swing's thin swish and light "woomp", a servo whine and the joints rattling.
function clawSwing(o) {
  const swing = swingGC(o);
  return (s, v) => {
    swing(s, v);
    const main = s.bus({ pan: o.pan === 'alt' ? (v % 2 ? 0.3 : -0.3) : 0 });
    s.fm(420 * (o.whine ?? 1), 900 * (o.whine ?? 1), 0.5, 1.4, 0, o.dur * 0.5, 0.05, { dest: main, a: 0.01 });
    s.metal(0.005, s.r(950, 1100), 0.08, 0.05, { n: 3, q: 30, dest: main });
  };
}

// Claw on armour: a clank ringing near 1 kHz over a 350-490 Hz body, a light thump and a crunch near 2 kHz; the heavy
// take is lower and longer, with plates shearing off.
function clawHit(heavy) {
  return (s) => {
    const main = s.bus({ pan: s.r(-0.15, 0.15) });
    const crunch = s.bus({ dest: main, drive: 5, gain: 0.8 });
    s.click(0, heavy ? 1 : 0.8, main);
    s.noise(0, heavy ? 0.2 : 0.12, 1.2, { type: 'bandpass', f0: 430 * s.r(0.9, 1.1), f1: 340, q: 1.3, dest: crunch });
    s.noise(0, 0.08, 0.4, { type: 'bandpass', f0: 1900 * s.r(0.9, 1.1), f1: 1500, q: 1.1, dest: crunch });
    s.tone('sine', (heavy ? 120 : 165) * s.r(0.9, 1.1), 55, 0, heavy ? 0.35 : 0.16, heavy ? 0.8 : 0.5, { dest: main });
    s.metal(0.002, s.r(960, 1080), heavy ? 0.5 : 0.28, heavy ? 0.4 : 0.3, { n: 5, q: 24, dest: main });
    s.crackle(0.02, heavy ? 0.5 : 0.18, heavy ? 9 : 4, 0.12, { f0: 1200, f1: 3000, dest: main });
    if (heavy) s.noise(0.03, 0.45, 0.3, { type: 'lowpass', f0: 600, f1: 140, dest: main, a: 0.02 });
  };
}

// 180mm recoilless report: a crack at 2-3 kHz over a low boom centred near 165 and 92 Hz, and instead of a breech
// clanking back, the back-blast: gas roaring out of the rear of the gun.
function ballCannon(s) {
  const main = s.filter('lowpass', 5500, 0.7, s.bus({ pan: s.r(-0.1, 0.1) }));
  const hot = s.bus({ dest: main, drive: 4 });
  s.click(0, 1, main);
  s.noise(0, 0.05, 0.8, { type: 'bandpass', f0: 2500 * s.r(0.9, 1.1), q: 0.7, dest: main, a: 0.0008 });
  s.tone('sine', 165 * s.r(0.92, 1.08), 70, 0, 0.35, 0.9, { dest: hot });
  s.tone('sine', 92 * s.r(0.92, 1.08), 40, 0, 0.5, 0.9, { dest: main });
  s.noise(0, 0.45, 1, { type: 'lowpass', f0: 420, f1: 110, dest: hot, a: 0.002 });
  s.noise(0, 0.25, 1.1, { type: 'bandpass', f0: 2600, f1: 2000, q: 0.9, dest: main, a: 0.002 });
  s.noise(0.01, 0.5, 0.45, { type: 'bandpass', f0: 1400, f1: 500, q: 0.8, dest: main, a: 0.01 });
  s.crackle(0.03, 0.5, 9, 0.22, { f0: 1500, f1: 3800, dest: main });
  s.noise(0.08, 0.5, 0.22, { type: 'lowpass', f0: 350, dest: main, a: 0.05 });
}

// A spin: the claws whirring round in a sweep of air that circles the listener, over a servo whine.
function spinBall(s, v) {
  swingGC({ dur: 0.5, lo: 1300, top: 3000, peak: 0.18, weight: 0.8, low: 1.2, pan: v % 2 ? [-0.7, 0.7, -0.4] : [0.7, -0.7, 0.4], panAt: [0.2, 0.42] })(s, v);
  const main = s.bus();
  s.fm(500, 800, 0.5, 1.2, 0, 0.45, 0.05, { dest: main, a: 0.03 });
  s.metal(0.1, s.r(950, 1100), 0.1, 0.05, { n: 3, q: 28, dest: main });
}

// Rolling along the ground: a low rumble, grit crunching under the hull and the plating booming.
function broll(s) {
  const main = s.bus({ pan: s.r(-0.1, 0.1) });
  s.noise(0, 0.3, 1, { type: 'lowpass', f0: 240, f1: 160, dest: s.bus({ dest: main, drive: 3 }), a: 0.03, hold: 0.05 });
  s.tone('sine', 70 * s.r(0.9, 1.1), 55, 0, 0.3, 0.6, { dest: main, a: 0.03 });
  s.crackle(0, 0.38, 10, 0.25, { f0: 400, f1: 1800, dest: main });
  s.metal(0.05, s.r(200, 260), 0.25, 0.15, { n: 4, q: 14, dest: main });
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
  slash_a: { n: 5, dur: 0.5, build: blade({ dur: 0.4, pan: [-0.55, 0.55], heavy: 0.15 }) },
  slash_b: { n: 5, dur: 0.5, build: blade({ dur: 0.4, base: 150, pan: [0.55, -0.55], heavy: 0.2, airTop: 2600 }) },
  slash_h: { n: 4, dur: 0.7, build: blade({ dur: 0.55, base: 135, pan: [0.25, -0.15], heavy: 0.85, peak: 0.09, bright: 2200, airTop: 2100 }) },
  slash_spin: { n: 3, dur: 0.75, build: blade({ dur: 0.6, base: 145, pan: [-0.7, 0.7, -0.4], panAt: [0.2, 0.45], heavy: 0.4, peak: 0.16, bright: 2400 }) },
  slash_down: { n: 3, dur: 0.8, build: blade({ dur: 0.62, base: 125, pan: [0, 0], heavy: 1, peak: 0.1, bright: 2000, airTop: 1900 }) },
  slash_dash: { n: 3, dur: 0.55, build: blade({ dur: 0.45, base: 150, pan: [0.5, -0.6], heavy: 0.5, bright: 2800 }) },
  slash_fast: { n: 6, dur: 0.3, level: 0.7, build: blade({ dur: 0.22, base: 170, pan: 'alt', bright: 2900, tail: 1500, lo: 1300, airLo: 1000, body: 0.3 }) },
  slash_rise: { n: 3, dur: 0.8, build: rise },
  ignite: { n: 3, dur: 0.6, level: 0.6, build: ignite },
  hit: { n: 6, dur: 0.6, build: hit },
  hit_heavy: { n: 4, dur: 1.2, build: hitHeavy },
  bhit: { n: 5, dur: 0.4, level: 0.8, build: bhit },
  hurt: { n: 4, dur: 0.9, build: hurt },
  ping: { n: 5, dur: 0.3, level: 0.6, build: ping },
  clang: { n: 3, dur: 0.8, build: clang },
  slam: { n: 3, dur: 1.6, level: 1, build: slam },
  boom: { n: 5, dur: 1.8, level: 1, build: boom },
  bigboom: { n: 2, dur: 3, level: 1, build: bigboom },
  rifle: { n: 4, dur: 0.5, level: 0.8, build: rifle },
  cshot: { n: 2, dur: 1.0, level: 0.95, build: cshot },
  javelin: { n: 2, dur: 0.6, build: javelin },
  bazooka: { n: 3, dur: 0.6, level: 0.9, build: bazooka },
  bzboom: { n: 4, dur: 1.2, level: 1, build: bzboom },
  flash: { n: 3, dur: 0.6, level: 0.6, build: flash },
  burst: { n: 1, dur: 1.0, level: 0.8, build: burst },
  draw: { n: 2, dur: 0.35, level: 0.55, build: draw },
  shock: { n: 2, dur: 1.2, level: 1, build: shock },
  lightning: { n: 1, dur: 1.8, level: 1, build: lightning },
  spcharge: { n: 1, dur: 1.5, level: 0.7, build: spcharge },
  hammer: { n: 4, dur: 0.45, level: 0.75, build: hammer },
  mg: { n: 4, dur: 0.35, level: 0.5, build: mg },
  hawk: { n: 3, dur: 0.55, level: 0.55, build: hawk },
  step: { n: 6, dur: 0.6, level: 0.75, build: step },
  land: { n: 3, dur: 1, build: land },
  qb: { n: 4, dur: 0.9, build: qb },
  skid: { n: 2, dur: 0.8, level: 0.6, build: skid },
  punch: { n: 6, dur: 0.4, level: 0.55, build: swingGC({ dur: 0.28, pan: 'alt' }) },
  kick: { n: 4, dur: 0.55, level: 0.62, build: swingGC({ dur: 0.42, lo: 1100, top: 2400, tail: 1300, weight: 1.4, low: 0.8 }) },
  spin_gc: { n: 3, dur: 0.75, level: 0.62, build: swingGC({ dur: 0.55, lo: 1200, top: 2800, peak: 0.2, pan: [-0.7, 0.7, -0.4], panAt: [0.2, 0.45] }) },
  throw: { n: 2, dur: 0.85, level: 0.7, build: swingGC({ dur: 0.6, lo: 1000, top: 2200, tail: 1200, weight: 1.6, low: 0.7, peak: 0.15 }) },
  uppercut: { n: 3, dur: 0.7, level: 0.72, build: uppercut },
  phit: { n: 6, dur: 0.5, level: 0.85, build: phit },
  phit_heavy: { n: 4, dur: 1.0, level: 0.95, build: phitHeavy },
  cannon: { n: 4, dur: 1.0, level: 1, build: cannon },
  grab: { n: 3, dur: 0.6, level: 0.75, build: grab },
  cboom: { n: 4, dur: 1.2, level: 1, build: cboom },
  punch_fast: { n: 6, dur: 0.25, level: 0.5, build: swingGC({ dur: 0.16, lo: 1500, top: 3600, tail: 2000, weight: 0.3, air: 8, pan: 'alt' }) },
  claw: { n: 6, dur: 0.4, level: 0.55, build: clawSwing({ dur: 0.26, lo: 1300, top: 3200, tail: 1800, weight: 0.75, low: 1.3, pan: 'alt' }) },
  spin_ball: { n: 3, dur: 0.7, level: 0.6, build: spinBall },
  bflail: { n: 6, dur: 0.25, level: 0.5, build: clawSwing({ dur: 0.15, lo: 1800, top: 4200, tail: 2400, weight: 0.3, air: 8, whine: 1.4, pan: 'alt' }) },
  clawhit: { n: 6, dur: 0.5, level: 0.85, build: clawHit(false) },
  clawhit_heavy: { n: 4, dur: 1.0, level: 0.95, build: clawHit(true) },
  bcannon: { n: 4, dur: 0.9, level: 1, build: ballCannon },
  broll: { n: 3, dur: 0.45, level: 0.7, build: broll },
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
