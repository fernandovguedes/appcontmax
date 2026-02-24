

## Atualizar tokens do Acessorias

Atualizar os dois segredos de backend com os valores fornecidos:

| Segredo | Novo valor |
|---|---|
| `ACESSORIAS_TOKEN_CONTMAX` | `c0c7dbf5c8256db5cd3a5da7b4d42763` |
| `ACESSORIAS_TOKEN_PG` | `d00ac97b1d99ebfbb32749eb8068e2e4` |

Apos a atualizacao, os tokens serao diferentes entre si, resolvendo o problema de ambos os tenants retornarem os mesmos 1860 registros.

### Proximo passo recomendado

Depois de atualizar, rodar uma sincronizacao manual em cada tenant para confirmar que os numeros de empresas lidas sao diferentes.

