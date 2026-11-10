shader_type spatial;
// Fachada: albedo + máscara de vidro (reflexivo) + normal map + janelas acesas
// à noite. Substitui o StandardMaterial porque no renderer Compatibility a
// textura de emissão padrão é ignorada (o prédio inteiro acendia).
render_mode cull_disabled;

uniform sampler2D albedo_tex : source_color, filter_linear_mipmap_anisotropic;
uniform sampler2D mask_tex : hint_default_black, filter_linear_mipmap;
uniform sampler2D normal_tex : hint_normal, filter_linear_mipmap;
uniform sampler2D emission_tex : source_color, hint_default_black, filter_linear_mipmap;
uniform vec4 tint : source_color = vec4(1.0);
uniform float night = 0.0;
uniform float emission_strength = 0.6;
uniform float base_emission = 0.0;
// vitrines: UV em metros a partir da posição no mundo (caixa sem UV própria)
uniform bool world_uv = false;
uniform vec2 world_scale = vec2(0.25, 0.26);

varying vec3 wpos;
varying vec3 wnrm;

void vertex() {
	wpos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
	wnrm = normalize((MODEL_MATRIX * vec4(NORMAL, 0.0)).xyz);
}

void fragment() {
	vec2 uv = UV;
	if (world_uv) {
		float u = abs(wnrm.x) > abs(wnrm.z) ? wpos.z : wpos.x;
		uv = vec2(u * world_scale.x, 1.0 - fract(wpos.y * world_scale.y));
	}
	vec3 a = texture(albedo_tex, uv).rgb;
	ALBEDO = a * tint.rgb;
	float m = clamp(texture(mask_tex, uv).r / 0.85, 0.0, 1.0);
	ROUGHNESS = mix(0.88, 0.06, m);
	METALLIC = m * 0.8;
	SPECULAR = 0.5;
	NORMAL_MAP = texture(normal_tex, uv).rgb;
	NORMAL_MAP_DEPTH = 0.7;
	EMISSION = texture(emission_tex, uv).rgb * (night * emission_strength + base_emission);
}
