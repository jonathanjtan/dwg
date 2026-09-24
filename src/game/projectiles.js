// Beam rifle shots, the charged mega beam, Zaku machine-gun tracers.
import * as THREE from 'three';
import { rand } from '../core/util.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();
const Zf = new THREE.Vector3(0, 0, 1);

function glowInstanced(scene, max, color) {
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const mat = new THREE.MeshBasicMaterial({ color, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const mesh = new THREE.InstancedMesh(geo, mat, max);
  mesh.frustumCulled = false;
  mesh.count = 0;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);
  return mesh;
}

export class Projectiles {
  constructor(game) {
    this.game = game;
    const scene = game.scene;
    this.beams = [];
    this.bullets = [];
    this.beamMesh = glowInstanced(scene, 64, new THREE.Color(3.2, 1.1, 2.4));
    this.beamCore = glowInstanced(scene, 64, new THREE.Color(3, 3, 2.6));
    this.bulletMesh = glowInstanced(scene, 256, new THREE.Color(3, 1.6, 0.5));
    // mega beam
    const cyl = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5);
    this.mega = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 0.9, 2.2), toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, side: THREE.DoubleSide }));
    this.megaCore = new THREE.Mesh(cyl, new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 3), toneMapped: false }));
    this.mega.visible = this.megaCore.visible = false;
    this.mega.frustumCulled = this.megaCore.frustumCulled = false;
    scene.add(this.mega, this.megaCore);
    this.megaState = null;
    this.serial = 1e6;
    this._v = new THREE.Vector3();
  }

  clear() {
    this.beams.length = 0;
    this.bullets.length = 0;
    this.megaState = null;
    this.mega.visible = this.megaCore.visible = false;
  }

  heroBeam(from, dir) {
    this.beams.push({ p: from.clone(), d: dir.clone(), life: 0, max: 0.8, speed: 120, id: ++this.serial, dmg: 38, kills: 0 });
  }

  megaBeam(from, dir) {
    this.megaState = { p: from.clone(), d: dir.clone(), t: 0, dur: 0.75, id: ++this.serial, ticks: 0, len: 70 };
    const g = this.game;
    g.fx.ring(from, 0.3, 4, 0xff7ad0, 0.4, from.y);
    g.fx.light(from, 0xff6fd0, 220, 40, 0.7);
  }

  enemyBullet(from, dir, mul = 1) {
    if (this.bullets.length > 250) return;
    this.bullets.push({ p: from.clone(), d: dir.clone(), life: 0, max: 1.4, speed: 42, dmg: 4 * mul });
    this.game.fx.sparks(from, 3, 0xffc070, 5, 0.6, dir);
    if (Math.random() < 0.5) this.game.audio.play('mg', { vol: 0.3, at: from });
  }

  update(dt) {
    const g = this.game;
    const combat = g.combat;
    // hero beams: pierce everything in their path
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life += dt;
      const ax = b.p.x, ay = b.p.y, az = b.p.z;
      b.p.addScaledVector(b.d, b.speed * dt);
      combat.beamSweep(ax, ay, az, b.p.x, b.p.y, b.p.z, 0.8, (t, boss) => {
        const ok = boss ? t.damage(b.dmg * 1.1, 7, 1.5, ax, az, b.id) : g.crowd.damage(t, b.dmg, 7, 1.5, ax, az, b.id);
        if (ok) {
          b.kills++;
          const hp = this._v.set(t.x ?? t.pos.x, (t.y ?? t.pos.y) + 1.8, t.z ?? t.pos.z);
          g.fx.hit(hp, 0xff7ad0, true);
          g.fx.puff(hp, 2, 0.4, 0.8, 1, 2);
          combat.registerHits(1, {});
          if (combat.hitSfxBudget >= 1) { combat.hitSfxBudget--; g.audio.play('hit', { vol: 0.6, pitch: 1.2 }); }
        }
      });
      if (b.life > b.max || g.world.blocked(b.p.x, b.p.z, 0) && b.p.y < 8) {
        g.fx.hit(b.p, 0xff7ad0);
        g.fx.puff(b.p, 3, 0.5, 0.8);
        this.beams.splice(i, 1);
      }
    }
    // mega beam
    const M = this.megaState;
    if (M) {
      M.t += dt;
      const u = M.t / M.dur;
      const w = (u < 0.15 ? u / 0.15 : 1 - Math.pow((u - 0.15) / 0.85, 2)) * 1.6;
      let len = M.len;
      const yaw = Math.atan2(M.d.x, M.d.z);
      for (const m of [this.mega, this.megaCore]) {
        m.visible = w > 0.01;
        m.position.copy(M.p);
        m.rotation.set(0, yaw, 0);
      }
      this.mega.scale.set(w * (1 + Math.sin(M.t * 60) * 0.08), w, len);
      this.megaCore.scale.set(w * 0.45, w * 0.45, len);
      // damage ticks
      const tickEvery = 0.12;
      if (M.t >= M.ticks * tickEvery && M.ticks < 5) {
        M.ticks++;
        const id = ++this.serial;
        const end = this._v.copy(M.p).addScaledVector(M.d, len);
        combat.beamSweep(M.p.x, M.p.y, M.p.z, end.x, end.y, end.z, 2.4, (t, boss) => {
          const ok = boss ? t.damage(60, 10, 5, M.p.x, M.p.z, id) : g.crowd.damage(t, 60, 12, 6, M.p.x, M.p.z, id);
          if (ok) {
            const hp = new THREE.Vector3(t.x ?? t.pos.x, (t.y ?? t.pos.y) + 1.8, t.z ?? t.pos.z);
            g.fx.hit(hp, 0xff7ad0, true);
            combat.registerHits(1, {});
          }
        });
      }
      if (Math.random() < 0.8) {
        const along = rand(0, len);
        const sp = this._v.copy(M.p).addScaledVector(M.d, along);
        g.fx.sparks(sp, 3, 0xff8ad8, 10);
      }
      if (M.t >= M.dur) { this.megaState = null; this.mega.visible = this.megaCore.visible = false; }
    }
    // enemy bullets
    const hero = g.hero;
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.life += dt;
      b.p.addScaledVector(b.d, b.speed * dt);
      const dx = b.p.x - hero.pos.x, dy = b.p.y - (hero.pos.y + 1.6), dz = b.p.z - hero.pos.z;
      if (dx * dx + dy * dy * 0.4 + dz * dz < 1.3 && hero.alive) {
        hero.takeHit(b.dmg, b.p.x - b.d.x * 5, b.p.z - b.d.z * 5, false, 'bullet');
        this.bullets.splice(i, 1);
        continue;
      }
      if (b.p.y < 0.05 || b.life > b.max || g.world.blocked(b.p.x, b.p.z, 0) && b.p.y < 6) {
        g.fx.sparks(b.p, 3, 0xffc070, 5);
        if (b.p.y < 0.3) g.fx.puff(b.p, 1, 0.55, 0.5, 1, 1);
        this.bullets.splice(i, 1);
      }
    }
  }

  render() {
    let n = 0;
    for (const b of this.beams) {
      _q.setFromUnitVectors(Zf, b.d);
      _p.copy(b.p).addScaledVector(b.d, -1.8);
      _s.set(0.34, 0.34, 3.6);
      _m.compose(_p, _q, _s);
      this.beamMesh.setMatrixAt(n, _m);
      _s.set(0.14, 0.14, 3.8);
      _m.compose(_p, _q, _s);
      this.beamCore.setMatrixAt(n, _m);
      n++;
    }
    this.beamMesh.count = this.beamCore.count = n;
    this.beamMesh.instanceMatrix.needsUpdate = this.beamCore.instanceMatrix.needsUpdate = true;
    n = 0;
    for (const b of this.bullets) {
      _q.setFromUnitVectors(Zf, b.d);
      _p.copy(b.p);
      _s.set(0.12, 0.12, 1.4);
      _m.compose(_p, _q, _s);
      this.bulletMesh.setMatrixAt(n++, _m);
    }
    this.bulletMesh.count = n;
    this.bulletMesh.instanceMatrix.needsUpdate = true;
  }
}
