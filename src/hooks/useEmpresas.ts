import { useState, useEffect, useCallback } from "react";
import { Empresa, StatusExtrato } from "@/types/fiscal";
import { SEED_DATA } from "@/data/seed";

const STORAGE_KEY = "controle_fiscal_empresas";

// Migra dados antigos para o novo formato
function migrateEmpresa(empresa: any): Empresa {
  const migrateMes = (mes: any) => ({
    extratoEnviado: mes.extratoEnviado ?? (mes.recebimentoExtrato ? "sim" : "nao") as StatusExtrato,
    faturamentoNacional: mes.faturamentoNacional ?? 0,
    faturamentoNotaFiscal: mes.faturamentoNotaFiscal ?? 0,
    faturamentoExterior: mes.faturamentoExterior ?? 0,
    faturamentoTotal: mes.faturamentoTotal ?? 0,
    distribuicaoLucros: mes.distribuicaoLucros ?? (mes.faturamentoTotal ?? 0) * 0.75,
  });

  return {
    ...empresa,
    emiteNotaFiscal: empresa.emiteNotaFiscal ?? true,
    meses: {
      janeiro: migrateMes(empresa.meses?.janeiro ?? {}),
      fevereiro: migrateMes(empresa.meses?.fevereiro ?? {}),
      marco: migrateMes(empresa.meses?.marco ?? {}),
    },
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
