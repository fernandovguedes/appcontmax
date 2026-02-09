import { useState, useEffect, useCallback } from "react";
import { Empresa } from "@/types/fiscal";
import { SEED_DATA } from "@/data/seed";

const STORAGE_KEY = "controle_fiscal_empresas";

function loadEmpresas(): Empresa[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
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
