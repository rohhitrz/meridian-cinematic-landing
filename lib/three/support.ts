// Kept free of three.js imports so the main bundle can feature-detect WebGL
// without pulling in the renderer.
export function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}
