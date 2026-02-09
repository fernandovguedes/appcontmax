export interface Socio {
  nome: string;
  percentual: number;
  cpf: string;
  distribuicaoLucros?: number; // calculado: 75% do faturamento total * percentual do sócio
}

export type StatusEntrega = "ok" | "pendente" | "nao_aplicavel";
export type StatusExtrato = "sim" | "nao" | "sem_faturamento";

export interface DadosMensais {
  extratoEnviado: StatusExtrato;
  faturamentoNacional: number;
  faturamentoNotaFiscal: number;
  faturamentoExterior: number;
  faturamentoTotal: number; // calculado: nacional + NF + exterior
  distribuicaoLucros: number; // calculado: 75% do faturamento total
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
  emiteNotaFiscal: boolean;
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

// Calcula faturamento total e distribuição de lucros
export function calcularFaturamento(dados: Omit<DadosMensais, "faturamentoTotal" | "distribuicaoLucros">): DadosMensais {
  const faturamentoTotal = dados.faturamentoNacional + dados.faturamentoNotaFiscal + dados.faturamentoExterior;
  const distribuicaoLucros = faturamentoTotal * 0.75;
  return { ...dados, faturamentoTotal, distribuicaoLucros };
}

// Calcula distribuição por sócio
export function calcularDistribuicaoSocios(socios: Socio[], distribuicaoTotal: number): Socio[] {
  return socios.map(s => ({
    ...s,
    distribuicaoLucros: (distribuicaoTotal * s.percentual) / 100
  }));
}
