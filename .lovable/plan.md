

# Evolucao Multi-Tenant + Integracao Acessorias

## Resumo

Evoluir a tabela `organizacoes` existente para funcionar como entidade de tenants, adicionar infraestrutura de integracoes por tenant, relacionamento usuario-tenant com roles, campos de sincronizacao na tabela `empresas`, tabelas de auditoria de sync, e edge function para sincronizar empresas via API Acessorias. Nenhum dado existente sera alterado ou removido.

---

## Fase 1: Migracao de Schema (nao destrutiva)

### 1.1 Evoluir `organizacoes` como tenants

Adicionar coluna `updated_at` na tabela existente:

```sql
ALTER TABLE public.organizacoes
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
```

### 1.2 Criar `tenant_integrations`

Nova tabela para armazenar configuracao de integracao por tenant/provider. O `access_token` sera armazenado como secret no backend (via Supabase Secrets), nao nesta tabela. A tabela guarda apenas metadados de configuracao.

Campos:
- `id` (uuid, PK)
- `tenant_id` (FK organizacoes)
- `provider` (text, ex: "acessorias")
- `base_url` (text, default "https://api.acessorias.com")
- `is_enabled` (boolean, default true)
- `created_at`, `updated_at`

Indice unico: `(tenant_id, provider)`

RLS: somente admins podem ler/escrever.

### 1.3 Criar `user_tenants`

Nova tabela de relacionamento usuario-tenant com role por tenant.

Campos:
- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `tenant_id` (FK organizacoes)
- `role` (text, default "staff") -- valores: admin, manager, staff, readonly
- `created_at`

Indice unico: `(user_id, tenant_id)`

RLS: admins globais podem gerenciar; usuarios podem ler seus proprios registros.

**Dados iniciais**: Popular `user_tenants` para usuarios existentes com base nos modulos que ja possuem acesso (inferido de `user_modules` + `modules.organizacao_id`). Admins globais recebem role "admin" em ambos tenants.

### 1.4 Adicionar colunas de sync em `empresas`

Adicionar colunas sem alterar dados existentes:

```sql
ALTER TABLE public.empresas
  ADD COLUMN external_source text,
  ADD COLUMN external_key text,
  ADD COLUMN raw_payload jsonb,
  ADD COLUMN hash_payload text,
  ADD COLUMN synced_at timestamptz;
```

Indice: `CREATE INDEX idx_empresas_tenant_cnpj ON empresas(organizacao_id, cnpj);`

Indice unico parcial para evitar duplicidade por tenant: `CREATE UNIQUE INDEX idx_empresas_tenant_cnpj_unique ON empresas(organizacao_id, cnpj) WHERE cnpj IS NOT NULL AND cnpj != '';`

### 1.5 Criar `sync_jobs`

Tabela de auditoria de execucoes de sincronizacao.

Campos:
- `id` (uuid, PK)
- `tenant_id` (FK organizacoes)
- `provider` (text, ex: "acessorias")
- `entity` (text, ex: "companies")
- `status` (text: "running", "success", "failed")
- `total_read` (int, default 0)
- `total_created` (int, default 0)
- `total_updated` (int, default 0)
- `total_skipped` (int, default 0)
- `total_errors` (int, default 0)
- `started_at` (timestamptz)
- `finished_at` (timestamptz)
- `created_by_user_id` (uuid, nullable)
- `error_message` (text, nullable)

RLS: admins podem ler/inserir/atualizar.

### 1.6 Criar `sync_logs`

Tabela de logs detalhados por sync_job.

Campos:
- `id` (uuid, PK)
- `sync_job_id` (FK sync_jobs)
- `level` (text: "info", "warning", "error")
- `message` (text)
- `payload` (jsonb)
- `created_at` (timestamptz)

RLS: admins podem ler.

---

## Fase 2: Secrets para tokens Acessorias

Armazenar os tokens da API Acessorias como secrets do projeto:

- `ACESSORIAS_TOKEN_CONTMAX` -- token do escritorio Contmax
- `ACESSORIAS_TOKEN_PG` -- token do escritorio P&G

A edge function usara o `tenant_slug` para determinar qual secret carregar. Os tokens nunca sao expostos ao frontend.

---

## Fase 3: Edge Function `sync-acessorias`

Criar `supabase/functions/sync-acessorias/index.ts`:

