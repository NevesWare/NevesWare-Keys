import * as THREE from 'three';

// 16-color sunset palette (sRGB). Every final pixel is snapped to one of these.
export const PALETTE = [
  '#140c1c', // 0 outline / deepest shadow
  '#2a1d3d', // 1 deep purple
  '#44305e', // 2 purple
  '#5d4a87', // 3 violet
  '#3b5a8c', // 4 dusk blue
  '#5f8fbf', // 5 sky blue
  '#a3c6e0', // 6 pale blue
  '#f4e9d8', // 7 cream
  '#ffd66b', // 8 lantern yellow
  '#ff9f4a', // 9 orange
  '#e0583c', // 10 red-orange
  '#9e3a4a', // 11 wine
  '#6b3f2a', // 12 bark brown
  '#a8703f', // 13 earth
  '#4f7a3a', // 14 moss
  '#8bbf4f', // 15 grass
];

export function createPaletteTexture() {
  const data = new Uint8Array(PALETTE.length * 4);
  PALETTE.forEach((hex, i) => {
    const n = parseInt(hex.slice(1), 16);
    data[i * 4 + 0] = (n >> 16) & 255;
    data[i * 4 + 1] = (n >> 8) & 255;
    data[i * 4 + 2] = n & 255;
    data[i * 4 + 3] = 255;
  });
  const tex = new THREE.DataTexture(data, PALETTE.length, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.NoColorSpace; // raw sRGB bytes, read as-is in the shader
  tex.needsUpdate = true;
  return tex;
}
