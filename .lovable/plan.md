

## Corrigir tickets de bot ja pontuados no banco

### Problema
Os tickets 26449 e 26451 foram avaliados pela IA com notas 83.5 e 100 respectivamente, mas sao tickets de bot (sem atendente humano -- `user_id` e NULL). A logica para ignorar esses tickets no futuro ja foi implementada no codigo, mas os registros existentes precisam ser corrigidos.

### Solucao
Executar uma migration SQL para zerar os scores desses tickets e marca-los como "skipped":

```text
UPDATE onecode_ticket_scores
SET score_final = NULL,
    clareza = NULL,
    cordialidade = NULL,
    objetividade = NULL,
    resolucao = NULL,
    conformidade = NULL,
    feedback = 'Ticket sem interacao de atendente humano — ignorado.',
    model_used = 'skipped',
    pontos_fortes = '{}',
    pontos_melhoria = '{}'
WHERE user_id IS NULL AND model_used != 'skipped';
```

### Impacto
- 2 registros afetados (tickets 26449 e 26451)
- As medias de qualidade dos atendentes ficam mais precisas
- Nenhum codigo precisa ser alterado (ja foi feito na etapa anterior)

