import * as THREE from 'three';
import { DitherShader } from './ditherShader.js';
import { createPaletteTexture } from './palette.js';

/**
 * Renders the scene into a small render target (fixed pixel height, width from aspect),
 * then draws it full-screen through the dither/palette shader with nearest upscaling.
 */
export class PixelPipeline {
  constructor(renderer, { pixelHeight = 200 } = {}) {
    this.renderer = renderer;
    this.pixelHeight = pixelHeight;
    this.width = 1;
    this.height = pixelHeight;

    const depthTexture = new THREE.DepthTexture(1, 1);
    depthTexture.minFilter = THREE.NearestFilter;
    depthTexture.magFilter = THREE.NearestFilter;

    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.HalfFloatType,
      depthTexture,
    });

    const u = THREE.UniformsUtils.clone(DitherShader.uniforms);
    u.tDiffuse.value = this.target.texture;
    u.tDepth.value = depthTexture;
    u.tPalette.value = createPaletteTexture();
    u.resolution.value = new THREE.Vector2(1, 1);
    u.skyTop.value = srgbVec('#2a1d3d');
    u.skyMid.value = srgbVec('#5d4a87');
    u.skyBottom.value = srgbVec('#ff9f4a');

    this.material = new THREE.ShaderMaterial({
      uniforms: u,
      vertexShader: DitherShader.vertexShader,
      fragmentShader: DitherShader.fragmentShader,
      depthTest: false,
      depthWrite: false,
    });

    this.postScene = new THREE.Scene();
    this.postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.material);
    quad.frustumCulled = false;
    this.postScene.add(quad);
  }

  get uniforms() {
    return this.material.uniforms;
  }

  resize(screenW, screenH) {
    this.height = this.pixelHeight;
    this.width = Math.max(1, Math.round(this.pixelHeight * (screenW / screenH)));
    this.target.setSize(this.width, this.height);
    this.material.uniforms.resolution.value.set(this.width, this.height);
    this.renderer.setSize(screenW, screenH, false);
  }

  render(scene, camera) {
    const r = this.renderer;
    this.material.uniforms.cameraNear.value = camera.near;
    this.material.uniforms.cameraFar.value = camera.far;
    r.setRenderTarget(this.target);
    r.render(scene, camera);
    r.setRenderTarget(null);
    r.render(this.postScene, this.postCamera);
  }
}

function srgbVec(hex) {
  const n = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}
