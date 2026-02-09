import { Empresa, StatusExtrato, MesesData, ObrigacoesData } from "@/types/fiscal";

const emptyMes = () => ({
  extratoEnviado: "nao" as StatusExtrato,
  faturamentoNacional: 0,
  faturamentoNotaFiscal: 0,
  faturamentoExterior: 0,
  faturamentoTotal: 0,
  distribuicaoLucros: 0,
});

const createEmptyMeses = (): MesesData => ({
  janeiro: emptyMes(),
  fevereiro: emptyMes(),
  marco: emptyMes(),
  abril: emptyMes(),
  maio: emptyMes(),
  junho: emptyMes(),
  julho: emptyMes(),
  agosto: emptyMes(),
  setembro: emptyMes(),
  outubro: emptyMes(),
  novembro: emptyMes(),
  dezembro: emptyMes(),
});

const emptyObrigacoes = () => ({
  lancamentoFiscal: "pendente" as const,
  reinf: "pendente" as const,
  dcftWeb: "pendente" as const,
  mit: "pendente" as const,
});

const createEmptyObrigacoes = (): ObrigacoesData => ({
  marco: emptyObrigacoes(),
  junho: emptyObrigacoes(),
  setembro: emptyObrigacoes(),
  dezembro: emptyObrigacoes(),
});

export const SEED_DATA: Empresa[] = [
  {
    id: "1",
    numero: 1,
    nome: "Empresa Exemplo Alpha LTDA",
    cnpj: "12.345.678/0001-90",
    dataAbertura: "2020-03-15",
    emiteNotaFiscal: true,
    socios: [
      { nome: "João Silva", percentual: 60, cpf: "123.456.789-00" },
      { nome: "Maria Santos", percentual: 40, cpf: "987.654.321-00" },
    ],
    meses: createEmptyMeses(),
    obrigacoes: createEmptyObrigacoes(),
  },
  {
    id: "2",
    numero: 2,
    nome: "Beta Serviços e Consultoria ME",
    cnpj: "98.765.432/0001-10",
    dataAbertura: "2019-08-01",
    emiteNotaFiscal: true,
    socios: [
      { nome: "Carlos Oliveira", percentual: 100, cpf: "111.222.333-44" },
    ],
    meses: {
      ...createEmptyMeses(),
      janeiro: { extratoEnviado: "sim", faturamentoNacional: 30000, faturamentoNotaFiscal: 15000, faturamentoExterior: 0, faturamentoTotal: 45000, distribuicaoLucros: 33750 },
      fevereiro: { extratoEnviado: "sim", faturamentoNacional: 40000, faturamentoNotaFiscal: 12000, faturamentoExterior: 0, faturamentoTotal: 52000, distribuicaoLucros: 39000 },
    },
    obrigacoes: {
      marco: { lancamentoFiscal: "ok", reinf: "ok", dcftWeb: "pendente", mit: "pendente" },
      junho: emptyObrigacoes(),
      setembro: emptyObrigacoes(),
      dezembro: emptyObrigacoes(),
    },
  },
  {
    id: "3",
    numero: 3,
    nome: "Gamma Comércio Digital EIRELI",
    cnpj: "55.666.777/0001-88",
    dataAbertura: "2022-01-10",
    emiteNotaFiscal: true,
    socios: [
      { nome: "Ana Costa", percentual: 50, cpf: "555.666.777-88" },
      { nome: "Pedro Lima", percentual: 50, cpf: "999.888.777-66" },
    ],
    meses: {
      ...createEmptyMeses(),
      janeiro: { extratoEnviado: "sim", faturamentoNacional: 100000, faturamentoNotaFiscal: 20000, faturamentoExterior: 30000, faturamentoTotal: 150000, distribuicaoLucros: 112500 },
      fevereiro: { extratoEnviado: "sim", faturamentoNacional: 80000, faturamentoNotaFiscal: 18000, faturamentoExterior: 15000, faturamentoTotal: 113000, distribuicaoLucros: 84750 },
    },
    obrigacoes: {
      marco: { lancamentoFiscal: "ok", reinf: "ok", dcftWeb: "ok", mit: "ok" },
      junho: emptyObrigacoes(),
      setembro: emptyObrigacoes(),
      dezembro: emptyObrigacoes(),
    },
  },
];
