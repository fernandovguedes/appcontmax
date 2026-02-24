
# Corrigir Erros do Job Queue de Integracoes

## Problemas Identificados

### Problema 1: Worker nao consegue autenticar nas funcoes de sync
O `process-integration-job` chama as funcoes de sync (sync-acessorias, sync-onecode-contacts, sync-bomcontrole) passando o `service_role_key` como Bearer token. Porem, essas funcoes validam o token como JWT de usuario (`getClaims` ou `getUser`), e o service role key nao e um JWT de usuario valido. Resultado: retorna "Unauthorized".

### Problema 2: Campo enviado errado para sync-acessorias
O worker envia `{ tenant_id, org_slug }` mas o sync-acessorias espera `{ tenant_slug }` (campo diferente).

### Problema 3: Toast de erro no duplo-clique (409)
Ao clicar "Executar" duas vezes rapido, a segunda chamada retorna 409 (job ja existe). O `supabase.functions.invoke` trata qualquer non-2xx como erro, mostrando o toast "Erro ao criar job". Deveria mostrar uma mensagem informativa em vez de erro.

---

## Solucao

### 1. Adicionar bypass de autenticacao para chamadas internas (service role)

Nos 3 arquivos de sync, adicionar verificacao: se o Bearer token for o service role key, pular a validacao de JWT de usuario e prosseguir como chamada interna confiavel.

**Arquivos:**
- `supabase/functions/sync-acessorias/index.ts`
- `supabase/functions/sync-onecode-contacts/index.ts`
- `supabase/functions/sync-bomcontrole/index.ts`

Logica adicionada antes da validacao de JWT:
```text
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const token = authHeader.replace("Bearer ", "");
const isInternalCall = (token === serviceRoleKey);

if (!isInternalCall) {
  // validacao JWT normal existente
}
```

### 2. Corrigir campo tenant_slug no worker

No `process-integration-job/index.ts`, quando o provider e "acessorias", enviar `tenant_slug` (que e o campo que sync-acessorias espera) em vez de `org_slug`.

### 3. Tratar 409 no hook useIntegrationJobs

No `src/hooks/useIntegrationJobs.ts`, tratar a resposta 409 como informativa:
- Em vez de mostrar toast de erro, mostrar toast informativo: "Ja existe uma execucao em andamento"
- Retornar os dados do response (que contem o job_id existente)

---

## Arquivos Modificados

| Arquivo | Alteracao |
|---------|----------|
| `supabase/functions/sync-acessorias/index.ts` | Bypass de auth para service role key |
| `supabase/functions/sync-onecode-contacts/index.ts` | Bypass de auth para service role key |
| `supabase/functions/sync-bomcontrole/index.ts` | Verificar se precisa bypass (pode nao ter auth check) |
| `supabase/functions/process-integration-job/index.ts` | Enviar `tenant_slug` em vez de `org_slug` |
| `src/hooks/useIntegrationJobs.ts` | Tratar 409 como info, nao como erro |

## Ordem de Implementacao

1. Corrigir as 3 edge functions de sync (bypass interno)
2. Corrigir o campo no worker
3. Corrigir o hook do frontend
4. Re-deploy das edge functions
