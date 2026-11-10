shader_type spatial;
// Mar: ondas suaves no vértice, normal procedural animada, reflexo do céu
// (fresnel) e brilho especular do sol. Barato o bastante para celular.
render_mode blend_mix, cull_disabled, depth_draw_opaque, specular_schlick_ggx;

uniform vec3 deep_color : source_color = vec3(0.02, 0.1, 0.14);
uniform vec3 shallow_color : source_color = vec3(0.07, 0.3, 0.34);
uniform float alpha_base = 0.86;

varying vec3 wpos;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	vec2 u = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float height(vec2 p, float t) {
	return noise(p + vec2(t, t * 0.6)) + 0.5 * noise(p * 2.3 - vec2(t * 0.8, t * 1.1)) + 0.25 * noise(p * 5.1 + vec2(t * 1.6, 0.0));
}

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	VERTEX.y += sin(wpos.x * 0.07 + TIME * 1.1) * 0.12 + sin(wpos.z * 0.11 + TIME * 0.8) * 0.1;
}

void fragment() {
	vec2 p = wpos.xz * 0.22;
	float t = TIME * 0.35;
	float e = 0.08;
	float h0 = height(p, t);
	float hx = height(p + vec2(e, 0.0), t);
	float hz = height(p + vec2(0.0, e), t);
	vec3 n = normalize(vec3((h0 - hx) * 2.2, 1.0, (h0 - hz) * 2.2));
	NORMAL = normalize((VIEW_MATRIX * vec4(n, 0.0)).xyz);
	float fres = pow(1.0 - clamp(dot(NORMAL, VIEW), 0.0, 1.0), 3.0);
	float depth_mix = clamp((wpos.z - 255.0) / 30.0, 0.0, 1.0);
	ALBEDO = mix(shallow_color, deep_color, depth_mix);
	ROUGHNESS = 0.05;
	METALLIC = 0.15;
	SPECULAR = 0.7;
	ALPHA = mix(alpha_base, 1.0, fres);
}
