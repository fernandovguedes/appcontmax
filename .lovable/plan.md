

# Campo "Mês Inicial" no Modulo Honorarios

**Custo estimado: ~2 creditos**

## Resumo

Adicionar um campo "Mes Inicial" ao cadastro de empresas no modulo Honorarios. Ao selecionar um mes (ex: Marco), a empresa so aparecera na tabela a partir daquele mes. Meses anteriores nao mostrarao a empresa.

## Alteracoes

### 1. Migracao no banco de dados

Adicionar coluna `mes_inicial` na tabela `honorarios_empresas`:

```sql
ALTER TABLE honorarios_empresas
ADD COLUMN mes_inicial text NOT NULL DEFAULT 'janeiro';
```

O valor padrao `'janeiro'` garante que empresas ja cadastradas continuem aparecendo em todos os meses.

### 2. `src/hooks/useHonorarios.ts`

- Adicionar `mes_inicial` ao tipo `HonorarioEmpresa`
- Mapear o campo no fetch
- Incluir `mes_inicial` nos parametros de `addEmpresa` e `updateEmpresa`
- Adicionar logica de filtragem: no retorno, expor a lista filtrada por mes ou deixar a filtragem para a pagina

### 3. `src/components/HonorariosEmpresaDialog.tsx`

- Adicionar um Select com os 12 meses para o campo "Mes Inicial"
- Estado `mesInicial` com default `'janeiro'`
- Incluir no payload de save/update
- Visivel tanto no cadastro quanto na edicao

### 4. `src/pages/Honorarios.tsx`

- Filtrar a lista de empresas pelo `mes_inicial` antes de renderizar na tabela
- Usar o indice numerico dos meses para comparar: empresa so aparece se `MES_INDEX[mesSelecionado] >= MES_INDEX[empresa.mes_inicial]`
- A aba "Fechamento" mostra todas as empresas (sem filtro de mes)

## Detalhes Tecnicos

- O campo usa as mesmas keys de `MesKey` ja existentes no hook (`janeiro`, `fevereiro`, etc.)
- A filtragem e feita no frontend (sem query adicional ao banco)
- Empresas existentes terao `mes_inicial = 'janeiro'` por default, mantendo comportamento atual
- O Select no dialog usa os mesmos `MES_LABELS` ja definidos no hook

