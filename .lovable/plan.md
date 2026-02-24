

# Corrigir erro "Failed to send a request to the Edge Function"

## Problema

A Edge Function `sync-onecode-contacts` esta rejeitando requisicoes do navegador porque os headers CORS estao incompletos. O cliente Supabase JS envia headers adicionais (`x-supabase-client-platform`, etc.) que nao estao listados no `Access-Control-Allow-Headers`, causando falha no preflight CORS.

## Solucao

Atualizar a constante `corsHeaders` no arquivo `supabase/functions/sync-onecode-contacts/index.ts` para incluir todos os headers necessarios:

```text
Antes:
  "authorization, x-client-info, apikey, content-type"

Depois:
  "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

## Arquivo a modificar

| Arquivo | Alteracao |
|---|---|
| `supabase/functions/sync-onecode-contacts/index.ts` | Atualizar `corsHeaders` (linha 5-6) |

## Impacto

Nenhuma alteracao funcional. Apenas correcao de compatibilidade CORS com a versao atual do SDK Supabase JS.

