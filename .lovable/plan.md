

## Modulo dedicado de Clientes + Remover edicao dos modulos

### Resumo

Criar um modulo exclusivo "Clientes" no Portal para gerenciar (cadastrar, editar, baixar, excluir) as empresas de cada organizacao. Os demais modulos (como Controle Fiscal) passam a usar a base de empresas apenas em modo leitura, sem botoes de edicao, exclusao ou cadastro.

---

### O que muda na pratica

- No Portal, aparece um novo card "Clientes P&G" (e futuramente "Clientes Contmax") que abre a pagina de gerenciamento de clientes
- Dentro desse modulo, o admin pode cadastrar, editar, baixar/reativar e excluir empresas
- No Controle Fiscal (e qualquer modulo futuro), os botoes "Nova Empresa", "Editar", "Baixar" e "Excluir" sao removidos; so permanece o botao "Faturamento" e os controles operacionais do modulo
- Se uma empresa for alterada no modulo Clientes, a mudanca reflete automaticamente em todos os modulos que usam aquela base

---

### Detalhes tecnicos

**1. Novo arquivo: `src/pages/Clientes.tsx`**

Pagina dedicada para gerenciamento de clientes de uma organizacao:
- Header com logo, titulo "Clientes [Nome Organizacao]" e botao "Voltar ao Portal"
- Busca por nome/CNPJ e filtro por regime tributario
- Tabela simplificada com colunas: N, Empresa, CNPJ, Regime, NF, Inicio Competencia, Acoes (Editar, Baixar/Reativar, Excluir)
- Botao "Nova Empresa" no header
- Reutiliza `EmpresaFormDialog` para cadastro/edicao
- Dialog de confirmacao para exclusao e baixa (mesma logica atual do Index.tsx)
- Recebe `organizacaoId` via parametro de rota ou state do router
- Usa `useModulePermissions("clientes")` para controlar acesso de edicao
- Usa `useEmpresas(organizacaoId)` para carregar a base filtrada

**2. Alteracao: `src/App.tsx`**

Adicionar rota `/clientes/:orgSlug` apontando para a nova pagina `Clientes.tsx`, protegida por `ProtectedRoute`.

**3. Alteracao: `src/pages/Portal.tsx`**

Atualizar `MODULE_ROUTES` para mapear o slug "clientes-pg" para `/clientes/pg` e futuramente "clientes-contmax" para `/clientes/contmax`.

**4. Banco de dados (insert, nao migracao)**

Inserir o novo modulo "Clientes P&G" na tabela `modules`:
- `nome`: "Clientes P&G"
- `slug`: "clientes-pg"
- `descricao`: "Gerenciamento da base de clientes P&G"
- `icone`: "LayoutDashboard"
- `organizacao_id`: (UUID da organizacao P&G)
- `ordem`: 0 (aparece antes do Controle Fiscal)

Futuramente, um modulo "Clientes Contmax" sera inserido da mesma forma.

**5. Alteracao: `src/pages/Index.tsx` (Controle Fiscal)**

Remover:
- Botao "Nova Empresa" do header
- `EmpresaFormDialog` (nao precisa mais do form de cadastro/edicao)
- Dialog de confirmacao de exclusao
- Dialog de baixa de empresa
- Estados `formOpen`, `editingEmpresa`, `deleteConfirm`, `baixaDialog`, `baixaDate`
- Handlers `handleEdit`, `handleNew`

Manter:
- `FaturamentoFormDialog` e handler `handleFaturamento`
- Todos os controles operacionais (extrato, Questor, obrigacoes trimestrais)
- Filtros e dashboard

**6. Alteracao: `src/components/EmpresaTable.tsx`**

Tornar as props de edicao opcionais:
- `onEdit`, `onDelete`, `onBaixar`, `onReativar` passam a ser opcionais (`?`)
- Na coluna "Acoes", renderizar botoes de edicao apenas quando essas props forem fornecidas
- O botao "Faturamento" continua aparecendo sempre (ou tambem fica opcional, conforme o modulo)
- Quando usado pelo modulo Clientes: passa todas as props de edicao, sem colunas fiscais
- Quando usado pelo Controle Fiscal: passa apenas `onFaturamento` e controles operacionais, sem botoes de edicao

**7. RLS**

Criar funcao `has_module_edit_access` para o slug "clientes-pg" (ou reaproveitar a existente parametrizada). As policies de INSERT, UPDATE e DELETE na tabela `empresas` precisam aceitar tanto "controle-fiscal" quanto "clientes-pg":
- Atualizar as policies para usar: `has_module_edit_access(auth.uid(), 'controle-fiscal') OR has_module_edit_access(auth.uid(), 'clientes-pg')`
- Ou criar uma funcao generica que verifica se o usuario tem acesso de edicao em qualquer modulo vinculado a mesma organizacao

---

### Resumo dos arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/Clientes.tsx` | Criar (nova pagina de gerenciamento) |
| `src/App.tsx` | Adicionar rota `/clientes/:orgSlug` |
| `src/pages/Portal.tsx` | Mapear slug do modulo para rota |
| `src/pages/Index.tsx` | Remover botoes e dialogs de edicao |
| `src/components/EmpresaTable.tsx` | Props de edicao opcionais |
| Banco de dados (insert) | Inserir modulo "Clientes P&G" |
| Banco de dados (migracao) | Atualizar RLS policies para aceitar novo modulo |

