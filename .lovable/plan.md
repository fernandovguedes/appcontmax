

# Corrigir permissoes de edicao no modulo Clientes P&G

## Problema

A pagina `Clientes.tsx` busca a permissao `canEdit` corretamente (linha 34), porem **nunca a utiliza** para esconder os botoes de acao. Todos os usuarios, mesmo sem permissao de edicao, conseguem ver e usar os botoes de Nova Empresa, Editar, Baixar, Reativar e Excluir.

O banco de dados possui RLS que bloqueia as operacoes, mas a interface nao reflete isso -- o usuario tenta a acao, recebe um erro silencioso, ou pior, pensa que a acao foi concluida.

## Solucao

Condicionar a exibicao dos botoes de acao ao valor de `canEdit`, no arquivo `src/pages/Clientes.tsx`.

## Alteracoes

### Arquivo: `src/pages/Clientes.tsx`

1. **Botao "Nova Empresa"** (linha 98-105): Renderizar somente se `canEdit` for `true`
2. **Secao "Acoes" no painel lateral** (linhas 273-299): Renderizar os botoes Editar, Baixar/Reativar e Excluir somente se `canEdit` for `true`. Se o usuario nao tiver permissao, a secao de acoes nao aparece.

Nenhuma alteracao de banco de dados necessaria -- as politicas RLS ja protegem as operacoes. Esta correcao alinha a interface com as regras de seguranca existentes.

