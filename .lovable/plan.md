
# Botao Exportar Excel nos Modulos Clientes

**Custo estimado: ~2 creditos**

## Resumo

Adicionar um botao "Exportar Excel" no header da pagina Clientes (usado tanto por Clientes P&G quanto Clientes Contmax). O botao exportara a lista filtrada de empresas para um arquivo `.xlsx`.

## Alteracoes

### 1. `src/lib/exportExcel.ts` - Nova funcao `exportClientesToExcel`

Adicionar uma funcao simples que exporta a lista de clientes com as colunas visiveis na tabela:

- No (numero)
- Empresa (nome)
- CNPJ
- Regime Tributario
- Emite NF (Sim/Nao)
- Inicio Competencia
- Status (Ativa / Baixada em DD/MM/YYYY)
- Socios (nome, CPF, percentual de cada socio)

O nome do arquivo sera `Clientes_{nomeOrg}.xlsx`.

### 2. `src/pages/Clientes.tsx` - Botao no header

- Importar `Download` do lucide-react e a nova funcao `exportClientesToExcel`
- Adicionar o botao "Exportar Excel" ao lado do botao "Nova Empresa" na area de `actions` do AppHeader
- O botao exporta a lista `filtered` (respeitando os filtros de busca e regime ativos)
- Visivel para todos os usuarios (nao depende de `canEdit`)

## Detalhes Tecnicos

- Usa a biblioteca `xlsx` ja instalada no projeto
- A funcao recebe `Empresa[]` e `nomeOrg: string` como parametros
- Reutiliza o mesmo pattern do `exportToExcel` existente (json_to_sheet + writeFile)
- Ambos os modulos (P&G e Contmax) usam a mesma pagina `Clientes.tsx` com slug diferente, entao a mudanca automaticamente se aplica aos dois
