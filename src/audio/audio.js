// Fully synthesized SFX; the score lives in music.js.
import { Music } from './music.js';
export class Audio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.musicOn = true;
    this.listener = null; // {x,z}
    this.throttle = new Map();
  }

  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = 0.8;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.knee.value = 10;
    comp.ratio.value = 5;
    comp.attack.value = 0.003;
    comp.release.value = 0.2;
    this.master.connect(comp).connect(ctx.destination);
    this.sfx = ctx.createGain();
    this.sfx.gain.value = 0.9;
    this.sfx.connect(this.master);
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

  play(name, { vol = 1, pitch = 1, at = null } = {}) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    // throttle identical sounds
    const last = this.throttle.get(name) || 0;
    const minGap = { hit: 0.03, boom: 0.04, mg: 0.03, step: 0.08, swing: 0.04, jet: 0.12 }[name] ?? 0.015;
    if (now - last < minGap) return;
    this.throttle.set(name, now);
    if (at && this.listener) {
      const d = Math.hypot(at.x - this.listener.x, at.z - this.listener.z);
      vol *= Math.max(0, 1 - d / 70);
      if (vol < 0.03) return;
    }
    const t = now + 0.005;
    const out = this.ctx.createGain();
    out.gain.value = vol;
    out.connect(this.sfx);
    const p = pitch;
    switch (name) {
      case 'ignite':
        this.osc('sawtooth', 70 * p, 240 * p, t, 0.35, 0.18, out);
        this.osc('sawtooth', 71 * p, 243 * p, t, 0.35, 0.12, out);
        this.noiseBurst(t, 0.25, 0.25, out, { type: 'bandpass', f0: 800, f1: 3000, q: 2 });
        break;
      case 'swing': {
        this.noiseBurst(t, 0.2, 0.55, out, { type: 'bandpass', f0: 500 * p, f1: 2600 * p, q: 1.6 });
        this.osc('sawtooth', 150 * p, 70 * p, t, 0.22, 0.14, out);
        this.osc('sawtooth', 152 * p, 71 * p, t, 0.22, 0.1, out);
        break;
      }
      case 'hit': {
        const ws = this.ctx.createWaveShaper();
        ws.curve = this.curve;
        const g = this.ctx.createGain();
        g.gain.value = 0.7;
        ws.connect(g).connect(out);
        this.osc('square', 220 * p, 90 * p, t, 0.1, 0.35, ws);
        this.noiseBurst(t, 0.12, 0.6, out, { type: 'highpass', f0: 1800 * p, q: 0.7 });
        this.osc('sawtooth', 900 * p, 300 * p, t, 0.08, 0.12, out);
        break;
      }
      case 'boom':
        this.noiseBurst(t, 0.9, 0.9, out, { type: 'lowpass', f0: 1400 * p, f1: 90, q: 0.5 });
        this.osc('sine', 90 * p, 32, t, 0.6, 0.8, out);
        this.noiseBurst(t, 0.08, 0.5, out, { type: 'highpass', f0: 3000 });
        break;
      case 'bigboom':
        this.noiseBurst(t, 1.8, 1.0, out, { type: 'lowpass', f0: 2200, f1: 60, q: 0.4 });
        this.osc('sine', 70, 24, t, 1.2, 1.0, out);
        this.osc('triangle', 140, 40, t, 0.8, 0.4, out);
        this.noiseBurst(t + 0.15, 1.2, 0.5, out, { type: 'lowpass', f0: 900, f1: 80 });
        break;
      case 'rifle':
        this.osc('sawtooth', 1800 * p, 220 * p, t, 0.28, 0.3, out);
        this.osc('square', 900 * p, 110 * p, t, 0.3, 0.14, out);
        this.noiseBurst(t, 0.3, 0.5, out, { type: 'bandpass', f0: 4000, f1: 600, q: 1.2 });
        break;
      case 'mega':
        for (let i = 0; i < 3; i++) this.osc('sawtooth', (400 + i * 7) * p, 60, t, 1.1, 0.22, out, { detune: i * 12 });
        this.noiseBurst(t, 1.1, 0.7, out, { type: 'bandpass', f0: 3000, f1: 300, q: 0.8 });
        this.osc('sine', 60, 30, t, 1.0, 0.6, out);
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
        break;
      case 'slam':
        this.osc('sine', 110, 28, t, 0.55, 0.9, out);
        this.noiseBurst(t, 0.5, 0.7, out, { type: 'lowpass', f0: 1800, f1: 100 });
        this.noiseBurst(t, 0.06, 0.4, out, { type: 'highpass', f0: 2500 });
        break;
      case 'boost':
        this.noiseBurst(t, 0.45, 0.45, out, { type: 'highpass', f0: 600, f1: 2400, q: 0.7, a: 0.03 });
        this.noiseBurst(t, 0.4, 0.3, out, { type: 'lowpass', f0: 400, q: 1 });
        break;
      case 'hurt':
        this.osc('square', 240, 120, t, 0.18, 0.3, out);
        this.osc('square', 330, 160, t, 0.16, 0.2, out);
        this.noiseBurst(t, 0.15, 0.5, out, { type: 'bandpass', f0: 1500, q: 1 });
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
