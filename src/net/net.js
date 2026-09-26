// Online co-op over WebRTC (PeerJS). The host runs the whole simulation for up to MAX_PLAYERS pilots; each guest picks
// a suit, streams its input to the host and renders what the host sends back.
// Host -> guests: 20 Hz snapshots (players, commanders, crowd packed into an Int16Array, projectiles, items, stats)
// plus replicated one-shot events (effects, sounds, HUD lines). Guest -> host: input at ~30 Hz and the suit it picked.
// PeerJS's public broker is only used for the handshake; game data flows peer to peer.
const PEER_URL = 'https://cdn.jsdelivr.net/npm/peerjs@1.5.5/+esm';
const PREFIX = 'gundam-musou-side7-';
const SNAP_HZ = 20;
export const MAX_PLAYERS = 3; // the host and two guests
// ?localnet: same-browser BroadcastChannel transport for testing co-op in several tabs (no WebRTC).
export const LOCALNET = new URLSearchParams(location.search).has('localnet');

// A BroadcastChannel dressed as a PeerJS connection. `to` addresses one guest (every guest reads the channel).
function bcConn(bc, dir, to) {
  const handlers = {};
  return {
    open: true,
    send: (d) => bc.postMessage({ dir, to, d }),
    close() { this.open = false; bc.postMessage({ dir, to, bye: true }); handlers.close?.(); },
    on(ev, fn) { handlers[ev] = fn; },
    handlers,
  };
}

// Guest buttons: pressed since the last message (edges) and held down (held), one bit each.
const BTN = { attack: 1, charge: 2, jump: 4, dodge: 8, musou: 16 };

// The host's view of a guest's controls, in the shape Hero.update / Tank.update read: `dir` is the move direction in
// world space (the guest's camera already applied), key() the held buttons.
export class RemoteInput {
  constructor() {
    this.dir = null;
    this.held = 0;
    this.edges = 0;
    this.lock = 0; // netId of the commander the guest is locked on to
  }

  key(action) {
    return !!(this.held & BTN[action]);
  }

