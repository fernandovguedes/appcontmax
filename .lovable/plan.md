

## Implementar filtro de grupos no scoring OneCode

### Etapas

#### 1. Migration no banco de dados
Adicionar coluna `is_group` (boolean, default false) na tabela `onecode_messages_raw` e preencher retroativamente com base no payload JSON existente.

#### 2. Webhook: salvar is_group
No `onecode-webhook/index.ts`, extrair `ticket.isGroup` do payload e incluir no upsert da `onecode_messages_raw`.

#### 3. Scoring: ignorar grupos
No `onecode-score-ticket/index.ts`, incluir `is_group` no select e, se qualquer mensagem do ticket for de grupo, salvar score nulo com motivo `group_ticket` sem gastar creditos de IA.

#### 4. Deploy das edge functions

### Detalhes tecnicos

**Migration SQL:**
```text
ALTER TABLE public.onecode_messages_raw 
  ADD COLUMN is_group boolean NOT NULL DEFAULT false;

UPDATE public.onecode_messages_raw
SET is_group = COALESCE(
  (payload_json->'data'->'payload'->'ticket'->>'isGroup')::boolean,
  false
)
WHERE is_group = false;
```

**Webhook (`onecode-webhook/index.ts`):**
- Extrair `is_group` do payload: `Boolean(ticket?.isGroup ?? false)`
- Adicionar ao objeto `row` antes do upsert

**Scoring (`onecode-score-ticket/index.ts`):**
- Adicionar `is_group` ao `.select()`
- Apos buscar mensagens, checar `messages?.some((m) => m.is_group)`
- Se grupo: salvar score nulo com `feedback: "Ticket de grupo — ignorado na avaliacao"` e `model_used: "skipped"`, retornar `{ ok: true, skipped: true, reason: "group_ticket" }`

**Arquivos editados:**
- `supabase/functions/onecode-webhook/index.ts`
- `supabase/functions/onecode-score-ticket/index.ts`

