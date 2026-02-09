import { useState, useEffect, useCallback } from "react";
import { Empresa, StatusExtrato, MesesData, ObrigacoesData } from "@/types/fiscal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

const createEmptyMeses = (): MesesData => ({
  janeiro: emptyMes(), fevereiro: emptyMes(), marco: emptyMes(),
  abril: emptyMes(), maio: emptyMes(), junho: emptyMes(),
  julho: emptyMes(), agosto: emptyMes(), setembro: emptyMes(),
  outubro: emptyMes(), novembro: emptyMes(), dezembro: emptyMes(),
});

const createEmptyObrigacoes = (): ObrigacoesData => ({
  marco: emptyObrigacoes(), junho: emptyObrigacoes(),
  setembro: emptyObrigacoes(), dezembro: emptyObrigacoes(),
});

// Convert DB row to Empresa
function rowToEmpresa(row: any): Empresa {
  return {
    id: row.id,
    numero: row.numero,
    nome: row.nome,
    cnpj: row.cnpj,
    dataAbertura: row.data_abertura ?? "",
    dataCadastro: row.data_cadastro,
    regimeTributario: row.regime_tributario,
    emiteNotaFiscal: row.emite_nota_fiscal,
    socios: row.socios ?? [],
    meses: row.meses ?? createEmptyMeses(),
    obrigacoes: row.obrigacoes ?? createEmptyObrigacoes(),
  };
}

// Convert Empresa to DB row fields
function empresaToRow(empresa: Partial<Empresa>) {
  const row: Record<string, any> = {};
  if (empresa.nome !== undefined) row.nome = empresa.nome;
  if (empresa.cnpj !== undefined) row.cnpj = empresa.cnpj;
  if (empresa.dataAbertura !== undefined) row.data_abertura = empresa.dataAbertura;
  if (empresa.dataCadastro !== undefined) row.data_cadastro = empresa.dataCadastro;
  if (empresa.regimeTributario !== undefined) row.regime_tributario = empresa.regimeTributario;
  if (empresa.emiteNotaFiscal !== undefined) row.emite_nota_fiscal = empresa.emiteNotaFiscal;
  if (empresa.socios !== undefined) row.socios = empresa.socios;
  if (empresa.meses !== undefined) row.meses = empresa.meses;
  if (empresa.obrigacoes !== undefined) row.obrigacoes = empresa.obrigacoes;
  return row;
}

export function useEmpresas() {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchEmpresas = useCallback(async () => {
    const { data, error } = await supabase
      .from("empresas")
      .select("*")
      .order("numero", { ascending: true });

    if (error) {
      toast({ title: "Erro ao carregar empresas", description: error.message, variant: "destructive" });
      return;
    }
    setEmpresas((data ?? []).map(rowToEmpresa));
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    fetchEmpresas();
  }, [fetchEmpresas]);

  const addEmpresa = useCallback(async (empresa: Omit<Empresa, "id" | "numero" | "dataCadastro">) => {
    const row = empresaToRow({
      ...empresa,
      dataCadastro: new Date().toISOString().split("T")[0],
    });

    const { error } = await supabase.from("empresas").insert(row as any);
    if (error) {
      toast({ title: "Erro ao adicionar empresa", description: error.message, variant: "destructive" });
      return;
    }
    fetchEmpresas();
  }, [fetchEmpresas, toast]);

  const updateEmpresa = useCallback(async (id: string, updates: Partial<Empresa>) => {
    const row = empresaToRow(updates);
    const { error } = await supabase.from("empresas").update(row).eq("id", id);
    if (error) {
      toast({ title: "Erro ao atualizar empresa", description: error.message, variant: "destructive" });
      return;
    }
    // Optimistic update
    setEmpresas((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, [toast]);

  const deleteEmpresa = useCallback(async (id: string) => {
    const { error } = await supabase.from("empresas").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao deletar empresa", description: error.message, variant: "destructive" });
      return;
    }
    setEmpresas((prev) => prev.filter((e) => e.id !== id));
  }, [toast]);

  return { empresas, loading, addEmpresa, updateEmpresa, deleteEmpresa, setEmpresas, refetch: fetchEmpresas };
}
