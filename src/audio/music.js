// Original anime hard-rock score, synthesized live with WebAudio:
// double-tracked distorted power-chord guitars (palm mutes, gallops), bass guitar, a rock kit, a gliding synth lead
// with a dotted-eighth delay, string pads and a synth arp, all glued by a bus compressor and a shared plate reverb.
// Songs are written as sections of bars (chord names) with riff / drum / bass patterns and a lead melody.

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };

function parseChord(name) {
  const m = /^([A-G][#b]?)(m?)(\*?)$/.exec(name);
  const pc = PC[m[1]];
  return { pc, minor: m[2] === 'm', turn: m[3] === '*', gtr: 40 + ((pc - 4 + 12) % 12) };
}

// ---------------------------------------------------------------- patterns
// Guitar riffs: [step, length(16ths), 'o' open | 'm' palm-muted, semitone offset from the bar root]
const RIFFS = {
  hits: [[0, 6, 'o'], [6, 2, 'o'], [8, 8, 'o']],
  hits2: [[0, 3, 'o'], [3, 3, 'o'], [6, 2, 'o'], [8, 2, 'm'], [10, 2, 'm'], [12, 4, 'o', 2]],
  gallop: [[0, 2, 'o'], [2, 1, 'm'], [3, 1, 'm'], [4, 2, 'm'], [6, 1, 'm'], [7, 1, 'm'], [8, 2, 'm'], [10, 1, 'm'], [11, 1, 'm'], [12, 2, 'm'], [14, 1, 'm'], [15, 1, 'm']],
  turn: [[0, 2, 'o'], [2, 1, 'm'], [3, 1, 'm'], [4, 2, 'm'], [6, 1, 'm'], [7, 1, 'm'], [8, 4, 'o', 3], [12, 4, 'o', 5]],
  drive: [[0, 2, 'o'], [2, 2, 'm'], [4, 2, 'm'], [6, 2, 'm'], [8, 2, 'o'], [10, 2, 'm'], [12, 2, 'm'], [14, 2, 'm']],
  anthem: [[0, 8, 'o'], [8, 2, 'm'], [10, 2, 'm'], [12, 4, 'o']],
  anthem2: [[0, 6, 'o'], [6, 2, 'm'], [8, 6, 'o'], [14, 1, 'm'], [15, 1, 'm']],
  ring: [[0, 16, 'o']],
  chug16: Array.from({ length: 16 }, (_, i) => [i, 1, i % 4 === 0 ? 'o' : 'm']),
  phryg: [[0, 1, 'm'], [1, 1, 'm'], [2, 1, 'm'], [3, 1, 'o', 1], [4, 1, 'm'], [5, 1, 'm'], [6, 1, 'm'], [7, 1, 'o', 1], [8, 1, 'm'], [9, 1, 'm'], [10, 2, 'o', 3], [12, 2, 'o', 1], [14, 1, 'm'], [15, 1, 'm']],
  stab: [[0, 2, 'o'], [3, 2, 'o'], [6, 2, 'o'], [8, 1, 'm'], [9, 1, 'm'], [10, 1, 'm'], [11, 1, 'm'], [12, 2, 'o', 1], [14, 2, 'o']],
};

// Drums: k kick, s snare, h closed hat, o open hat, t tom (value = step list)
const s8 = [0, 2, 4, 6, 8, 10, 12, 14];
const DRUMS = {
  intro: { k: [0, 6, 8], s: [], h: [], o: [0, 8], t: [] },
  introFill: { k: [0], s: [8, 10, 12, 13, 14, 15], h: [], o: [], t: [0, 2, 4, 6] },
  verse: { k: [0, 3, 6, 8, 11, 14], s: [4, 12], h: s8, o: [] },
  pre: { k: [0, 4, 8, 12], s: [2, 6, 10, 14], h: [], o: [0, 4, 8, 12] },
  roll: { k: [0, 4, 8, 12], s: [0, 2, 4, 6, 8, 9, 10, 11, 12, 13, 14, 15], h: [], o: [] },
  chorus: { k: [0, 2, 6, 8, 10, 14], s: [4, 12], h: [], o: s8 },
  half: { k: [0, 10], s: [8], h: s8, o: [] },
  blast: { k: Array.from({ length: 16 }, (_, i) => i), s: [4, 12], h: [], o: s8 },
  gallopK: { k: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], s: [4, 12], h: [], o: s8 },
};

// Melody helper: bars of [midi | 0 rest, length in 16ths]
const R = 0;

// ---------------------------------------------------------------- songs
// "Side 7 Sortie" (E minor, 160 bpm)
const BATTLE = {
  bpm: 160,
  sections: {
    intro: {
      bars: ['E', 'E', 'E', 'E*'], gtr: ['hits', 'hits', 'hits2', 'turn'], drums: ['intro', 'intro', 'intro', 'introFill'],
      bass: 'follow', arp: true, crash: true,
    },
    verse: {
      bars: ['Em', 'Em', 'Em', 'Em*', 'C', 'C', 'D', 'B*'], gtr: ['gallop', 'gallop', 'gallop', 'turn', 'gallop', 'gallop', 'gallop', 'turn'],
      drums: 'verse', bass: 'follow', crash: true,
      lead: [
        [[R, 8], [64, 2], [67, 2], [69, 2], [71, 2]],
        [[71, 6], [69, 2], [67, 4], [66, 4]],
        [[67, 4], [69, 4], [71, 4], [74, 4]],
        [[76, 8], [74, 4], [71, 4]],
        [[72, 6], [71, 2], [69, 4], [67, 4]],
        [[69, 4], [67, 4], [64, 8]],
        [[66, 4], [67, 4], [69, 4], [74, 4]],
        [[75, 12], [71, 4]],
      ],
    },
    pre: {
      bars: ['C', 'D', 'Em', 'B'], gtr: 'drive', drums: ['pre', 'pre', 'pre', 'roll'], bass: 'eighths', pad: true,
      lead: [[[67, 8], [69, 8]], [[69, 8], [71, 8]], [[71, 8], [74, 8]], [[75, 8], [78, 8]]],
    },
    chorus: {
      bars: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B'], gtr: ['anthem', 'anthem', 'anthem', 'anthem2', 'anthem', 'anthem', 'anthem', 'anthem2'],
      drums: 'chorus', bass: 'octaves', pad: true, crash: true, crashEvery: 4,
      lead: [
        [[71, 4], [76, 4], [78, 4], [79, 4]],
        [[79, 6], [78, 2], [76, 4], [72, 4]],
        [[74, 4], [79, 4], [83, 6], [81, 2]],
        [[81, 8], [78, 4], [74, 4]],
        [[76, 4], [79, 4], [83, 8]],
        [[84, 6], [83, 2], [81, 4], [79, 4]],
        [[78, 4], [79, 4], [81, 4], [83, 4]],
        [[78, 8], [75, 4], [71, 4]],
      ],
    },
    bridge: {
      bars: ['Am', 'Am', 'Em', 'Em', 'C', 'D', 'B', 'B*'], gtr: ['ring', 'ring', 'ring', 'ring', 'gallop', 'gallop', 'drive', 'turn'],
      drums: ['half', 'half', 'half', 'half', 'verse', 'verse', 'pre', 'roll'], bass: 'follow', arp: true, crash: true,
      lead: [
        [[81, 4], [79, 2], [78, 2], [76, 4], [74, 4]],
        [[76, 12], [R, 4]],
        [[79, 4], [78, 2], [76, 2], [74, 4], [71, 4]],
        [[76, 12], [R, 4]],
        [[72, 2], [74, 2], [76, 2], [79, 2], [84, 8]],
        [[83, 2], [81, 2], [78, 2], [74, 2], [81, 8]],
        [[83, 4], [81, 4], [78, 4], [75, 4]],
        [[78, 8], [83, 8]],
      ],
    },
  },
  order: ['intro', 'verse', 'pre', 'chorus', 'verse', 'pre', 'chorus', 'bridge', 'chorus'],
  loopTo: 1,
};

// "Red Comet" (E phrygian dominant / A harmonic minor, 176 bpm)
const BOSS = {
  bpm: 176,
  sections: {
    intro: {
      bars: ['E', 'F', 'E', 'F'], gtr: ['stab', 'stab', 'stab', 'chug16'], drums: ['gallopK', 'gallopK', 'gallopK', 'roll'],
      bass: 'follow', crash: true, arp: true,
    },
    verse: {
      bars: ['E', 'E', 'F', 'E', 'E', 'E', 'G', 'F'], gtr: 'phryg', drums: 'gallopK', bass: 'follow', crash: true,
      lead: [
        [[76, 2], [77, 2], [76, 4], [71, 4], [72, 4]],
        [[71, 8], [68, 4], [69, 4]],
        [[77, 4], [76, 4], [74, 4], [72, 4]],
        [[71, 12], [R, 4]],
        [[76, 2], [77, 2], [80, 4], [83, 4], [81, 4]],
        [[80, 8], [77, 4], [76, 4]],
        [[74, 4], [76, 4], [77, 4], [79, 4]],
        [[80, 8], [83, 8]],
      ],
    },
    chorus: {
      bars: ['Am', 'F', 'D', 'E', 'Am', 'F', 'G', 'E'], gtr: ['anthem', 'anthem', 'anthem', 'chug16', 'anthem', 'anthem', 'anthem', 'chug16'],
      drums: 'blast', bass: 'octaves', pad: true, crash: true, crashEvery: 2,
      lead: [
        [[76, 4], [81, 4], [83, 4], [84, 4]],
        [[84, 8], [83, 4], [81, 4]],
        [[77, 4], [81, 4], [86, 6], [84, 2]],
        [[83, 8], [80, 8]],
        [[81, 4], [84, 4], [88, 4], [86, 4]],
        [[84, 6], [83, 2], [81, 4], [77, 4]],
        [[79, 4], [81, 4], [83, 4], [86, 4]],
        [[88, 8], [83, 4], [80, 4]],
      ],
    },
  },
  order: ['intro', 'verse', 'chorus', 'verse', 'chorus'],
  loopTo: 1,
};

// Title: the battle chorus as a slow, glowing synth piece (no guitars or drums).
const TITLE = {
  bpm: 92,
  soft: true,
  sections: {
    a: {
      bars: ['Em', 'C', 'G', 'D', 'Em', 'C', 'D', 'B'], pad: true, arp: true, bass: 'roots',
      lead: BATTLE.sections.chorus.lead.map((bar) => bar.map(([m, d]) => [m ? m - 12 : 0, d])),
    },
    b: { bars: ['Am', 'C', 'Em', 'D', 'C', 'D', 'B', 'B'], pad: true, arp: true, bass: 'roots' },
  },
  order: ['b', 'a'],
  loopTo: 0,
};

const SONGS = { battle: BATTLE, boss: BOSS, title: TITLE };

// Precompute per-section step events for the lead.
for (const song of Object.values(SONGS)) {
  for (const sec of Object.values(song.sections)) {
    if (!sec.lead) continue;
    sec.leadSteps = sec.lead.map((bar) => {
      const ev = [];
      let st = 0;
      for (const [m, d] of bar) { if (m) ev.push([st, m, d]); st += d; }
      return ev;
    });
  }
}

function makeIR(ctx, secs, decay) {
  const len = Math.floor(ctx.sampleRate * secs);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      const t = i / len;
      lp += (Math.random() * 2 - 1 - lp) * (0.55 - t * 0.4); // darken the tail
      d[i] = lp * Math.pow(1 - t, decay) * (i < ctx.sampleRate * 0.012 ? i / (ctx.sampleRate * 0.012) : 1);
    }
  }
  return buf;
}

