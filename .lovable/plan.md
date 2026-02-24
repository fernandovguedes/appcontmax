

## Corrigir identificacao do atendente no scoring de tickets

### Problema

A funcao de scoring busca o primeiro `from_me` message para identificar o atendente. Porem, as primeiras mensagens `from_me` sao do bot automatizado (menu de opcoes), que nao possui `user_id` nem `user_name`. Isso faz o sistema cair no fallback "Atendente" ao inves de identificar o usuario real.

No ticket 26446, o atendente real era **Aratau** (user_id: 4), mas foi salvo como "Atendente" com user_id null.

### Solucao

#### 1. Corrigir a logica de identificacao do atendente

No arquivo `supabase/functions/onecode-score-ticket/index.ts`, alterar a busca para filtrar apenas mensagens `from_me` que tenham `user_id` preenchido (nao nulo), ignorando mensagens de bot:

```text
// Antes (pega bot):
const attendantName = messages.find((m) => m.from_me)?.user_name || "Atendente";
const attendantUserId = messages.find((m) => m.from_me)?.user_id || null;

// Depois (ignora bot):
const humanMsg = messages.find((m) => m.from_me && m.user_id);
const attendantName = humanMsg?.user_name || "Atendente";
const attendantUserId = humanMsg?.user_id || null;
```

#### 2. Corrigir o score existente do ticket 26446

Atualizar o registro na tabela `onecode_ticket_scores` para refletir o atendente correto:

```text
UPDATE onecode_ticket_scores
SET user_id = '4', user_name = 'Aratau'
WHERE ticket_id = '26446';
```

### Detalhes tecnicos

**Arquivo editado:** `supabase/functions/onecode-score-ticket/index.ts`
- Linha ~96-97: substituir `messages.find((m) => m.from_me)` por `messages.find((m) => m.from_me && m.user_id)`
- Extrair em variavel `humanMsg` para evitar busca duplicada

**Correcao de dados:** UPDATE direto no registro do ticket 26446

