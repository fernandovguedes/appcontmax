
# Sincronizacao Inteligente OneCode Contacts

## Resumo

Implementar um sistema completo de sincronizacao automatica entre os contatos da API OneCode e a tabela `empresas`, preenchendo o campo `whatsapp` com base em similaridade de nomes (Jaro-Winkler). Inclui Edge Function, novas tabelas de log/revisao, e tela administrativa.

## 1. Migracao de Banco de Dados

### 1.1 Adicionar coluna na tabela `empresas`

```text
empresas.onecode_contact_id  (text, nullable)
empresas.whatsapp_synced_at  (timestamptz, nullable)
```

### 1.2 Criar tabela `onecode_contact_match_log`

| Coluna | Tipo | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| tenant_id | text | NOT NULL |
| contact_id | text | NOT NULL |
| contact_name | text | NOT NULL |
| company_id | uuid | nullable |
| similarity_score | numeric | NOT NULL |
| status | text | NOT NULL (matched / review / ignored) |
| processed_at | timestamptz | nullable |
| created_at | timestamptz | now() |

RLS: Admins podem ler; service role insere via Edge Function.

### 1.3 Criar tabela `onecode_contact_review`

| Coluna | Tipo | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| tenant_id | text | NOT NULL |
| contact_id | text | NOT NULL |
| contact_name | text | NOT NULL |
| contact_phone | text | nullable |
| suggested_company_id | uuid | NOT NULL |
| suggested_company_name | text | NOT NULL |
| similarity_score | numeric | NOT NULL |
| resolved | boolean | false |
| resolved_action | text | nullable (approved / ignored) |
| resolved_at | timestamptz | nullable |
| created_at | timestamptz | now() |

RLS: Admins podem ler/atualizar.

### 1.4 Criar tabela `integration_logs`

| Coluna | Tipo | Default |
|---|---|---|
| id | uuid | gen_random_uuid() |
| tenant_id | text | NOT NULL |
| integration | text | NOT NULL |
| status | text | NOT NULL |
| total_processados | integer | 0 |
| total_matched | integer | 0 |
| total_review | integer | 0 |
| total_ignored | integer | 0 |
| execution_time_ms | integer | nullable |
| error_message | text | nullable |
| created_at | timestamptz | now() |

RLS: Admins podem ler.

## 2. Edge Function: `sync-onecode-contacts`

### Fluxo

1. Recebe `{ tenant_id }` no body
2. Valida JWT do usuario chamador (admin)
3. Busca `ONECODE_API_URL` e `ONECODE_API_TOKEN` dos secrets
4. GET `{ONECODE_API_URL}/api/contacts?page=1&pageSize=1000` com retry (ate 2 tentativas)
5. Busca todas as empresas do tenant na tabela `empresas` (via organizacao vinculada)
6. Para cada contato:
   - Extrai nome da empresa (parte antes de " - " se existir)
   - Normaliza: uppercase, remove acentos, remove LTDA/ME/EPP/EIRELI/SA, remove pontuacao, trim
   - Compara contra todas as empresas usando Jaro-Winkler
   - Melhor match >= 0.85: atualiza `whatsapp`, `onecode_contact_id`, `whatsapp_synced_at` (se nao ja preenchidos)
   - Match entre 0.70 e 0.85: salva em `onecode_contact_review`
   - Match < 0.70: ignora
   - Registra em `onecode_contact_match_log`
7. Salva resumo em `integration_logs`
8. Retorna metricas

### Seguranca

- Nunca sobrescreve se `onecode_contact_id` ou `whatsapp` ja estiverem preenchidos
- Usa service role key internamente (function configurada com verify_jwt = false, valida JWT no codigo)
- Timeout de 25s controlado por AbortController
- Retry basico para chamada OneCode

### Algoritmo Jaro-Winkler

Implementado diretamente no index.ts (sem dependencias externas), ~40 linhas de codigo.

## 3. Nova Rota e Pagina: Admin > OneCode Contacts

### Rota

`/admin/onecode-contacts` -- protegida, somente admins

### Layout da pagina

```text
+-----------------------------------------------+
|  AppHeader: "Integracao OneCode"               |
|  Breadcrumb: Portal > Admin > OneCode          |
|  [Botao: Sincronizar Contatos]                 |
+-----------------------------------------------+
|  Cards de Metricas (4 cards)                   |
|  - Total processados                           |
|  - Matches automaticos                         |
|  - Pendentes revisao                           |
|  - Ignorados                                   |
+-----------------------------------------------+
|  Tabela de Revisao                             |
|  Colunas: Contato | Empresa Sugerida |         |
|           Similaridade | Acoes                  |
|  Acoes: [Aprovar] [Ignorar]                    |
+-----------------------------------------------+
|  Historico de Execucoes (integration_logs)     |
+-----------------------------------------------+
```

### Comportamento

- **Sincronizar Contatos**: chama `supabase.functions.invoke("sync-onecode-contacts", { body: { tenant_id } })`, exibe progresso
- **Aprovar**: atualiza `empresas.whatsapp` e `empresas.onecode_contact_id`, marca `onecode_contact_review.resolved = true, resolved_action = 'approved'`
- **Ignorar**: marca `resolved = true, resolved_action = 'ignored'`
- Cards carregam dados das tabelas de log

## 4. Alteracoes no App.tsx

Adicionar rota:

```text
/admin/onecode-contacts -> <OnecodeContacts />
```

## 5. Config.toml

Adicionar:

```text
[functions.sync-onecode-contacts]
verify_jwt = false
```

## Arquivos a criar/modificar

| Arquivo | Acao |
|---|---|
| Migracao SQL | Criar tabelas + colunas |
| `supabase/functions/sync-onecode-contacts/index.ts` | Criar |
| `supabase/config.toml` | Adicionar entry |
| `src/pages/OnecodeContacts.tsx` | Criar |
| `src/App.tsx` | Adicionar rota |

## Dependencias

Nenhuma nova dependencia necessaria. O algoritmo Jaro-Winkler sera implementado inline na Edge Function. Os secrets `ONECODE_API_URL` e `ONECODE_API_TOKEN` ja existem configurados.