### Fluxo

1. Receber `POST` com body `{ tenant_slug: "contmax" | "pg" }`
2. Validar JWT e verificar se o usuario e admin global ou admin do tenant
3. Resolver tenant_id a partir do slug
4. Carregar token do secret correspondente (`ACESSORIAS_TOKEN_CONTMAX` ou `ACESSORIAS_TOKEN_PG`)
5. Criar registro em `sync_jobs` com status "running"
6. Paginar `GET /companies/ListAll?page={n}` com throttling (max 80 req/min para margem de seguranca)
7. Para cada empresa retornada:
   - Extrair chave (CNPJ ou CPF)
   - Calcular `hash_payload` (SHA-256 do JSON normalizado)
   - Buscar na tabela `empresas` por `(organizacao_id, cnpj)`
   - Se nao existe: INSERT com campos mapeados + `external_source="acessorias"`, `raw_payload`, `hash_payload`, `synced_at`
   - Se existe e hash mudou: UPDATE campos + `raw_payload`, `hash_payload`, `synced_at`
   - Se existe e hash igual: skip (incrementar `total_skipped`)
   - Registrar `sync_logs` para erros/avisos
8. Atualizar `sync_jobs` com contadores e status final
9. Retornar resumo

### Throttling

Implementar rate limiter simples: contador de requests por minuto, com `await` de 700ms entre cada request para garantir no maximo ~85 req/min (abaixo do limite de 100).

### Mapeamento de campos

A edge function mapeara os campos da API Acessorias para a estrutura existente de `empresas`:
- `cnpj` -> `cnpj`
- `razaoSocial` ou equivalente -> `nome`
- Demais campos -> `raw_payload` (JSON completo)
- `regime_tributario` -> default "simples_nacional" se nao informado
- `emite_nota_fiscal` -> default true
- `meses` -> `{}` (vazio, sem dados de faturamento)
- `obrigacoes` -> `{}` (vazio)

### Configuracao

```toml
[functions.sync-acessorias]
verify_jwt = false
```

---

## Fase 4: Populacao inicial de `user_tenants`

Script de migracao (INSERT) para popular `user_tenants` com dados derivados:

- Para cada admin global (`user_roles.role = 'admin'`): inserir com role "admin" em ambos tenants
- Para cada usuario nao-admin com modulos atribuidos: inferir tenant pelo `modules.organizacao_id` do modulo e inserir com role "staff"

Isso sera feito via INSERT tool (dados, nao schema).

---

## Resumo de Arquivos

### Novos
- `supabase/functions/sync-acessorias/index.ts` -- edge function de sincronizacao

### Migracoes (schema)
- Uma migracao SQL com:
  - ALTER TABLE organizacoes (add updated_at)
  - CREATE TABLE tenant_integrations
  - CREATE TABLE user_tenants
  - ALTER TABLE empresas (add sync columns + indices)
  - CREATE TABLE sync_jobs
  - CREATE TABLE sync_logs
  - RLS policies para todas as novas tabelas
  - RLS policy para tenant_integrations

### Configuracao
- `supabase/config.toml` -- adicionar entrada para sync-acessorias
- Secrets: `ACESSORIAS_TOKEN_CONTMAX` e `ACESSORIAS_TOKEN_PG`

### Nao alterados
- Nenhum arquivo de frontend sera modificado
- Nenhuma tabela existente tera dados removidos ou sobrescritos
- A tabela `empresas` mantera todas as colunas e dados atuais

---

## Detalhes Tecnicos

- A tabela `tenant_integrations` nao armazena tokens diretamente; usa Supabase Secrets. O campo `base_url` permite configurar URLs diferentes por tenant se necessario no futuro.
- O indice unico parcial em `(organizacao_id, cnpj)` previne duplicidade de empresas por tenant, mas ignora registros sem CNPJ.
- A edge function usa service_role para INSERT/UPDATE em `empresas`, `sync_jobs` e `sync_logs`, mas valida autorizacao do chamador via JWT.
- O throttling e implementado com um sleep simples entre requests, nao com um token bucket complexo, para manter a simplicidade.
- Os campos `external_source`, `external_key`, `raw_payload`, `hash_payload` e `synced_at` sao todos nullable, permitindo que empresas cadastradas manualmente continuem funcionando sem esses campos preenchidos.

