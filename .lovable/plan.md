

## Ignorar mensagens de grupo no scoring de tickets

### Contexto

O payload do OneCode inclui o campo `ticket.isGroup` que diferencia conversas diretas (`false`) de grupos (`true`). Atualmente o sistema pontua todos os tickets indiscriminadamente. Existem 27 tickets diretos e 1 ticket de grupo no banco.

### Solucao

#### 1. Adicionar coluna `is_group` na tabela `onecode_messages_raw`

Criar uma migration para adicionar a coluna `is_group` (boolean, default false) na tabela de mensagens. Isso facilita a consulta sem precisar parsear o JSON toda vez.

```text
ALTER TABLE onecode_messages_raw ADD COLUMN is_group boolean NOT NULL DEFAULT false;
```

#### 2. Webhook: salvar `is_group` ao persistir mensagens

No arquivo `supabase/functions/onecode-webhook/index.ts`, extrair `ticket.isGroup` do payload e salvar na nova coluna ao fazer o upsert na `onecode_messages_raw`.

#### 3. Scoring: rejeitar tickets de grupo

No arquivo `supabase/functions/onecode-score-ticket/index.ts`, apos buscar as mensagens, verificar se o ticket e de grupo (qualquer mensagem com `is_group = true`). Se for grupo, salvar score nulo com motivo "group_ticket" e retornar sem chamar a IA.

```text
// Apos buscar mensagens:
const isGroup = messages?.some((m) => m.is_group);
if (isGroup) {
  // Salvar score nulo com reason "group_ticket"
  // Retornar { ok: true, skipped: true, reason: "group_ticket" }
}
```

#### 4. Backfill: atualizar mensagens existentes

Migration SQL para preencher `is_group` nas mensagens ja existentes baseado no payload JSON:

```text
UPDATE onecode_messages_raw
SET is_group = COALESCE(
  (payload_json->'data'->'payload'->'ticket'->>'isGroup')::boolean,
  false
)
WHERE is_group = false;
```

### Detalhes tecnicos

**Migration SQL:** Adicionar coluna + backfill dados existentes

**Arquivos editados:**
- `supabase/functions/onecode-webhook/index.ts` -- adicionar `is_group` no row de upsert
- `supabase/functions/onecode-score-ticket/index.ts` -- adicionar `is_group` no select e verificacao de grupo antes do scoring

**Impacto:** Tickets de grupo serao ignorados na avaliacao de qualidade. Nenhum credito de IA sera gasto com eles.

