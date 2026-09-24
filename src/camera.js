import * as THREE from 'three';
import { clamp, damp, angleDamp, lerp } from './core/util.js';

export class CameraRig {
  constructor(camera, world) {
    this.cam = camera;
    this.world = world;
    this.yaw = 0;
    this.pitch = 0.3;
    this.dist = 8.8;
    this.distTarget = 8.8;
    this.crowdPull = 0;
    this.target = new THREE.Vector3(0, 2.4, 0);
    this.trauma = 0;
    this.fovBase = 46;
    this.fovKick = 0;
    this.idleLook = 0;
    this.cine = null;
    this.focus = null; // optional look-at blend target (e.g. a boss)
    this._v = new THREE.Vector3();
    this._p = new THREE.Vector3();
  }
  shake(a) {
    this.trauma = Math.min(1.2, this.trauma + a);
  }
  kick(f) {
    this.fovKick = Math.max(this.fovKick, f);
  }
  forward() {
    return { x: Math.sin(this.yaw), z: Math.cos(this.yaw) };
  }
  recenter(heading) {
    this.recenterTo = heading;
  }
  cinematic(opts) {
    this.cine = { t: 0, ...opts };
  }

  update(dt, rdt, heroPos, heroHeading, input, moving, crowdN = 0) {
    let manual = false;
    if (input) {
      const sens = 0.0026;
      if (input.mouseDX || input.mouseDY) {
        this.yaw -= input.mouseDX * sens;
        this.pitch = clamp(this.pitch + input.mouseDY * sens * 0.8, -0.15, 1.1);
        manual = true;
      }
      if (input.look.x || input.look.y) {
        this.yaw -= input.look.x * 2.6 * rdt;
        this.pitch = clamp(this.pitch + input.look.y * 1.6 * rdt, -0.15, 1.1);
        manual = true;
      }
      if (input.wheel) this.distTarget = clamp(this.distTarget + input.wheel * 1.2, 6, 18);
    }
    if (manual) { this.idleLook = 0; this.recenterTo = undefined; }
    else this.idleLook += rdt;
    if (this.recenterTo !== undefined) {
      this.yaw = angleDamp(this.yaw, this.recenterTo, 10, rdt);
      if (Math.abs(this.yaw - this.recenterTo) < 0.01) this.recenterTo = undefined;
    } else if (moving && !input?.locked && !input?.usingPad && this.idleLook > 0.6) {
      // gentle auto-follow for keyboard-only players
      this.yaw = angleDamp(this.yaw, heroHeading, 0.9, rdt);
    }

    // dense crowd: pull out ~15% so the mob reads around the hero
    this.crowdPull = damp(this.crowdPull, Math.min(1, Math.max(0, (crowdN - 15) / 30)), 1.5, rdt);
    this.dist = damp(this.dist, this.distTarget * (1 + 0.15 * this.crowdPull), 6, rdt);
    const goal = this._v.set(heroPos.x, heroPos.y * (this.yFollow ?? 0.7) + 2.3, heroPos.z);
    this.target.x = damp(this.target.x, goal.x, 14, rdt);
    this.target.z = damp(this.target.z, goal.z, 14, rdt);
    this.target.y = damp(this.target.y, goal.y, 8, rdt);

    let yaw = this.yaw, pitch = this.pitch, dist = this.dist, fov = this.fovBase;
    if (this.cine) {
      const c = this.cine;
      c.t += rdt;
      const k = Math.min(1, c.t / 0.25) * Math.min(1, Math.max(0, (c.dur - c.t) / 0.35));
      yaw = lerp(yaw, heroHeading + (c.yaw ?? 0), k * (c.yawBlend ?? 1));
      pitch = lerp(pitch, c.pitch ?? pitch, k);
      dist = lerp(dist, c.dist ?? dist, k);
      fov = lerp(fov, c.fov ?? fov, k);
      if (c.t >= c.dur) this.cine = null;
    }

    const cp = Math.cos(pitch);
    const p = this._p.set(
      this.target.x - Math.sin(yaw) * cp * dist,
      this.target.y + Math.sin(pitch) * dist,
      this.target.z - Math.cos(yaw) * cp * dist
    );
    // pull in when a building is between the hero and the camera
    const steps = 14;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const x = lerp(this.target.x, p.x, t), y = lerp(this.target.y, p.y, t), z = lerp(this.target.z, p.z, t);
      let hit = false;
      for (const c of this.world.colliders) {
        if (x > c.x0 - 0.4 && x < c.x1 + 0.4 && z > c.z0 - 0.4 && z < c.z1 + 0.4 && y < c.h + 0.5) { hit = true; break; }
      }
      if (hit) {
        const tt = Math.max(0.25, (i - 1) / steps);
        p.set(lerp(this.target.x, p.x, tt), lerp(this.target.y, p.y, tt), lerp(this.target.z, p.z, tt));
        break;
      }
    }
    p.y = Math.max(0.6, p.y);

    this.trauma = Math.max(0, this.trauma - rdt * 1.6);
    const s = this.trauma * this.trauma;
    const t = performance.now() * 0.001;
    p.x += (Math.sin(t * 61.3) + Math.sin(t * 23.1)) * 0.22 * s;
    p.y += (Math.sin(t * 57.7) + Math.sin(t * 31.9)) * 0.22 * s;
    p.z += (Math.sin(t * 49.1) + Math.sin(t * 27.3)) * 0.22 * s;

    this.cam.position.copy(p);
    this.cam.lookAt(this.target.x, this.target.y + 0.3, this.target.z);
    this.fovKick = damp(this.fovKick, 0, 5, rdt);
    const f = fov + this.fovKick;
    if (Math.abs(this.cam.fov - f) > 0.01) {
      this.cam.fov = f;
      this.cam.updateProjectionMatrix();
    }
  }
}