  // This frame's button presses (cleared once the sim has seen them).
  take(live) {
    const e = live ? this.edges : 0;
    this.edges = 0;
    const act = { chargeHeld: live && this.key('charge') };
    for (const k in BTN) act[k] = !!(e & BTN[k]);
    return act;
  }
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
    this.conn = null; // guest: the link to the host
    this.guests = []; // host: { slot, conn }
    this.slot = 0; // guest: which player this browser is (the host is 0)
    this.ev = [];
    this.depth = 0;
    this.snapT = 0;
    this.inputT = 0;
    this.pending = 0;
    this.sent = null;
  }

  get connected() {
    return this.role === 'host' ? this.guests.length > 0 : !!(this.conn && this.conn.open);
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
      const byId = new Map();
      bc.onmessage = (e) => {
        const m = e.data;
        if (m.join) {
          const conn = bcConn(bc, 'h2g', m.join);
          if (!this.accept(conn)) return;
          byId.set(m.join, conn);
        } else if (m.dir === 'g2h') {
          const conn = byId.get(m.from);
          if (!conn) return;
          if (m.bye) { byId.delete(m.from); conn.open = false; this.drop(conn); } else this.onGuestData(conn, m.d);
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
      conn.on('open', () => this.accept(conn));
      conn.on('data', (d) => this.onGuestData(conn, d));
      conn.on('close', () => this.drop(conn));
      conn.on('error', () => {});
    });
    this.peer.on('disconnected', () => this.peer.reconnect?.());
    return this.code;
  }

  // A guest's link is open: give it the lowest free slot, or turn it away when the room is full.
  accept(conn) {
    const used = new Set(this.guests.map((x) => x.slot));
    let slot = 1;
    while (used.has(slot)) slot++;
    if (slot >= MAX_PLAYERS) {
      conn.send({ y: 'full' });
      setTimeout(() => conn.close(), 300);
      return false;
    }
    this.guests.push({ slot, conn });
    this.hookRecorders();
    conn.send({ y: 'hello', slot, difficulty: this.game.difficultyName, mode: this.game.mode });
    this.game.onGuestJoined(slot);
    return true;
  }

  drop(conn) {
    const i = this.guests.findIndex((x) => x.conn === conn);
    if (i < 0) return;
    const [g] = this.guests.splice(i, 1);
    this.game.onGuestLeft(g.slot);
  }

  onGuestData(conn, d) {
    const guest = this.guests.find((x) => x.conn === conn);
    if (!guest) return;
    if (d.y === 'i') {
      const inp = this.game.slots[guest.slot]?.input;
      if (!inp) return;
      inp.dir = d.m > 0.05 ? { x: d.x, z: d.z, mag: d.m } : null;
      inp.held = d.h;
      inp.edges |= d.b; // accumulate presses until the sim consumes them
      inp.lock = d.lk || 0;
    } else if (d.y === 'suit') this.game.onGuestSuit(guest.slot, d.id);
  }

  // Wrap effect / sound / HUD calls so one-shot events replay on the guests.
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

  // An event only one guest acts on (their camera shakes, their portrait winces).
  eventFor(slot, ...e) {
    this.event('@', slot, ...e);
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
      // every pilot in the fight, by slot; `ready` is each slot's suit for the lobby (null: choosing, false: empty)
      pl: g.players.map((p) => ({ slot: g.slotOf(p), suit: p.suit.id, s: p.netState() })),
      ready: Array.from({ length: MAX_PLAYERS }, (_, i) => (i === 0 ? g.hero.suit.id : g.slots[i] ? g.slots[i].suit : false)),
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
      const id = code6() + code6();
      return new Promise((resolve, reject) => {
        bc.onmessage = (e) => {
          const m = e.data;
          if (m.dir !== 'h2g' || (m.to && m.to !== id)) return;
          if (m.bye) { if (this.conn) { this.conn = null; this.game.onHostLeft(); } return; }
          if (!this.conn) {
            this.conn = { open: true, send: (d) => bc.postMessage({ dir: 'g2h', from: id, d }), close() { this.open = false; bc.postMessage({ dir: 'g2h', from: id, bye: true }); } };
            resolve();
          }
          this.game.onNet(m.d);
        };
        bc.postMessage({ join: id });
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

  // Buttons pressed since the last send, the ones held down, the world-space move vector and the lock-on target.
  // Sent at 30 Hz while anything is going on, and at least every quarter second regardless.
  guestTick(dt, act, dir, held, lock) {
    if (!this.connected) return;
    for (const k in BTN) if (act[k]) this.pending |= BTN[k];
    this.inputT -= dt;
    const moving = !!dir;
    const state = `${moving}|${held}|${lock}`;
    const news = this.pending || state !== this.sent;
    if (!news && this.inputT > (moving ? 0 : -0.22)) return;
    this.inputT = 1 / 30;
    this.sent = state;
    this.send({ y: 'i', x: dir ? dir.x : 0, z: dir ? dir.z : 0, m: dir ? dir.mag : 0, b: this.pending, h: held, lk: lock });
    this.pending = 0;
  }

  static heldBits(input, act) {
    let h = 0;
    for (const k in BTN) if (input.key(k)) h |= BTN[k];
    if (act.chargeHeld) h |= BTN.charge;
    return h;
  }

  // Host: to every guest. Guest: to the host.
  send(msg) {
    if (this.role === 'host') { for (const x of this.guests) if (x.conn.open) x.conn.send(msg); } else if (this.connected) this.conn.send(msg);
  }

  sendTo(slot, msg) {
    const x = this.guests.find((q) => q.slot === slot);
    if (x && x.conn.open) x.conn.send(msg);
  }

  close() {
    for (const x of this.guests) { try { x.conn.close(); } catch (e) { /* ignore */ } }
    try { this.conn?.close(); } catch (e) { /* ignore */ }
    try { this.bc?.close(); } catch (e) { /* ignore */ }
    this.bc = null;
    try { this.peer?.destroy(); } catch (e) { /* ignore */ }
    this.guests = [];
    this.conn = null;
    this.peer = null;
    this.role = null;
  }

  static decodeCrowd(buf) {
    return new Int16Array(buf instanceof ArrayBuffer ? buf : buf.buffer ? buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) : buf);
  }
}

export { GF };
