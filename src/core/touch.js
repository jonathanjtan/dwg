// On-screen controls for phones and tablets: a floating movement stick under the left thumb, drag-to-look
// on the right, and a diamond of action buttons under the right thumb.
//
// Nothing here knows about the game. Every control presses the key its action is already bound to in
// KEYMAP, so holds (dash, hover, charge shot, charge SP) and edges fall out of the existing input path.

const BTNS = [
  { a: 'attack', code: 'KeyJ', label: 'ATK' },
  { a: 'charge', code: 'KeyK', label: 'CHG', hint: 'hold' },
  { a: 'dodge', code: 'KeyL', label: 'BOOST', hint: 'hold' },
  { a: 'jump', code: 'Space', label: 'JUMP', hint: 'hold' },
  { a: 'musou', code: 'KeyI', label: 'SP', hint: 'hold' },
  { a: 'lock', code: 'KeyR', label: 'LOCK' },
];

const R = 58; // stick travel, in CSS pixels, for a full-speed run
const DEAD = 0.14;
// The camera turns 0.0026 rad per pixel of mouse travel (0.8x that in pitch). A thumb drags a much
// shorter distance than a mouse, so scale it up.
const LOOK_X = 1.7;
const LOOK_Y = 1.45;

export const isTouch = () => matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

export class TouchControls {
  constructor(input) {
    this.input = input;
    this.active = false;
    this.stick = null; // { id, ox, oy } — origin follows the thumb once it travels past the ring
    this.look = null; // { id, x, y }
    this.btns = new Map(); // pointerId -> button element
    this.vec = { x: 0, y: 0 };

    const root = document.createElement('div');
    root.id = 'touch';
    root.className = 'hidden';
    root.innerHTML = `
      <div id="tc-stick" class="hidden"><div class="tc-ring"></div><div class="tc-knob"></div></div>
      <button type="button" id="tc-pause" aria-label="Pause"><span></span><span></span></button>
      <div id="tc-pad">${BTNS.map((b) => `<button type="button" class="tc-btn" data-a="${b.a}" aria-label="${b.label}"><b>${b.label}</b>${b.hint ? `<i>${b.hint}</i>` : ''}</button>`).join('')}</div>`;
    document.getElementById('app').appendChild(root);
    this.root = root;
    this.stickEl = root.querySelector('#tc-stick');
    this.knobEl = root.querySelector('.tc-knob');
    this.spEl = root.querySelector('[data-a="musou"]');
    this.boostEl = root.querySelector('[data-a="dodge"]');

    for (const b of BTNS) {
      const el = root.querySelector(`[data-a="${b.a}"]`);
      el.dataset.code = b.code;
      el.addEventListener('pointerdown', (e) => this.btnDown(e, el), { passive: false });
    }
    const pause = root.querySelector('#tc-pause');
    pause.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.input.pressKey('KeyP');
      this.input.releaseKey('KeyP');
    }, { passive: false });

    // The stick and the look drag live on the whole surface, so a thumb can start anywhere.
    const app = document.getElementById('app');
    app.addEventListener('pointerdown', (e) => this.surfaceDown(e), { passive: false });
    addEventListener('pointermove', (e) => this.move(e), { passive: false });
    addEventListener('pointerup', (e) => this.up(e));
    addEventListener('pointercancel', (e) => this.up(e));
    addEventListener('blur', () => this.releaseAll());
  }

  // ---------- buttons ----------
  btnDown(e, el) {
    if (!this.active || e.pointerType === 'mouse') return;
    e.preventDefault();
    e.stopPropagation();
    if ([...this.btns.values()].includes(el)) return; // a second finger on the same button
    this.btns.set(e.pointerId, el);
    el.classList.add('on');
    this.input.pressKey(el.dataset.code);
    navigator.vibrate?.(8);
  }

  btnUp(id) {
    const el = this.btns.get(id);
    if (!el) return;
    this.btns.delete(id);
    el.classList.remove('on');
    this.input.releaseKey(el.dataset.code);
  }

  // ---------- stick / look ----------
  surfaceDown(e) {
    if (!this.active || e.pointerType === 'mouse' || e.target.closest('#tc-pad, #tc-pause')) return;
    e.preventDefault();
    if (!this.stick && e.clientX < innerWidth * 0.5) {
      this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
      this.stickEl.classList.remove('hidden');
      this.drawStick(e.clientX, e.clientY);
    } else if (!this.look) {
      this.look = { id: e.pointerId, x: e.clientX, y: e.clientY };
    }
  }

  move(e) {
    if (this.stick && e.pointerId === this.stick.id) {
      e.preventDefault();
      const s = this.stick;
      let dx = e.clientX - s.ox, dy = e.clientY - s.oy;
      const len = Math.hypot(dx, dy);
      // past the ring the origin is dragged along, so the stick never runs out of travel
      if (len > R) {
        const k = 1 - R / len;
        s.ox += dx * k;
        s.oy += dy * k;
        dx *= R / len;
        dy *= R / len;
      }
      const mag = Math.min(1, Math.hypot(dx, dy) / R);
      const k = mag > DEAD ? (mag - DEAD) / (1 - DEAD) / mag : 0;
      this.vec.x = (dx / R) * k;
      this.vec.y = (-dy / R) * k; // screen up is forward
      this.drawStick(s.ox + dx, s.oy + dy);
    } else if (this.look && e.pointerId === this.look.id) {
      e.preventDefault();
      this.input.mouseDX += (e.clientX - this.look.x) * LOOK_X;
      this.input.mouseDY += (e.clientY - this.look.y) * LOOK_Y;
      this.look.x = e.clientX;
      this.look.y = e.clientY;
    }
  }

  up(e) {
    if (this.stick && e.pointerId === this.stick.id) this.dropStick();
    else if (this.look && e.pointerId === this.look.id) this.look = null;
    else this.btnUp(e.pointerId);
  }

  drawStick(kx, ky) {
    const s = this.stick;
    this.stickEl.style.left = `${s.ox}px`;
    this.stickEl.style.top = `${s.oy}px`;
    this.knobEl.style.transform = `translate(-50%, -50%) translate(${kx - s.ox}px, ${ky - s.oy}px)`;
  }

  dropStick() {
    this.stick = null;
    this.vec.x = 0;
    this.vec.y = 0;
    this.stickEl.classList.add('hidden');
  }

  releaseAll() {
    for (const id of [...this.btns.keys()]) this.btnUp(id);
    this.dropStick();
    this.look = null;
  }

  // Called once a frame: show the pad only while there is something to drive, and mirror the two gauges
  // the thumb cluster covers up.
  update(on, local) {
    if (on !== this.active) {
      this.active = on;
      this.root.classList.toggle('hidden', !on);
      if (!on) this.releaseAll();
    }
    if (!on || !local) return;
    this.spEl.classList.toggle('ready', local.sp >= local.maxSp);
    this.boostEl.classList.toggle('low', (local.boost ?? 1) < 0.25);
  }

}