function distCurve(k) {
  const n = 2048, c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    c[i] = Math.tanh(k * x) / Math.tanh(k);
  }
  return c;
}

export class Music {
  constructor(ctx, dest, noise) {
    this.ctx = ctx;
    this.noise = noise;
    this.out = ctx.createGain();
    this.out.gain.value = 1;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 8;
    comp.ratio.value = 3.5;
    comp.attack.value = 0.008;
    comp.release.value = 0.18;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.85;
    this.bus.connect(comp).connect(this.out).connect(dest);
    // plate-ish reverb
    this.verb = ctx.createConvolver();
    this.verb.buffer = makeIR(ctx, 2.4, 3.2);
    const vr = ctx.createGain();
    vr.gain.value = 0.28;
    const vhp = ctx.createBiquadFilter();
    vhp.type = 'highpass';
    vhp.frequency.value = 250;
    this.verb.connect(vhp).connect(vr).connect(this.bus);
    // dotted-eighth delay for the lead (tempo set per song)
    this.delay = ctx.createDelay(1.5);
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    const dlp = ctx.createBiquadFilter();
    dlp.type = 'lowpass';
    dlp.frequency.value = 2600;
    const dOut = ctx.createGain();
    dOut.gain.value = 0.3;
    this.delay.connect(dlp).connect(fb).connect(this.delay);
    dlp.connect(dOut).connect(this.bus);
    dOut.connect(this.verb);
    // two guitar amps, hard-panned for a double-tracked wall
    this.amps = [this.makeAmp(-0.75), this.makeAmp(0.75)];
    this.song = null;
    this.timer = null;
    this.lastLead = null;
  }

