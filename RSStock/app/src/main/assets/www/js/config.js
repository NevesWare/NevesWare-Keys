/* ==========================================================================
   Configuração central do RS Stock.
   Para ativar contas na nuvem, preencha "supabase" e mude features.accounts.
   ========================================================================== */
window.RS = window.RS || {};
RS.screens = {};

RS.config = {
  appName: 'RS Stock',
  version: '1.0.0',
  studio: 'Flow Labs Studio',
  year: new Date().getFullYear(),

  /* Site oficial — o botão aparece como "Em breve" enquanto estiver vazio. */
  siteUrl: '',

  /* Supabase (futuro): https://supabase.com → Project Settings → API */
  supabase: {
    url: '',      // ex.: 'https://xxxx.supabase.co'
    anonKey: '',  // chave pública "anon"
    tables: { products: 'products', profiles: 'profiles' }
  },

  features: {
    accounts: false,   // login com nick/senha e cadastro com e-mail
    cloudSync: false,  // sincronizar produtos com o Supabase
    site: false        // botão "Visitar site"
  },

  categories: ['Alimentos', 'Bebidas', 'Laticínios', 'Carnes', 'Hortifruti', 'Padaria', 'Congelados', 'Limpeza', 'Higiene', 'Medicamentos', 'Cosméticos', 'Pet', 'Outros'],
  units: ['un', 'cx', 'pct', 'kg', 'g', 'L', 'ml'],

  accents: {
    violet: { name: 'Violeta', a: '#7c5cff', b: '#4cc9ff', rgb: '124, 92, 255' },
    blue:   { name: 'Azul',    a: '#3b82f6', b: '#22d3ee', rgb: '59, 130, 246' },
    mint:   { name: 'Menta',   a: '#10b981', b: '#a3e635', rgb: '16, 185, 129' },
    pink:   { name: 'Rosa',    a: '#ec4899', b: '#a855f7', rgb: '236, 72, 153' },
    sunset: { name: 'Pôr do sol', a: '#f97316', b: '#f43f5e', rgb: '249, 115, 22' },
    ocean:  { name: 'Oceano',  a: '#06b6d4', b: '#6366f1', rgb: '6, 182, 212' }
  }
};
