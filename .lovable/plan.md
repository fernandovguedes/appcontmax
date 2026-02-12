

# Modulo Honorarios Mensal Contmax - Plano Atualizado

## Ajustes baseados na planilha real

### Campos corrigidos (diferente do plano anterior):

1. **Emitir NF** - Muda de `boolean` para `text` (campo livre). Exemplos da planilha: "SIM", "SIM MUZYKANT", "JUNTO COM A NF DA MATRIZ". Sera exibido no grid exatamente como digitado.

2. **Nao Emitir Boleto** - `boolean` (checkbox). Novo campo solicitado.

3. **Data de Pagamento** - Muda para `text` (campo livre). Exemplos: "PAGO PIX 15.01.2026", "ACORDO ESCOLA SEBASTIAN", "***".

4. **Pessoal (R$)** - Valor padrao mais comum e R$ 41,00, mas varia (R$ 38, R$ 40, R$ 43, R$ 46, R$ 70, R$ 30, R$ 100). Mantido como valor por empresa.

5. Algumas empresas tem valor fixo em vez de percentual (ex: "R$ 70,00" para MEIs, "R$ 90,00 POR TRIMESTRE"). Esses casos serao tratados colocando 0% no fiscal e o valor fixo como "Servicos Extras".

## Estrutura do Banco de Dados

### Tabela `honorarios_config`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid, PK | Identificador |
| salario_minimo | numeric | Valor vigente (default 1618.00) |
| created_at | timestamptz | Data criacao |
| updated_at | timestamptz | Data atualizacao |

### Tabela `honorarios_empresas`

| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid, PK | Identificador |
| empresa_id | uuid, FK | Referencia a empresas.id |
| fiscal_percentual | numeric | Ex: 55 para 55% |
| contabil_percentual | numeric | Ex: 70 para 70% |
| pessoal_valor | numeric | Valor por funcionario (ex: 41.00) |
| emitir_nf | text | Texto livre ("SIM", "SIM MUZYKANT", etc) |
| nao_emitir_boleto | boolean | Checkbox |
| meses | jsonb | Dados mensais por mes |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### Estrutura JSONB dos meses

```text
{
  "janeiro": {
    "num_funcionarios": 3,
    "servicos_extras": 150.00,
    "data_pagamento": "PAGO PIX 15.01.2026"
  },
  "fevereiro": { ... }
}
```

### RLS Policies
- SELECT: usuarios autenticados
- INSERT/UPDATE/DELETE: `has_module_edit_access` para "honorarios-contmax"

### Inserir modulo na tabela `modules`
- nome: "Honorarios Mensal Contmax"
- slug: "honorarios-contmax"
- icone: "DollarSign"

## Arquivos a Criar

### 1. `src/pages/Honorarios.tsx`
Pagina principal, layout igual ao Index.tsx (Controle Fiscal):
- AppHeader com breadcrumbs
- Tabs de meses (Jan-Dez)
- Barra de busca
- Botao configurar salario minimo
- Botao cadastrar empresa
- Tabela de honorarios

### 2. `src/components/HonorariosTable.tsx`
Tabela com colunas:

| Razao Social | Fiscal % | Contabil % | Pessoal | Valor Fisc+Cont | N Func | Valor Func | Serv Extras | Total Mes | Nao Emitir Boleto | Data Pgto | Emitir NF |

- Razao Social: somente leitura (da base Contmax)
- Fiscal %, Contabil %, Pessoal, Emitir NF, Nao Emitir Boleto: editaveis via dialog de cadastro
- N Funcionarios, Servicos Extras, Data Pagamento: editaveis inline por mes
- Valor Fiscal+Contabil, Valor Funcionarios, Total: calculados automaticamente
- Emitir NF: exibido como texto no grid

### 3. `src/components/HonorariosEmpresaDialog.tsx`
Dialog de cadastro/edicao com campos:
- Selecionar empresa da base Contmax
- Fiscal % (numerico)
- Contabil % (numerico)
- Pessoal R$ (numerico)
- Emitir NF (campo texto livre)
- Nao Emitir Boleto (checkbox)

### 4. `src/components/SalarioMinimoDialog.tsx`
Dialog para alterar o salario minimo vigente.

### 5. `src/hooks/useHonorarios.ts`
Hook com:
- Buscar empresas do modulo com JOIN em empresas
- CRUD de honorarios_empresas
- Buscar/atualizar salario minimo
- Atualizar dados mensais

## Arquivos a Modificar

### `src/App.tsx`
- Importar pagina Honorarios
- Adicionar rota `/honorarios-contmax`

### `src/pages/Portal.tsx`
- Adicionar `"honorarios-contmax": "/honorarios-contmax"` no MODULE_ROUTES
- Adicionar `DollarSign` no ICON_MAP

## Logica de Calculos

```text
Valor Fiscal+Contabil = (fiscal_percentual + contabil_percentual) / 100 * salario_minimo
Valor Funcionarios = pessoal_valor * num_funcionarios
Total Mes = Valor Fiscal+Contabil + Valor Funcionarios + Servicos Extras
```

## Ordem de Implementacao

1. Migracoes de banco (tabelas + RLS + modulo)
2. Hook useHonorarios
3. Componentes (tabela, dialogs)
4. Pagina Honorarios
5. Rota e Portal updates

## Estimativa: 8-10 creditos

