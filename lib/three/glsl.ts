// Shared GLSL: hash-based 3D gradient noise and fractal sums (written for this project).
export const NOISE_GLSL = /* glsl */ `
vec3 hash33(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yxz + 19.19);
  return -1.0 + 2.0 * fract((p.xxy + p.yxx) * p.zyx);
}

float gnoise(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  vec3 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float n000 = dot(hash33(i + vec3(0,0,0)), f - vec3(0,0,0));
  float n100 = dot(hash33(i + vec3(1,0,0)), f - vec3(1,0,0));
  float n010 = dot(hash33(i + vec3(0,1,0)), f - vec3(0,1,0));
  float n110 = dot(hash33(i + vec3(1,1,0)), f - vec3(1,1,0));
  float n001 = dot(hash33(i + vec3(0,0,1)), f - vec3(0,0,1));
  float n101 = dot(hash33(i + vec3(1,0,1)), f - vec3(1,0,1));
  float n011 = dot(hash33(i + vec3(0,1,1)), f - vec3(0,1,1));
  float n111 = dot(hash33(i + vec3(1,1,1)), f - vec3(1,1,1));
  return mix(
    mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
    mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
    u.z);
}

float fbm(vec3 p, int oct) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * gnoise(p);
    p = p * 2.03 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}

// Absolute-value turbulence: sharp ridges, good for plasma and lava cells.
float turb(vec3 p, int oct) {
  float a = 0.5, s = 0.0;
  for (int i = 0; i < 8; i++) {
    if (i >= oct) break;
    s += a * abs(gnoise(p));
    p = p * 2.07 + vec3(4.3, 1.1, 7.7);
    a *= 0.5;
  }
  return s;
}
`;
