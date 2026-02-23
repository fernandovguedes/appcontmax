

# Modulo Comparativo Tributario - Gerador de Relatorio via Excel

## Resumo

Criar um novo modulo "Comparativo Tributario" no Portal Contmax. O modulo funciona como gerador de relatorio: o usuario faz upload de um arquivo Excel (no formato padrao da planilha enviada) e o sistema gera um dashboard visual comparando Lucro Presumido vs. Lucro Real. Sem persistencia no banco -- dados vivem apenas em memoria.

## Estrutura do Excel Esperado

```text
LUCRO REAL
  IR:     4 valores trimestrais (Mar, Jun, Sep, Dec)
  CSLL:   4 valores trimestrais
  PIS:    12 valores mensais (Jan-Dec)
  COFINS: 12 valores mensais
  TOTAL:  1 valor

LUCRO PRESUMIDO
  (mesma estrutura)
  TOTAL:  1 valor

Diferenca: 1 valor
```

## Dashboard Gerado

1. **Hero KPI**: Economia total anual (diferenca entre Presumido e Real)
2. **4 Cards KPI**: Total Presumido, Total Real, Economia absoluta, Reducao percentual
3. **Grafico Trimestral**: IR + CSLL por trimestre comparando os dois regimes (barras agrupadas)
4. **Grafico Composicao**: Breakdown por tipo de imposto (IR, CSLL, PIS, COFINS) nos dois regimes
5. **Grafico Mensal PIS/COFINS**: Comparativo mensal entre os dois regimes
6. **Tabela Detalhada**: Todos os valores com coluna de diferenca
7. **Botao Exportar PDF**: Usa window.print() para gerar PDF

## Arquivos a Criar

### Tipos e Parser
- **`src/types/comparativo.ts`** -- Interfaces TypeScript (ComparativoData, RegimeData, TaxQuarterly, TaxMonthly)
- **`src/lib/parseComparativoExcel.ts`** -- Parser usando `xlsx` que busca keywords "LUCRO REAL", "LUCRO PRESUMIDO", "IR", "CSLL", "PIS", "COFINS", "TOTAL" e extrai os valores monetarios

### Componentes
- **`src/components/comparativo/UploadArea.tsx`** -- Drag-and-drop para upload do Excel (.xlsx/.xls)
- **`src/components/comparativo/ComparativoHeroKPI.tsx`** -- Card hero com economia total
- **`src/components/comparativo/ComparativoKPICards.tsx`** -- 4 cards KPI
- **`src/components/comparativo/QuarterlyComparisonChart.tsx`** -- Grafico barras IR+CSLL trimestral (recharts)
- **`src/components/comparativo/TaxBreakdownChart.tsx`** -- Grafico composicao por imposto
- **`src/components/comparativo/MonthlyPISCOFINSChart.tsx`** -- Grafico mensal PIS/COFINS
- **`src/components/comparativo/ComparativoTable.tsx`** -- Tabela detalhada com diferencas

### Pagina Principal
- **`src/pages/ComparativoTributario.tsx`** -- Pagina do modulo com:
  - Estado `data: ComparativoData | null`
  - Se null: mostra UploadArea
  - Se preenchido: mostra dashboard completo
  - Botao "Novo Upload" para substituir dados
  - Botao "Exportar PDF" flutuante

## Arquivos a Modificar

### `src/App.tsx`
- Importar ComparativoTributario
- Adicionar rota `/comparativo-tributario` com ProtectedRoute

### `src/pages/Portal.tsx`
- Adicionar `"comparativo-tributario": "/comparativo-tributario"` ao MODULE_ROUTES
- Adicionar `BarChart3` ao ICON_MAP

## Registro no Banco

Inserir na tabela `modules`:

```sql
INSERT INTO modules (nome, slug, descricao, icone, ativo, ordem, organizacao_id)
VALUES ('Comparativo Tributário', 'comparativo-tributario', 'Gerador de relatório comparativo Lucro Presumido vs. Lucro Real', 'BarChart3', true, 4, NULL);
```

`organizacao_id = NULL` pois e um modulo de sistema, nao vinculado a organizacao.

## Detalhes Tecnicos

- **Sem persistencia**: Dados em useState, perdidos ao navegar. Upload a cada uso.
- **Sem framer-motion**: O codigo de referencia usa framer-motion mas nao esta instalado. Substituir por classes CSS existentes (`animate-fade-in`, `animate-slide-up`).
- **Bibliotecas ja instaladas**: `xlsx` para parse do Excel, `recharts` para graficos, `lucide-react` para icones.
- **Formatacao monetaria**: `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`.
- **Estilo visual**: Segue design system existente (shadcn/ui Cards, cores primary/accent, tipografia do projeto).

