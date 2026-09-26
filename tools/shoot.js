// Dev-only: stage a move for a screenshot. `await import('/tools/shoot.js')` in the console, then
// `arena(8)` (a ring of tough soldiers around the suit) and `shoot(events, frames, camYaw, camDist)`.
// events: [frame, 'tap' | 'hold', keys, frames held]. Stops the game's own loop; pausing is disabled.
// `film(events, stops, camYaw, camDist)` plays the same way and lays the frames at each stop out as a contact sheet
// over the page (one screenshot shows a whole move); `film.clear()` removes it.
const game = window.game;
game.renderer.setAnimationLoop(null);
game.pause = () => {};
document.getElementById('pause').classList.add('hidden');
const tick = () => { game.last = performance.now() - 1000 / 60; game.frame(); };

window.arena = (n = 10, hp = 5000, suit = null) => {
  if (game.mode !== 'play') game.start();
  if (suit) game.setSuit(suit);
  for (let i = 0; i < 1200 && (game.cutsceneT > 0 || game.hero.state === 'intro'); i++) tick();
  const h = game.hero;
  h.reset();
  h.pos.set(0, 0, 0);
  h.heading = 0;
  h.state = 'move';
  h.invuln = 999;
  game.crowd.clear();
  game.commanders.clear();
  game.projectiles.clear();
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, r = i < 2 ? 3.4 : 6.5 + (i % 3);
    game.crowd.spawn(i < 2 ? (i - 0.5) * 1.8 : Math.sin(a) * r, i < 2 ? 3.4 : Math.cos(a) * r, { yaw: Math.PI, hp });
  }
  for (let i = 0; i < 90; i++) tick();
  game.camera.yaw = 0;
  game.camera.pitch = 0.22;
};

// Play frames [from, stop) of a take; `held` carries keys held down across calls.
function play(events, stop, camYaw, camDist, from = 0, held = []) {
  for (let i = from; i < stop; i++) {
    game.input.down.clear();
    for (const [f, kind, keys, dur = 2] of events) {
      if (f !== i) continue;
      for (const k of keys) game.input.pressed.add(k);
      held.push({ keys, until: i + (kind === 'hold' ? dur : 2) });
    }
    for (const hd of held) if (i < hd.until) for (const k of hd.keys) game.input.down.add(k);
    if (camYaw !== null) { game.camera.yaw = game.hero.heading + camYaw; game.camera.idleLook = 0; }
    if (camDist !== null) game.camera.distTarget = camDist;
    tick();
  }
}

const status = () => {
  const h = game.hero;
  return `${h.state} ${h.moveName} t=${h.moveT.toFixed(2)} y=${h.pos.y.toFixed(2)}`;
};

window.shoot = (events, stop, camYaw = null, camDist = null) => {
  play(events, stop, camYaw, camDist);
  game.input.down.clear();
  game.render();
  return status();
};

window.film = (events, stops, camYaw = null, camDist = null, cols = 4) => {
  const src = game.renderer.domElement;
  const w = 320, h = Math.round((w * src.height) / src.width), rows = Math.ceil(stops.length / cols);
  const sheet = document.createElement('canvas');
  sheet.width = w * cols;
  sheet.height = h * rows;
  const g = sheet.getContext('2d');
  g.font = '14px monospace';
  const held = [], log = [];
  let at = 0;
  stops.forEach((stop, i) => {
    play(events, stop, camYaw, camDist, at, held);
    at = stop;
    game.render();
    const x = (i % cols) * w, y = Math.floor(i / cols) * h;
    g.drawImage(src, x, y, w, h);
    g.fillStyle = '#000a';
    g.fillRect(x, y, 170, 18);
    g.fillStyle = '#ff0';
    g.fillText(`${stop} ${game.hero.moveName || game.hero.state} ${game.hero.moveT.toFixed(2)}`, x + 3, y + 14);
    log.push(status());
  });
  game.input.down.clear();
  film.clear();
  const img = document.createElement('img');
  img.id = 'film';
  img.src = sheet.toDataURL();
  img.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;object-fit:contain;background:#000;z-index:99999';
  document.body.appendChild(img);
  return log;
};
window.film.clear = () => document.getElementById('film')?.remove();

export default true;
