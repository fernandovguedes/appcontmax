

## Filtrar tickets skipped do ranking e listagem

### Problema
Tickets marcados como "skipped" (sem atendente humano) tem `score_final = NULL`, mas continuam aparecendo no ranking de atendentes. Como `Number(null)` vira `0` no JavaScript, eles puxam a media para baixo em vez de serem ignorados.

### Solucao
Filtrar tickets com `score_final` nulo em dois pontos do arquivo `src/pages/QualidadeAtendimento.tsx`:

1. **Na query do banco**: adicionar `.not("score_final", "is", null)` para nem trazer registros skipped
2. **Seguranca extra no frontend**: manter o filtro `validScores` existente para os KPIs

### Alteracoes

**Arquivo:** `src/pages/QualidadeAtendimento.tsx`

- Na query de scores (e na re-fetch apos avaliar), adicionar filtro:
```text
scoreQuery = scoreQuery.not("score_final", "is", null);
```
Isso ocorre em dois lugares: no `useEffect` principal e dentro do `handleScore`.

### Resultado
- Tickets skipped nao aparecem mais no ranking nem na tabela de "Tickets Avaliados"
- Tickets skipped continuam aparecendo corretamente como "Pendentes" (via `unscoredTickets`)
- KPIs refletem apenas atendimentos humanos reais

### Impacto
- Apenas 1 arquivo editado
- Nenhuma mudanca no banco de dados
- Nenhuma mudanca nas edge functions

