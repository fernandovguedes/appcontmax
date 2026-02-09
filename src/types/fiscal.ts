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

export type MesKey = 
  | "janeiro" | "fevereiro" | "marco" 
  | "abril" | "maio" | "junho" 
  | "julho" | "agosto" | "setembro" 
  | "outubro" | "novembro" | "dezembro";

export const MES_LABELS: Record<MesKey, string> = {
  janeiro: "Janeiro",
  fevereiro: "Fevereiro",
  marco: "Março",
  abril: "Abril",
  maio: "Maio",
  junho: "Junho",
  julho: "Julho",
  agosto: "Agosto",
  setembro: "Setembro",
  outubro: "Outubro",
  novembro: "Novembro",
  dezembro: "Dezembro",
};

// Meses que fecham trimestre - onde as obrigações são exigidas
export const MESES_FECHAMENTO_TRIMESTRE: MesKey[] = ["marco", "junho", "setembro", "dezembro"];

export function isMesFechamentoTrimestre(mes: MesKey): boolean {
  return MESES_FECHAMENTO_TRIMESTRE.includes(mes);
}

// Retorna os meses do trimestre para um mês de fechamento
export function getMesesTrimestre(mesFechamento: MesKey): MesKey[] {
  switch (mesFechamento) {
    case "marco":
      return ["janeiro", "fevereiro", "marco"];
    case "junho":
      return ["abril", "maio", "junho"];
    case "setembro":
      return ["julho", "agosto", "setembro"];
    case "dezembro":
      return ["outubro", "novembro", "dezembro"];
    default:
      return [mesFechamento];
  }
}

export interface MesesData {
  janeiro: DadosMensais;
  fevereiro: DadosMensais;
  marco: DadosMensais;
  abril: DadosMensais;
  maio: DadosMensais;
  junho: DadosMensais;
  julho: DadosMensais;
  agosto: DadosMensais;
  setembro: DadosMensais;
  outubro: DadosMensais;
  novembro: DadosMensais;
  dezembro: DadosMensais;
}

export interface ObrigacoesData {
  marco: ControleObrigacoes;
  junho: ControleObrigacoes;
  setembro: ControleObrigacoes;
  dezembro: ControleObrigacoes;
}

export interface Empresa {
  id: string;
  numero: number;
  nome: string;
  cnpj: string;
  dataAbertura: string;
  emiteNotaFiscal: boolean;
  socios: Socio[];
  meses: MesesData;
  obrigacoes: ObrigacoesData;
}

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

// Calcula faturamento acumulado do trimestre
export function calcularFaturamentoTrimestre(empresa: Empresa, mesFechamento: MesKey): number {
  const meses = getMesesTrimestre(mesFechamento);
  return meses.reduce((total, mes) => total + empresa.meses[mes].faturamentoTotal, 0);
}
