
## Correcao Urgente da Competencia de Encerramento

### Problema
- 62 contratos ja encerrados com competencia **2025-07** (errada)
- 393 contratos pendentes sendo processados com a mesma competencia errada
- O cron job `close-legacy-contracts-loop` esta rodando a cada 2 minutos com o valor incorreto

### Acoes (3 passos, todos via SQL)

1. **Remover o cron job atual** para parar o processamento errado imediatamente
2. **Corrigir os 62 registros** ja encerrados: atualizar `closed_competencia` de `2025-07` para `2026-03`
3. **Recriar o cron job** com `competencia_corte: "2026-03"` para continuar o encerramento dos 393 restantes

### Detalhes Tecnicos

**Passo 1** - Parar o cron:
```sql
SELECT cron.unschedule('close-legacy-contracts-loop');
```

**Passo 2** - Corrigir dados:
```sql
UPDATE bc_contracts 
SET closed_competencia = '2026-03' 
WHERE tenant_id = 'contmax' AND legacy = true AND active = false AND closed_competencia = '2025-07';
```

**Passo 3** - Recriar cron com competencia correta:
```sql
SELECT cron.schedule(
  'close-legacy-contracts-loop',
  '*/2 * * * *',
  $$ SELECT net.http_post(
    url := '...functions/v1/close-bomcontrole-contracts',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ..."}'::jsonb,
    body := '{"tenant_id":"contmax","competencia_corte":"2026-03","execute":true}'::jsonb
  ) AS request_id; $$
);
```

A edge function tambem precisa ser atualizada para enviar `2026-03-01 00:00:00` como `DataCompetencia` no corpo da requisicao de encerramento ao BomControle. Isso ja acontece automaticamente pois a function usa o valor de `competencia_corte` recebido no body.

**Nota importante**: Os 62 contratos ja encerrados no BomControle foram fechados com a data `2025-07-01`. A correcao no banco local atualiza apenas o registro interno. Se for necessario corrigir tambem no lado do BomControle, sera preciso reabrir e fechar novamente esses contratos com a data correta.
