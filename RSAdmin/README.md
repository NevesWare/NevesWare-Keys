# RS Admin

Painel administrativo do **RS Stock** — FlowLabs Studio. Pacote: `com.flowlabs.rsadmin`.

## O que faz
- **Painel**: contas, ativos (24h/7d), lojas, produtos, vencidos, < 7 dias, baixas, gráficos de 14 dias e versões em uso.
- **Contas**: busca e filtros (ativas, admins, bloqueadas, e-mail pendente), criar conta.
- **Detalhe da conta**: aparelho, versão, último acesso, lojas com estoque por status, histórico de movimentações.
  Suporte: editar nick/nome, alterar e-mail, definir senha, enviar redefinição, confirmar e-mail, bloquear/desbloquear,
  tornar/remover admin, excluir conta.
- **Estoque da loja**: ver produtos por status, ajustar quantidade/validade, excluir produto.
- **Versões**: enviar o APK do RS Stock, marcar como **obrigatória** ou opcional, ocultar, copiar link, excluir.
  Os apps verificam ao abrir: obrigatória bloqueia o app até atualizar; opcional mostra o aviso.

## Primeiro acesso
1. Crie sua conta pelo app **RS Stock** (Ajustes › Criar conta) e confirme o e-mail.
2. Abra o **RS Admin** e entre com essa conta. A primeira conta que entrar vira a administradora principal.
3. Para dar acesso a outra pessoa: Contas › escolha a conta › **Tornar admin**.

## Publicar uma atualização
1. Compile o APK do RS Stock no AIDE (de preferência aumentando o `versionCode` no build.gradle — o Android não instala
   um APK com versionCode **menor** que o instalado).
2. RS Admin › Versões › **Publicar nova versão** → escolha o APK. O admin lê sozinho o pacote, o versionCode, o versionName
   e calcula a **impressão digital (SHA-256)** do arquivo.
3. Ajuste o **número** e o **nome da versão** como quiser, escreva as novidades e marque “Atualização obrigatória” se precisar.
4. Os aparelhos enviam a impressão digital do APK instalado; o servidor (`check_update`) compara com a última versão
   publicada e responde se está atualizado. O painel mostra quantos aparelhos estão atualizados/desatualizados.

Banco: veja `docs/supabase-schema.sql`.
