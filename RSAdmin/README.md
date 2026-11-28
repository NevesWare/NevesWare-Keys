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
1. No `RSStock/app/build.gradle`, aumente `versionCode` (ex.: 2 → 3) e `versionName` (ex.: 1.1.0 → 1.2.0).
2. Compile o APK no AIDE.
3. RS Admin › Versões › **Publicar nova versão** → escolha o APK, informe o mesmo código/nome, escreva as novidades
   e marque “Atualização obrigatória” se necessário.

Banco: veja `docs/supabase-schema.sql`.
