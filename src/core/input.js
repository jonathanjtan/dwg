// Keyboard + mouse + gamepad, normalised to game actions.

// requestPointerLock returns a promise in modern browsers and rejects when not allowed (e.g. in iframes).
export function lockPointer(el) {
  try {
    const p = el.requestPointerLock?.();
    if (p && p.catch) p.catch(() => {});
  } catch (e) { /* ignore */ }
}
const KEYMAP = {
  attack: ['KeyJ'],
  charge: ['KeyK'],
  dodge: ['KeyL', 'ShiftLeft', 'ShiftRight'],
  jump: ['Space'],
  musou: ['KeyI', 'KeyF'],
  camL: ['KeyQ'],
  camR: ['KeyE'],
  recenter: ['KeyR'],
  pause: ['Escape', 'KeyP'],
  mute: ['KeyM'],
  help: ['KeyH'],
};

export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
    this.locked = false;
    this.canvas = canvas;
    this.pad = null;
    this.padPrev = [];
    this.move = { x: 0, y: 0 };
    this.look = { x: 0, y: 0 };
    this.usingPad = false;
    this.padHeld = {};
    this.enabled = true;

    addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.down.add(e.code);
      this.pressed.add(e.code);
      this.usingPad = false;
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    });
    addEventListener('keyup', (e) => this.down.delete(e.code));
    addEventListener('blur', () => this.down.clear());
    canvas.addEventListener('mousedown', (e) => {
      if (!this.enabled) return;
      if (!this.locked && this.wantLock) lockPointer(canvas);
      const code = e.button === 0 ? 'Mouse0' : e.button === 2 ? 'Mouse2' : 'Mouse1';
      this.down.add(code);
      this.pressed.add(code);
    });
    addEventListener('mouseup', (e) => {
      this.down.delete(e.button === 0 ? 'Mouse0' : e.button === 2 ? 'Mouse2' : 'Mouse1');
    });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    addEventListener('mousemove', (e) => {
      if (this.locked) {
        this.mouseDX += e.movementX;
        this.mouseDY += e.movementY;
      }
    });
    canvas.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === canvas;
    });
    this.wantLock = true;
  }

  // held: keyboard, or the gamepad buttons for boost / jump (hold to dash / hover)
  key(action) {
    return KEYMAP[action].some((k) => this.down.has(k)) || !!this.padHeld[action];
  }
  hit(action) {
    return KEYMAP[action].some((k) => this.pressed.has(k));
  }

  // Called once per frame before game logic.
  poll() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let pad = null;
    for (const p of pads) if (p && p.connected) { pad = p; break; }
    this.pad = pad;
    const act = {
      attack: this.hit('attack') || this.pressed.has('Mouse0'),
      charge: this.hit('charge') || this.pressed.has('Mouse2'),
      dodge: this.hit('dodge'),
      jump: this.hit('jump'),
      musou: this.hit('musou'),
      pause: this.hit('pause'),
      mute: this.hit('mute'),
      help: this.hit('help'),
      recenter: this.hit('recenter'),
      attackHeld: this.key('attack') || this.down.has('Mouse0'),
      chargeHeld: this.key('charge') || this.down.has('Mouse2'),
    };
    let mx = 0, my = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) mx -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) mx += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) my += 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) my -= 1;
    let lx = 0, ly = 0;
    if (this.key('camL')) lx -= 1;
    if (this.key('camR')) lx += 1;

    if (pad) {
      const b = (i) => pad.buttons[i] && pad.buttons[i].pressed;
      const edge = (i) => b(i) && !this.padPrev[i];
      const dz = (v) => (Math.abs(v) < 0.18 ? 0 : v);
      const ax = dz(pad.axes[0] || 0), ay = dz(pad.axes[1] || 0);
      const rx = dz(pad.axes[2] || 0), ry = dz(pad.axes[3] || 0);
      if (ax || ay || rx || ry || pad.buttons.some((x) => x.pressed)) this.usingPad = true;
      mx += ax;
      my -= ay;
      lx += rx;
      ly += ry;
      act.attack ||= edge(2);
      act.charge ||= edge(3);
      act.jump ||= edge(0);
      act.dodge ||= edge(1) || edge(4);
      act.musou ||= edge(5) || edge(7);
      act.pause ||= edge(9);
      act.recenter ||= edge(6) || edge(11);
      act.attackHeld ||= b(2);
      act.chargeHeld ||= b(3);
      this.padHeld = { dodge: b(1) || b(4), jump: b(0), musou: b(5) || b(7) };
      if (b(12)) my += 1;
      if (b(13)) my -= 1;
      if (b(14)) mx -= 1;
      if (b(15)) mx += 1;
      this.padPrev = pad.buttons.map((x) => x.pressed);
    }
    if (!pad) this.padHeld = {};
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    this.move.x = mx;
    this.move.y = my;
    this.look.x = lx;
    this.look.y = ly;
    this.actions = act;
    return act;
  }

  endFrame() {
    this.pressed.clear();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.wheel = 0;
  }
}
