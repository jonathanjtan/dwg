// Score in the style of late-70s anime orchestral funk, synthesized live with WebAudio: a brass section
// (trumpets on the tune, horns under them, short chord stabs), a string section, a plucked funk bass, glockenspiel,
// timpani and a dry march-funk kit, glued by a bus compressor and a shared hall reverb.
// Songs are sections of bars; each part is a line of [note, length in 16ths] per bar (a note name like 'Bb4', a chord
// as an array of names, '-' for a rest), and the drums name a pattern per bar.

const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const midi = (name) => {
  const m = /^([A-G][#b]?)(-?\d)$/.exec(name);
  return 12 * (+m[2] + 1) + PC[m[1]];
};
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------------------------------------------------------- drums
// k kick, s snare, g ghost snare, h closed hat, a soft hat, o open hat, t tom, r snare roll (crescendo)
const all16 = Array.from({ length: 16 }, (_, i) => i);
const DRUMS = {
  none: {},
  march: { k: [0, 7, 8, 10], s: [4, 12], g: [14], h: [0, 2, 4, 6, 8, 10, 12, 14], a: [3, 11] },
  drive: { k: [0, 4, 8, 12], s: [4, 12], g: [7, 15], h: all16 },
  half: { k: [0, 10], s: [8], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  gallop: { k: [0, 2, 3, 4, 6, 7, 8, 10, 11, 12, 14, 15], s: [4, 12], o: [0, 4, 8, 12] },
  fill: { k: [0], s: [8, 10, 12, 13, 14, 15], t: [0, 2, 4, 6] },
  roll: { r: all16 },
  hits: { k: [0, 6], s: [6] },
  four: { k: [0, 4, 8, 12], s: [4, 12], h: [0, 4, 8, 12], o: [2, 6, 10, 14] },
  half16: { k: [0, 10], s: [8], g: [14], h: all16 },
  synco: { k: [0, 2, 6, 8, 11], s: [4, 12], g: [14], h: [0, 2, 4, 6, 8, 10, 12, 14] },
  stop: { k: [0, 8], h: [1, 2, 3, 4] },
  brk: { k: [0], s: [6, 13], h: [0] },
  brk2: { s: [2], h: [0, 1] },
};

// ---------------------------------------------------------------- songs
const rep = (bar, n) => Array.from({ length: n }, () => bar);
const eighths = (lo, hi) => rep([[lo, 2], [hi, 2]], 4).flat();
const Dm = ['D4', 'F4', 'A4'], Bb = ['D4', 'F4', 'Bb4'], Cmaj = ['E4', 'G4', 'C5'], Gm = ['D4', 'G4', 'Bb4'];
const A7 = ['C#4', 'E4', 'G4', 'A4'], Amaj = ['C#4', 'E4', 'A4'], Fmaj = ['F4', 'A4', 'C5'], Eb = ['Eb4', 'G4', 'Bb4'];

// Battle theme (A minor, 140 bpm), transcribed from a reference track onto this band. A bright A major stab intro, then
// a two-bar riff (Am | Dm C F/A) chugged by the brass stabs over a pumping A pedal and a four-on-the-floor kick; the
// trumpet adds syncopated A pings and a chromatic climb; a hard stop, then the whole riff a half step up in Bb minor over
// a syncopated groove, and a two-bar break back into the riff.
const transpose = (bars, k) => bars.map((bar) => bar && bar.map(([n, d]) => [n === '-' ? n : Array.isArray(n) ? n.map((x) => shift(x, k)) : shift(n, k), d]));
const AM = ['A3', 'C#4', 'E4'], A5 = ['A3', 'E4', 'A4'];
const Am = ['A3', 'C4', 'E4'], DmA = ['A3', 'D4', 'F4'], Cg = ['G3', 'C4', 'E4'], FA = ['C4', 'F4', 'A4'];
const chug = (c) => [[c, 2], ['-', 1], [c, 1], [c, 2], ['-', 1], [c, 1], [c, 2], ['-', 1], [c, 1], [c, 2], ['-', 1], [c, 1]];
const RIFF = {
  stab: [chug(Am), [[Am, 2], ['-', 1], [Am, 1], [DmA, 2], ['-', 1], [DmA, 1], [DmA, 2], [Cg, 1], [Cg, 1], [Cg, 2], [FA, 2]]],
  strings: [[[Am, 16]], [[Am, 4], [DmA, 6], [Cg, 4], [FA, 2]]],
  horn: [[['E4', 16]], [['E4', 4], ['F4', 6], ['G4', 4], ['A4', 2]]],
};
const pump = (lo, hi) => rep([[hi, 1], [lo, 3]], 4).flat();
const PING = [['-', 2], ['A5', 3], ['-', 2], ['A5', 5], ['-', 2], ['A5', 2]];
const LINE = [['-', 4], ['F5', 6], ['G5', 4], ['A5', 2]];
const bbBass = [['Bb1', 2], ['Bb2', 2], ['Bb1', 2], ['F2', 2], ['Bb1', 2], ['Bb2', 2], ['Bb1', 2], ['Bb2', 2]];
const BATTLE = {
  bpm: 140,
  sections: {
    intro: {
      drums: ['four', 'four', 'four', 'fill'], crash: [0],
      stab: [...rep(rep([[AM, 2], ['-', 2]], 4).flat(), 2), ...rep(rep([[A5, 2], ['-', 2]], 4).flat(), 2)],
      strings: [[[AM, 16]], [[AM, 16]], [[A5, 16]], [[A5, 16]]],
      horn: [...rep([['C#5', 2], ['A4', 2], ['C#5', 2], ['A4', 1], ['C#5', 9]], 2), null, null],
      bass: rep(pump('A1', 'A2'), 4),
      timp: [[['A1', 4], ['-', 12]], null, [['A1', 4], ['-', 12]], rep(['A1', 1], 16)],
    },
    A: {
      drums: ['four', 'four', 'four', 'four'], crash: [0],
      ...Object.fromEntries(Object.entries(RIFF).map(([k, v]) => [k, rep(v, 2).flat()])),
      bass: rep(pump('A1', 'A2'), 4),
    },
    L: {
      drums: ['drive', 'drive', 'half16', 'half16', 'half16', 'half16'], crash: [0, 4],
      ...Object.fromEntries(Object.entries(RIFF).map(([k, v]) => [k, rep(v, 3).flat()])),
      bass: rep(pump('A1', 'A2'), 6),
      trumpet: [PING, LINE, PING, LINE,
        [['-', 2], ['A5', 3], ['-', 4], ['E5', 1], ['F5', 1], ['F#5', 1], ['G5', 1], ['G#5', 1], ['A5', 2]], LINE],
      glock: [transpose([PING], 12)[0], null, transpose([PING], 12)[0], null, null, null],
    },
    // Bar 1 is the riff's first bar with a fill; bar 2 is two hits and silence.
    S: {
      drums: ['fill', 'stop'],
      stab: [chug(Am), [[Am, 2], ['-', 6], [A5, 2], ['-', 6]]],
      strings: [[[Am, 16]], null],
      horn: [[['E4', 16]], null],
      bass: [pump('A1', 'A2'), [['A1', 2], ['-', 6], ['A1', 2], ['-', 6]]],
    },
    B: {
      drums: ['synco', 'synco', 'synco', 'synco', 'synco', 'synco', 'synco', 'fill'], crash: [0, 4],
      ...Object.fromEntries(Object.entries(RIFF).map(([k, v]) => [k, transpose(rep(v, 4).flat(), 1)])),
      bass: rep(bbBass, 8),
      trumpet: [null, transpose([LINE], 1)[0], null, transpose([LINE], 1)[0],
        [['-', 5], ['Bb5', 11]], [['Bb5', 12], ['Ab5', 2], ['Bb5', 2]], null, transpose([LINE], 1)[0]],
    },
    brk: {
      drums: ['brk', 'brk2'], crash: [0],
      timp: [null, rep(['A1', 1], 16)],
    },
  },
  order: ['intro', 'A', 'L', 'S', 'B', 'brk'],
  loopTo: 1,
};

// The old battle tune's chorus and verse, kept for the title piece.
const CHORUS = [
  [['D5', 3], ['D5', 1], ['F5', 4], ['A5', 8]],
  [['Bb5', 6], ['A5', 2], ['F5', 4], ['D5', 4]],
  [['F5', 4], ['E5', 4], ['F5', 4], ['A5', 4]],
  [['G5', 8], ['E5', 4], ['C5', 4]],
  [['D5', 4], ['G5', 4], ['Bb5', 4], ['G5', 4]],
  [['A5', 6], ['F5', 2], ['D5', 8]],
  [['Eb5', 4], ['G5', 4], ['Bb5', 4], ['C6', 4]],
  [['C#6', 8], ['A5', 4], ['C#5', 4]],
];
const CHORUS_CHORDS = [
  [[['D4', 'A4'], 16]], [[['D4', 'F4'], 8], [['F4', 'Bb4'], 8]], [[Fmaj, 16]], [[Cmaj, 16]],
  [[Gm, 16]], [[Dm, 16]], [[Eb, 16]], [[['E4', 'A4', 'C#5'], 16]],
];
const VERSE = [
  [['D5', 8], ['C5', 4], ['Bb4', 4]],
  [['C5', 8], ['Bb4', 4], ['A4', 4]],
  [['A4', 4], ['C5', 4], ['F5', 8]],
  [['F5', 6], ['E5', 2], ['D5', 8]],
  [['E5', 4], ['D5', 4], ['C5', 4], ['Bb4', 4]],
  [['A4', 8], ['C#5', 8]],
  [['D5', 4], ['A4', 4], ['F4', 4], ['D4', 4]],
  [['E4', 8], ['C#4', 8]],
];

// "Red Comet" (E minor, 168 bpm): chromatic brass hits over a driving pedal bass, then a soaring chorus.
const Em = ['E4', 'G4', 'B4'], Fm = ['F4', 'A4', 'C5'], Gmaj = ['G4', 'B4', 'D5'];
const pedal = (r) => rep([[r + '2', 1], [r + '2', 1], [r + '3', 1], [r + '2', 1]], 4).flat();
const BOSS = {
  bpm: 168,
  sections: {
    intro: {
      drums: ['gallop', 'gallop', 'gallop', 'fill'], crash: [0],
      stab: [
        [[Em, 2], ['-', 1], [Em, 1], ['-', 2], [Fm, 2], ['-', 8]],
        [[Em, 2], ['-', 1], [Em, 1], ['-', 2], [Fm, 2], ['-', 4], [Gmaj, 4]],
        [[Em, 2], ['-', 1], [Em, 1], ['-', 2], [Fm, 2], ['-', 8]],
        [[Fm, 4], [Em, 4], [Fm, 4], [Em, 4]],
      ],
      bass: [pedal('E'), pedal('E'), pedal('E'), pedal('E')],
      timp: [[['E2', 4], ['-', 12]], null, [['E2', 4], ['-', 12]], rep(['E2', 2], 8)],
    },
    A: {
      drums: ['gallop', 'gallop', 'gallop', 'gallop', 'gallop', 'gallop', 'gallop', 'fill'], crash: [0, 2, 4, 6],
      trumpet: [
        [['E5', 4], ['B4', 4], ['E5', 2], ['F5', 2], ['G5', 4]],
        [['F5', 6], ['E5', 2], ['C5', 8]],
        [['E5', 4], ['G5', 4], ['B5', 4], ['G5', 4]],
        [['A5', 8], ['F#5', 4], ['D5', 4]],
        [['E5', 4], ['C5', 4], ['G5', 4], ['E5', 4]],
        [['D#5', 8], ['F#5', 4], ['B5', 4]],
        [['G5', 4], ['F#5', 2], ['E5', 2], ['B4', 8]],
        [['C5', 4], ['E5', 4], ['F5', 8]],
      ],
      horn: [[['B4', 16]], [['A4', 16]], [['B4', 16]], [['A4', 16]], [['G4', 16]], [['F#4', 16]], [['G4', 16]], [['A4', 16]]],
      strings: [[[Em, 16]], [[Fm, 16]], [[Em, 16]], [[['D4', 'F#4', 'A4'], 16]], [[['C4', 'E4', 'G4'], 16]], [[['B3', 'D#4', 'F#4'], 16]], [[Em, 16]], [[Fm, 16]]],
      bass: [pedal('E'), pedal('F'), pedal('E'), pedal('D'), pedal('C'), pedal('B'), pedal('E'), pedal('F')],
    },
    B: {
      drums: ['march', 'march', 'march', 'march', 'march', 'march', 'march', 'fill'], crash: [0, 2, 4, 6],
      trumpet: [
        [['E5', 4], ['A5', 4], ['B5', 4], ['C6', 4]],
        [['C6', 8], ['B5', 4], ['A5', 4]],
        [['F5', 4], ['A5', 4], ['D6', 6], ['C6', 2]],
        [['B5', 8], ['G#5', 8]],
        [['A5', 4], ['C6', 4], ['E6', 4], ['D6', 4]],
        [['C6', 6], ['B5', 2], ['A5', 4], ['F5', 4]],
        [['G5', 4], ['A5', 4], ['B5', 4], ['D6', 4]],
        [['E6', 8], ['B5', 4], ['G#5', 4]],
      ],
      strings: [
        [[['A3', 'C4', 'E4'], 16]], [[['F3', 'A3', 'C4'], 16]], [[['D4', 'F#4', 'A4'], 16]], [[['E4', 'G#4', 'B4'], 16]],
        [[['A3', 'C4', 'E4'], 16]], [[['F3', 'A3', 'C4'], 16]], [[['G3', 'B3', 'D4'], 16]], [[['E4', 'G#4', 'B4'], 16]],
      ],
      bass: [eighths('A1', 'A2'), eighths('F1', 'F2'), eighths('D2', 'D3'), eighths('E2', 'E3'), eighths('A1', 'A2'), eighths('F1', 'F2'), eighths('G1', 'G2'), eighths('E2', 'E3')],
      timp: [[['A1', 4], ['-', 12]], null, null, [['E2', 4], ['-', 12]], [['A1', 4], ['-', 12]], null, null, rep(['E2', 2], 8)],
    },
  },
  order: ['intro', 'A', 'B', 'A', 'B'],
  loopTo: 1,
};
BOSS.sections.B.horn = BOSS.sections.B.trumpet.map((bar) => bar.map(([n, d]) => [n === '-' ? n : shift(n, -12), d]));

// Title: the old battle chorus as a slow, warm horn piece over strings, with glockenspiel (no drums).
const TITLE = {
  bpm: 84,
  soft: true,
  sections: {
    a: {
      horn: CHORUS.map((bar) => bar.map(([n, d]) => [n === '-' ? n : shift(n, -12), d])),
      strings: CHORUS_CHORDS,
      bass: [[['D3', 16]], [['Bb2', 16]], [['F2', 16]], [['C3', 16]], [['G2', 16]], [['D3', 16]], [['Eb3', 16]], [['A2', 16]]],
      glock: [null, null, null, [['G5', 4], ['E5', 4], ['C5', 8]], null, null, null, [['C#6', 4], ['A5', 4], ['E5', 8]]],
    },
    b: {
      strings: [[[Gm, 16]], [[Cmaj, 16]], [[Fmaj, 16]], [[Bb, 16]], [[['E4', 'G4', 'Bb4'], 16]], [[A7, 16]], [[Dm, 16]], [[Amaj, 16]]],
      bass: [[['G2', 16]], [['C3', 16]], [['F2', 16]], [['Bb2', 16]], [['E2', 16]], [['A2', 16]], [['D3', 16]], [['A2', 16]]],
      glock: VERSE.map((bar) => bar.map(([n, d]) => [n === '-' ? n : shift(n, 12), d])),
    },
  },
  order: ['b', 'a'],
  loopTo: 0,
};

function shift(name, semis) {
  const m = midi(name) + semis;
  const names = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  return names[m % 12] + (Math.floor(m / 12) - 1);
}

const SONGS = { battle: BATTLE, boss: BOSS, title: TITLE };
const PARTS = ['trumpet', 'horn', 'stab', 'strings', 'bass', 'glock', 'timp'];

// Precompute each part's note events per bar: [step, midi[], length in steps].
for (const song of Object.values(SONGS)) {
  for (const sec of Object.values(song.sections)) {
    sec.bars = Math.max(...PARTS.map((p) => sec[p]?.length || 0), sec.drums?.length || 0);
    sec.ev = {};
    for (const p of PARTS) {
      if (!sec[p]) continue;
      sec.ev[p] = sec[p].map((bar) => {
        const ev = [];
        let st = 0;
        for (const [n, d] of bar || []) {
          if (n !== '-') ev.push([st, (Array.isArray(n) ? n : [n]).map(midi), d]);
          st += d;
        }
        return ev;
      });
    }
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
    // hall reverb
    this.verb = ctx.createConvolver();
    this.verb.buffer = makeIR(ctx, 2.6, 3.0);
    const vr = ctx.createGain();
    vr.gain.value = 0.3;
    const vhp = ctx.createBiquadFilter();
    vhp.type = 'highpass';
    vhp.frequency.value = 220;
    this.verb.connect(vhp).connect(vr).connect(this.bus);
    this.pans = {};
    for (const [k, v] of Object.entries({ trumpet: -0.22, horn: 0.28, stab: 0, strings: 0, bass: 0, glock: -0.35, timp: 0.15 })) {
      const p = ctx.createStereoPanner();
      p.pan.value = v;
      p.connect(this.bus);
      this.pans[k] = p;
    }
    this.song = null;
    this.timer = null;
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
    if (++this.bar < sec.bars) return;
    this.bar = 0;
    if (++this.secIdx >= song.order.length) this.secIdx = song.loopTo;
  }

  schedule(t) {
    const song = this.song;
    const sec = song.sections[song.order[this.secIdx]];
    const bar = this.bar, st = this.step, sd = this.stepDur, soft = !!song.soft;
    // drums
    const dp = sec.drums && DRUMS[sec.drums[bar]];
    if (dp) {
      if (dp.k?.includes(st)) this.kick(t);
      if (dp.s?.includes(st)) this.snare(t, 1);
      if (dp.g?.includes(st)) this.snare(t, 0.28);
      if (dp.r?.includes(st)) this.snare(t, 0.25 + (st / 15) * 0.75);
      if (dp.h?.includes(st)) this.hat(t, false, st % 4 === 0 ? 1 : 0.7);
      if (dp.a?.includes(st)) this.hat(t, false, 0.45);
      if (dp.o?.includes(st)) this.hat(t, true, 1);
      if (dp.t?.includes(st)) this.tom(t, 170 - st * 14);
    }
    if (st === 0 && sec.crash?.includes(bar)) this.crash(t);
    // pitched parts
    for (const p in sec.ev) {
      const evs = sec.ev[p][bar];
      if (!evs) continue;
      for (const [s, notes, d] of evs) {
        if (s !== st) continue;
        const dur = d * sd;
        switch (p) {
          case 'trumpet': this.brass(t, notes, dur, { vol: 0.11, bright: 1, dest: this.pans.trumpet, soft }); break;
          case 'horn': this.brass(t, notes, dur, { vol: soft ? 0.1 : 0.085, bright: 0.5, low: true, dest: this.pans.horn, soft }); break;
          case 'stab': this.brass(t, notes, dur, { vol: 0.07, bright: 1.15, stab: true, dest: this.pans.stab }); break;
          case 'strings': this.strings(t, notes, dur, soft); break;
          case 'bass': this.fbass(t, notes[0], dur, soft); break;
          case 'glock': this.glock(t, notes[0], dur); break;
          case 'timp': this.timp(t, notes[0], dur); break;
        }
      }
    }
  }

  // ---------------------------------------------------------------- instruments
  // Brass: three detuned saws that scoop up into pitch, through a low-pass that flares open on the attack ("blat") and
  // settles; vibrato blooms on held notes; horns add a square an octave down for body; a little breath on the front.
  brass(t, notes, dur, { vol = 0.07, bright = 1, low = false, stab = false, soft = false, dest = this.bus } = {}) {
    const ctx = this.ctx;
    const n = notes.length;
    const v = vol / Math.sqrt(n);
    const att = stab ? 0.008 : soft ? 0.12 : 0.028;
    const rel = stab ? 0.09 : soft ? 0.3 : 0.08;
    const hold = Math.max(att + 0.01, dur - (stab ? 0 : 0.03));
    const send = ctx.createGain();
    send.gain.value = soft ? 0.5 : 0.25;
    send.connect(this.verb);
    for (const m of notes) {
      const f = mtof(m);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + att);
      if (stab) g.gain.exponentialRampToValueAtTime(v * 0.35, t + Math.min(hold, 0.12));
      else g.gain.setValueAtTime(v, t + hold);
      g.gain.exponentialRampToValueAtTime(0.0001, t + hold + rel);
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.Q.value = 0.9;
      const top = Math.min(9000, f * (4 + 7 * bright) * (soft ? 0.6 : 1));
      lp.frequency.setValueAtTime(f * 1.2, t);
      lp.frequency.exponentialRampToValueAtTime(top, t + att + 0.02);
      lp.frequency.exponentialRampToValueAtTime(Math.max(f * 1.5, top * 0.62), t + att + 0.3);
      lp.connect(g);
      g.connect(dest);
      g.connect(send);
      const end = t + hold + rel + 0.05;
      let lg = null;
      if (dur > 0.35 && !stab) {
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 5.3;
        lg = ctx.createGain();
        lg.gain.setValueAtTime(0, t);
        lg.gain.setValueAtTime(0, t + 0.22);
        lg.gain.linearRampToValueAtTime(f * 0.007, t + Math.min(0.6, dur));
        lfo.connect(lg);
        lfo.start(t);
        lfo.stop(end);
      }
      const oscs = [['sawtooth', -7, 1], ['sawtooth', 6, 1], ['sawtooth', 0, 0.8]];
      if (low) oscs.push(['square', 0, 0.35, 0.5]);
      for (const [type, det, a, mul = 1] of oscs) {
        const o = ctx.createOscillator();
        o.type = type;
        o.detune.value = det;
        o.frequency.setValueAtTime(f * mul * (soft ? 0.99 : 0.965), t);
        o.frequency.exponentialRampToValueAtTime(f * mul, t + (soft ? 0.08 : 0.045));
        if (lg) lg.connect(o.frequency);
        const og = ctx.createGain();
        og.gain.value = a;
        o.connect(og).connect(lp);
        o.start(t);
        o.stop(end);
      }
    }
    if (!soft) this.noiseHit(t, 0.05, vol * 0.5, 'bandpass', 1900, 1.2, dest);
  }

  // String section: four detuned saws per note, a soft bow attack (sharper on fast runs), vibrato, lots of hall.
  strings(t, notes, dur, soft) {
    const ctx = this.ctx;
    const v = (soft ? 0.05 : 0.045) / Math.sqrt(notes.length);
    const att = Math.min(soft ? 0.25 : 0.1, dur * 0.35);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + att);
    g.gain.setValueAtTime(v, t + Math.max(att, dur - 0.05));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + (dur < 0.2 ? 0.08 : 0.35));
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = soft ? 2200 : 3200;
    lp.connect(g).connect(this.pans.strings);
    const send = ctx.createGain();
    send.gain.value = 0.55;
    g.connect(send).connect(this.verb);
    const end = t + dur + 0.45;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.8;
    const lg = ctx.createGain();
    lg.gain.value = 5;
    lfo.connect(lg);
    lfo.start(t);
    lfo.stop(end);
    for (const m of notes) {
      for (const det of [-12, -5, 5, 12]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(m);
        o.detune.value = det;
        lg.connect(o.detune);
        o.connect(lp);
        o.start(t);
        o.stop(end);
      }
    }
  }

  // Fingered funk bass: a saw with a sine an octave down, through a resonant low-pass that snaps shut after the pluck.
  fbass(t, m, dur, soft) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    const vol = soft ? 0.09 : 0.13;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + (soft ? 0.06 : 0.004));
    g.gain.setValueAtTime(vol * 0.8, t + Math.max(0.02, dur - 0.03));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.05);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.Q.value = soft ? 1 : 4;
    lp.frequency.setValueAtTime(soft ? 600 : 2400, t);
    lp.frequency.exponentialRampToValueAtTime(soft ? 300 : 480, t + Math.min(dur, 0.14));
    lp.connect(g).connect(this.pans.bass);
    const f = mtof(m);
    for (const [type, mul, a] of [['sawtooth', 1, 1], ['triangle', 1, 0.6]]) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f * mul;
      const og = ctx.createGain();
      og.gain.value = a;
      o.connect(og).connect(lp);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
  }

  // Glockenspiel: struck bar partials that ring out.
  glock(t, m, dur) {
    const ctx = this.ctx;
    const f = mtof(m);
    const send = ctx.createGain();
    send.gain.value = 0.5;
    send.connect(this.verb);
    for (const [mul, a, d] of [[1, 0.05, 0.9], [2.76, 0.012, 0.35], [5.4, 0.006, 0.15]]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * mul;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(a, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(d, Math.min(1.2, dur)));
      o.connect(g);
      g.connect(this.pans.glock);
      g.connect(send);
      o.start(t);
      o.stop(t + 1.3);
    }
  }

  // Timpani: a tuned drum that sags a little in pitch, with the mallet's thud.
  timp(t, m, dur) {
    const ctx = this.ctx;
    const f = mtof(m);
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f * 1.04, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.08);
    const g = ctx.createGain();
    const roll = dur < 0.15;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(roll ? 0.14 : 0.32, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (roll ? 0.3 : 1.2));
    o.connect(g).connect(this.pans.timp);
    const send = ctx.createGain();
    send.gain.value = 0.35;
    g.connect(send).connect(this.verb);
    o.start(t);
    o.stop(t + 1.3);
    this.noiseHit(t, 0.06, roll ? 0.08 : 0.18, 'lowpass', 500, 0.8, this.pans.timp);
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

  // A dry, tight 70s kit.
  kick(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(52, t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.26);
    this.noiseHit(t, 0.01, 0.2, 'bandpass', 1800, 1);
  }

  snare(t, vel = 1) {
    const ctx = this.ctx;
    const g = this.noiseHit(t, 0.15, 0.42 * vel, 'bandpass', 1900, 0.8);
    this.noiseHit(t, 0.08, 0.18 * vel, 'highpass', 5500);
    if (vel > 0.5) {
      const send = ctx.createGain();
      send.gain.value = 0.3;
      g.connect(send).connect(this.verb);
    }
    const o = ctx.createOscillator();
    o.type = 'triangle';
    o.frequency.setValueAtTime(230, t);
    o.frequency.exponentialRampToValueAtTime(175, t + 0.05);
    const og = ctx.createGain();
    og.gain.setValueAtTime(0.35 * vel, t);
    og.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    o.connect(og).connect(this.bus);
    o.start(t);
    o.stop(t + 0.08);
  }

  hat(t, open, vel = 1) {
    this.noiseHit(t, open ? 0.2 : 0.03, (open ? 0.1 : 0.11) * vel, 'highpass', 8500, 0.6);
  }

  crash(t) {
    const g = this.noiseHit(t, 1.8, 0.22, 'highpass', 4500, 0.5);
    this.noiseHit(t, 1.2, 0.1, 'bandpass', 9500, 1.2);
    const send = this.ctx.createGain();
    send.gain.value = 0.5;
    g.connect(send).connect(this.verb);
  }

  tom(t, f) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f, t);
    o.frequency.exponentialRampToValueAtTime(f * 0.62, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.6, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    o.connect(g).connect(this.bus);
    o.start(t);
    o.stop(t + 0.3);
    this.noiseHit(t, 0.03, 0.12, 'lowpass', 1500);
  }

  // ---------------------------------------------------------------- stingers
  // Mission complete: a brass fanfare up to a held D major chord, timpani and a crash.
  victory() {
    this.stop();
    const t = this.ctx.currentTime + 0.05;
    const sd = 60 / 132 / 4;
    const tp = (s, names, d, o = {}) => this.brass(t + s * sd, names.map(midi), d * sd, { vol: 0.08, bright: 1, dest: this.pans.trumpet, ...o });
    tp(0, ['D5'], 2); tp(2, ['D5'], 1); tp(3, ['D5'], 1); tp(4, ['F#5'], 2); tp(6, ['A5'], 2); tp(8, ['D6'], 20);
    this.brass(t + 8 * sd, ['D4', 'F#4', 'A4', 'D5'].map(midi), 20 * sd, { vol: 0.07, bright: 0.5, low: true, dest: this.pans.horn });
    this.strings(t + 8 * sd, ['D4', 'A4', 'F#5'].map(midi), 20 * sd, false);
    for (let i = 0; i < 8; i++) this.timp(t + i * sd, midi('A1'), sd * 0.9);
    this.timp(t + 8 * sd, midi('D2'), 2);
    this.fbass(t + 8 * sd, midi('D2'), 12 * sd);
    this.crash(t + 8 * sd);
    this.snare(t + 8 * sd);
    this.kick(t + 8 * sd);
  }

  // Mission failed: the horns sink through D minor over a dark string chord.
  defeat() {
    this.stop();
    const t = this.ctx.currentTime + 0.05;
    const sd = 60 / 66 / 4;
    [['D4', 0, 4], ['C4', 4, 4], ['Bb3', 8, 4], ['A3', 12, 16]].forEach(([n, s, d]) => this.brass(t + s * sd, [midi(n)], d * sd, { vol: 0.08, bright: 0.35, low: true, soft: true, dest: this.pans.horn }));
    this.strings(t, ['D3', 'F3', 'A3'].map(midi), 28 * sd, true);
    this.timp(t, midi('D2'), 2);
    this.crash(t);
  }
}
