

## Mostrar apenas a ultima sincronizacao no historico

Alteracao simples: limitar o historico de sincronizacoes para exibir apenas o registro mais recente, em vez dos 10 ultimos.

### Arquivo alterado

| Arquivo | Alteracao |
|---|---|
| `src/hooks/useSyncAcessorias.ts` | Mudar `.limit(10)` para `.limit(1)` na query de `fetchHistory` (linha 46) |

Com isso, a secao "Historico de Sincronizacoes" continuara funcionando normalmente, mas mostrara apenas a ultima sincronizacao realizada.

