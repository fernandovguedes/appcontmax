

# Plano: Corrigir botoes de Salario Minimo, Incluir Empresa, Editar e Excluir

## Problema identificado

Os botoes estao todos presentes no codigo, mas ficam invisiveis porque a variavel `canEdit` esta retornando `false`. Isso acontece por uma **race condition** no hook `useModulePermissions`:

1. O hook `useUserRole` comeca com `isAdmin = false` enquanto carrega do banco
2. Enquanto isso, `useModulePermissions` ja executa a consulta em `user_modules` e nao encontra nenhum registro para o modulo `honorarios-contmax`
3. Resultado: `canEdit = false`, e os botoes nao aparecem
4. Quando `isAdmin` finalmente vira `true`, o efeito deveria re-executar, mas em certas condicoes de timing ele falha

## Solucao

Corrigir o hook `useModulePermissions` para **aguardar** o carregamento do `useUserRole` antes de tomar qualquer decisao.

## Alteracoes

### 1. Arquivo: `src/hooks/useModulePermissions.ts`

- Importar o `loading` do `useUserRole` alem de `isAdmin`
- No `useEffect`, se `loading` do role ainda estiver `true`, nao fazer nada (aguardar)
- Somente apos `loading = false`, verificar `isAdmin` e decidir se precisa consultar `user_modules`
- Adicionar `loading` do role como dependencia do `useEffect`

Logica corrigida:
```
Se loading do role -> nao faz nada, mantém carregando
Se isAdmin -> canEdit = true, pronto
Senao -> consulta user_modules normalmente
```

### Detalhes tecnicos

- O hook `useUserRole` ja retorna `{ isAdmin, loading }` - so precisamos usar o `loading`
- Nenhuma alteracao de banco de dados necessaria
- Nenhum componente precisa mudar, apenas o hook de permissoes
- Os botoes de Salario Minimo, Incluir Empresa, Editar (lapis) e Excluir (lixeira com confirmacao) ja estao implementados e voltarao a aparecer assim que `canEdit = true`

