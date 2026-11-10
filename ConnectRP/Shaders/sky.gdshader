shader_type sky;
// Céu: degradê, sol com halo, nuvens procedurais (fbm) e estrelas à noite.
// Sem TIME: o script move as nuvens (cloud_offset) para não recalcular o
// reflexo do céu a cada quadro no celular.

uniform vec3 top_color : source_color = vec3(0.2, 0.42, 0.78);
uniform vec3 horizon_color : source_color = vec3(0.68, 0.78, 0.88);
uniform vec3 ground_color : source_color = vec3(0.22, 0.22, 0.22);
uniform vec3 cloud_light : source_color = vec3(1.0);
uniform vec3 cloud_shadow : source_color = vec3(0.62, 0.66, 0.74);
uniform float cloud_coverage : hint_range(0.0, 1.0) = 0.42;
uniform float cloud_offset = 0.0;
uniform float night : hint_range(0.0, 1.0) = 0.0;
uniform float sun_size = 1.0;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * noise(p);
		p = p * 2.03 + vec2(1.7, 9.2);
		a *= 0.5;
	}
	return v;
}

void sky() {
	vec3 d = EYEDIR;
	float h = d.y;
	vec3 col;
	if (h >= 0.0) {
		col = mix(horizon_color, top_color, pow(clamp(h, 0.0, 1.0), 0.5));
	} else {
		col = mix(horizon_color, ground_color, clamp(-h * 5.0, 0.0, 1.0));
	}
	if (LIGHT0_ENABLED) {
		float s = dot(d, LIGHT0_DIRECTION);
		float disk = smoothstep(1.0 - 0.00035 * sun_size, 1.0 - 0.00015 * sun_size, s);
		float halo = pow(max(s, 0.0), 80.0) * 0.5 + pow(max(s, 0.0), 8.0) * 0.12;
		col += LIGHT0_COLOR * (disk * 12.0 + halo) * (1.0 - night * 0.85);
	}
	if (h > 0.0) {
		vec2 uv = d.xz / (h + 0.15) * 1.3 + vec2(cloud_offset, cloud_offset * 0.35);
		float n = fbm(uv);
		float c = smoothstep(1.0 - cloud_coverage, 1.0 - cloud_coverage + 0.28, n);
		float shade = fbm(uv * 1.8 + vec2(3.1, 1.3));
		vec3 cc = mix(cloud_shadow, cloud_light, smoothstep(0.25, 0.75, shade));
		c *= smoothstep(0.0, 0.18, h);
		col = mix(col, cc, c * 0.9);
		if (night > 0.01) {
			vec2 sp = d.xz / (h + 0.35) * 140.0;
			float star = step(0.9965, hash(floor(sp))) * (0.5 + 0.5 * hash(floor(sp) + 7.0));
			col += vec3(star) * night * smoothstep(0.08, 0.35, h) * (1.0 - c);
		}
	}
	COLOR = col;
}
