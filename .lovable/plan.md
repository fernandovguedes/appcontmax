

# Integracao OneCode Webhook + Qualidade de Atendimento

## Resumo

Criar sistema completo de monitoramento e avaliacao de atendimentos WhatsApp via OneCode, com 3 componentes principais: (1) webhook para receber mensagens, (2) funcao de scoring com IA, (3) tela de ranking no portal.

---

## 1. Tabelas no Banco de Dados (Migracao)

### `onecode_messages_raw`

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| onecode_message_id | text UNIQUE NOT NULL | Deduplicacao |
| ticket_id | text NOT NULL | |
| contact_id | text | |
| from_me | boolean NOT NULL | |
| body | text | |
| created_at_onecode | timestamptz | Timestamp original da mensagem |
| whatsapp_id | text | |
| user_id | text | ticket.userId do OneCode |
| user_name | text | ticket.user.name do OneCode |
| payload_json | jsonb | Payload completo |
| created_at | timestamptz DEFAULT now() | |

RLS: SELECT para authenticated (leitura geral). Sem INSERT/UPDATE/DELETE via client (somente edge function com service_role).

### `onecode_ticket_scores`

| Coluna | Tipo | Notas |
|---|---|---|
| id | uuid PK | gen_random_uuid() |
| ticket_id | text NOT NULL | |
| user_id | text | Atendente OneCode |
| user_name | text | Nome do atendente |
| clareza | numeric(3,1) | 0-10 |
| cordialidade | numeric(3,1) | 0-10 |
| objetividade | numeric(3,1) | 0-10 |
| resolucao | numeric(3,1) | 0-10 |
| conformidade | numeric(3,1) | 0-10 |
| score_final | numeric(4,1) | 0-100 |
| feedback | text | Texto explicativo da IA |
| scored_at | timestamptz DEFAULT now() | |
| model_used | text | Modelo da IA usado |
| created_at | timestamptz DEFAULT now() | |

RLS: SELECT para authenticated. Sem INSERT/UPDATE/DELETE via client.

---

## 2. Edge Function `onecode-webhook`

Arquivo: `supabase/functions/onecode-webhook/index.ts`

- **Metodo**: somente POST (retorna 405 para outros)
- **Autenticacao**: valida header `x-onecode-hook-secret` contra secret `ONECODE_WEBHOOK_SECRET` (nova secret a ser configurada)
- **Processamento**:
  - Extrai campos do payload OneCode (`messages.create` event)
  - Faz UPSERT em `onecode_messages_raw` usando `onecode_message_id` como chave de deduplicacao (ON CONFLICT DO NOTHING)
  - Usa `SUPABASE_SERVICE_ROLE_KEY` para escrita
- **Config**: `verify_jwt = false` (webhook externo, sem JWT)

### Secret necessaria

- `ONECODE_WEBHOOK_SECRET`: sera solicitada ao usuario via tool antes de prosseguir

---

## 3. Edge Function `onecode-score-ticket`

Arquivo: `supabase/functions/onecode-score-ticket/index.ts`

- **Metodo**: POST com body `{ ticket_id: string }`
- **Autenticacao**: JWT (getClaims) - somente usuarios autenticados
- **Fluxo**:
  1. Busca todas as mensagens do ticket em `onecode_messages_raw` ordenadas por `created_at_onecode`
  2. Monta transcript formatado (distinguindo atendente vs cliente via `from_me`)
  3. Envia para Lovable AI Gateway (`google/gemini-3-flash-preview`) com prompt de avaliacao
  4. Usa tool calling para extrair JSON estruturado com notas por criterio
  5. Calcula `score_final` = clareza*0.25 + cordialidade*0.15 + objetividade*0.20 + resolucao*0.30 + conformidade*0.10 (multiplicado por 10)
  6. Salva em `onecode_ticket_scores`
  7. Retorna o score

### Prompt da IA

O prompt instrui a IA a avaliar a conversa de atendimento ao cliente nos 5 criterios, atribuindo notas de 0 a 10 e gerando feedback construtivo em portugues.

---

## 4. Tela "Qualidade de Atendimento"

### Pagina: `src/pages/QualidadeAtendimento.tsx`

Seguindo template identico ao DashboardExecutivo:
- AppHeader com titulo "Qualidade de Atendimento", subtitulo "Avaliacao de Atendimentos OneCode", botao voltar
- Seletor de mes (Select com ultimos 6 meses)

#### Cards KPI (3 cards)

- Total de tickets avaliados no mes
- Media geral do score_final no mes
- Atendente destaque (maior media no mes)

#### Tabela de Ranking por Atendente

- Colunas: Posicao, Atendente (user_name), Tickets Avaliados, Media Score, Clareza, Cordialidade, Objetividade, Resolucao, Conformidade
- Ordenado por media score descendente
- Dados agregados de `onecode_ticket_scores` filtrados pelo mes

#### Lista de Tickets com Nota

- Tabela expansivel ou lista com: ticket_id, atendente, score_final, data, feedback (truncado com expand)
- Botao "Avaliar" em tickets ainda nao avaliados (chama `onecode-score-ticket`)

### Rota e Portal

- Adicionar rota `/qualidade-atendimento` em `App.tsx`
- Adicionar slug `qualidade-atendimento` em `MODULE_ROUTES` no `Portal.tsx`
- Adicionar icone `Award` ao `ICON_MAP` no `Portal.tsx`
- Inserir modulo na tabela `modules` via SQL

---

## 5. Sequencia de Implementacao

1. Solicitar secret `ONECODE_WEBHOOK_SECRET` ao usuario
2. Criar migracao SQL (tabelas + RLS + indice unique)
3. Criar edge function `onecode-webhook`
4. Criar edge function `onecode-score-ticket`
5. Criar pagina `QualidadeAtendimento.tsx`
6. Atualizar `App.tsx` e `Portal.tsx`
7. Inserir modulo no banco

---

## Arquivos criados/alterados

| Arquivo | Acao |
|---|---|
| `supabase/functions/onecode-webhook/index.ts` | Criar |
| `supabase/functions/onecode-score-ticket/index.ts` | Criar |
| `src/pages/QualidadeAtendimento.tsx` | Criar |
| `src/App.tsx` | Adicionar rota |
| `src/pages/Portal.tsx` | Adicionar slug + icone |
| Migracao SQL | Criar tabelas + RLS |
| Insert SQL | Registrar modulo |

