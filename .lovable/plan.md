

## Corrigir sincronizacao que nunca sai do status "Executando"

### Problema

A Edge Function usa `EdgeRuntime.waitUntil()` para processar em background, mas o runtime esta encerrando a funcao antes que o processamento termine. Os logs mostram um evento "shutdown" no meio da paginacao, e a atualizacao final do `sync_jobs` (para status "success") nunca acontece. Resultado: o frontend faz polling infinito e o botao fica travado em "Sincronizando...".

### Causa Raiz

O `EdgeRuntime.waitUntil` nao esta garantindo que a promise complete antes do shutdown. Em funcoes com processamento longo (71+ paginas, ~5 min), o runtime pode derrubar a instancia.

### Solucao (3 partes)

#### 1. Edge Function: processar de forma sincrona (nao usar waitUntil)

Alterar a edge function para **processar sincronamente** antes de retornar a resposta. Como o frontend ja faz polling no `sync_jobs`, nao ha necessidade de retornar imediatamente. A funcao vai:

- Processar todas as paginas
- Atualizar o status final para "success" ou "failed"
- Retornar a resposta com o resultado final

Isso elimina o problema do shutdown prematuro.

#### 2. Frontend: adicionar timeout no polling

No hook `useSyncAcessorias`, adicionar um timeout de 10 minutos no polling. Se o job nao finalizar nesse prazo:

- Parar o polling
- Mostrar mensagem de timeout
- Desbloquear o botao

Tambem melhorar o `fetchHistory` para buscar os ultimos 10 jobs (atualmente busca apenas 1).

#### 3. Limpar jobs travados no banco

Executar uma migration SQL para marcar como "timeout" todos os sync_jobs que estao com status "running" ha mais de 15 minutos.

### Detalhes Tecnicos

**Arquivo: `supabase/functions/sync-acessorias/index.ts`**
- Remover o bloco `EdgeRuntime.waitUntil`
- Chamar `await runSync(...)` diretamente
- Retornar a resposta final apos o processamento

**Arquivo: `src/hooks/useSyncAcessorias.ts`**
- Adicionar constante `POLL_TIMEOUT_MS = 600_000` (10 min)
- Usar `setTimeout` para limpar o polling se exceder o timeout
- Alterar `fetchHistory` para `limit(10)` ao inves de `limit(1)`

**Migration SQL:**
```text
UPDATE sync_jobs
SET status = 'timeout',
    finished_at = now()
WHERE status = 'running'
  AND started_at < now() - interval '15 minutes';
```

