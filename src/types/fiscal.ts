export interface Socio {
  nome: string;
  percentual: number;
  cpf: string;
}

export type StatusEntrega = "ok" | "pendente" | "nao_aplicavel";

export interface DadosMensais {
  recebimentoExtrato: boolean;
  faturamentoNacional: number;
  faturamentoExterior: number;
  notasEmitidas: number;
  faturamentoTotal: number;
  distribuicaoLucros: number;
}

export interface ControleObrigacoes {
  lancamentoFiscal: StatusEntrega;
  reinf: StatusEntrega;
  dcftWeb: StatusEntrega;
  mit: StatusEntrega;
}

export interface Empresa {
  id: string;
  numero: number;
  nome: string;
  cnpj: string;
  dataAbertura: string;
  socios: Socio[];
  meses: {
    janeiro: DadosMensais;
    fevereiro: DadosMensais;
    marco: DadosMensais;
  };
  obrigacoes: {
    janeiro: ControleObrigacoes;
    fevereiro: ControleObrigacoes;
    marco: ControleObrigacoes;
  };
}

export type MesKey = "janeiro" | "fevereiro" | "marco";

export const MES_LABELS: Record<MesKey, string> = {
  janeiro: "Janeiro",
  fevereiro: "Fevereiro",
  marco: "Março",
};