// ---------------------------------------------------------------------------
// Fullscreen
//
// A phone browser spends a third of a landscape screen on its address bar and tab strip, which on a game
// this dense is the difference between readable and not. Fullscreen reclaims it. iPhone Safari supports
// neither the Fullscreen API nor an orientation lock, so there it stays a no-op and `fullscreenAvailable`
// reports false — the caller offers "add to home screen" instead, which does run chrome-less.

export const fullscreenAvailable = () =>
  !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);

export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);

// Standalone = launched from the home screen, where there is no browser chrome to hide.
export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

export function enterFullscreen() {
  const el = document.documentElement;
  try {
    const p = el.requestFullscreen?.({ navigationUI: 'hide' }) ?? el.webkitRequestFullscreen?.();
    p?.catch?.(() => {});
  } catch (e) { /* not allowed outside a gesture */ }
  // Landscape only matters on a phone, and only Chromium honours it.
  try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch (e) { /* unsupported */ }
}

export function exitFullscreen() {
  try {
    (document.exitFullscreen?.() ?? document.webkitExitFullscreen?.())?.catch?.(() => {});
    screen.orientation?.unlock?.();
  } catch (e) { /* already out */ }
}

export function toggleFullscreen() {
  if (isFullscreen()) exitFullscreen();
  else enterFullscreen();
}
