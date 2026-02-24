

# Campo WhatsApp no Cadastro de Clientes

**Custo estimado: ~2 creditos**

## Resumo

Adicionar um campo "WhatsApp" ao cadastro de empresas nos modulos de Clientes (P&G e Contmax). O campo armazenara o numero no formato `55DDDNUMERO` (sem espacos) e exibira uma dica de preenchimento ao usuario.

## Alteracoes

### 1. Migracao no banco de dados

Adicionar coluna `whatsapp` na tabela `empresas`:

```sql
ALTER TABLE public.empresas
ADD COLUMN whatsapp text DEFAULT '';
```

Valor default vazio para empresas existentes.

### 2. `src/types/fiscal.ts`

Adicionar `whatsapp?: string` na interface `Empresa`.

### 3. `src/hooks/useEmpresas.ts`

- Mapear `whatsapp` em `rowToEmpresa` (leitura do banco)
- Incluir `whatsapp` em `empresaToRow` (escrita no banco)

### 4. `src/components/EmpresaFormDialog.tsx`

- Adicionar estado `whatsapp` com valor inicial vindo da empresa em edicao
- Incluir campo Input com placeholder `5511999999999` e texto auxiliar indicando o formato: "Formato: 55 + DDD + Numero (sem espacos)"
- Incluir no payload de save/update

### 5. `src/pages/Clientes.tsx`

- Exibir o numero de WhatsApp no painel lateral (Sheet) de detalhes da empresa, na secao "Dados da Empresa"
- Caso preenchido, renderizar como link clicavel que abre `https://wa.me/{numero}`

### 6. `src/lib/exportExcel.ts`

- Incluir coluna "WhatsApp" na funcao `exportClientesToExcel`

## Detalhes Tecnicos

- O campo e do tipo `text` sem validacao rigida no banco, permitindo flexibilidade
- A validacao de formato e orientada pelo placeholder e texto auxiliar no formulario
- O link `wa.me` funciona diretamente com o formato numerico sem espacos
- A alteracao se aplica automaticamente a ambos os modulos (P&G e Contmax) pois compartilham a mesma pagina e hook

