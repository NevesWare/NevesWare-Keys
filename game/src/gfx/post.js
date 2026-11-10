import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { view } from '../ui/viewport.js';

/** Quality tiers. 'auto' resolves from the device. */
export const TIERS = {
  baixo: { label: 'Baixo', dpr: 1, shadows: 1024, grass: 16000, grassPatch: 24, post: 'none', bloom: false },
  medio: { label: 'Médio', dpr: 1.5, shadows: 1024, grass: 40000, grassPatch: 30, post: 'grade', bloom: false },
  alto: { label: 'Alto', dpr: 2, shadows: 2048, grass: 110000, grassPatch: 40, post: 'full', bloom: true },
};

export function resolveTier(setting) {
  if (TIERS[setting]) return setting;
  const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  const cores = navigator.hardwareConcurrency ?? 4;
  if (touch) return cores >= 8 ? 'medio' : 'baixo';
  return 'alto';
}

const FinalShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uBlur: { value: 2.2 },
    uTilt: { value: 1.0 },
  },
  vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform vec2 uRes; uniform float uBlur; uniform float uTilt;
    varying vec2 vUv;
    void main(){
      vec4 base = texture2D(tDiffuse, vUv);
      vec3 col = base.rgb;
      // tilt-shift: blur grows toward top and bottom of the frame
      float band = smoothstep(0.2, 0.55, abs(vUv.y - 0.47)) * uTilt;
      if (band > 0.01) {
        vec3 acc = vec3(0.0); float wsum = 0.0;
        for (int i = 0; i < 12; i++) {
          float a = float(i) * 2.39996;
          float r = sqrt(float(i) + 0.5) / 3.5;
          vec2 o = vec2(cos(a), sin(a)) * r * uBlur * band * 3.0 / uRes;
          acc += texture2D(tDiffuse, vUv + o).rgb; wsum += 1.0;
        }
        col = mix(col, acc / wsum, band);
      }
      // warm grade + gentle contrast
      col *= vec3(1.05, 1.0, 0.92);
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(vec3(l), col, 1.08);
      // vignette
      float v = smoothstep(0.95, 0.3, length((vUv - 0.5) * vec2(1.1, 1.0)));
      col *= mix(0.62, 1.0, v);
      gl_FragColor = vec4(col, base.a);
    }`,
};

/** Wraps the renderer with the post chain for the chosen tier. */
export class Pipeline {
  constructor(renderer) {
    this.renderer = renderer;
    this.composer = null;
    this.tier = null;
  }

  setTier(name) {
    const t = TIERS[name];
    this.tier = t;
    this.name = name;
    const r = this.renderer;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.15;
    r.setPixelRatio(Math.min(window.devicePixelRatio, t.dpr));
    this.composer?.dispose();
    this.composer = null;
    if (t.post === 'none') return;
    const c = new EffectComposer(r);
    this.renderPass = new RenderPass(new THREE.Scene(), new THREE.PerspectiveCamera());
    c.addPass(this.renderPass);
    if (t.bloom) c.addPass(new UnrealBloomPass(new THREE.Vector2(256, 256), 0.18, 0.5, 0.92));
    this.final = new ShaderPass(FinalShader);
    this.final.uniforms.uTilt.value = t.post === 'full' ? 1 : 0;
    c.addPass(this.final);
    c.addPass(new OutputPass());
    this.composer = c;
    this.resize();
  }

  resize() {
    const w = view.w, h = view.h;
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
      this.final.uniforms.uRes.value.set(w, h);
    }
  }

  render(scene, camera) {
    if (!this.composer) return this.renderer.render(scene, camera);
    this.renderPass.scene = scene;
    this.renderPass.camera = camera;
    this.composer.render();
  }
}
