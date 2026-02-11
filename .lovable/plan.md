

# Redesign Visual Profissional (sem alterar Login)

## Escopo
Redesign visual de todo o sistema **exceto a tela de login (Auth.tsx)**, que permanece como esta.

## Estimativa: 12-20 creditos

## Mudancas Planejadas

### 1. CSS Global e Animacoes (`src/index.css`) - 1 credito
- Adicionar keyframes para fade-in e slide-up
- Classes utilitarias para gradientes e glass-morphism
- Transicoes suaves globais para hover em cards e botoes

### 2. Componentes Base - 1-2 creditos
- **`src/components/AppHeader.tsx`** (novo): Header reutilizavel com gradiente escuro, breadcrumbs, avatar do usuario com iniciais, animacao de entrada
- **`src/components/LoadingSkeleton.tsx`** (novo): Skeletons animados (pulse) substituindo os textos "Carregando..."

### 3. Portal de Modulos (`src/pages/Portal.tsx`) - 2-3 creditos
- Header com gradiente e saudacao personalizada
- Cards com faixa lateral colorida (accent bar), icone em container gradiente
- Hover com elevacao e escala sutil
- Usar AppHeader

### 4. Dashboard e Cards (`src/components/DashboardSummary.tsx`) - 2-3 creditos
- Icones em circulos com fundo gradiente
- Bordas laterais coloridas por status (verde/ambar/vermelho)
- Numeros com destaque visual

### 5. Tabelas (`src/components/EmpresaTable.tsx`, `src/pages/Clientes.tsx`) - 3-5 creditos
- Header da tabela com fundo gradiente escuro
- Zebra striping sutil nas linhas
- Hover com transicao suave
- Container com bordas arredondadas e sombra
- Badges/StatusBadge mais refinados com estilo pill

### 6. Pagina Admin (`src/pages/Admin.tsx`) - 1-2 creditos
- Usar AppHeader
- Tabela de permissoes com header sticky e visual mais limpo
- Badges "Auto" com estilo dourado

### 7. Paginas Internas (`src/pages/Index.tsx`) - 1-2 creditos
- Usar AppHeader com breadcrumbs
- Aplicar LoadingSkeleton
- Melhorar layout de filtros

### 8. Ajustes e Refinamentos - 2-4 creditos
- Iteracoes visuais conforme feedback

## Detalhes Tecnicos

### Arquivos que NAO serao tocados:
- `src/pages/Auth.tsx` (login)
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `supabase/config.toml`
- `.env`

### Arquivos novos:
- `src/components/AppHeader.tsx`
- `src/components/LoadingSkeleton.tsx`

### Arquivos modificados:
- `src/index.css`
- `src/pages/Portal.tsx`
- `src/pages/Index.tsx`
- `src/pages/Clientes.tsx`
- `src/pages/Admin.tsx`
- `src/components/DashboardSummary.tsx`
- `src/components/EmpresaTable.tsx`
- `src/components/StatusBadge.tsx`

### Sem mudancas no banco de dados
Redesign puramente frontend.

### Ordem de implementacao
1. CSS global (base para tudo)
2. AppHeader + LoadingSkeleton (componentes reutilizaveis)
3. Portal (hub de modulos)
4. Index + DashboardSummary + EmpresaTable (controle fiscal)
5. Clientes
6. Admin

