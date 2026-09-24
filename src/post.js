// Post chain: MSAA HDR scene target -> capped bloom -> final pass (depth of field, grade, retro dither) to screen.
// Approach adapted from voxel-musou's post pipeline (MIT, © 2026 BubuAi): square-bokeh gather DoF so blurred voxels
// read as soft blocks, split-tone grade, vignette with a darker bottom band, fine grain and 2 px ordered dithering.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';

export const POST = {
  exposure: 1.08,
  bloom: 0.75, bloomRadius: 0.35, bloomThreshold: 0.95,
  focusBand: 0.35, nearBlur: 5, farBlur: 3.2, // DoF: sharp band ± focus*band, CoC scales in px
  sat: 1.12,
  shadowTint: [0.93, 0.96, 1.08], highTint: [1.03, 1.0, 0.95],
  vignette: 0.22, bottom: 0.16, grain: 0.022, levels: 48, dither: 0.75,
};

const vs = /* glsl */`varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const fs = /* glsl */`
  #include <packing>
  uniform sampler2D tColor, tDepth, tBloom;
  uniform vec2 uRes; uniform float uNear, uFar, uFocus, uBand, uNearBlur, uFarBlur, uTime, uFlash, uExposure, uSat;
  uniform float uVignette, uBottom, uGrain, uLevels, uDither, uMusou, uBloomOn, uRadial, uAberr;
  uniform vec3 uShadowTint, uHighTint;
  varying vec2 vUv;

  float viewDist(vec2 uv) {
    float z = texture2D(tDepth, uv).x;
    return -perspectiveDepthToViewZ(z, uNear, uFar);
  }
  float coc(float d) {
    float n = max(uFocus * (1.0 - uBand), 0.5), f = uFocus * (1.0 + uBand * 1.6);
    float cn = clamp((n / d - 1.0) * uNearBlur, 0.0, 7.0);
    float cf = clamp((1.0 - f / d) * uFarBlur, 0.0, 5.0);
    return max(cn, cf);
  }
  float bayer4(vec2 p) {
    int i = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
    int m[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
    return (float(m[i]) + 0.5) / 16.0 - 0.5;
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
  vec3 aces(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  void main() {
    vec2 texel = 1.0 / uRes;
    float d0 = viewDist(vUv);
    float c0 = coc(d0);
    vec3 col = texture2D(tColor, vUv).rgb;
    vec2 dc = vUv - 0.5;
    // heavy blows split the colour channels for a beat
    if (uAberr > 0.001) {
      vec2 o = dc * uAberr * 0.014;
      col.r = texture2D(tColor, vUv + o).r;
      col.b = texture2D(tColor, vUv - o).b;
    }
    // gather bokeh on a golden-angle spiral stretched to a square, so out-of-focus voxels stay blocky
    if (c0 > 0.25) {
      vec3 acc = col; float tot = 1.0;
      float r = 0.9;
      for (int i = 0; i < 20; i++) {
        float ang = float(i) * 2.39996323;
        vec2 dv = vec2(cos(ang), sin(ang)); dv /= max(abs(dv.x), abs(dv.y));
        vec2 suv = vUv + dv * texel * r;
        float ds = viewDist(suv);
        float cs = coc(ds);
        if (ds > d0) cs = min(cs, c0 * 2.0);           // sharp foreground never smears onto background
        float m = smoothstep(r - 0.6, r + 0.6, cs);
        acc += mix(acc / tot, texture2D(tColor, suv).rgb, m); tot += 1.0;
        r += 0.36;
      }
      col = acc / tot;
    }
    // boost dash / SP rush: zoom blur that leaves the centre of the frame sharp
    if (uRadial > 0.001) {
      vec3 acc = vec3(0.0);
      for (int i = 1; i <= 8; i++) acc += texture2D(tColor, vUv - dc * (float(i) / 8.0) * 0.07 * uRadial).rgb;
      col = mix(col, acc / 8.0, smoothstep(0.16, 0.5, length(dc * vec2(1.6, 1.0))) * min(1.0, uRadial * 1.2));
    }
    col += texture2D(tBloom, vUv).rgb * uBloomOn;
    col *= uExposure;
    // split tone in scene-linear: cool shade, warm light; hot emissive fades back to neutral
    float L = max(dot(col, vec3(0.2126, 0.7152, 0.0722)), 1e-6);
    col *= mix(mix(uShadowTint, uHighTint, smoothstep(0.02, 0.5, L)), vec3(1.0), smoothstep(1.2, 3.0, L));
    L = max(dot(col, vec3(0.2126, 0.7152, 0.0722)), 1e-6);
    col = max(mix(vec3(L), col, uSat), 0.0);
    // SP attack grade: magenta-night dim that the finisher burns through
    col = mix(col, vec3(L) * vec3(0.9, 0.55, 1.1) * 0.75 + col * vec3(0.35, 0.1, 0.3), uMusou * 0.55);
    col = aces(col);
    col = sRGBTransferOETF(vec4(col, 1.0)).rgb;
    vec2 d = vUv - 0.5;
    col *= (1.0 - uVignette * smoothstep(0.35, 0.95, length(d * vec2(1.6, 1.0)))) * (1.0 - uBottom * (1.0 - smoothstep(0.0, 0.4, vUv.y)));
    col = mix(col, vec3(1.0, 0.97, 0.94), uFlash);
    col += (hash(gl_FragCoord.xy + fract(uTime * 7.31) * 97.0) - 0.5) * uGrain;
    col += bayer4(floor(gl_FragCoord.xy * 0.5)) * uDither / uLevels;
    col = floor(col * uLevels + 0.5) / uLevels;
    gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
  }`;

export class Post {
  constructor(renderer, w, h) {
    this.renderer = renderer;
    const depthTexture = new THREE.DepthTexture(w, h);
    depthTexture.type = THREE.UnsignedIntType;
    this.sceneRT = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4, depthTexture });
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), POST.bloom, POST.bloomRadius, POST.bloomThreshold);
    this.bloom.blendMaterial.visible = false; // the final pass adds the bloom itself
    // cap the prefilter so stacked additive glows bloom as a halo, never a white flare over the action
    const hp = this.bloom.materialHighPassFilter;
    hp.fragmentShader = /* glsl */`
      uniform sampler2D tDiffuse; uniform float luminosityThreshold, smoothWidth;
      varying vec2 vUv;
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float v = luminance(c);
        gl_FragColor = vec4(min(c, vec3(1.8)) * smoothstep(luminosityThreshold, luminosityThreshold + smoothWidth, v), 1.0);
      }`;
    hp.needsUpdate = true;
    this.bloom.highPassUniforms.smoothWidth.value = 0.6;
    this.quad = new FullScreenQuad(new THREE.ShaderMaterial({
      vertexShader: vs,
      fragmentShader: fs,
      uniforms: {
        tColor: { value: this.sceneRT.texture }, tDepth: { value: depthTexture },
        tBloom: { value: this.bloom.renderTargetsHorizontal[0].texture },
        uRes: { value: new THREE.Vector2(w, h) }, uNear: { value: 0.1 }, uFar: { value: 3000 },
        uFocus: { value: 9 }, uBand: { value: POST.focusBand }, uNearBlur: { value: POST.nearBlur }, uFarBlur: { value: POST.farBlur },
        uTime: { value: 0 }, uFlash: { value: 0 }, uExposure: { value: POST.exposure }, uSat: { value: POST.sat },
        uVignette: { value: POST.vignette }, uBottom: { value: POST.bottom }, uGrain: { value: POST.grain },
        uLevels: { value: POST.levels }, uDither: { value: POST.dither }, uMusou: { value: 0 }, uBloomOn: { value: 1 },
        uRadial: { value: 0 }, uAberr: { value: 0 },
        uShadowTint: { value: new THREE.Vector3(...POST.shadowTint) }, uHighTint: { value: new THREE.Vector3(...POST.highTint) },
      },
      depthTest: false, depthWrite: false, toneMapped: false,
    }));
    this.flash = 0;
    this.musou = 0;
    this.radial = 0;
    this.aberr = 0;
    this.focus = 9;
  }

  setSize(w, h) {
    this.sceneRT.setSize(w, h);
    this.bloom.setSize(Math.round(w / 2), Math.round(h / 2));
    this.quad.material.uniforms.uRes.value.set(w, h);
  }

  render(scene, camera, time) {
    const r = this.renderer;
    r.setRenderTarget(this.sceneRT);
    r.render(scene, camera);
    this.bloom.render(r, null, this.sceneRT, 1 / 60, false);
    const u = this.quad.material.uniforms;
    u.uNear.value = camera.near;
    u.uFar.value = camera.far;
    u.uFocus.value = this.focus;
    u.uTime.value = time;
    u.uFlash.value = this.flash;
    u.uMusou.value = this.musou;
    u.uRadial.value = this.radial;
    u.uAberr.value = this.aberr;
    r.setRenderTarget(null);
    this.quad.render(r);
  }
}
