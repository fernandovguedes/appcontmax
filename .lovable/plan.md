
Objetivo imediato: destravar a integração Acessórias e garantir que a fila volte a processar sem ficar presa em “pending/running”.

Diagnóstico confirmado (com base no estado atual):
1) A correção de UUID já está no código (`created_by_user_id` agora vira `null` para chamada interna), então a causa original do crash foi corrigida.
2) Ainda existem jobs antigos da Acessórias presos em `pending`, e o `run-integration` bloqueia novas execuções quando encontra qualquer `pending/running` para o mesmo tenant+provider (retorna 409).
3) O worker atual processa 1 job por disparo e, em cenário de retry, retorna o job para `pending` sem se auto-disparar de novo; isso pode deixar fila parada sem novo gatilho.
4) Há warnings de `ref` no frontend (AppHeader/IntegrationCard/Badge), que não parecem ser a causa do travamento da integração, mas devem ser corrigidos depois para evitar ruído.

Plano de ação para destravar de vez:
1. Higienização operacional da fila (dados)
- Marcar jobs `integration_jobs` da Acessórias que estão presos (`pending`/`running` antigos) como `error` com mensagem de cleanup e `finished_at`.
- Atualizar `tenant_integrations.last_status/last_error` coerentemente para não manter estado “running” fantasma.
- Opcional: encerrar também `sync_jobs` muito antigos em `running` para manter histórico consistente.

2. Robustez no worker (`process-integration-job`)
- Após finalizar um job (success/error/retry), re-disparar o próprio worker em fire-and-forget para drenar a fila.
- No ramo de retry, além de voltar para `pending`, já agendar próximo processamento imediatamente.
- Garantir que timeout trate também casos onde `started_at` está nulo mas status ficou inconsistente.
- Melhorar logs de execução por job_id (início, função chamada, status final, tentativa).

3. Robustez no criador de jobs (`run-integration`)
- Antes de bloquear por “job em andamento”, validar idade do job ativo:
  - se `pending`/`running` muito antigo, autocurar para `error` e permitir novo job;
  - se realmente ativo recente, manter 409.
- Retornar payload padronizado para 409/erros para o frontend interpretar sem ambiguidades.

4. Ajuste no frontend de jobs (`useIntegrationJobs`)
- Melhorar tratamento de non-2xx para capturar corretamente corpo do erro 409 e mostrar toast informativo.
- Adicionar fallback de `refetch()` curto após submit para sincronizar UI mesmo se evento realtime atrasar.
- Exibir mensagem mais clara quando status ficar parado por muito tempo (ex.: “fila aguardando reprocessamento”).

5. Validação completa ponta a ponta (Acessórias)
- Fluxo 1: clicar “Executar” com fila limpa → criar job → running → success/error final.
- Fluxo 2: duplo clique rápido → segunda tentativa deve exibir “execução em andamento” (sem erro genérico).
- Fluxo 3: erro forçado de integração → retry automático deve ocorrer e não deixar job preso.
- Fluxo 4: dois tenants com jobs da Acessórias na fila → worker deve drenar ambos sem intervenção manual.
- Critério de aceite: nenhum job da Acessórias fica indefinidamente em `pending/running` sem progresso; novos cliques em “Executar” não ficam travados por resíduos antigos.

Arquivos que serão ajustados na implementação:
- `supabase/functions/process-integration-job/index.ts` (drenagem/auto-retrigger/retry robusto)
- `supabase/functions/run-integration/index.ts` (autocura de jobs antigos + bloqueio inteligente)
- `src/hooks/useIntegrationJobs.ts` (tratamento robusto de 409/non-2xx + sincronização UI)
- Operação de dados no backend para limpar jobs presos existentes

Riscos e mitigação:
- Risco: autocura agressiva encerrar job legítimo. Mitigação: limiar temporal conservador e checagem por timestamps.
- Risco: loop de worker sem fim. Mitigação: re-disparo somente quando ainda existir job pendente e com proteção por tentativa máxima.
- Risco: inconsistência entre `integration_jobs` e `sync_jobs`. Mitigação: cleanup coordenado e logging por `job_id`.

Resultado esperado após executar este plano:
- O estado “travou” desaparece.
- Acessórias volta a executar normalmente.
- Fila assíncrona fica auto-recuperável mesmo após falhas.
