
# Dashboard Executivo - Relatorio Gerencial

## Resumo

Criar uma nova pagina "Dashboard Executivo" que apresenta metricas gerenciais sobre a base de clientes, com cards KPI, grafico de distribuicao por regime tributario e grafico de crescimento mensal. O usuario pode selecionar qual organizacao visualizar (Contmax, P&G ou ambas).

## O que sera criado

### 1. Nova pagina `src/pages/DashboardExecutivo.tsx`

Seguindo o mesmo template visual das demais paginas (AppHeader, LoadingSkeleton, glass-morphism, gradientes azul escuro, cards com borda lateral):

**Seletor de organizacao**: Select no topo com opcoes "Contmax", "P&G" e "Todas". Ao trocar, recarrega os dados filtrando por `organizacao_id`.

**Cards KPI superiores** (3 cards em grid):
- Total de empresas ativas (excluindo baixadas)
- Novos clientes no mes atual (filtro por `data_cadastro` no mes/ano corrente)
- Crescimento % vs mes anterior (comparando novos clientes do mes atual com mes anterior)

**Grafico de distribuicao por regime tributario**:
- BarChart horizontal ou PieChart usando Recharts (ja instalado)
- Agrupa empresas por `regime_tributario` e mostra contagem
- Usa as mesmas cores e estilos dos graficos do comparativo

**Grafico de crescimento mensal**:
- AreaChart ou BarChart mostrando ultimos 12 meses
- Agrupa empresas pela coluna `data_cadastro` (formato YYYY-MM-DD) por mes
- Eixo X: meses cronologicamente ordenados
- Eixo Y: quantidade de novos cadastros

**Estados**: Loading skeleton enquanto carrega, mensagem amigavel se nao houver dados.

### 2. Registro de rota em `src/App.tsx`

Adicionar rota `/dashboard-executivo` protegida.

### 3. Registro no Portal em `src/pages/Portal.tsx`

Adicionar entrada em `MODULE_ROUTES` para o slug `dashboard-executivo`.

### 4. Criar modulo no banco de dados

Inserir registro na tabela `modules` com:
- slug: `dashboard-executivo`
- nome: `Dashboard Executivo`
- descricao: `Relatorio Gerencial`
- icone: `BarChart3`
- organizacao_id: NULL (disponivel para ambas)
- ativo: true

### 5. Adicionar icone ao Portal

Adicionar `BarChart3` ao `ICON_MAP` (ja esta mapeado).

---

## Detalhes tecnicos

### Queries ao banco

Todas as queries usam a tabela `empresas` existente e filtram por `organizacao_id`. A query seleciona apenas colunas leves: `id, data_cadastro, regime_tributario, data_baixa, organizacao_id`.

Para "Todas" as organizacoes, a query nao aplica filtro de `organizacao_id`.

Calculos de KPI sao feitos no frontend apos buscar os dados:
- Total de empresas: `empresas.filter(e => !e.data_baixa).length`
- Novos no mes: filtro por `data_cadastro` comecando com `YYYY-MM` do mes atual
- Crescimento %: `((novosAtual - novosAnterior) / novosAnterior) * 100`

### Arquivos criados/alterados

| Arquivo | Acao |
|---|---|
| `src/pages/DashboardExecutivo.tsx` | Criar |
| `src/App.tsx` | Adicionar rota |
| `src/pages/Portal.tsx` | Adicionar slug no MODULE_ROUTES |
| Migracao SQL | Inserir modulo na tabela modules |

### Componentes reutilizados

- `AppHeader` (cabecalho com breadcrumbs e logout)
- `LoadingSkeleton` (estado de carregamento)
- `Card, CardContent, CardHeader, CardTitle` (shadcn)
- `Select` (seletor de organizacao)
- `BarChart, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar, Cell` do Recharts
- Cores e estilos do sistema: `hsl(var(--chart-1))`, gradientes, `header-gradient`, `border-l-4`
