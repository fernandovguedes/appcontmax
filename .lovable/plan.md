

## Organizacoes (P&G / Contmax) + Empresa Baixada nos Modulos

### Resumo

Duas mudancas combinadas:
1. Criar a estrutura de organizacoes para separar bases de clientes entre P&G e Contmax
2. Garantir que a logica de empresa baixada (visibilidade ate o fechamento trimestral) funcione em todos os modulos que usarem a base de empresas

---

### Parte 1: Estrutura de Organizacoes

**Migracao de banco de dados**

Criar tabela `organizacoes`:
- `id` (uuid, PK, default gen_random_uuid())
- `nome` (text, NOT NULL) -- "P&G", "Contmax"
- `slug` (text, UNIQUE, NOT NULL) -- "pg", "contmax"
- `created_at` (timestamptz, default now())

Inserir dois registros iniciais: P&G (slug: "pg") e Contmax (slug: "contmax").

Adicionar coluna `organizacao_id` (uuid, FK para `organizacoes`) na tabela `empresas`:
- Atualizar todas as empresas existentes para apontar para a organizacao P&G
- Tornar a coluna NOT NULL apos o update

Adicionar coluna `organizacao_id` (uuid, nullable FK para `organizacoes`) na tabela `modules`:
- Atualizar o modulo "Controle Fiscal" existente para apontar para P&G
- Manter nullable pois nem todo modulo precisa de base de clientes

RLS na tabela `organizacoes`: leitura para todos os autenticados, gerenciamento apenas para admins.

**Arquivos a alterar**

1. `src/hooks/useModules.ts`
   - Incluir `organizacao_id` no tipo `Module` e no select

2. `src/hooks/useEmpresas.ts`
   - Receber `organizacaoId` como parametro
   - Filtrar query por `.eq("organizacao_id", organizacaoId)`
   - Incluir `organizacao_id` ao inserir nova empresa

3. `src/pages/Index.tsx`
   - Buscar o `organizacao_id` do modulo atual (via query ao banco usando o slug "controle-fiscal")
   - Passar para `useEmpresas(organizacaoId)`

4. `src/components/EmpresaFormDialog.tsx`
   - Receber e incluir `organizacao_id` ao criar empresa

5. `src/pages/Portal.tsx`
   - Sem mudancas significativas; os modulos ja carregam com organizacao_id

6. `src/pages/Admin.tsx`
   - Adicionar select de "Organizacao" ao lado de cada modulo na tabela (ou como coluna extra)
   - Permitir ao admin associar um modulo a P&G, Contmax ou nenhuma organizacao

7. `src/App.tsx`
   - Sem mudancas na estrutura de rotas

---

### Parte 2: Empresa Baixada nos Modulos

A logica de visibilidade de empresa baixada ja existe em `src/types/fiscal.ts` (`isEmpresaBaixadaVisivel`). Atualmente so e aplicada no `Index.tsx` (Controle Fiscal).

Para que funcione em todos os modulos futuros:

1. **Mover a filtragem para o hook `useEmpresas`**
   - Adicionar um parametro opcional `mesSelecionado?: MesKey` ao hook
   - Quando fornecido, o hook filtra automaticamente empresas baixadas usando `isEmpresaBaixadaVisivel`
   - Isso centraliza a logica e evita que cada pagina de modulo precise reimplementar

2. **Alternativa (recomendada)**: Exportar uma funcao utilitaria `filtrarEmpresasVisiveis(empresas, mesSelecionado)` que qualquer modulo pode usar
   - Manter a filtragem no componente (como ja e feito no Index.tsx) para flexibilidade
   - Criar a funcao em `src/types/fiscal.ts` ou em um novo arquivo `src/lib/empresaUtils.ts`
   - Cada modulo que tenha selecao de mes chama essa funcao

3. **`src/types/fiscal.ts`** (ou `src/lib/empresaUtils.ts`)
   - Criar `filtrarEmpresasVisiveis(empresas: Empresa[], mesSelecionado: MesKey): Empresa[]`
   - Aplica as regras: inicio de competencia + empresa baixada visivel ate fechamento trimestral
   - Reutilizavel por qualquer modulo

4. **`src/pages/Index.tsx`**
   - Refatorar para usar `filtrarEmpresasVisiveis` em vez de ter a logica inline
   - Manter os filtros especificos do Controle Fiscal (REINF, NF, etc.) no componente

---

### Detalhes tecnicos

- A tabela `organizacoes` usa RLS com `RESTRICTIVE` SELECT para autenticados e ALL para admins
- A FK em `empresas` garante integridade referencial
- O campo `organizacao_id` em `modules` e nullable para permitir modulos que nao dependem de base de clientes (ex: modulos administrativos)
- A funcao `filtrarEmpresasVisiveis` centraliza a logica de visibilidade por competencia e baixa, garantindo consistencia entre modulos
- Nenhum dado existente e perdido; todas as empresas atuais serao associadas a P&G automaticamente

