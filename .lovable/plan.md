

## UI de Sincronizacao Acessorias - Dentro dos Modulos Clientes

### Objetivo
Adicionar um painel de sincronizacao com a API do Acessorias dentro de cada pagina de Clientes (P&G e Contmax), permitindo que admins disparem a sync e acompanhem o historico diretamente na interface.

### Componentes a Criar

**1. `src/components/SyncPanel.tsx`**
Componente reutilizavel que recebe o `tenantSlug` como prop. Contem:
- Botao "Sincronizar com Acessorias" (visivel apenas para admins)
- Indicador de progresso durante a execucao (spinner + texto "Sincronizando...")
- Ao concluir, exibe um resumo inline: criados, atualizados, ignorados, erros
- Tabela colapsavel com o historico das ultimas 10 sync_jobs do tenant
  - Colunas: Data, Status (badge colorido), Lidos, Criados, Atualizados, Ignorados, Erros, Duracao
- Dialog de confirmacao antes de iniciar a sync

**2. `src/hooks/useSyncAcessorias.ts`**
Hook que encapsula:
- `triggerSync(tenantSlug)`: chama a edge function via `supabase.functions.invoke('sync-acessorias', { body: { tenant_slug } })`
- Estado: `syncing`, `result`, `error`
- `fetchHistory(tenantId)`: busca os ultimos sync_jobs do tenant
- `history`: array de jobs com status e contadores

### Integracao na Pagina Clientes

No `src/pages/Clientes.tsx`:
- Importar e renderizar `<SyncPanel tenantSlug={orgSlug} tenantId={orgInfo.id} />` logo acima da tabela de empresas (dentro do `<main>`)
- Apos sync bem-sucedida, chamar `refetch()` do `useEmpresas` para atualizar a lista
- O painel so aparece para usuarios com `canEdit` (admins do tenant)

### Detalhes Tecnicos

```text
+-----------------------------------------------+
|  [Sincronizar com Acessorias]   Ultima sync:   |
|                                  24/02 14:30   |
+-----------------------------------------------+
| Historico de Sincronizacoes        [Expandir v] |
|  Data       | Status | Lidos | +  | ~  | Erros |
|  24/02 14h  | OK     |   20  | 0  | 0  |   0   |
|  23/02 10h  | OK     |   20  | 3  | 1  |   0   |
+-----------------------------------------------+
```

- O botao fica desabilitado durante a sync com um `Loader2` animado
- Status badges: `success` = verde, `failed` = vermelho, `running` = amarelo
- A chamada `supabase.functions.invoke` envia automaticamente o token JWT do usuario logado
- Apos sync concluida, o hook refaz a query de historico e o componente pai refaz `refetch()` das empresas

### Arquivos Modificados
| Arquivo | Acao |
|---------|------|
| `src/hooks/useSyncAcessorias.ts` | Criar (hook de sync + historico) |
| `src/components/SyncPanel.tsx` | Criar (UI do painel) |
| `src/pages/Clientes.tsx` | Modificar (adicionar SyncPanel) |

### Permissoes
- Leitura de `sync_jobs` ja esta protegida por RLS (somente admins)
- A edge function ja valida JWT + `is_tenant_admin`
- Nenhuma alteracao de banco necessaria
