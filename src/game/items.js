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

// heal: fraction of max HP restored
const TYPES = {
  hp: { model: () => crate(0x5dff7a, PLUS), scale: 0.16, heal: 0.25, label: 'REPAIR KIT', color: '#5dff7a', beam: 0x5dff7a },
  hpL: { model: () => crate(0x5dff7a, PLUS), scale: 0.26, heal: 0.6, label: 'LARGE REPAIR KIT', color: '#8dffa4', beam: 0x9dffb0 },
  sp: { model: () => crate(0xff5fd0, BOLT), scale: 0.16, label: 'E-CAP', color: '#ff7ad8', beam: 0xff5fd0 },
};
const NET_TYPES = ['hp', 'sp', 'hpL'];
const MAGNET = 6.5;

export class Items {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.templates = {};
    const beamGeo = new THREE.CylinderGeometry(0.22, 0.22, 7, 8, 1, true).translate(0, 3.5, 0);
    for (const k in TYPES) {
      const t = TYPES[k];
      const g = voxelMesh(t.model(), { scale: t.scale });
      // a thin light pillar so a dropped kit reads from across the street
      const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({
        color: new THREE.Color(t.beam).multiplyScalar(1.6), transparent: true, opacity: 0.35,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }));
      beam.name = 'beam';
      g.add(beam);
      this.templates[k] = g;
    }
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
        const name = NET_TYPES[type] || 'hp';
        const mesh = this.templates[name].clone();
        this.game.scene.add(mesh);
        it = { id, type: name, mesh, t: 0 };
        this.list.push(it);
      }
      it.x = x; it.y = y; it.z = z;
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      if (!seen.has(this.list[i].id)) { this.game.scene.remove(this.list[i].mesh); this.list.splice(i, 1); }
    }
  }

  netState() {
    return this.list.map((it) => [it.id, NET_TYPES.indexOf(it.type), it.x, it.y, it.z]);
  }

  netAnimate(dt) {
    for (const it of this.list) {
      it.t += dt;
      this.pose(it);
    }
  }

  pose(it) {
    it.mesh.position.set(it.x, it.y + Math.sin(it.t * 3) * 0.15, it.z);
    it.mesh.rotation.y = it.t * 2;
    const beam = it.mesh.getObjectByName('beam');
    if (beam) beam.material.opacity = 0.22 + 0.18 * Math.sin(it.t * 5);
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
      // drift toward a nearby pilot who can use it
      let pull = null, pd = MAGNET;
      if (it.t > 0.5) {
        for (const p of g.players) {
          if (!p.alive) continue;
          const d = Math.hypot(p.pos.x - it.x, p.pos.z - it.z);
          const wants = it.type === 'sp' ? p.sp < p.maxSp : p.hp < p.maxHp;
          if (d < pd && wants) { pd = d; pull = p; }
        }
      }
      if (pull) {
        const k = Math.min(1, (16 * dt) / Math.max(0.1, pd));
        it.x += (pull.pos.x - it.x) * k;
        it.z += (pull.pos.z - it.z) * k;
      }
      this.pose(it);
      const hero = it.t > 0.4 && g.players.find((p) => p.alive && Math.hypot(p.pos.x - it.x, p.pos.z - it.z) < 2.2);
      if (hero) {
        const T = TYPES[it.type];
        if (T.heal) {
          hero.hp = Math.min(hero.maxHp, hero.hp + hero.maxHp * T.heal);
          if (hero.hpRed) hero.hpRed = Math.min(hero.hpRed, hero.maxHp - hero.hp);
        } else hero.sp = hero.maxSp;
        g.fx.aura(hero.pos, it.type === 'sp' ? 0xff5fd0 : 0x5dff7a, it.type === 'hpL' ? 50 : 30, 1.6);
        g.fx.ring(hero.pos, 0.5, it.type === 'hpL' ? 4.5 : 3, it.type === 'sp' ? 0xff7ad8 : 0x7dff96, 0.4);
        g.audio.play('pickup');
        if (hero === g.local) g.hud.toast(T.label, T.color);
        else g.netEvent('toast', T.label, T.color);
        g.scene.remove(it.mesh);
        this.list.splice(i, 1);
      } else if (it.t > 40) {
        g.scene.remove(it.mesh);
        this.list.splice(i, 1);
      }
    }
  }
}