  makeAmp(pan) {
    const ctx = this.ctx;
    const input = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 95;
    const drive = ctx.createGain();
    drive.gain.value = 9;
    const ws = ctx.createWaveShaper();
    ws.curve = distCurve(4);
    ws.oversample = '4x';
    const scoop = ctx.createBiquadFilter();
    scoop.type = 'peaking';
    scoop.frequency.value = 700;
    scoop.gain.value = -5;
    scoop.Q.value = 0.8;
    const pres = ctx.createBiquadFilter();
    pres.type = 'peaking';
    pres.frequency.value = 2400;
    pres.gain.value = 4;
    pres.Q.value = 1.1;
    const cab = ctx.createBiquadFilter();
    cab.type = 'lowpass';
    cab.frequency.value = 4800;
    cab.Q.value = 0.9;
    const cab2 = ctx.createBiquadFilter();
    cab2.type = 'lowpass';
    cab2.frequency.value = 7000;
    const out = ctx.createGain();
    out.gain.value = 0.085;
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    input.connect(hp).connect(drive).connect(ws).connect(scoop).connect(pres).connect(cab).connect(cab2).connect(out).connect(p).connect(this.bus);
    const send = ctx.createGain();
    send.gain.value = 0.12;
    out.connect(send).connect(this.verb);
    return input;
  }

