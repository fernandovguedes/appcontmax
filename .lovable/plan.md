
# Upgrade Visual do Comparativo Tributario

**Custo estimado: ~4-5 creditos**

## Resumo

Atualizar o visual do modulo Comparativo Tributario para ficar mais moderno e sofisticado, inspirado no codigo de referencia enviado. As mudancas incluem: efeitos de glow, gradientes mais ricos, cards com bordas coloridas por variante, hover effects, tooltips customizados nos graficos e estilo de tabela mais refinado.

## Alteracoes

### 1. `src/index.css` - Novos utilitarios CSS

Adicionar classes CSS inspiradas no codigo de referencia:

- `.gradient-hero`: gradiente radial sofisticado para o hero KPI (radial-gradient com primary/5 e primary/10)
- `.glow-gain`: box-shadow com glow verde/primary sutil
- `.glow-gold`: box-shadow com glow dourado/accent
- `.card-variant-neutral`: borda esquerda cinza + hover sutil
- `.card-variant-gain`: borda esquerda primary + glow primary no hover
- `.card-variant-gold`: borda esquerda accent/dourada + glow dourado no hover
- `.chart-card`: estilo de card com backdrop-filter e borda sutil para os graficos

### 2. `src/components/comparativo/ComparativoHeroKPI.tsx`

- Trocar classes do container para usar `gradient-hero` + `glow-gain`
- Adicionar efeito de backdrop mais rico com gradiente radial
- Aumentar o shadow para criar profundidade

### 3. `src/components/comparativo/ComparativoKPICards.tsx`

- Adicionar borda esquerda colorida por variante (4px accent bar)
- Adicionar efeito hover com elevacao e glow por variante
- Icone com fundo mais vibrante e arredondamento maior
- Valor principal com tamanho maior e fonte mono

### 4. `src/components/comparativo/QuarterlyComparisonChart.tsx`

- Card com classe `card-hover` para efeito de elevacao
- Tooltip customizado com fundo escuro e borda arredondada
- Cores das barras mais contrastantes (usar emerald/green para Real e orange para Presumido)

### 5. `src/components/comparativo/TaxBreakdownChart.tsx`

- Mesmas melhorias de card e tooltip do QuarterlyChart
- Cores consistentes com o grafico trimestral

### 6. `src/components/comparativo/MonthlyPISCOFINSChart.tsx`

- Mesmas melhorias de card e tooltip
- Altura aumentada para melhor leitura dos 12 meses

### 7. `src/components/comparativo/ComparativoTable.tsx`

- Header da tabela com gradiente escuro (`header-gradient` adaptado)
- Texto do header em branco/claro
- Linha de TOTAL com fundo highlight sutil
- Coluna de diferenca com badge colorido (verde quando positivo)
- Hover nas linhas com transicao suave

### 8. `src/pages/ComparativoTributario.tsx`

- Botoes flutuantes com backdrop-blur (glass effect)
- Botao de exportar com gradiente primary

## Detalhes Tecnicos

- Sem dependencias novas (sem framer-motion) -- todas as animacoes via CSS existente
- As cores usam as variaveis CSS ja definidas (--primary, --accent, --chart-1, --chart-2)
- Adicionamos cores especificas para os efeitos de glow usando hsl com opacidade
- Tooltip customizado dos graficos via componente inline do Recharts (prop `content`)
- Compativel com dark mode pois usa variaveis CSS tematicas
