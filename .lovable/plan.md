

## Criar Modulo "Clientes Contmax"

Modulo identico ao "Clientes P&G", importando a base de ~290 empresas da planilha enviada, com suporte aos novos regimes tributarios.

---

### 1. Expandir tipos de Regime Tributario

**Arquivo:** `src/types/fiscal.ts`

Atualizar o tipo `RegimeTributario` para incluir os novos regimes encontrados na planilha:

- `lucro_real`
- `mei`
- `imunidade_tributaria`
- `pessoa_fisica`

Atualizar tambem o `REGIME_LABELS` com os labels correspondentes.

---

### 2. Atualizar formulario e filtros com novos regimes

**Arquivos:**
- `src/components/EmpresaFormDialog.tsx` -- adicionar as novas opcoes no Select de regime
- `src/pages/Clientes.tsx` -- adicionar os novos regimes no filtro e ajustar o Badge na tabela (siglas: LR, MEI, IT, PF)

---

### 3. Criar modulo no banco de dados

Inserir registro na tabela `modules`:
- nome: "Clientes Contmax"
- slug: "clientes-contmax"
- icone: "Users"
- organizacao_id: `d84e2150-0ae0-4462-880c-da8cec89e96a` (Contmax)
- ordem: 2

---

### 4. Atualizar politicas RLS

Atualizar as 3 politicas RLS da tabela `empresas` (INSERT, UPDATE, DELETE) para incluir o slug `clientes-contmax` nas verificacoes de permissao, adicionando:

```sql
OR has_module_edit_access(auth.uid(), 'clientes-contmax')
```

---

### 5. Importar base de clientes Contmax

Criar script de dados (`src/data/seed-contmax.ts`) com os ~290 registros da planilha, mapeando:

| Planilha | Campo BD |
|---|---|
| N (ou N/A -> 0) | numero |
| EMPRESA | nome |
| CNPJ | cnpj |
| REGIME | regime_tributario (mapeado para slug) |
| DATA DE ABERTURA | data_abertura |
| BAIXA | data_baixa |
| SOCIOS + % + CPF | socios (JSONB) |

Mapeamento de regimes:
- SIMPLES NACIONAL -> `simples_nacional`
- LUCRO PRESUMIDO -> `lucro_presumido`
- LUCRO REAL -> `lucro_real`
- MEI - Micro Empreendedor Individual -> `mei`
- IMUNIDADE TRIBUTARIA -> `imunidade_tributaria`
- Pessoa fisica -> `pessoa_fisica`

Usar `organizacao_id = d84e2150-0ae0-4462-880c-da8cec89e96a`.

A importacao sera feita via INSERT direto no banco (ferramenta de insercao de dados), nao via seed automatico.

---

### 6. Rota ja configurada

A rota `/clientes/contmax` e o mapeamento no `Portal.tsx` (`MODULE_ROUTES["clientes-contmax"] = "/clientes/contmax"`) ja existem. A pagina `Clientes.tsx` ja carrega empresas pela organizacao via `orgSlug`, entao o modulo funcionara automaticamente.

---

### Resumo de arquivos alterados

- `src/types/fiscal.ts` -- novos regimes
- `src/components/EmpresaFormDialog.tsx` -- opcoes de regime no formulario
- `src/pages/Clientes.tsx` -- filtro e badges para novos regimes
- Banco de dados: novo modulo + RLS + ~290 empresas inseridas

