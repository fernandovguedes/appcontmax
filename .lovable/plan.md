

# Ajustar rate limiting da funcao close-bomcontrole-contracts

## Problema

A funcao esta recebendo erros HTTP 429 (Too Many Requests) da API do BomControle, o que trava o processamento dos contratos pendentes. Os parametros atuais (BATCH_SIZE=3, DELAY_MS=3000) sao agressivos demais para o rate limit da API.

## Alteracao

Arquivo: `supabase/functions/close-bomcontrole-contracts/index.ts`

| Parametro | Antes | Depois |
|-----------|-------|--------|
| BATCH_SIZE | 3 | 2 |
| DELAY_MS | 3000 | 5000 |

Apenas duas linhas serao alteradas (linhas 11-12). Nenhuma outra modificacao funcional.

## Resultado esperado

Com BATCH_SIZE=2 e DELAY_MS=5000, cada execucao do cron (a cada 2 minutos) processara 2 contratos com 5 segundos entre cada chamada a API, reduzindo a chance de 429. Os 246+ contratos pendentes serao processados gradualmente ao longo das proximas horas.

