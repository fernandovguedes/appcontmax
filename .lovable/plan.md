

## Funcionalidade: Baixa de Empresa

### Objetivo
Permitir "baixar" uma empresa (encerramento), mantendo-a visivel com nome em vermelho e etiqueta "BAIXADA EM DD/MM/AAAA" ate o proximo fechamento de trimestre, quando ela deixa de aparecer.

### Regra de negocio
- Ao baixar, registra-se a data da baixa (ex: 15/02/2026)
- A empresa continua aparecendo no sistema ate o proximo mes de fechamento trimestral (marco, junho, setembro, dezembro) a partir da data da baixa
  - Exemplo: baixada em 15/02/2026 -- visivel ate marco/2026 (inclusive). A partir de abril, nao aparece mais
  - Exemplo: baixada em 10/04/2026 -- visivel ate junho/2026 (inclusive). A partir de julho, nao aparece mais
- Enquanto visivel, o nome aparece em vermelho com badge "BAIXADA EM DD/MM/AAAA"
- Possibilidade de desfazer a baixa (reativar)

---

### Detalhes tecnicos

**1. Migracao de banco de dados**
- Adicionar coluna `data_baixa` (tipo `text`, nullable, default null) na tabela `empresas`
- Quando null, empresa esta ativa. Quando preenchida (formato YYYY-MM-DD), empresa esta baixada

**2. Tipo Empresa (`src/types/fiscal.ts`)**
- Adicionar campo `dataBaixa?: string` na interface `Empresa`
- Criar funcao auxiliar `isEmpresaBaixadaVisivel(dataBaixa: string, mesSelecionado: MesKey): boolean` que calcula se a empresa baixada ainda deve aparecer com base no proximo fechamento trimestral

**3. Hook useEmpresas (`src/hooks/useEmpresas.ts`)**
- Mapear `data_baixa` no `rowToEmpresa` e `empresaToRow`
- Adicionar funcao `baixarEmpresa(id: string, data: string)` que faz update de `data_baixa`
- Adicionar funcao `reativarEmpresa(id: string)` que seta `data_baixa` para null

**4. Tabela (`src/components/EmpresaTable.tsx`)**
- Receber callbacks `onBaixar` e `onReativar` via props
- Na coluna "Empresa", verificar se `empresa.dataBaixa` existe:
  - Se sim: nome em vermelho + badge "BAIXADA EM DD/MM/AAAA"
- Na coluna "Acoes", adicionar botao para baixar (icone `Ban` ou `Archive`) ou reativar (icone `RotateCcw`)

**5. Filtro de visibilidade (`src/pages/Index.tsx`)**
- No filtro de empresas, adicionar logica: se `empresa.dataBaixa` existe, verificar se o mes selecionado ainda esta dentro do periodo de visibilidade (ate o proximo fechamento trimestral). Caso contrario, ocultar
- Dialog de confirmacao para baixar empresa com campo de data

**6. Fluxo do usuario**
- Clica no botao de baixar na linha da empresa
- Dialog de confirmacao aparece pedindo a data da baixa (default: hoje)
- Confirma e a empresa fica com nome vermelho + badge
- Nos meses seguintes ao fechamento do trimestre, a empresa desaparece automaticamente
