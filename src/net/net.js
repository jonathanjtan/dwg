// Online co-op over WebRTC (PeerJS). The host runs the whole simulation; the guest pilots the Guntank.
// Host -> guest: 20 Hz snapshots (players, commanders, crowd packed into an Int16Array, projectiles, items,
// stats) plus replicated one-shot events (effects, sounds, HUD lines). Guest -> host: input at ~30 Hz.
// PeerJS's public broker is only used for the handshake; game data flows peer to peer.
const PEER_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm';
const PREFIX = 'gundam-musou-side7-';
const SNAP_HZ = 20;
// ?localnet: same-browser BroadcastChannel transport for testing co-op in two tabs (no WebRTC).
export const LOCALNET = new URLSearchParams(location.search).has('localnet');

function bcConn(bc, dir) {
  const handlers = {};
  return {
    open: true,
    send: (d) => bc.postMessage({ dir, d }),
    close() { this.open = false; bc.postMessage({ dir, bye: true }); handlers.close?.(); },
    on(ev, fn) { handlers[ev] = fn; },
    handlers,
  };
}

export const GRUNT_STATES = ['idle', 'approach', 'charge', 'windup', 'strike', 'aim', 'fire', 'stagger', 'air', 'down', 'getup', 'dying', 'drop', 'held'];
const STATE_ID = Object.fromEntries(GRUNT_STATES.map((s, i) => [s, i]));
const GF = 13; // int16 fields per grunt

// Effects the guest regenerates locally from state instead of receiving (they fire every frame).
const LOCAL_FX = new Set(['thruster', 'aura']);
const FX_METHODS = ['explode', 'hit', 'sparks', 'debris', 'puff', 'dust', 'ring', 'dome', 'light', 'glint', 'thruster', 'aura', 'star', 'muzzle', 'scorch', 'shock', 'bolts', 'fireball', 'aimLine'];
const HUD_METHODS = ['announce', 'say', 'setObjective', 'toast', 'whiteFlash'];

function code6() {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += a[(Math.random() * a.length) | 0];
  return s;
}

const plain = (v) => (v && typeof v === 'object' && 'x' in v && 'y' in v && 'z' in v ? { x: v.x, y: v.y, z: v.z } : v);

export class Net {
  constructor(game) {
    this.game = game;
    this.role = null; // 'host' | 'guest'
    this.peer = null;
    this.conn = null;
    this.ev = [];
    this.depth = 0;
    this.snapT = 0;
    this.inputT = 0;
    this.pending = { b: 0 };
    this.onStatus = () => {};
  }

  get connected() {
    return !!(this.conn && this.conn.open);
  }

  async loadPeer() {
    const mod = await import(PEER_URL);
    return mod.Peer || mod.default?.Peer || mod.default;
  }

  // ---------------------------------------------------------------- host
  async host() {
    this.role = 'host';
    this.code = code6();
    if (LOCALNET) {
      const bc = (this.bc = new BroadcastChannel('gmusou-' + this.code));
      bc.onmessage = (e) => {
        const m = e.data;
        if (m.join && !this.connected) {
          this.conn = bcConn(bc, 'h2g');
          this.hookRecorders();
          this.game.onGuestJoined();
          this.send({ y: 'hello', difficulty: this.game.difficultyName, mode: this.game.mode });
        } else if (m.dir === 'g2h') {
          if (m.bye) { this.conn = null; this.game.onGuestLeft(); } else this.onHostData(m.d);
        }
      };
      return this.code;
    }
    const Peer = await this.loadPeer();
    this.peer = new Peer(PREFIX + this.code, { debug: 1 });
    await new Promise((resolve, reject) => {
      this.peer.on('open', resolve);
      this.peer.on('error', reject);
    });
    this.peer.on('connection', (conn) => {
      if (this.connected) { conn.on('open', () => { conn.send({ y: 'full' }); setTimeout(() => conn.close(), 300); }); return; }
      conn.on('open', () => {
        this.conn = conn;
        this.hookRecorders();
        this.game.onGuestJoined();
        this.send({ y: 'hello', difficulty: this.game.difficultyName, mode: this.game.mode });
      });
      conn.on('data', (d) => this.onHostData(d));
      conn.on('close', () => { if (this.conn === conn) { this.conn = null; this.game.onGuestLeft(); } });
      conn.on('error', () => {});
    });
    this.peer.on('disconnected', () => this.peer.reconnect?.());
    return this.code;
  }

