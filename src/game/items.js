// Pickups dropped by fallen Zeon suits: repair kits and E-caps.
import * as THREE from 'three';
import { VoxelModel, Palette, voxelMesh } from '../core/voxel.js';

const pal = new Palette();
function crate(color, icon) {
  const m = new VoxelModel(pal);
  m.box(-2, 0, -2, 1, 3, 1, 0xe8e4d8);
  m.box(-2, 0, -2, 1, 0, 1, 0x8a8678);
  m.box(-2, 3, -2, 1, 3, 1, 0x8a8678);
  for (const [x, y] of icon) {
    m.set(x, y, 2, color, { glow: 2.4, jitter: 0 });
    m.set(x, y, -3, color, { glow: 2.4, jitter: 0 });
  }
  return m;
}
const PLUS = [[-1, 1], [0, 1], [-1, 2], [0, 2], [-2, 1], [1, 1], [-2, 2], [1, 2], [-1, 0], [0, 0], [-1, 3], [0, 3]].filter(([x, y]) => y >= 0 && y <= 3);
const BOLT = [[0, 3], [-1, 2], [0, 2], [-1, 1], [0, 1], [-1, 0]];

const TYPES = {
  hp: { model: () => crate(0x5dff7a, PLUS), label: 'REPAIR KIT', color: '#5dff7a' },
  sp: { model: () => crate(0xff5fd0, BOLT), label: 'E-CAP', color: '#ff7ad8' },
};

export class Items {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.templates = {};
    for (const k in TYPES) this.templates[k] = voxelMesh(TYPES[k].model(), { scale: 0.16 });
  }
  drop(type, x, z) {
    const mesh = this.templates[type].clone();
    mesh.position.set(x, 3, z);
    this.game.scene.add(mesh);
    this.list.push({ id: (this.serial = (this.serial || 0) + 1), type, mesh, x, z, vy: 6, y: 3, t: 0 });
  }
  // Guest: mirror the host's pickups.
  applyNet(arr) {
    const seen = new Set();
    for (const [id, type, x, y, z] of arr) {
      seen.add(id);
      let it = this.list.find((i) => i.id === id);
      if (!it) {
        const mesh = this.templates[type === 0 ? 'hp' : 'sp'].clone();
        this.game.scene.add(mesh);
        it = { id, type: type === 0 ? 'hp' : 'sp', mesh, t: 0 };
        this.list.push(it);
      }
      it.x = x; it.y = y; it.z = z;
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (!seen.has(this.list[i].id)) { this.game.scene.remove(this.list[i].mesh); this.list.splice(i, 1); }
    }
  }

  netAnimate(dt) {
    for (const it of this.list) {
      it.t += dt;
      it.mesh.position.set(it.x, it.y + Math.sin(it.t * 3) * 0.15, it.z);
      it.mesh.rotation.y += dt * 2;
    }
  }

  clear() {
    for (const it of this.list) this.game.scene.remove(it.mesh);
    this.list.length = 0;
  }
  update(dt) {
    const g = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const it = this.list[i];
      it.t += dt;
      if (it.y > 0.4 || it.vy > 0) {
        it.vy -= 25 * dt;
        it.y = Math.max(0.4, it.y + it.vy * dt);
        if (it.y === 0.4) it.vy = 0;
      }
      it.mesh.position.set(it.x, it.y + Math.sin(it.t * 3) * 0.15, it.z);
      it.mesh.rotation.y += dt * 2;
      const hero = it.t > 0.4 && g.players.find((p) => p.alive && Math.hypot(p.pos.x - it.x, p.pos.z - it.z) < 2.2);
      if (hero) {
        if (it.type === 'hp') hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * 0.3);
        if (it.type === 'sp') hero.sp = hero.maxSp;
        g.fx.aura(hero.pos, it.type === 'hp' ? 0x5dff7a : 0xff5fd0, 30, 1.6);
        g.audio.play('pickup');
        if (hero === g.local) g.hud.toast(TYPES[it.type].label, TYPES[it.type].color);
        else g.netEvent('toast', TYPES[it.type].label, TYPES[it.type].color);
        g.scene.remove(it.mesh);
        this.list.splice(i, 1);
      } else if (it.t > 30) {
        g.scene.remove(it.mesh);
        this.list.splice(i, 1);
      }
    }
  }
}