  setVolume(v, t = 0.3) {
    this.out.gain.setTargetAtTime(v, this.ctx.currentTime, t);
  }

  // Dip the score under a big moment (SP attack), then swell back.
  duck(depth = 0.3, hold = 0.9) {
    const g = this.bus.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(0.85 * depth, now, 0.05);
    g.setTargetAtTime(0.85, now + hold, 0.35);
  }

  play(name) {
    const song = SONGS[name];
    this.stop();
    if (!song) return;
    this.song = song;
    this.secIdx = 0;
    this.bar = 0;
    this.step = 0;
    this.next = this.ctx.currentTime + 0.08;
    this.stepDur = 60 / song.bpm / 4;
    this.delay.delayTime.value = this.stepDur * 3;
    this.lastLead = null;
    this.bus.gain.cancelScheduledValues(this.ctx.currentTime);
    this.bus.gain.setValueAtTime(0.85, this.ctx.currentTime);
    const tick = () => {
      while (this.song && this.next < this.ctx.currentTime + 0.14) {
        this.schedule(this.next);
        this.advance();
        this.next += this.stepDur;
      }
    };
    this.timer = setInterval(tick, 25);
    tick();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.song = null;
  }

  advance() {
    const song = this.song;
    const sec = song.sections[song.order[this.secIdx]];
    if (++this.step < 16) return;
    this.step = 0;
    if (++this.bar < sec.bars.length) return;
    this.bar = 0;
    if (++this.secIdx >= song.order.length) this.secIdx = song.loopTo;
  }