  onHostData(d) {
    if (d.y === 'i') {
      const inp = this.game.remoteInput;
      inp.x = d.x;
      inp.z = d.z;
      inp.mag = d.m;
      inp.edges |= d.b; // accumulate presses until the sim consumes them
    }
  }

  // Wrap effect / sound / HUD calls so one-shot events replay on the guest.
  hookRecorders() {
    if (this.hooked) return;
    this.hooked = true;
    const g = this.game;
    const wrap = (obj, name, tag) => {
      const orig = obj[name].bind(obj);
      obj[name] = (...args) => {
        const top = this.depth++ === 0;
        try {
          if (top && this.connected && !obj.noNet && !(tag === 'f' && LOCAL_FX.has(name))) this.ev.push([tag, name, ...args.map(plain)]);
          return orig(...args);
        } finally {
          this.depth--;
        }
      };
    };
    for (const m of FX_METHODS) wrap(g.fx, m, 'f');
    for (const m of HUD_METHODS) wrap(g.hud, m, 'h');
    const play = g.audio.play.bind(g.audio);
    g.audio.play = (name, opts = {}) => {
      if (this.connected) this.ev.push(['a', name, opts.vol ?? 1, opts.pitch ?? 1, opts.at ? opts.at.x : null, opts.at ? opts.at.z : null]);
      return play(name, opts);
    };
  }

  event(...e) {
    if (this.role === 'host' && this.connected) this.ev.push(e);
  }

  hostTick(dt) {
    if (!this.connected) return;
    this.snapT -= dt;
    if (this.snapT > 0) return;
    this.snapT = 1 / SNAP_HZ;
    this.send(this.snapshot());
    this.ev.length = 0;
  }

