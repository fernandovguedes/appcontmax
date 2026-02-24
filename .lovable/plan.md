

## Descartar tickets sem atendente humano no scoring

### Problema

Tickets como o 26451 e 26449 contêm apenas mensagens de bot (menu automatico, triagem). A IA avalia esses tickets com nota maxima (100), inflando a media geral dos atendentes. Atualmente existem pelo menos 2 tickets assim no banco.

### Como detectar

O indicador e simples: mensagens enviadas pela empresa (`from_me = true`) que tem `user_id = NULL` sao mensagens de bot. Se **nenhuma** mensagem `from_me` do ticket possui `user_id` preenchido, nao houve interacao humana.

### Solucao

Adicionar uma verificacao no `onecode-score-ticket/index.ts`, logo apos a checagem de grupo e antes da checagem de mensagens insuficientes:

```text
// Apos checar is_group...
// Checar se tem atendente humano
const humanMessages = messages?.filter(m => m.from_me && m.user_id);
if (!humanMessages || humanMessages.length === 0) {
  // Nenhum atendente humano — salvar score nulo e retornar
  // reason: "bot_only"
  // feedback: "Ticket sem interacao de atendente humano — ignorado."
  // model_used: "skipped"
}
```

### O que acontece

1. Busca as mensagens do ticket (ja existente)
2. Verifica se e grupo (ja existente)
3. **NOVO**: Verifica se alguma mensagem `from_me` tem `user_id` preenchido
4. Se nao tem, salva score nulo com `reason: "bot_only"` e `model_used: "skipped"`, sem chamar a IA
5. Se tem, segue o fluxo normal de avaliacao

### Correcao retroativa

Os tickets 26451 e 26449 ja foram pontuados com nota 100. Sera necessario re-pontua-los (ou atualizar diretamente no banco) para que fiquem com score nulo e `model_used: "skipped"`.

```text
UPDATE onecode_ticket_scores
SET score_final = NULL,
    clareza = NULL, cordialidade = NULL, objetividade = NULL,
    resolucao = NULL, conformidade = NULL,
    feedback = 'Ticket sem interacao de atendente humano — ignorado.',
    model_used = 'skipped',
    pontos_fortes = '{}',
    pontos_melhoria = '{}'
WHERE user_id IS NULL AND model_used != 'skipped';
```

### Detalhes tecnicos

**Arquivo editado:** `supabase/functions/onecode-score-ticket/index.ts`

**Migration SQL:** Correcao retroativa dos tickets de bot ja pontuados

**Impacto:** Tickets de bot nao serao mais avaliados, economizando creditos de IA e mantendo a media de qualidade precisa para atendentes humanos reais.

