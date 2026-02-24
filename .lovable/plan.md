
## Encerramento em Lote dos Contratos Legados no BomControle

### Situacao Atual

O dry-run revelou dois problemas que impedem o encerramento dos 455 contratos:

1. **Limite de batch fixo em 20**: A function busca no maximo 20 contratos por execucao
2. **Rate limiting da API (HTTP 429)**: A API do BomControle bloqueia apos ~10 requisicoes rapidas consecutivas

Dos 20 processados no teste: 10 retornaram "ok_to_close", 10 deram erro 429. Zero bloqueados por pagamento futuro.

### Plano de Implementacao

#### 1. Atualizar a edge function `close-bomcontrole-contracts`

Modificacoes necessarias:

- **Remover o limite de 20** e buscar todos os contratos ativos+legados (usar paginacao do Supabase com range para buscar alem de 1000 se necessario)
- **Adicionar delay entre chamadas** para evitar 429: inserir um `await sleep(500ms)` entre cada chamada a API do BomControle
- **Retry inteligente para 429**: quando receber HTTP 429, esperar 3 segundos e tentar novamente (ate 3 retries), em vez de marcar como erro imediato
- **Suporte a offset/cursor**: aceitar parametro `offset` opcional no body para permitir continuar de onde parou caso o timeout da edge function (60s) seja atingido

#### 2. Estrategia de execucao

Como 455 contratos com delay de 500ms entre chamadas = ~4 minutos so para dry-run (mais ~4 min para execucao), e edge functions tem timeout de ~60s, a abordagem sera:

- **Pular o dry-run individual**: Para o modo `execute=true`, encerrar diretamente sem fase de pre-verificacao separada (a verificacao de faturas pagas ja e feita inline antes de cada encerramento)
- **Processar em batches com offset**: A function processa ate 50 contratos por chamada, retornando o proximo offset para continuar
- **Loop de chamadas**: Chamar a function repetidamente via curl ate que todos os contratos sejam processados

### Detalhes Tecnicos

Arquivo modificado: `supabase/functions/close-bomcontrole-contracts/index.ts`

Mudancas principais:
- `BATCH_SIZE`: de 20 para 50
- Novo `DELAY_MS = 600` entre chamadas a API
- `fetchWithRetry` passa a tratar 429 com backoff (espera 3s, 6s, 9s)
- Novo parametro `offset` no body para paginacao
- Resposta inclui `next_offset` quando ha mais contratos a processar
- Modo execute faz verificacao + encerramento em uma unica passada por contrato (reduz chamadas API pela metade)

Apos deploy, executarei a function em loop ate completar todos os 455 contratos.