  schedule(t) {
    const song = this.song;
    const sec = song.sections[song.order[this.secIdx]];
    const bar = this.bar, st = this.step;
    const chord = parseChord(sec.bars[bar]);
    const pick = (v) => (Array.isArray(v) ? v[bar] : v);
    const sd = this.stepDur;

    // guitars + following bass
    const riffName = pick(sec.gtr);
    const riff = riffName && RIFFS[riffName];
    if (riff) {
      for (const [s, len, kind, off = 0] of riff) {
        if (s !== st) continue;
        const root = chord.gtr + off;
        this.power(t, root, len * sd, kind === 'm');
        if (sec.bass === 'follow') this.bassNote(t, root - 12, Math.max(len, 1) * sd * (kind === 'm' ? 0.8 : 0.95));
      }
    }
    if (sec.bass === 'eighths' && st % 2 === 0) this.bassNote(t, chord.gtr - 12, sd * 1.8);
    if (sec.bass === 'octaves' && st % 2 === 0) this.bassNote(t, chord.gtr - 12 + (st % 4 === 2 ? 12 : 0), sd * 1.8);
    if (sec.bass === 'roots' && st === 0) this.bassNote(t, chord.gtr - 12, sd * 15, true);

    // drums
    const dp = DRUMS[pick(sec.drums)];
    if (dp) {
      if (dp.k.includes(st)) this.kick(t);
      if (dp.s.includes(st)) this.snare(t, dp === DRUMS.roll && st > 7 ? 0.4 + (st - 8) * 0.08 : 1);
      if (dp.h.includes(st)) this.hat(t, false);
      if (dp.o.includes(st)) this.hat(t, true);
      if (dp.t && dp.t.includes(st)) this.tom(t, 150 - st * 12);
    }
    if (sec.crash && st === 0 && (bar === 0 || (sec.crashEvery && bar % sec.crashEvery === 0))) this.crash(t);

    // pads
    if (sec.pad && st === 0) this.pad(t, chord, sd * 16, song.soft);
    // arp
    if (sec.arp && (!song.soft || st % 2 === 0)) {
      const tones = [0, chord.minor ? 3 : 4, 7, 12];
      const order = [0, 1, 2, 3, 2, 1, 2, 3];
      const n = 64 + ((chord.pc - 4 + 12) % 12) + tones[order[(st >> (song.soft ? 1 : 0)) % 8]];
      this.arp(t, song.soft ? n : n + 12, sd * (song.soft ? 1.8 : 0.9), song.soft);
    }
    // lead
    if (sec.leadSteps) {
      for (const [s, m, d] of sec.leadSteps[bar]) if (s === st) this.lead(t, m, d * sd, song.soft);
    }
  }

