

## Permissao de edicao por modulo

### Resumo
Adicionar controle granular de permissao nos modulos: cada usuario podera ter permissao de "somente visualizar" ou "editar" em cada modulo. Admins continuam com acesso total automaticamente. Usuarios sem permissao de edicao verao a interface sem os botoes de cadastrar, editar, excluir e baixar empresas.

### O que muda para o usuario
- No painel de Administracao, alem do checkbox de acesso ao modulo, aparecera um segundo checkbox "Pode Editar" por modulo
- Usuarios sem permissao de edicao verao a tabela de empresas normalmente, mas sem os botoes de acao (Nova Empresa, editar, excluir, baixar, faturamento)
- Admins mantem acesso total sem restricoes

### Detalhes tecnicos

**1. Migracao de banco de dados**
- Adicionar coluna `can_edit` (boolean, default false) na tabela `user_modules`
- Criar funcao `has_module_edit_access(_user_id uuid, _module_slug text)` (security definer) que retorna true se o usuario tem `can_edit = true` para o modulo ou se eh admin

**2. Hook de permissao (`src/hooks/useModulePermissions.ts`)**
- Novo hook que consulta `user_modules` para verificar se o usuario logado tem `can_edit = true` para o modulo atual (slug `controle-fiscal`)
- Admins retornam `canEdit = true` automaticamente
- Expoe `{ canEdit, loading }`

**3. Pagina principal (`src/pages/Index.tsx`)**
- Consumir o hook `useModulePermissions`
- Condicionar a exibicao do botao "Nova Empresa" e "Excel" (manter export para todos) a `canEdit`
- Passar `canEdit` como prop para `EmpresaTable`

**4. Tabela (`src/components/EmpresaTable.tsx`)**
- Receber prop `canEdit: boolean`
- Quando `canEdit = false`: ocultar coluna de Acoes (editar, excluir, baixar, faturamento)
- Manter visibilidade dos dados, apenas remover botoes de acao

**5. Painel de Administracao (`src/pages/Admin.tsx`)**
- Adicionar coluna "Pode Editar" na tabela de usuarios/modulos
- Para cada combinacao usuario-modulo, mostrar checkbox de edicao (somente habilitado se o usuario tem acesso ao modulo)
- Admins mostram badge "Auto" como ja fazem para acesso

