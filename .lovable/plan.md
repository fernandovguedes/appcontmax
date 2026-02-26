
# Corrigir Deadlock da Integracao Acessorias

## Problema Raiz

Existe um job preso em `pending` (id: `85b4f94b`, criado ha 18+ minutos) que causa um deadlock:

1. O frontend (`getActiveJob`) encontra o job `pending` e mostra o card como "Na fila..." com botao **desabilitado**
2. O usuario nao consegue clicar "Executar" para disparar o `run-integration` (que tem auto-heal para jobs > 15 min)
3. O worker (`process-integration-job`) so limpa jobs `running` antigos, nao `pending` antigos
4. Resultado: a integracao fica permanentemente travada

Alem disso, o tenant PG tem `last_status: running` fantasma na tabela `tenant_integrations`.

## Solucao (3 partes)

### 1. Limpeza imediata dos dados travados

Migracao SQL para:
- Marcar o job `85b4f94b` (pending ha 18 min) como `error`
- Limpar o `last_status` fantasma do tenant PG (`30e6da4c`)

### 2. Worker: adicionar timeout para jobs `pending` antigos

No `process-integration-job/index.ts`, alem do timeout de jobs `running`, adicionar timeout para jobs `pending` presos ha mais de 15 minutos sem serem processados. Isso impede que jobs pendentes que nunca foram pegos pelo worker fiquem travando a fila.

```text
// Novo bloco no worker, logo apos o timeout de running:
await admin
  .from("integration_jobs")
  .update({
    status: "error",
    error_message: "Timeout: job ficou pending por mais de 15 minutos",
    finished_at: new Date().toISOString(),
    progress: 0,
  })
  .eq("status", "pending")
  .lt("created_at", new Date(Date.now() - STALE_PENDING_MS).toISOString());
```

### 3. Frontend: considerar jobs `pending` antigos como nao-ativos

No `useIntegrationJobs.ts`, o `getActiveJob` deve ignorar jobs `pending` com mais de 15 minutos, para nao bloquear o botao "Executar" indefinidamente:

```text
getActiveJob: filtra apenas jobs pending/running que tenham sido
criados/iniciados ha menos de 15 minutos
```

## Arquivos

| Arquivo | Alteracao |
|---------|----------|
| Migracao SQL | Limpar job travado + status fantasma |
| `supabase/functions/process-integration-job/index.ts` | Timeout para pending antigos |
| `src/hooks/useIntegrationJobs.ts` | getActiveJob ignora pending antigos |

## Resultado

- O botao "Executar" volta a funcionar imediatamente
- Jobs pending que ficarem presos serao limpos automaticamente pelo worker
- O frontend nunca mais ficara travado por jobs antigos