  // ---------------------------------------------------------------- instruments
  power(t, root, dur, mute) {
    const ctx = this.ctx;
    this.amps.forEach((amp, side) => {
      const tt = t + side * 0.007; // double-track: slightly late second guitar
      const g = ctx.createGain();
      const peak = mute ? 0.5 : 0.6;
      g.gain.setValueAtTime(0.0001, tt);
      g.gain.exponentialRampToValueAtTime(peak, tt + 0.004);
      if (mute) g.gain.exponentialRampToValueAtTime(0.0001, tt + Math.min(dur, 0.16));
      else {
        g.gain.setValueAtTime(peak, tt + Math.max(0.01, dur - 0.04));
        g.gain.exponentialRampToValueAtTime(0.0001, tt + dur + 0.05);
      }
      let dest = amp;
      if (mute) {
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.setValueAtTime(1400, tt);
        lp.frequency.exponentialRampToValueAtTime(500, tt + 0.1);
        lp.connect(amp);
        dest = lp;
      }
      g.connect(dest);
      for (const iv of [0, 7, 12]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(root + iv);
        o.detune.value = (side ? 5 : -5) + (iv === 12 ? 3 : 0);
        o.connect(g);
        o.start(tt);
        o.stop(tt + dur + 0.1);
      }
    });
  }

