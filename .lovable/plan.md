

## Edge Function: close-bomcontrole-contracts

Encerramento em lote de contratos antigos (legacy) no BomControle, com modo dry-run e execute.

### 1. Migracao de banco de dados

Adicionar 3 colunas na tabela `bc_contracts`:

- `legacy` (boolean, default false) -- marca contratos antigos elegiveis para encerramento
- `closed_at` (timestamptz, nullable) -- data/hora do encerramento efetivo
- `closed_competencia` (text, nullable) -- competencia usada no encerramento (ex: "2026-03")

### 2. Nova edge function: `close-bomcontrole-contracts`

Arquivo: `supabase/functions/close-bomcontrole-contracts/index.ts`

Registrar em `supabase/config.toml` com `verify_jwt = false`.

**Input (POST body):**
```text
{
  "tenant_id": "contmax",
  "competencia_corte": "2026-03",
  "execute": false
}
```

**Logica:**

1. Buscar contratos em `bc_contracts` onde `tenant_id` = input, `active` = true, `legacy` = true
2. Limitar a 20 contratos por execucao (batch size)
3. Para cada contrato:
   - GET `/integracao/VendaContrato/Obter/{bc_contract_id}` (sem filtro de periodo, para pegar todas as faturas)
   - Verificar no array `Faturas` se existe alguma com `DataCompetencia >= competencia_corte` e (`Quitado == true` ou `DataPagamento != null` ou `ValorPagamento > 0`)
   - Se sim: status = `blocked_paid_future`
   - Se nao: status = `ok_to_close`
   - Logar em `bc_sync_log` com action = `dry_close_check`

4. Se `execute == false` (dry-run): retornar relatorio sem executar nada

5. Se `execute == true`: para cada contrato `ok_to_close`:
   - DELETE `/integracao/VendaContrato/Encerrar/{bc_contract_id}` com body:
     ```text
     {
       "DataCompetencia": "2026-03-01 00:00:00",
       "Motivo": "Encerramento para migracao contrato unico Contmax"
     }
     ```
   - Se HTTP 200-204: atualizar `bc_contracts` com `active = false`, `closed_at = now()`, `closed_competencia = competencia_corte`
   - Logar em `bc_sync_log` com action = `execute_close`

**Reutiliza do sync-bomcontrole:** `getApiKey()`, `fetchWithRetry()`, `sanitizeForLog()`, `logAction()` (reimplementados no novo arquivo, pois edge functions sao isoladas).

**Retorno:**
```text
{
  "summary": {
    "total_analisados": 25,
    "total_ok": 18,
    "total_bloqueados": 5,
    "total_encerrados": 18,  // (somente se execute=true)
    "total_falhas": 2        // (somente se execute=true)
  },
  "details": [
    { "bc_contract_id": 123, "portal_company_id": "...", "status": "closed", ... },
    { "bc_contract_id": 456, "portal_company_id": "...", "status": "blocked_paid_future", ... }
  ]
}
```

### 3. Resumo de arquivos

| Acao | Arquivo |
|------|---------|
| Migrar | `supabase/migrations/...` (ADD COLUMN legacy, closed_at, closed_competencia) |
| Criar | `supabase/functions/close-bomcontrole-contracts/index.ts` |
| Editar | `supabase/config.toml` (adicionar secao da nova function) |

Nao ha alteracoes de UI -- esta function sera chamada manualmente via API ou futuramente via botao admin.

