

# Evolucao do Modulo Integracoes: Job Queue Assincrono

## Resumo

Transformar o fluxo de execucao de integracoes de sincrono para assincrono, com fila de jobs, monitoramento em tempo real via Realtime, barra de progresso, e governanca multi-tenant.

---

## 1. Banco de Dados — Tabela `integration_jobs`

Criar tabela `integration_jobs` via migracao:

```text
Campos:
- id (uuid, PK)
- tenant_id (uuid, NOT NULL)
- provider_slug (text, NOT NULL)
- status (text, default 'pending') — pending | running | success | error | canceled
- progress (integer, default 0) — 0 a 100
- attempts (integer, default 0)
- max_attempts (integer, default 3)
- started_at (timestamptz)
- finished_at (timestamptz)
- execution_time_ms (integer)
- error_message (text)
- payload (jsonb, default '{}')
- result (jsonb) — resposta da integracao
- created_by (uuid) — user que disparou
- created_at (timestamptz, default now())
```

Indices: `(tenant_id, provider_slug)`, `(status)`

RLS: Admins podem ler/inserir/atualizar. Isolamento por tenant via policy.

Habilitar Realtime na tabela para updates em tempo real no frontend.

---

## 2. Edge Function — `process-integration-job`

Nova Edge Function que processa o proximo job pendente:

```text
Fluxo:
1. Buscar proximo job com status = 'pending' (ORDER BY created_at ASC, LIMIT 1)
2. Atualizar para status = 'running', started_at = now(), attempts++
3. Verificar se integracao esta habilitada em tenant_integrations
4. Delegar para a funcao especifica (sync-acessorias, sync-bomcontrole, sync-onecode-contacts)
5. Em sucesso: status = 'success', finished_at, execution_time_ms, result
6. Em erro: status = 'error', error_message, finished_at
   - Se attempts < max_attempts: reverter para 'pending' (retry automatico)
7. Atualizar tenant_integrations com last_run, last_status, last_error
8. Registrar em integration_logs (manter compatibilidade)
```

Timeout de seguranca: se job fica 'running' por mais de 10 minutos sem update, marcar como 'error'.

---

## 3. Refatorar `run-integration` Edge Function

Simplificar para apenas criar o job e disparar o worker:

```text
Fluxo novo:
1. Validar JWT e permissoes
2. Verificar se integracao esta habilitada
3. Verificar se ja nao existe job 'pending' ou 'running' para mesmo tenant+provider
4. Criar registro em integration_jobs com status = 'pending'
5. Disparar process-integration-job via fetch (fire-and-forget)
6. Retornar { job_id } imediatamente ao frontend
```

---

## 4. Hook `useIntegrationJobs`

Novo hook React para gerenciar jobs com Realtime:

```text
- Buscar jobs ativos (pending/running) para os tenants do usuario
- Subscrever via Supabase Realtime para updates de status/progress
- Expor: activeJobs, submitJob(), cancelJob()
- submitJob() chama run-integration e retorna job_id
```

---

## 5. Frontend — Pagina Integracoes (`Integracoes.tsx`)

Atualizar o card de integracao:

```text
- Botao "Executar" cria job via submitJob()
- Se existe job ativo (pending/running):
  - Badge amarelo "Processando..."
  - Barra de progresso (componente Progress existente)
  - Botao "Executar" desabilitado
- Se ultimo job com erro:
  - Badge vermelho "Falha"
  - Link "Ver erro"
- Se sucesso:
  - Badge verde "Concluido"
```

---

## 6. Frontend — Pagina Detalhe (`IntegracaoDetalhe.tsx`)

Adicionar aba "Execucoes Recentes" usando Tabs:

```text
Tab 1: "Visao Geral" (conteudo atual — metricas e grafico)
Tab 2: "Execucoes" (tabela de jobs com colunas):
  - Data
  - Status (badge colorido)
  - Progresso (barra)
  - Tempo de execucao
  - Tentativas
  - Acao: Ver detalhes/erro

Manter o grafico e metricas na tab Visao Geral.
Botao "Executar Agora" com mesma logica de fila.
Status em tempo real via Realtime subscription.
```

---

## 7. Governanca e Seguranca

- RLS em integration_jobs: apenas admins leem, filtrado por tenant
- Service role apenas nas Edge Functions
- Payload/result nunca contem secrets
- Jobs isolados por tenant — um tenant nao ve jobs de outro
- Logs em integration_logs mantidos para auditoria

---

## Arquivos Modificados/Criados

| Arquivo | Acao |
|---------|------|
| Migracao SQL | Criar tabela integration_jobs + indices + RLS + Realtime |
| `supabase/functions/process-integration-job/index.ts` | Novo — worker que processa jobs |
| `supabase/functions/run-integration/index.ts` | Refatorar — criar job + disparar worker |
| `supabase/config.toml` | Adicionar config do process-integration-job |
| `src/hooks/useIntegrationJobs.ts` | Novo — hook com Realtime para jobs |
| `src/hooks/useIntegrations.ts` | Atualizar runIntegration para usar fila |
| `src/pages/Integracoes.tsx` | Adicionar status em tempo real + barra progresso |
| `src/pages/IntegracaoDetalhe.tsx` | Adicionar aba Execucoes + Realtime |

---

## Ordem de Implementacao

1. Migracao SQL (tabela + RLS + Realtime)
2. Edge Function `process-integration-job`
3. Refatorar `run-integration`
4. Hook `useIntegrationJobs`
5. Atualizar `Integracoes.tsx` e `IntegracaoDetalhe.tsx`

