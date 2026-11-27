/* ViceHub — configuração de contas e links.
 * Preencha quando tiver os serviços prontos; com os campos vazios os botões mostram "em breve".
 *
 * googleClientId : ID do cliente OAuth do Google (Google Cloud Console → Credenciais).
 * discordUrl     : convite do servidor do Discord (ex.: https://discord.gg/xxxx).
 * backend        : "local" guarda contas só neste aparelho (protótipo).
 *                  Troque por "supabase" ou "firebase" quando ligar um servidor de contas;
 *                  o app chama VH_AUTH.* (veja app.js, seção CONTAS) e só esse adaptador muda.
 */
window.VH_CONFIG = {
  googleClientId: "",
  discordUrl: "",
  backend: "local",
  supabaseUrl: "",
  supabaseAnonKey: ""
};
