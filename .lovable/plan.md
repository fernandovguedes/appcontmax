

# Inserir registros de BomControle e OneCode em tenant_integrations

## Problema

A tabela `tenant_integrations` so possui registros para o provider "acessorias" (2 registros, um por tenant). Os providers BomControle e OneCode existem na tabela `integration_providers` mas nao tem registros vinculados aos tenants, por isso nao aparecem na pagina.

## Dados atuais

| Provider | Provider ID | Registros em tenant_integrations |
|----------|-------------|----------------------------------|
| Acessorias | e7dd87f3-... | 2 (P&G + Contmax) |
| BomControle | d9e7029c-... | 0 |
| OneCode | 73682030-... | 0 |

## Solucao

Inserir os registros faltantes em `tenant_integrations`:

**BomControle** - usado pelo tenant Contmax (`d84e2150-0ae0-4462-880c-da8cec89e96a`):
- provider: "bomcontrole"
- provider_id: d9e7029c-3080-40db-9afb-6f03eec01c65
- base_url: (sera preenchido conforme configuracao existente)

**OneCode** - usado por ambos os tenants (P&G e Contmax):
- provider: "onecode"
- provider_id: 73682030-1ba0-4bd4-a487-a29da78aa01d

## Detalhes tecnicos

Executar INSERT na tabela `tenant_integrations` para 3 novos registros:

1. BomControle + Contmax
2. OneCode + Contmax
3. OneCode + P&G

Cada registro tera `is_enabled = true`, `provider_id` correspondente, e `config` com os campos relevantes. Nenhuma alteracao de schema ou frontend necessaria - os cards aparecerao automaticamente apos os dados serem inseridos.
