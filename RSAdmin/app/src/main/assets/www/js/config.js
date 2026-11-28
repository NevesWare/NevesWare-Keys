/* RS Admin — configuração */
window.RS = window.RS || {};
RS.screens = {};
RS.config = {
  appName: 'RS Admin',
  version: '1.1.0',
  versionCode: 2,
  studio: 'FlowLabs Studio',
  year: new Date().getFullYear(),
  /* Mesmo projeto Supabase do RS Stock. A chave publicável é pública; o que protege os dados
     são as regras RLS e a função "admin-users" (que confere se você é admin). */
  supabase: { url: 'https://yycbznbocdylbghutdrp.supabase.co', anonKey: 'sb_publishable_mZUjcoDsUf1CYahMdGtK5g_ZJjRXos3' },
  releasesBucket: 'apks',
  targetPackage: 'com.flowlabs.rsstock',   // pacote do app que recebe as atualizações
  accents: { violet: { name: 'Violeta', a: '#7c5cff', b: '#4cc9ff', rgb: '124, 92, 255' } }
};
