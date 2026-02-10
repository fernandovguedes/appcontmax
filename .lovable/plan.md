

## Adicionar campo "Alugueis" ao Faturamento + Filtro

### Resumo
Adicionar o campo `faturamentoAlugueis` em todo o sistema de faturamento mensal e criar um filtro checkbox permanente (como os de Nota Fiscal e Exterior) para exibir apenas empresas com Alugueis > 0 no mes selecionado.

---

### Arquivos a alterar

**1. `src/types/fiscal.ts`**
- Adicionar `faturamentoAlugueis: number` na interface `DadosMensais` (apos `faturamentoExterior`)
- Atualizar `calcularFaturamento` para incluir `faturamentoAlugueis` na soma do total e no tipo do parametro

**2. `src/components/FaturamentoFormDialog.tsx`**
- Adicionar campo de input "Fat. Alugueis (R$)" no grid de valores (mudar grid de 3 para 4 colunas, ou manter 3 e adicionar na linha seguinte)
- Incluir `faturamentoAlugueis` na chamada de `updateField`

**3. `src/components/FaturamentoPopover.tsx`**
- Adicionar linha "Alugueis" no detalhamento, entre "Exterior" e o separador "Total"

**4. `src/lib/exportExcel.ts`**
- Adicionar coluna "Faturamento Alugueis" apos "Faturamento Exterior" na exportacao Excel

**5. `src/pages/Index.tsx`**
- Adicionar estado `alugueisFilter` (boolean, padrao `false`)
- Adicionar checkbox de filtro "Alugueis" (permanente, ao lado de "Nota Fiscal" e "Exterior")
- Na logica de filtragem, verificar `dados.faturamentoAlugueis > 0` quando filtro ativo (usando `|| 0` para compatibilidade com dados antigos)

**6. Funcoes `emptyMes()` em 4 arquivos**
- `src/data/seed.ts` — adicionar `faturamentoAlugueis: 0`
- `src/data/empresas-cadastro.ts` — adicionar `faturamentoAlugueis: 0`
- `src/hooks/useEmpresas.ts` — adicionar `faturamentoAlugueis: 0`
- `src/components/EmpresaFormDialog.tsx` — adicionar `faturamentoAlugueis: 0`

---

### Detalhes tecnicos

- O campo `faturamentoAlugueis` sera do tipo `number`, com valor padrao `0`
- A formula do total passa a ser: `faturamentoNacional + faturamentoNotaFiscal + faturamentoExterior + faturamentoAlugueis`
- A distribuicao de lucros (75%) continua sendo calculada sobre o novo total
- Dados JSONB existentes no banco nao precisam de migracao — campos ausentes serao tratados como `0` usando `|| 0`
- O filtro "Alugueis" segue exatamente o mesmo padrao dos filtros "Nota Fiscal" e "Exterior" ja existentes (checkbox permanente, independente do mes)
