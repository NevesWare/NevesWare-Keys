# RS Stock

<img src="docs/icon-512.png" width="96" alt="Ícone">

**Controle de validades e estoque** — minimalista, intuitivo, com visual de vidro fosco (glassmorphism), tema escuro e claro.
Desenvolvido por **FlowLabs Studio**.

![RS Stock](docs/screenshots/abertura-login-inicio.png)

## Recursos

- **Contas na nuvem (Supabase)**: criar conta com nick + e-mail, entrar por nick ou e-mail, recuperar/alterar senha,
  alterar nick/e-mail, modo convidado offline. Ao entrar, os dados do convidado podem ser enviados para a conta.
- **Backup na nuvem**: tudo salva no aparelho na hora e sincroniza em segundo plano (funciona sem internet e envia depois).
- **Atualizações pelo RS Admin**: ao abrir, o app confere a última versão publicada. Obrigatória = tela bloqueante com
  “Atualizar agora”; opcional = aviso. O APK é baixado e o instalador do Android abre.

- **Várias lojas**: crie, edite e exclua lojas (ex.: Mercado Rio Sul, Guanabara). Cada loja tem o próprio estoque;
  troque de loja pelo topo da tela inicial ou de Produtos.
- **Cores por prazo**: ⚫ vencido (tag VENCIDO) · 🔴 menos de 7 dias · 🟡 7 a 30 dias · 🟢 mais de 30 dias.
- **Dar baixa / Entrada** com motivo (venda, vencido/descarte, avaria, uso interno, troca, ajuste) e observação.
- **Histórico completo**: cadastros, edições, baixas, entradas, remoções e ações de loja, por loja ou de todas, com autor e horário.
- **Exportação com o nome da loja** (ou de todas as lojas): PDF, imagem em **folhas** 1080×1920 (Folha 1, Folha 2…), texto e planilha.
- **Tema especial Coca**: vermelho e branco, bolhas, faixa ondulada, transições próprias e **ícone do app vermelho**.

- **Cara de app de verdade**: tela cheia imersiva (sem barras do sistema; pode desligar em Aparência), splash nativa com o ícone,
  cada aba cabe inteira na tela (sem rolar a página; só listas longas rolam por dentro), transições deslizantes entre abas e telas,
  efeito de toque (ripple), barra inferior flutuante com indicador animado, vibração, modo compacto automático em telas pequenas.
- **Introdução** em 3 telas deslizáveis na primeira abertura.
- **Calendário de validades** e faixa “Próximos 7 dias” na tela inicial.
- **Seleção múltipla** (segure um produto) para excluir vários de uma vez, com “Desfazer”.
- **Filtros** por status, data e categoria.
- **Histórico** de movimentações (adicionado, editado, entrada, baixa, removido).
- **Exportar em 4 formatos**: PDF, Imagem, Texto e Planilha (CSV para Excel/Google Planilhas).

- **Splash** com nome do app, carregamento minimalista e rodapé “FlowLabs Studio · Todos os direitos reservados”.
- **Login**: entrar com nick/e-mail e senha, criar conta com e-mail (preparados para Supabase, marcados “Em breve”),
  **entrar como convidado** (funcional) e botão **Visitar site** (em breve).
- **Início**: saúde do estoque (anel %), contadores (vencidos, hoje, próximos, em dia), ações rápidas e alertas.
- **Produtos**: busca, filtros por status, ordenação, detalhes, editar, duplicar, ajustar quantidade, excluir com “Desfazer”.
- **Cadastro rápido**: só nome e validade são obrigatórios; código de barras opcional (digitado ou **escaneado pela câmera**),
  atalhos de data (+7 dias, +1 mês…), quantidade/unidade, categoria, lote, local e observações; “Salvar e novo”.
  Se o código já existir, o app oferece reaproveitar nome/categoria.
- **Notificações**: resumo diário no horário escolhido com os produtos que vencem dentro de N dias (1–30) e os vencidos;
  reagenda após reiniciar o aparelho; botão de teste.
- **Ajustes**: Perfil, Aparência (tema escuro/claro/sistema, 6 cores, intensidade do vidro, fundo animado/estático/liso,
  lista compacta, vibração), Notificações, Acessibilidade (tamanho do texto, negrito, alto contraste, botões maiores,
  reduzir movimento, reduzir transparência), Segurança (PIN de 4 dígitos, bloquear ao voltar, senha da conta — em breve),
  Backup/restauração (.json), Créditos e Sobre.

## Arquitetura

App Android **sem dependências externas** (compatível com AIDE e Android Studio).

| Camada | Onde | Função |
|---|---|---|
| Interface | `app/src/main/assets/www` | HTML/CSS/JS servido em origem segura `https://appassets.androidplatform.net` |
| Ponte | `WebBridge.java` | `window.AndroidBridge`: sincronização, notificações, PDF, compartilhar/salvar, vibração |
| Alertas | `AlertScheduler`, `ExpiryReceiver`, `Notifier` | Alarme diário + boot, cálculo e notificação |
| PDF | `PdfExporter.java` | `android.graphics.pdf.PdfDocument` |
| Arquivos | `ShareProvider.java` | ContentProvider mínimo para compartilhar exportações |

Pastas JS: `config.js` (configuração), `services/` (native, storage, auth, scanner, exporter), `screens/` (telas), `app.js` (rotas e hotbar).

## Supabase (futuro)

1. Crie o projeto e rode `docs/supabase-schema.sql`.
2. Preencha `VS.config.supabase.url` / `anonKey` e ative `features.accounts` e `features.cloudSync` em `js/config.js`.
3. Implemente os trechos comentados em `js/services/auth.js` e o `SupabaseRepository` em `js/services/storage.js`
   (mesma interface do `LocalRepository`).

Para o site: preencha `siteUrl` e `features.site`.

## Compilar

- **AIDE**: extraia `RSStock.zip`, abra a pasta `RSStock` e rode.
- **Android Studio**: abra a pasta; compileSdk 29, minSdk 21 (Android 5.0+).

Para testar a interface no navegador: `cd app/src/main/assets/www && python3 -m http.server` e abra `http://localhost:8000`.

© FlowLabs Studio · Todos os direitos reservados.

Pacote: `com.flowlabs.rsstock` · Ícones em `res/mipmap-*` (inclui ícone adaptativo Android 8+).
