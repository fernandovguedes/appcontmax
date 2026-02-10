

## Permissao de edicao por modulo (somente cadastro)

### Resumo
Adicionar controle granular de permissao: cada usuario podera ter permissao de "somente visualizar" ou "editar" no modulo. A restricao se aplica **somente a acoes cadastrais** (criar, editar, excluir e baixar empresas). Faturamento e demais funcoes continuam liberadas para todos os usuarios com acesso ao modulo.

### O que muda para o usuario
- No painel de Administracao, alem do checkbox de acesso ao modulo, aparecera um checkbox "Pode Editar" por modulo
- Usuarios sem permissao de edicao verao a tabela normalmente, com acesso ao faturamento, mas **sem** os botoes de:
  - Nova Empresa
  - Editar cadastro
  - Excluir empresa
  - Baixar empresa
- Admins mantem acesso total sem restricoes

### O que permanece liberado para todos
- Visualizar dados da tabela
- Acessar e editar faturamento mensal
- Exportar Excel
- Todas as demais funcoes do modulo

---

### Detalhes tecnicos

**1. Migracao de banco de dados**
- Adicionar coluna `can_edit` (boolean, default false) na tabela `user_modules`
- Criar funcao `has_module_edit_access(_user_id uuid, _module_slug text)` que retorna true se o usuario tem `can_edit = true` ou se eh admin

**2. Novo hook (`src/hooks/useModulePermissions.ts`)**
- Consulta `user_modules` para verificar `can_edit` do usuario logado para o modulo `controle-fiscal`
- Admins retornam `canEdit = true` automaticamente
- Expoe `{ canEdit, loading }`

**3. Pagina principal (`src/pages/Index.tsx`)**
- Consumir o hook `useModulePermissions`
- Condicionar exibicao do botao "Nova Empresa" a `canEdit`
- Passar `canEdit` como prop para `EmpresaTable`

**4. Tabela (`src/components/EmpresaTable.tsx`)**
- Receber prop `canEdit: boolean`
- Quando `canEdit = false`:
  - Ocultar botoes: Editar cadastro, Excluir, Baixar empresa
  - **Manter visivel**: botao de Faturamento e demais acoes
- Nao ocultar a coluna inteira de Acoes, apenas os botoes restritos

**5. Painel de Administracao (`src/pages/Admin.tsx`)**
- Adicionar coluna "Pode Editar" na tabela de usuarios/modulos
- Checkbox habilitado somente se o usuario tem acesso ao modulo
- Admins mostram badge "Auto"

