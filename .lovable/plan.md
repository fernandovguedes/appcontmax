

# Atualizar Faturamento de Janeiro via Planilha

## Resumo

Atualizar os valores de faturamento do mes de janeiro para todas as empresas listadas na planilha enviada. Somente lanca valores -- nao altera, exclui ou adiciona empresas.

## Dados Identificados na Planilha

A planilha contem aproximadamente 450+ empresas com os seguintes campos para janeiro:

| Campo da Planilha | Campo no Banco (meses.janeiro) |
|---|---|
| RECEBIDO EXTRATO | extratoEnviado (sim/nao/sem_faturamento) |
| FATURAMENTO NACIONAL | faturamentoNacional |
| LANCADO QUESTOR | lancadoQuestor (ok/pendente/sem_faturamento) |
| FATURAMENTO DE NOTA | faturamentoNotaFiscal |
| FATURAMENTO EXTERIOR | faturamentoExterior |
| Ultima coluna (alugueis) | faturamentoAlugueis |

Os campos calculados (faturamentoTotal e distribuicaoLucros) serao gerados automaticamente a partir dos valores lancados.

## Abordagem Tecnica

1. **Criar uma edge function temporaria** (`import-faturamento-janeiro`) que:
   - Recebe os dados da planilha como JSON no body da requisicao
   - Para cada empresa, busca pelo CNPJ no banco
   - Atualiza somente o campo `meses.janeiro` no JSONB, preservando os demais meses
   - Calcula automaticamente `faturamentoTotal` (soma dos 4 componentes) e `distribuicaoLucros` (75% do total)
   - Retorna um relatorio com quantas empresas foram atualizadas vs nao encontradas

2. **Preparar os dados** da planilha em formato JSON, mapeando:
   - "SIM" -> "sim", "NÃO" / "NÃO - NOTAS" -> "nao", "SEM FATURAMENTO" -> "sem_faturamento"
   - "OK" -> "ok", "PENDENTE" -> "pendente", "SEM FATURAMENTO" -> "sem_faturamento"
   - Valores monetarios (ex: "R$ 84,717.62") -> numeros (84717.62)
   - Campos vazios ou "-" -> 0

3. **Executar a importacao** chamando a edge function com os dados processados

4. **Remover a edge function** apos a importacao ser concluida com sucesso

## Campos Atualizados por Empresa

Para cada empresa identificada pelo CNPJ:

```text
meses.janeiro = {
  extratoEnviado: "sim" | "nao" | "sem_faturamento",
  faturamentoNacional: numero,
  faturamentoNotaFiscal: numero,
  faturamentoExterior: numero,
  faturamentoAlugueis: numero,
  faturamentoTotal: soma dos 4 acima,
  distribuicaoLucros: total * 0.75,
  lancadoQuestor: "ok" | "pendente" | "sem_faturamento"
}
```

## Seguranca

- A edge function usara o service role key para bypassar RLS (operacao administrativa)
- Somente atualiza empresas que ja existem no banco (match por CNPJ)
- Preserva todos os dados dos outros meses (fevereiro a dezembro)
- A edge function sera removida apos o uso

## Arquivo Modificado

- `supabase/functions/import-faturamento-janeiro/index.ts` (criado e depois removido)

