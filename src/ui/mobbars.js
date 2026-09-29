// Reborn-style health bars over the grunts. In Dynasty Warriors: Gundam Reborn every enemy soldier in view carries a
// small fixed-size bar over its head (a grey frame, pink-red fill, black where the health is gone), full until hit and
// cut back the instant a blow lands, with no lagging segment; bodies that are down for good lose theirs. Officers get a
// name and a wider bar instead, which the HUD's floating tags already draw.
// Drawn after the post chain as one instanced quad in screen pixels, so the bars stay crisp (no DoF, bloom or grade),
// and hidden where the scene's depth, pulled a few units toward the lens, says a wall stands in front of the whole bar.
import * as THREE from 'three';
import { RPITCH, RYAW } from '../core/rig.js';
import { clamp } from '../core/util.js';

const MAX = 300;
const FAR0 = 60, FAR1 = 75; // bars thin out between these camera distances
const BIAS = 3.5; // world units the bar's depth test is pulled toward the lens: its own body and its neighbours never hide it

const vertexShader = /* glsl */`
  attribute vec4 aRect; // lower-left corner in device px, fill 0..1, alpha
  attribute float aDepth;
  uniform sampler2D tDepth;
  uniform vec2 uRes, uSize;
  varying vec2 vPx;
  varying float vFill, vAlpha;
  float clear(vec2 px) { return step(aDepth, texture2D(tDepth, px / uRes).x); }
  void main() {
    vPx = position.xy * uSize;
    vFill = aRect.z; vAlpha = aRect.w;
    gl_Position = vec4((aRect.xy + vPx) / uRes * 2.0 - 1.0, 0.0, 1.0);
    // whole bar or none: a body flying past never cuts it, but a wall covering both ends and the middle hides it
    vec2 m = aRect.xy + vec2(0.0, uSize.y * 0.5);
    if (clear(m + vec2(1.0, 0.0)) + clear(m + vec2(uSize.x * 0.5, 0.0)) + clear(m + vec2(uSize.x - 1.0, 0.0)) < 0.5) gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  }`;

// colours read off the footage (sRGB, written straight to the screen)
const fragmentShader = /* glsl */`
  uniform vec2 uSize;
  uniform float uEdge;
  varying vec2 vPx;
  varying float vFill, vAlpha;
  void main() {
    vec2 p = vPx;
    vec3 c; float a = 1.0;
    if (p.x < uEdge || p.y < uEdge || p.x > uSize.x - uEdge || p.y > uSize.y - uEdge) { c = vec3(0.43, 0.44, 0.46); a = 0.95; }
    else if (p.x < uEdge + ceil((uSize.x - 2.0 * uEdge) * vFill)) {
      float v = (p.y - uEdge) / (uSize.y - 2.0 * uEdge); // 0 bottom .. 1 top: brightest just above the middle
      c = mix(vec3(0.62, 0.29, 0.37), vec3(0.88, 0.34, 0.45), smoothstep(0.0, 0.6, v));
      c = mix(c, vec3(0.80, 0.45, 0.52), smoothstep(0.7, 1.0, v));
    } else { c = vec3(0.0); a = 0.8; }
    gl_FragColor = vec4(c, a * vAlpha);
  }`;

export class MobBars {
  constructor(game) {
    this.game = game;
    this.enabled = true;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0], 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    this.rect = new THREE.InstancedBufferAttribute(new Float32Array(MAX * 4), 4).setUsage(THREE.DynamicDrawUsage);
    this.depth = new THREE.InstancedBufferAttribute(new Float32Array(MAX), 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aRect', this.rect);
    geo.setAttribute('aDepth', this.depth);
    geo.instanceCount = 0;
    this.geo = geo;
    this.mat = new THREE.ShaderMaterial({
      vertexShader, fragmentShader,
      uniforms: { tDepth: { value: null }, uRes: { value: new THREE.Vector2() }, uSize: { value: new THREE.Vector2() }, uEdge: { value: 1 } },
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    });
    const mesh = new THREE.Mesh(geo, this.mat);
    mesh.frustumCulled = false;
    this.scene = new THREE.Scene();
    this.scene.add(mesh);
    this._res = new THREE.Vector2();
    this.count = 0;
    game.post.overlays.push(this);
  }