  bassNote(t, midi, dur, soft = false) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(soft ? 500 : 1400, t);
    lp.frequency.exponentialRampToValueAtTime(soft ? 300 : 380, t + Math.min(dur, 0.25));
    lp.Q.value = 2;
    const vol = soft ? 0.18 : 0.3;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (soft ? 0.08 : 0.005));
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);
    lp.connect(g).connect(this.bus);
    const types = soft ? ['sine', 'triangle'] : ['sawtooth', 'sine'];
    types.forEach((type, i) => {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = mtof(midi) * (i ? 0.5 : 1);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.08);
    });
  }

  lead(t, midi, dur, soft = false) {
    const ctx = this.ctx;
    const f = mtof(midi);
    const from = this.lastLead && Math.abs(this.lastLead - midi) < 12 ? mtof(this.lastLead) : f;
    this.lastLead = midi;
    const g = ctx.createGain();
    const vol = soft ? 0.11 : 0.1;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (soft ? 0.05 : 0.012));
    g.gain.setValueAtTime(vol, t + Math.max(0.03, dur - 0.04));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (soft ? 0.25 : 0.06));
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = soft ? 2200 : 3800;
    lp.Q.value = 1.5;
    let chain = lp;
    if (!soft) {
      const ws = ctx.createWaveShaper();
      ws.curve = distCurve(2.2);
      lp.connect(ws);
      chain = ws;
    }
    chain.connect(g);
    g.connect(this.bus);
    const send = ctx.createGain();
    send.gain.value = soft ? 0.5 : 0.35;
    g.connect(send);
    send.connect(this.delay);
    send.connect(this.verb);
    // vibrato that blooms on held notes
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.6;
    const lg = ctx.createGain();
    lg.gain.setValueAtTime(0, t);
    lg.gain.setValueAtTime(0, t + Math.min(0.18, dur * 0.5));
    lg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(0.45, dur));
    lfo.connect(lg);
    const voices = soft ? [['triangle', 0], ['sine', 0]] : [['sawtooth', -8], ['square', 8]];
    for (const [type, det] of voices) {
      const o = ctx.createOscillator();
      o.type = type;
      o.detune.value = det;
      o.frequency.setValueAtTime(from, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.045); // portamento
      lg.connect(o.frequency);
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.3);
    }
    lfo.start(t);
    lfo.stop(t + dur + 0.3);
  }

  pad(t, chord, dur, soft) {
    const ctx = this.ctx;
    const base = 52 + ((chord.pc - 4 + 12) % 12);
    const notes = [base, base + (chord.minor ? 3 : 4), base + 7, base + 12];
    const g = ctx.createGain();
    const vol = soft ? 0.07 : 0.045;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.25);
    g.gain.setValueAtTime(vol, t + dur - 0.1);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = soft ? 1400 : 2000;
    lp.connect(g).connect(this.bus);
    const send = ctx.createGain();
    send.gain.value = 0.6;
    g.connect(send).connect(this.verb);
    for (const n of notes) for (const det of [-9, 9]) {
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = mtof(n);
      o.detune.value = det;
      o.connect(lp);
      o.start(t);
      o.stop(t + dur + 0.6);
    }
  }

  arp(t, midi, dur, soft) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = soft ? 'triangle' : 'square';
    o.frequency.value = mtof(midi);
    const g = ctx.createGain();
    const vol = soft ? 0.05 : 0.025;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = soft ? 2400 : 3000;
    o.connect(lp).connect(g).connect(this.bus);
    const send = ctx.createGain();
    send.gain.value = 0.4;
    g.connect(send).connect(this.delay);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  noiseHit(t, dur, vol, type, f, q = 0.8, dest = this.bus, f1 = f) {
    const ctx = this.ctx;
    const s = ctx.createBufferSource();
    s.buffer = this.noise;
    const bf = ctx.createBiquadFilter();
    bf.type = type;
    bf.frequency.setValueAtTime(f, t);
    if (f1 !== f) bf.frequency.exponentialRampToValueAtTime(f1, t + dur);
    bf.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(bf).connect(g).connect(dest);
    s.start(t, Math.random() * 1.5);
    s.stop(t + dur + 0.02);
    return g;
  }

  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(46, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(1.0, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.35);
    this.noiseHit(t, 0.012, 0.35, 'highpass', 2500); // beater click
  }

  snare(t, vel = 1) {
    const ctx = this.ctx;
    const g = this.noiseHit(t, 0.19, 0.55 * vel, 'bandpass', 2200, 0.7);
    this.noiseHit(t, 0.12, 0.3 * vel, 'highpass', 5000);
    const send = ctx.createGain();
    send.gain.value = 0.45;
    g.connect(send).connect(this.verb);
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(210, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.07);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.45 * vel, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    o.connect(og).connect(this.bus);
    o.start(t);
    o.stop(t + 0.1);
  }

  hat(t, open) {
    this.noiseHit(t, open ? 0.22 : 0.035, open ? 0.12 : 0.14, 'highpass', 8200, 0.6);
  }

  crash(t) {
    const g = this.noiseHit(t, 1.7, 0.28, 'highpass', 4200, 0.5);
    this.noiseHit(t, 1.2, 0.12, 'bandpass', 9000, 1.2);
    const send = this.ctx.createGain();
    send.gain.value = 0.5;
    g.connect(send).connect(this.verb);
  }

  tom(t, f) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.22);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.7, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.32);
    this.noiseHit(t, 0.03, 0.15, 'lowpass', 1500);
  }

  // ---------------------------------------------------------------- stingers
  victory() {
    this.stop();
    const t = this.ctx.currentTime + 0.05;
    const sd = 60 / 150 / 4;
    const hits = [[0, 45, 2], [3, 47, 2], [6, 48, 2], [8, 50, 2], [12, 52, 14]]; // A B C D -> big E
    for (const [s, root, len] of hits) {
      this.power(t + s * sd, root, len * sd, false);
      this.bassNote(t + s * sd, root - 12, len * sd);
      this.kick(t + s * sd);
    }
    this.crash(t + 12 * sd);
    this.snare(t + 12 * sd);
    this.lastLead = null;
    [[12, 76, 4], [16, 80, 4], [20, 83, 4], [24, 88, 16]].forEach(([s, m, d]) => this.lead(t + s * sd, m, d * sd));
    this.pad(t + 12 * sd, { pc: 4, minor: false }, 28 * sd, false);
  }

  defeat() {
    this.stop();
    const t = this.ctx.currentTime + 0.05;
    const sd = 60 / 70 / 4;
    this.power(t, 40, 8 * sd, false);
    this.crash(t);
    this.lastLead = null;
    [[0, 71, 4], [4, 69, 4], [8, 67, 4], [12, 64, 16]].forEach(([s, m, d]) => this.lead(t + s * sd, m, d * sd, true));
    this.pad(t, { pc: 4, minor: true }, 28 * sd, true);
  }
}