  snapshot() {
    const g = this.game;
    const h = g.hero, t = g.tank;
    const crowd = new Int16Array(g.crowd.list.length * GF);
    g.crowd.list.forEach((e, i) => {
      const o = i * GF;
      crowd[o] = e.id & 0x7fff;
      crowd[o + 1] = Math.round(e.x * 100);
      crowd[o + 2] = Math.round(e.y * 100);
      crowd[o + 3] = Math.round(e.z * 100);
      crowd[o + 4] = Math.round((((e.yaw % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI) * 1000);
      crowd[o + 5] = STATE_ID[e.state] ?? 0;
      crowd[o + 6] = Math.min(32767, Math.round(e.t * 1000));
      crowd[o + 7] = Math.round(e.vx * 100);
      crowd[o + 8] = Math.round(e.vz * 100);
      crowd[o + 9] = Math.round(e.flash * 1000);
      crowd[o + 10] = Math.round(Math.max(-32, Math.min(32, e.pitch)) * 1000);
      crowd[o + 11] = (e.gun ? 1 : 0) | (e.staggerAlt ? 2 : 0) | (e.hp <= 0 ? 4 : 0) | ((e.hitKind & 3) << 3) | (e.shudder > 0 ? 32 : 0);
      crowd[o + 12] = e.i;
    });
    const pj = g.projectiles;
    const flat = (arr, f) => arr.flatMap(f);
    return {
      y: 's',
      mode: g.mode,
      paused: g.mode === 'paused',
      hero: h.netState(),
      tank: t.netState(),
      cmd: g.commanders.list.map((c) => c.netState()),
      crowd: crowd.buffer,
      pj: {
        b: flat(pj.beams, (b) => [b.p.x, b.p.y, b.p.z, b.d.x, b.d.y, b.d.z, b.w]),
        rk: flat(pj.rockets, (r) => [r.p.x, r.p.y, r.p.z, r.v.x, r.v.y, r.v.z]),
        u: flat(pj.bullets, (b) => [b.p.x, b.p.y, b.p.z, b.d.x, b.d.y, b.d.z]),
        mi: flat(pj.missiles, (m) => [m.p.x, m.p.y, m.p.z, m.v.x, m.v.y, m.v.z]),
        sh: flat(pj.shells, (s) => [s.p.x, s.p.y, s.p.z, s.v.x, s.v.y, s.v.z]),
      },
      it: g.items.netState(),
      bz: g.lz.netState(),
      st: {
        kos: g.stats.kos, time: g.stats.time, combo: g.combo.count, timer: g.combo.timer, max: g.stats.maxCombo,
        music: g.audio.current, obj: g.hud.el.objective.textContent,
      },
      ev: this.ev,
    };
  }

  // ---------------------------------------------------------------- guest
  async join(code) {
    this.role = 'guest';
    this.code = code.toUpperCase();
    if (LOCALNET) {
      const bc = (this.bc = new BroadcastChannel('gmusou-' + this.code));
      return new Promise((resolve, reject) => {
        bc.onmessage = (e) => {
          const m = e.data;
          if (m.dir !== 'h2g') return;
          if (!this.conn) { this.conn = bcConn(bc, 'g2h'); resolve(); }
          if (m.bye) { this.conn = null; this.game.onHostLeft(); return; }
          this.game.onNet(m.d);
        };
        bc.postMessage({ join: true });
        setTimeout(() => { if (!this.conn) reject(new Error('timeout')); }, 5000);
      });
    }
    const Peer = await this.loadPeer();
    this.peer = new Peer({ debug: 1 });
    await new Promise((resolve, reject) => {
      this.peer.on('open', resolve);
      this.peer.on('error', reject);
    });
    return new Promise((resolve, reject) => {
      const conn = this.peer.connect(PREFIX + this.code, { reliable: true });
      const fail = (e) => reject(e);
      this.peer.on('error', fail);
      conn.on('open', () => {
        this.conn = conn;
        this.peer.off?.('error', fail);
        resolve();
      });
      conn.on('data', (d) => this.game.onNet(d));
      conn.on('close', () => { this.conn = null; this.game.onHostLeft(); });
      setTimeout(() => { if (!this.conn) reject(new Error('timeout')); }, 12000);
    });
  }

  // Buttons pressed since the last send, plus the current world-space move vector.
  guestTick(dt, act, dir) {
    if (!this.connected) return;
    const p = this.pending;
    p.b |= (act.attack ? 1 : 0) | (act.charge ? 2 : 0) | (act.jump ? 4 : 0) | (act.dodge ? 8 : 0) | (act.musou ? 16 : 0);
    this.inputT -= dt;
    const moving = !!dir;
    if (this.inputT > 0 && !p.b && moving === this.wasMoving) return;
    this.inputT = 1 / 30;
    this.wasMoving = moving;
    this.send({ y: 'i', x: dir ? dir.x : 0, z: dir ? dir.z : 0, m: dir ? dir.mag : 0, b: p.b });
    p.b = 0;
  }

  send(msg) {
    if (this.connected) this.conn.send(msg);
  }

  close() {
    try { this.conn?.close(); } catch (e) { /* ignore */ }
    try { this.bc?.close(); } catch (e) { /* ignore */ }
    this.bc = null;
    try { this.peer?.destroy(); } catch (e) { /* ignore */ }
    this.conn = null;
    this.peer = null;
    this.role = null;
  }

  static decodeCrowd(buf) {
    return new Int16Array(buf instanceof ArrayBuffer ? buf : buf.buffer ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf);
  }
}

export { GF };
