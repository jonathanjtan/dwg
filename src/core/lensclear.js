// Lens clear (render-only): fragments closer than `near` to the camera are discarded, so a Zaku, a tree or a chunk of
// debris passing the lens never blacks out the frame. Idea from voxel-musou's occlusion.js (MIT, © 2026 BubuAi).
export function lensClear(material, near = 2.4) {
  const prev = material.onBeforeCompile;
  const key = material.customProgramCacheKey() + '|lens' + near;
  material.onBeforeCompile = function (shader, renderer) {
    prev.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying float vLensD;\nvoid main() {')
      .replace('#include <project_vertex>', '#include <project_vertex>\n  vLensD = -mvPosition.z;');
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', `varying float vLensD;\nvoid main() {\n  if (vLensD < ${near.toFixed(2)}) discard;`);
  };
  material.customProgramCacheKey = () => key;
  material.needsUpdate = true;
  return material;
}

// Screen-door fade (render-only): an instanced mesh whose geometry carries a per-instance `instFade` (1 solid .. 0 gone)
// discards that share of its fragments in a 4x4 Bayer pattern, so a unit dissolves out of the way with no transparency
// sorting. Patch the mesh's customDepthMaterial too and its shadow thins with it.
export function ditherFade(material) {
  const prev = material.onBeforeCompile;
  const key = material.customProgramCacheKey() + '|fade';
  material.onBeforeCompile = function (shader, renderer) {
    prev.call(this, shader, renderer);
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'attribute float instFade;\nvarying float vFade;\nvoid main() {\n  vFade = instFade;');
    shader.fragmentShader = shader.fragmentShader.replace('void main() {', `varying float vFade;
float bayer2(vec2 a) { a = floor(a); return fract(a.x * 0.5 + a.y * a.y * 0.75); }
void main() {
  if (bayer2(gl_FragCoord.xy * 0.5) * 0.25 + bayer2(gl_FragCoord.xy) >= vFade) discard;`);
  };
  material.customProgramCacheKey = () => key;
  material.needsUpdate = true;
  return material;
}
