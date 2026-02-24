
# Sincronizacao Automatica (Cron) - sync-acessorias

## Resumo

Criar uma nova Edge Function `sync-acessorias-cron` que sera disparada automaticamente via `pg_cron` as 06h e 18h (horario de Brasilia, GMT-3), equivalente a `0 9,21 * * *` em UTC. Essa funcao orquestra a sincronizacao para ambos os tenants (contmax e pg), reutilizando a logica existente da `runSync` diretamente (sem depender de autenticacao de usuario).

## Etapas

### 1. Habilitar extensoes pg_cron e pg_net

Criar migracao SQL para garantir que as extensoes necessarias estejam ativas:

```sql
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 2. Criar Edge Function `sync-acessorias-cron`

Arquivo: `supabase/functions/sync-acessorias-cron/index.ts`

A funcao:
- Usa `SUPABASE_SERVICE_ROLE_KEY` para autenticar (sem depender de usuario/frontend)
- Para cada tenant (`contmax`, `pg`):
  - Busca o `organizacao_id` pela slug
  - Verifica lock: consulta `sync_jobs` se ha job com `status = 'running'` para aquele tenant. Se houver, pula e loga
  - Busca o token da API (`ACESSORIAS_TOKEN_CONTMAX` / `ACESSORIAS_TOKEN_PG`)
  - Busca `base_url` de `tenant_integrations` (ou usa default)
  - Verifica se integracao esta habilitada
  - Cria registro em `sync_jobs` com `created_by_user_id = NULL` (cron)
  - Executa `runSync` (mesma logica extraida/copiada do sync-acessorias original)
- Loga inicio/fim e job_id de cada disparo

### 3. Configurar config.toml

Adicionar entrada para a nova funcao:

```toml
[functions.sync-acessorias-cron]
verify_jwt = false
```

Nota: o arquivo config.toml e gerenciado automaticamente, mas a entrada sera necessaria.

### 4. Registrar cron job via SQL (insert tool, nao migracao)

Usar `pg_cron` + `pg_net` para chamar a Edge Function no schedule:

```sql
SELECT cron.schedule(
  'sync-acessorias-cron',
  '0 9,21 * * *',
  $$
  SELECT net.http_post(
    url := 'https://dpgfvvxxaoikdbfrqhwp.supabase.co/functions/v1/sync-acessorias-cron',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer <ANON_KEY>"}'::jsonb,
    body := '{"source": "cron"}'::jsonb
  ) AS request_id;
  $$
);
```

### 5. Alterar tabela sync_jobs

A coluna `created_by_user_id` ja e nullable, entao nenhuma migracao adicional e necessaria. Jobs criados pelo cron terao esse campo como NULL.

---

## Detalhes tecnicos

### Arquivos alterados/criados

| Arquivo | Acao |
|---|---|
| `supabase/functions/sync-acessorias-cron/index.ts` | Criar (nova funcao) |
| `supabase/config.toml` | Atualizado automaticamente |

### Migracao SQL

- Habilitar `pg_cron` e `pg_net`

### Insert SQL (nao migracao)

- Registrar o cron schedule com `cron.schedule()`

### Logica de lock

```text
SELECT count(*) FROM sync_jobs
WHERE tenant_id = <id> AND status = 'running'
```

Se count > 0, pula aquele tenant e loga "Skipped: job already running".

### Fluxo da Edge Function cron

```text
POST /functions/v1/sync-acessorias-cron
  |
  +-- Para cada tenant [contmax, pg]:
       |
       +-- Buscar organizacao_id
       +-- Verificar lock (job running?)
       +-- Se locked: logar skip, continuar
       +-- Buscar API token e base_url
       +-- Criar sync_job (created_by_user_id = NULL)
       +-- Executar runSync via EdgeRuntime.waitUntil
       +-- Logar job_id
  |
  +-- Retornar resumo { contmax: job_id|skipped, pg: job_id|skipped }
```

### Schedule

- Cron expression: `0 9,21 * * *` (UTC)
- Equivale a 06:00 e 18:00 horario de Brasilia (GMT-3)
