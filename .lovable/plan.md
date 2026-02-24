

## Corrigir Paginacao da Edge Function sync-acessorias

### Problema
A logica atual (linhas 326-335) assume page size de 50 registros. Como a API do Acessorias retorna ~20 por pagina, a condicao `companies.length < 50` e verdadeira na primeira pagina, encerrando a sync prematuramente com apenas 20 registros lidos.

### Solucao
Substituir o bloco de verificacao de fim de paginacao (linhas 326-335) por uma logica robusta:

1. Se o payload contiver `totalPages` ou `total_pages`, usar como limite superior
2. Caso contrario, incrementar `page++` e continuar -- a unica condicao de parada sera `companies.length === 0` (ja tratada nas linhas 221-224)
3. Adicionar log informativo registrando a pagina processada e quantidade de registros

### Detalhes Tecnicos

**Arquivo**: `supabase/functions/sync-acessorias/index.ts`

O bloco atual (linhas 326-335):
```typescript
// Check pagination end
const totalPages = data?.totalPages || data?.total_pages;
if (totalPages && page >= totalPages) {
  hasMore = false;
} else if (companies.length < 50) {
  // Assume page size ~50; if less returned, no more pages
  hasMore = false;
} else {
  page++;
}
```

Sera substituido por:
```typescript
// Check pagination end
const totalPages = data?.totalPages || data?.total_pages;
if (totalPages && page >= totalPages) {
  hasMore = false;
} else {
  page++;
}
```

A logica de `companies.length === 0` nas linhas 221-224 ja cobre o caso de fim de dados. O throttle de 750ms entre requisicoes permanece inalterado.

Apos a alteracao, sera feito deploy e teste com `tenant_slug: 'contmax'` para validar que todas as paginas sao percorridas.

