// Dev-only test harness: `await import('/tools/harness.js')` in the console.
// Drives the game loop deterministically (fixed 60 Hz steps) and runs a simple autoplay bot.
const game = window.game;
game.renderer.setAnimationLoop(null);

window.st = () => ({
  hero: game.hero.state, hp: Math.round(game.hero.hp), sp: Math.round(game.hero.sp), kos: game.stats.kos,
  crowd: game.crowd.count, phase: game.stage.phase, mode: game.mode, t: Math.round(game.stats.time),
  cmd: game.commanders.list.map((c) => `${c.name}:${c.state}:${Math.round(c.hp)}`), maxCombo: game.stats.maxCombo,
});

const tick = () => { game.last = performance.now() - 1000 / 60; game.frame(); };

window.step = (n, keys = [], press = [], render = true) => {
  const cr = game.post.render;
  if (!render) game.post.render = () => {};
  for (let i = 0; i < n; i++) {
    if (i === 0) for (const k of press) game.input.pressed.add(k);
    for (const k of keys) game.input.down.add(k);
    tick();
  }
  for (const k of keys) game.input.down.delete(k);
  game.post.render = cr;
  return st();
};

// Autoplay: chase the nearest target (or head for the nearest landing zone when the area is clear),
// boost over long distances, mash attacks, fire SP when full.
window.bot = (frames, { render = false, stop = null, charge = 49 } = {}) => {
  const cr = game.post.render;
  if (!render) game.post.render = () => {};
  let err = null;
  try {
    for (let i = 0; i < frames; i++) {
      const h = game.hero;
      let best = null, bd = 1e9;
      for (const e of game.crowd.list) {
        if (e.state === 'drop') continue;
        const d = Math.hypot(e.x - h.pos.x, e.z - h.pos.z);
        if (d < bd) { bd = d; best = e; }
      }
      for (const c of game.commanders.list) {
        if (!c.alive || c.state === 'drop') continue;
        const d = Math.hypot(c.pos.x - h.pos.x, c.pos.z - h.pos.z);
        if (d < bd + 12) { bd = d; best = { x: c.pos.x, z: c.pos.z }; }
      }
      if (bd > 25) {
        for (const lz of game.lz.list) {
          if (lz.captured || lz.y > 0) continue;
          const d = Math.hypot(lz.x - h.pos.x, lz.z - h.pos.z);
          if (d < bd) { bd = d; best = lz; }
        }
      }
      const held = game.input.down.has('ShiftLeft');
      game.input.down.clear();
      if (best && bd > 3.8) {
        game.camera.yaw = Math.atan2(best.x - h.pos.x, best.z - h.pos.z);
        game.input.down.add('KeyW');
        if (bd > 30 && h.boost > 0.3) {
          if (!held) game.input.pressed.add('ShiftLeft');
          game.input.down.add('ShiftLeft');
        } else if (held && bd > 14 && h.boost > 0.05) game.input.down.add('ShiftLeft');
      } else if (best && i % 7 === 0) {
        game.input.pressed.add(i % charge === charge - 7 ? 'KeyK' : 'KeyJ');
      }
      if (h.sp >= h.maxSp && i % 30 === 0) game.input.pressed.add('KeyI');
      tick();
      if (stop && stop()) break;
    }
  } catch (e) { err = e.stack; }
  game.post.render = cr;
  game.input.down.clear();
  return err ? { ...st(), err } : st();
};

window.hitLog = { taken: 0, bullets: 0 };
const takeHit = game.hero.takeHit.bind(game.hero);
game.hero.takeHit = (...a) => { const r = takeHit(...a); if (r) hitLog.taken++; return r; };
const bullet = game.projectiles.enemyBullet.bind(game.projectiles);
game.projectiles.enemyBullet = (...a) => { hitLog.bullets++; return bullet(...a); };

export default true;
