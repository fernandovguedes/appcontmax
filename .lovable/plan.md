
# Mover "Integrações" para o header do Portal

## O que muda

O módulo "Integrações" não é operacional, então faz mais sentido ele ficar como botão no header, ao lado do botão "Admin", em vez de aparecer como card na grid de módulos.

## Alterações

### 1. Portal.tsx - Adicionar botão "Integrações" no header

Modificar a prop `actions` do `AppHeader` para incluir um botão "Integrações" ao lado do botão "Admin". Ambos ficam visíveis para admins.

### 2. Portal.tsx - Filtrar o módulo "integracoes" dos cards

Adicionar um filtro para excluir o slug `integracoes` da listagem de módulos do sistema, evitando duplicidade (botão no header + card na grid).

## Resultado visual

O header ficará com dois botões para admins: **Integrações** (ícone de engrenagem/link) e **Admin**, posicionados lado a lado antes do avatar do usuário.
