

# Corrigir Erro na Integracao Acessorias

## Problema Identificado

Quando o worker `process-integration-job` chama `sync-acessorias`, a funcao tenta inserir um registro em `sync_jobs` com `created_by_user_id: "system"`. Porem, essa coluna e do tipo UUID — "system" nao e um UUID valido. O insert falha silenciosamente, `job` retorna `null`, e `job!.id` causa o erro `TypeError: Cannot read properties of null (reading 'id')`.

Alem disso, existem 2 jobs travados em status "pending" na tabela `integration_jobs` que impedem novas execucoes (retornam 409 Conflict).

## Solucao

### 1. Corrigir `sync-acessorias/index.ts` (linha 342)

Alterar o campo `created_by_user_id` para usar `null` quando a chamada e interna (userId === "system"):

```text
Antes:  created_by_user_id: userId,
Depois: created_by_user_id: userId === "system" ? null : userId,
```

### 2. Limpar jobs travados via migracao

Executar uma migracao SQL para marcar os 2 jobs pendentes como "error" com mensagem explicativa, liberando a fila para novas execucoes.

```text
UPDATE integration_jobs 
SET status = 'error', 
    error_message = 'Cleanup: job stuck in pending due to sync-acessorias bug',
    finished_at = now()
WHERE status = 'pending';
```

### 3. Re-deploy da edge function

Fazer deploy do `sync-acessorias` com a correcao.

## Arquivos

| Arquivo | Alteracao |
|---------|----------|
| `supabase/functions/sync-acessorias/index.ts` | Corrigir UUID null para chamadas internas |
| Migracao SQL | Limpar jobs travados |

## Resultado

Apos as correcoes, o fluxo completo sera:
1. Clicar "Executar" cria job em integration_jobs (pending)
2. Worker processa o job, chama sync-acessorias
3. sync-acessorias cria sync_job com created_by_user_id = null
4. Sincronizacao executa normalmente
5. Status atualiza em tempo real no frontend
