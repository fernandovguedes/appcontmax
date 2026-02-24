

## Remover painel de Webhook Errors da pagina Qualidade de Atendimento

Alteracao simples na pagina `src/pages/QualidadeAtendimento.tsx`:

1. Remover a linha de import do `WebhookErrorsPanel` (linha 23)
2. Remover a renderizacao condicional `{isAdmin && <WebhookErrorsPanel />}` (linha 480)

O componente `WebhookErrorsPanel` continuara existindo no projeto caso seja necessario usa-lo em outro lugar futuramente (ex: pagina Admin).

### Detalhes tecnicos

| Arquivo | Alteracao |
|---|---|
| `src/pages/QualidadeAtendimento.tsx` | Remover import (linha 23) e uso (linha 480) do WebhookErrorsPanel |

