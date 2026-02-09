import { Empresa } from "@/types/fiscal";

const emptyMes = () => ({
  recebimentoExtrato: false,
  faturamentoNacional: 0,
  faturamentoExterior: 0,
  notasEmitidas: 0,
  faturamentoTotal: 0,
  distribuicaoLucros: 0,
});

const emptyObrigacoes = () => ({
  lancamentoFiscal: "pendente" as const,
  reinf: "pendente" as const,
  dcftWeb: "pendente" as const,
  mit: "pendente" as const,
});

export const SEED_DATA: Empresa[] = [
  {
    id: "1",
    numero: 1,
    nome: "Empresa Exemplo Alpha LTDA",
    cnpj: "12.345.678/0001-90",
    dataAbertura: "2020-03-15",
    socios: [
      { nome: "João Silva", percentual: 60, cpf: "123.456.789-00" },
      { nome: "Maria Santos", percentual: 40, cpf: "987.654.321-00" },
    ],
    meses: { janeiro: emptyMes(), fevereiro: emptyMes(), marco: emptyMes() },
    obrigacoes: { janeiro: emptyObrigacoes(), fevereiro: emptyObrigacoes(), marco: emptyObrigacoes() },
  },
  {
    id: "2",
    numero: 2,
    nome: "Beta Serviços e Consultoria ME",
    cnpj: "98.765.432/0001-10",
    dataAbertura: "2019-08-01",
    socios: [
      { nome: "Carlos Oliveira", percentual: 100, cpf: "111.222.333-44" },
    ],
    meses: {
      janeiro: { ...emptyMes(), faturamentoNacional: 45000, notasEmitidas: 12, faturamentoTotal: 45000 },
      fevereiro: { ...emptyMes(), recebimentoExtrato: true, faturamentoNacional: 52000, notasEmitidas: 15, faturamentoTotal: 52000 },
      marco: emptyMes(),
    },
    obrigacoes: {
      janeiro: { lancamentoFiscal: "ok", reinf: "ok", dcftWeb: "ok", mit: "pendente" },
      fevereiro: { lancamentoFiscal: "ok", reinf: "ok", dcftWeb: "pendente", mit: "pendente" },
      marco: emptyObrigacoes(),
    },
  },
  {
    id: "3",
    numero: 3,
    nome: "Gamma Comércio Digital EIRELI",
    cnpj: "55.666.777/0001-88",
    dataAbertura: "2022-01-10",
    socios: [
      { nome: "Ana Costa", percentual: 50, cpf: "555.666.777-88" },
      { nome: "Pedro Lima", percentual: 50, cpf: "999.888.777-66" },
    ],
    meses: {
      janeiro: { recebimentoExtrato: true, faturamentoNacional: 120000, faturamentoExterior: 30000, notasEmitidas: 45, faturamentoTotal: 150000, distribuicaoLucros: 20000 },
      fevereiro: { recebimentoExtrato: true, faturamentoNacional: 98000, faturamentoExterior: 15000, notasEmitidas: 38, faturamentoTotal: 113000, distribuicaoLucros: 15000 },
      marco: emptyMes(),
    },
    obrigacoes: {
      janeiro: { lancamentoFiscal: "ok", reinf: "ok", dcftWeb: "ok", mit: "ok" },
      fevereiro: { lancamentoFiscal: "ok", reinf: "ok", dcftWeb: "ok", mit: "ok" },
      marco: emptyObrigacoes(),
    },
  },
];
