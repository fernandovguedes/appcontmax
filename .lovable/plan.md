

# Modulo "Integracoes" - Portal Contmax

## Resumo

Criar um modulo central de gerenciamento de integracoes no Portal Contmax, com dashboard visual, configuracao por tenant, logs de execucao, metricas e arquitetura plugavel para novas integracoes futuras.

## Estado Atual

- Ja existem tabelas `tenant_integrations` (com campos basicos: provider, base_url, is_enabled) e `integration_logs` (com campos: integration, status, totais, execution_time_ms)
- 2 organizacoes (Contmax, P&G) com integracao `acessorias` configurada
- Edge Functions existentes: sync-acessorias, sync-bomcontrole, sync-onecode-contacts, onecode-webhook
- Nao existe pagina de Integracoes no frontend

## Detalhes Tecnicos

### Fase 1: Banco de Dados

**Nova tabela: `integration_providers`**
- id (uuid PK)
- name (text) - Ex: "OneCode", "BomControle", "Acessorias"
- slug (text unique) - Ex: "onecode", "bomcontrole", "acessorias"
- description (text)
- category (text) - "messaging", "financeiro", "fiscal"
- is_global (boolean default true)
- config_schema (jsonb) - define quais campos de configuracao a integracao aceita (ex: api_key, base_url, webhook_url)
- created_at (timestamp default now())
- RLS: leitura para autenticados, escrita para admin

**Evolucao da tabela `tenant_integrations`**
- Adicionar coluna `provider_id` (uuid FK para integration_providers, nullable inicialmente para nao quebrar dados existentes)
- Adicionar coluna `last_run` (timestamp)
- Adicionar coluna `last_status` (text) - success, error, running
- Adicionar coluna `last_error` (text)
- Adicionar coluna `plan_feature_code` (text nullable)
- Adicionar coluna `config` (jsonb default '{}') - configuracoes especificas por tenant (ex: base_url, webhook_url)
- Criar unique constraint em (tenant_id, provider_id)

**Evolucao da tabela `integration_logs`**
- Adicionar coluna `provider_slug` (text) - redundante com `integration` para query otimizada
- Adicionar coluna `execution_id` (uuid default gen_random_uuid()) - agrupar execucoes
- Adicionar coluna `payload` (jsonb)
- Adicionar coluna `response` (jsonb)
- Criar indice em (tenant_id, integration)

**Seed de dados: `integration_providers`**
Inserir registros para as 3 integracoes existentes:
- acessorias (fiscal)
- bomcontrole (financeiro)
- onecode (messaging)

Atualizar `tenant_integrations` existentes com o `provider_id` correto.

### Fase 2: Frontend

**Novo modulo no banco:** Inserir registro em `modules` com slug `integracoes`, icone `Settings`, nome "Integracoes"

**Nova rota:** `/integracoes` em App.tsx

**Nova pagina: `src/pages/Integracoes.tsx`**
Layout com AppHeader + cards de integracao

Dashboard principal:
- Grid de cards, um por integracao ativa para o tenant
- Cada card mostra: nome, categoria, status (badge verde/amarelo/vermelho), ultima execucao (data relativa), botoes "Executar", "Configurar", "Logs"
- Painel de metricas resumidas (taxa de sucesso 30 dias, tempo medio)

**Pagina de detalhe: `src/pages/IntegracaoDetalhe.tsx`**
Rota: `/integracoes/:slug`

Secoes:
1. Status atual (badge + ultima execucao)
2. Configuracao (formulario dinamico baseado em config_schema do provider - campos read-only no frontend, secrets so via backend)
3. Toggle de ativacao
4. Historico de execucoes (tabela paginada de integration_logs)
5. Metricas: taxa de sucesso, tempo medio, grafico ultimos 30 dias (recharts)

**Hook: `src/hooks/useIntegrations.ts`**
- Busca providers + tenant_integrations + logs recentes
- Funcao para executar integracao (invoke edge function)
- Funcao para toggle ativacao

**Rota no MODULE_ROUTES do Portal.tsx:**
Adicionar `"integracoes": "/integracoes"`

### Fase 3: Edge Function Padrao

**Nova Edge Function: `supabase/functions/run-integration/index.ts`**

Fluxo:
1. Recebe `{ tenant_id, provider_slug }`
2. Valida JWT do usuario
3. Busca tenant_integration e verifica is_enabled
4. Verifica plan_feature_code (futuro - por enquanto sempre permite)
5. Atualiza last_status = "running", last_run = now()
6. Delega para a funcao especifica existente (ex: chama sync-acessorias, sync-bomcontrole, sync-onecode-contacts internamente via fetch)
7. Registra resultado em integration_logs
8. Atualiza last_status e last_error em tenant_integrations

Configurar em config.toml com verify_jwt = false (validacao manual no codigo).

### Fase 4: Governanca (ja embutida)

- Multi-tenant: todas as queries filtram por tenant_id
- RLS em todas as tabelas novas
- Secrets nunca expostos no frontend (coluna config armazena apenas dados nao-sensiveis; API keys permanecem como Supabase secrets)
- Logs nao contem dados sensiveis (sanitizacao ja existente no padrao do projeto)
- Timeout e retry ja implementados nas Edge Functions existentes
- execution_time_ms ja registrado

## Sequencia de Implementacao

1. Migracao de banco (criar integration_providers, evoluir tenant_integrations e integration_logs, seed de providers, update dados existentes)
2. Inserir modulo "Integracoes" na tabela modules
3. Criar hook useIntegrations.ts
4. Criar pagina Integracoes.tsx (dashboard)
5. Criar pagina IntegracaoDetalhe.tsx (detalhe por provider)
6. Atualizar App.tsx (nova rota) e Portal.tsx (MODULE_ROUTES)
7. Criar Edge Function run-integration

## Riscos e Mitigacoes

- **Tabelas existentes com dados**: evolucao nao-destrutiva, colunas novas sao nullable ou com defaults
- **Compatibilidade**: Edge Functions existentes continuam funcionando independentemente; run-integration e apenas um wrapper orquestrador
- **Secrets**: permanecem como Supabase secrets, nunca na tabela; config armazena apenas endpoints e parametros nao-sensiveis

