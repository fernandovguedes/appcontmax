

## Sticky Columns na Tabela do Controle Fiscal

### Problema
Nos meses de fechamento trimestral, a tabela ganha ate 5 colunas extras, forçando o usuario a descer ate o fim da tabela para encontrar a barra de rolagem horizontal. Isso prejudica a experiencia de uso.

### Solucao
Fixar as colunas de identificacao (N e Empresa) a esquerda e a coluna de Acoes a direita usando `position: sticky`. Assim, ao rolar horizontalmente, o usuario sempre ve qual empresa esta olhando e tem acesso aos botoes de acao.

### Arquivo alterado
Somente `src/components/EmpresaTable.tsx`.

### Detalhes tecnicos

**1. Coluna N (indice) - sticky left-0**
- Header: `sticky left-0 z-30 bg-primary/5`
- Body: `sticky left-0 z-20 bg-card` (ou `bg-destructive/5` em linhas com alerta)

**2. Coluna Empresa - sticky left-12 (48px)**
- Header: `sticky left-12 z-30 bg-primary/5` + sombra direita sutil via pseudo-elemento `after:`
- Body: `sticky left-12 z-20 bg-card` (ou `bg-destructive/5` em linhas com alerta) + mesma sombra

**3. Coluna Acoes - sticky right-0**
- Header: `sticky right-0 z-30 bg-primary/5` + sombra esquerda sutil
- Body: `sticky right-0 z-20 bg-card` (ou `bg-destructive/5` em linhas com alerta) + mesma sombra

**4. Backgrounds opacos**
Todas as celulas sticky precisam de background opaco (nao transparente) para que o conteudo das colunas intermediarias nao fique visivel por baixo durante a rolagem. Linhas com alerta usam `bg-red-50` (ou equivalente opaco) em vez de `bg-destructive/5` (que e semi-transparente).

**5. Hierarquia de z-index**
- `z-30`: celulas sticky do header (ficam acima de tudo)
- `z-20`: celulas sticky do body

Nenhum outro arquivo precisa ser alterado. A mudanca e puramente visual via classes Tailwind.
