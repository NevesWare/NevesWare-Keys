// Post-process: low-res scene -> 1px depth outline -> ordered (Bayer 4x4) dither -> nearest palette color.
export const DitherShader = {
  uniforms: {
    tDiffuse: { value: null },
    tDepth: { value: null },
    tPalette: { value: null },
    resolution: { value: null },
    cameraNear: { value: 0.1 },
    cameraFar: { value: 200 },
    ditherSpread: { value: 0.11 },
    outlineThreshold: { value: 1.2 },
    skyTop: { value: null },
    skyMid: { value: null },
    skyBottom: { value: null },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position.xy, 0.0, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tDepth;
    uniform sampler2D tPalette;
    uniform vec2 resolution;
    uniform float cameraNear;
    uniform float cameraFar;
    uniform float ditherSpread;
    uniform float outlineThreshold;
    uniform vec3 skyTop;
    uniform vec3 skyMid;
    uniform vec3 skyBottom;
    varying vec2 vUv;

    const float BAYER[16] = float[16](
       0.0,  8.0,  2.0, 10.0,
      12.0,  4.0, 14.0,  6.0,
       3.0, 11.0,  1.0,  9.0,
      15.0,  7.0, 13.0,  5.0
    );

    float bayer(vec2 cell) {
      int x = int(mod(cell.x, 4.0));
      int y = int(mod(cell.y, 4.0));
      return (BAYER[x + y * 4] + 0.5) / 16.0 - 0.5;
    }

    // Orthographic camera: stored depth is already linear in [near, far].
    float viewDepth(vec2 uv) {
      float d = texture2D(tDepth, uv).x;
      return cameraNear + d * (cameraFar - cameraNear);
    }

    vec3 toSRGB(vec3 c) {
      c = max(c, vec3(0.0));
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
    }

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }

    vec3 nearestPalette(vec3 c) {
      vec3 best = vec3(0.0);
      float bestD = 1e9;
      for (int i = 0; i < 16; i++) {
        vec3 p = texture2D(tPalette, vec2((float(i) + 0.5) / 16.0, 0.5)).rgb;
        vec3 d = c - p;
        float dist = dot(d * d, vec3(0.30, 0.59, 0.11));
        if (dist < bestD) { bestD = dist; best = p; }
      }
      return best;
    }

    void main() {
      vec2 cell = floor(vUv * resolution);
      vec2 uv = (cell + 0.5) / resolution;
      vec2 px = 1.0 / resolution;

      float raw = texture2D(tDepth, uv).x;
      bool isSky = raw >= 0.99999;
      vec3 col;

      if (isSky) {
        float h = uv.y;
        col = h > 0.55 ? mix(skyMid, skyTop, (h - 0.55) / 0.45) : mix(skyBottom, skyMid, h / 0.55);
        // sparse twinkle-free stars in the upper sky
        if (h > 0.6 && hash(cell) > 0.996) col = vec3(0.96, 0.91, 0.85);
      } else {
        col = toSRGB(texture2D(tDiffuse, uv).rgb);
      }

      // 1px outline: this pixel is in front of a neighbor by more than the threshold.
      float edge = 0.0;
      if (!isSky) {
        float dc = viewDepth(uv);
        float dn = max(max(viewDepth(uv + vec2(px.x, 0.0)), viewDepth(uv - vec2(px.x, 0.0))),
                       max(viewDepth(uv + vec2(0.0, px.y)), viewDepth(uv - vec2(0.0, px.y))));
        edge = step(outlineThreshold, dn - dc);
      }

      col += bayer(cell) * ditherSpread;
      vec3 outCol = nearestPalette(col);
      if (edge > 0.5) outCol = nearestPalette(col * 0.3);

      gl_FragColor = vec4(outCol, 1.0);
    }
  `,
};
