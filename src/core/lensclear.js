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
