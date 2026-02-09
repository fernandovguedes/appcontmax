import { useState, useEffect, useCallback } from "react";
import { Empresa, StatusExtrato, MesesData, ObrigacoesData } from "@/types/fiscal";
import { SEED_DATA } from "@/data/seed";

const STORAGE_KEY = "controle_fiscal_empresas";

const emptyMes = () => ({
  extratoEnviado: "nao" as StatusExtrato,
  faturamentoNacional: 0,
  faturamentoNotaFiscal: 0,
  faturamentoExterior: 0,
  faturamentoTotal: 0,
  distribuicaoLucros: 0,
});

const emptyObrigacoes = () => ({
  lancamentoFiscal: "pendente" as const,
  reinf: "pendente" as const,
  dcftWeb: "pendente" as const,
  mit: "pendente" as const,
});

// Migra dados antigos para o novo formato com 12 meses
function migrateEmpresa(empresa: any): Empresa {
  const migrateMes = (mes: any) => ({
    extratoEnviado: mes?.extratoEnviado ?? (mes?.recebimentoExtrato ? "sim" : "nao") as StatusExtrato,
    faturamentoNacional: mes?.faturamentoNacional ?? 0,
    faturamentoNotaFiscal: mes?.faturamentoNotaFiscal ?? 0,
    faturamentoExterior: mes?.faturamentoExterior ?? 0,
    faturamentoTotal: mes?.faturamentoTotal ?? 0,
    distribuicaoLucros: mes?.distribuicaoLucros ?? (mes?.faturamentoTotal ?? 0) * 0.75,
  });

  const oldMeses = empresa.meses ?? {};
  const meses: MesesData = {
    janeiro: migrateMes(oldMeses.janeiro),
    fevereiro: migrateMes(oldMeses.fevereiro),
    marco: migrateMes(oldMeses.marco),
    abril: migrateMes(oldMeses.abril),
    maio: migrateMes(oldMeses.maio),
    junho: migrateMes(oldMeses.junho),
    julho: migrateMes(oldMeses.julho),
    agosto: migrateMes(oldMeses.agosto),
    setembro: migrateMes(oldMeses.setembro),
    outubro: migrateMes(oldMeses.outubro),
    novembro: migrateMes(oldMeses.novembro),
    dezembro: migrateMes(oldMeses.dezembro),
  };

  const oldObrigacoes = empresa.obrigacoes ?? {};
  const obrigacoes: ObrigacoesData = {
    marco: oldObrigacoes.marco ?? oldObrigacoes.janeiro ?? emptyObrigacoes(),
    junho: oldObrigacoes.junho ?? emptyObrigacoes(),
    setembro: oldObrigacoes.setembro ?? emptyObrigacoes(),
    dezembro: oldObrigacoes.dezembro ?? emptyObrigacoes(),
  };

  return {
    ...empresa,
    regimeTributario: empresa.regimeTributario ?? "simples_nacional",
    emiteNotaFiscal: empresa.emiteNotaFiscal ?? true,
    meses,
    obrigacoes,
  };
}

function loadEmpresas(): Empresa[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map(migrateEmpresa);
    }
  } catch {}
  return SEED_DATA;
}

function saveEmpresas(empresas: Empresa[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(empresas));
}

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>(loadEmpresas);

  useEffect(() => {
    saveEmpresas(empresas);
  }, [empresas]);

  const addEmpresa = useCallback((empresa: Omit<Empresa, "id" | "numero">) => {
    setEmpresas((prev) => {
      const maxNum = prev.reduce((max, e) => Math.max(max, e.numero), 0);
      const newEmpresa: Empresa = {
        ...empresa,
        id: crypto.randomUUID(),
        numero: maxNum + 1,
      };
      return [...prev, newEmpresa];
    });
  }, []);

  const updateEmpresa = useCallback((id: string, updates: Partial<Empresa>) => {
    setEmpresas((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  }, []);

  const deleteEmpresa = useCallback((id: string) => {
    setEmpresas((prev) => prev.filter((e) => e.id !== id));
  }, []);

  return { empresas, addEmpresa, updateEmpresa, deleteEmpresa, setEmpresas };
}