  // Called by the post chain once the frame is on screen.
  render(r, cam) {
    const g = this.game, list = g.crowd.list, hud = g.hud.el.hud;
    this.count = 0;
    if (!this.enabled || !list.length || !(g.mode === 'play' || g.mode === 'paused' || g.mode === 'guest')) return;
    if (g.hud.cineT > 0 || hud.classList.contains('hidden') || hud.style.opacity === '0') return;
    const res = r.getDrawingBufferSize(this._res), W = res.x, H = res.y, dpr = r.getPixelRatio();
    // Reborn's bar is ~34 x 7.5 px on a 720-line screen, whatever the distance
    const bw = Math.round(clamp((H / dpr) * 0.047, 26, 50) * dpr), bh = Math.max(4, Math.round(bw * 0.21));
    const m = cam.matrixWorldInverse.elements, pm = cam.projectionMatrix.elements, near = cam.near;
    const R = this.rect.array, D = this.depth.array;
    let n = 0;
    for (let i = 0; i < list.length && n < MAX; i++) {
      const e = list[i];
      if (!e.alive || e.hp <= 0 || e.state === 'dying' || e.state === 'held' || e.fade < 0.05) continue;
      // a body's length over its centre, tilting with it as it tumbles or lies on its back
      const pose = e.pose, pitch = pose[RPITCH], yaw = e.yaw + pose[RYAW], s = e.scale;
      const lean = Math.sin(pitch) * 1.7 * s;
      const x = e.x + lean * Math.sin(yaw), y = e.y + (Math.cos(pitch) * 1.7 + 1.8) * s, z = e.z + lean * Math.cos(yaw);
      const vx = m[0] * x + m[4] * y + m[8] * z + m[12], vy = m[1] * x + m[5] * y + m[9] * z + m[13], vz = m[2] * x + m[6] * y + m[10] * z + m[14];
      const d = -vz;
      if (d < near + 0.5) continue;
      const dist = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (dist > FAR1) continue;
      const cw = pm[3] * vx + pm[7] * vy + pm[11] * vz + pm[15];
      const sx = ((pm[0] * vx + pm[4] * vy + pm[8] * vz + pm[12]) / cw * 0.5 + 0.5) * W;
      const sy = ((pm[1] * vx + pm[5] * vy + pm[9] * vz + pm[13]) / cw * 0.5 + 0.5) * H;
      if (sx < -bw || sx > W + bw || sy < -bh || sy > H + bh) continue;
      const k = Math.max(near * 2, d - BIAS) / d, bz = vz * k;
      const zc = pm[2] * vx * k + pm[6] * vy * k + pm[10] * bz + pm[14], wc = pm[3] * vx * k + pm[7] * vy * k + pm[11] * bz + pm[15];
      const o = n * 4;
      R[o] = Math.round(sx - bw / 2);
      R[o + 1] = Math.round(sy - bh / 2);
      R[o + 2] = clamp(e.hp / e.maxHp, 0, 1);
      R[o + 3] = e.fade * (dist > FAR0 ? 1 - (dist - FAR0) / (FAR1 - FAR0) : 1);
      D[n] = (zc / wc) * 0.5 + 0.5;
      n++;
    }
    this.count = n;
    if (!n) return;
    this.geo.instanceCount = n;
    this.rect.clearUpdateRanges(); this.rect.addUpdateRange(0, n * 4); this.rect.needsUpdate = true;
    this.depth.clearUpdateRanges(); this.depth.addUpdateRange(0, n); this.depth.needsUpdate = true;
    const u = this.mat.uniforms;
    u.tDepth.value = g.post.sceneRT.depthTexture;
    u.uRes.value.set(W, H);
    u.uSize.value.set(bw, bh);
    u.uEdge.value = Math.max(1, Math.round(bh / 8));
    const ac = r.autoClear;
    r.autoClear = false;
    r.render(this.scene, cam);
    r.autoClear = ac;
  }
}
