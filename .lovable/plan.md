

# Reorganizar Layout dos Modulos no Portal

## O que muda

O portal sera dividido em duas secoes visuais:

### Modulos do Sistema (maiores, formato grid)
- **Controle Fiscal Empresas P&G** e futuros modulos operacionais
- Cards grandes em grid (2 colunas no desktop), com icone maior, descricao visivel e mais destaque visual

### Modulos de Clientes (menores, empilhados verticalmente)
- **Clientes P&G** e **Clientes Contmax**
- Cards compactos em lista vertical (largura total, altura reduzida), com icone menor e layout horizontal

## Detalhes Tecnicos

### Arquivo modificado: `src/pages/Portal.tsx`

- Separar os modulos em dois grupos baseado no slug (slugs que comecam com `clientes-` vao para a secao de clientes, o restante para modulos do sistema)
- Secao "Modulos do Sistema" com titulo e grid `sm:grid-cols-2` com cards maiores (icone maior, padding generoso)
- Secao "Base de Clientes" abaixo, com titulo e cards em coluna unica (`flex flex-col gap-3`), estilo compacto com layout horizontal (icone + nome + descricao na mesma linha)
- Manter animacoes stagger e accent-bar existentes

### Estimativa: 1 credito
