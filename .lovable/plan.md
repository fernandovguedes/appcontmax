

# Correção do Travamento na Pagina de Clientes

## Problema Identificado

A pagina `/clientes/pg` travou por dois motivos:

1. **Jobs orfaos**: 2 sincronizacoes ficaram presas com status "running" sem nunca finalizar, ocupando recursos de polling
2. **Carga excessiva**: 519 empresas P&G sao carregadas de uma vez, cada uma com JSONs pesados (12 meses + obrigacoes + socios), gerando processamento intensivo no navegador

## Plano de Correcao

### 1. Limpar jobs orfaos no banco de dados
- Executar UPDATE nos 2 jobs presos (IDs: `92ada077-5df5-494a-9e0e-cb2e1722fab5` e `d33b82d1-58c1-4d71-bf2c-e97fb5e0d150`) marcando-os como `timeout`

### 2. Otimizar carregamento de empresas (useEmpresas.ts)
- Na query de listagem para a pagina Clientes, selecionar apenas as colunas necessarias para a tabela (`id, numero, nome, cnpj, regime_tributario, emite_nota_fiscal, data_abertura, data_baixa, whatsapp, socios`) em vez de `SELECT *` que traz `meses`, `obrigacoes`, `raw_payload` (campos JSON pesados)
- Carregar os dados completos apenas quando o usuario clicar em uma empresa especifica (Sheet de detalhes)

### 3. Adicionar paginacao na tabela de clientes (Clientes.tsx)
- Implementar paginacao simples com 50 empresas por pagina
- Adicionar controles de navegacao (anterior/proximo) no rodape da tabela
- Manter filtro e busca funcionando sobre os dados ja carregados

## Detalhes Tecnicos

### Mudancas nos arquivos:

**`src/hooks/useEmpresas.ts`**
- Alterar `select("*")` para `select("id, numero, nome, cnpj, regime_tributario, emite_nota_fiscal, data_abertura, data_baixa, data_cadastro, whatsapp, socios, organizacao_id")`
- Remover processamento de `meses` e `obrigacoes` na funcao `rowToEmpresa` quando esses campos nao estiverem presentes (usar defaults apenas quando necessario)

**`src/pages/Clientes.tsx`**
- Adicionar estado de paginacao (`page`, `pageSize = 50`)
- Fatiar o array `filtered` para exibir apenas a pagina atual
- Adicionar controles de paginacao no rodape da tabela

**Migracao SQL**
- UPDATE nos 2 jobs orfaos para status `timeout`
