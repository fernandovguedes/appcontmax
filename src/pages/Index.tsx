import { useState, useCallback } from "react";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAuth } from "@/hooks/useAuth";
import {
  Empresa,
  MesKey,
  MES_LABELS,
  StatusEntrega,
  StatusExtrato,
  RegimeTributario,
  REGIME_LABELS,
} from "@/types/fiscal";
import { DashboardSummary } from "@/components/DashboardSummary";
import { EmpresaTable } from "@/components/EmpresaTable";
import { EmpresaFormDialog } from "@/components/EmpresaFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, LogOut } from "lucide-react";
import logo from "@/assets/logo_contmax.png";

const Index = () => {
  const { empresas, loading, addEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas();
  const { signOut } = useAuth();
  const [mesSelecionado, setMesSelecionado] = useState<MesKey>("janeiro");
  const [search, setSearch] = useState("");
  const [regimeFilter, setRegimeFilter] = useState<RegimeTributario | "todos">("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const MES_INDEX: Record<MesKey, number> = {
    janeiro: 0,
    fevereiro: 1,
    marco: 2,
    abril: 3,
    maio: 4,
    junho: 5,
    julho: 6,
    agosto: 7,
    setembro: 8,
    outubro: 9,
    novembro: 10,
    dezembro: 11,
  };

  const filtered = empresas.filter((e) => {
    const matchesSearch = e.nome.toLowerCase().includes(search.toLowerCase()) || e.cnpj.includes(search);
    const matchesRegime = regimeFilter === "todos" || e.regimeTributario === regimeFilter;

    // Filtrar por data de cadastro no sistema
    let matchesMes = true;
    if (e.dataCadastro) {
      const cadastro = new Date(e.dataCadastro);
      const anoAtual = 2026;
      if (cadastro.getFullYear() === anoAtual) {
        matchesMes = MES_INDEX[mesSelecionado] >= cadastro.getMonth();
      } else if (cadastro.getFullYear() > anoAtual) {
        matchesMes = false;
      }
    }

    return matchesSearch && matchesRegime && matchesMes;
  });

  const handleEdit = useCallback((empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setFormOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingEmpresa(null);
    setFormOpen(true);
  }, []);

  const handleStatusChange = useCallback(
    (empresaId: string, mes: MesKey, campo: keyof Empresa["obrigacoes"]["marco"], valor: StatusEntrega) => {
      const empresa = empresas.find((e) => e.id === empresaId);
      if (!empresa) return;
      updateEmpresa(empresaId, {
        obrigacoes: {
          ...empresa.obrigacoes,
          [mes]: { ...empresa.obrigacoes[mes], [campo]: valor },
        },
      });
    },
    [empresas, updateEmpresa],
  );

  const handleExtratoChange = useCallback(
    (empresaId: string, mes: MesKey, valor: StatusExtrato) => {
      const empresa = empresas.find((e) => e.id === empresaId);
      if (!empresa) return;
      updateEmpresa(empresaId, {
        meses: {
          ...empresa.meses,
          [mes]: { ...empresa.meses[mes], extratoEnviado: valor },
        },
      });
    },
    [empresas, updateEmpresa],
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Contmax" className="h-9" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Controle Fiscal</h1>
              <p className="text-xs text-muted-foreground">Contmax · 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
              <Plus className="mr-1 h-4 w-4" /> Nova Empresa
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Summary */}
        <DashboardSummary empresas={filtered} mesSelecionado={mesSelecionado} />

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={mesSelecionado} onValueChange={(v) => setMesSelecionado(v as MesKey)}>
            <TabsList>
              {(Object.keys(MES_LABELS) as MesKey[]).map((m) => (
                <TabsTrigger key={m} value={m}>
                  {MES_LABELS[m]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Select value={regimeFilter} onValueChange={(v) => setRegimeFilter(v as RegimeTributario | "todos")}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-1 text-muted-foreground" />
                <SelectValue placeholder="Regime" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os Regimes</SelectItem>
                <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar empresa ou CNPJ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Table */}
        <EmpresaTable
          empresas={filtered}
          mesSelecionado={mesSelecionado}
          onEdit={handleEdit}
          onDelete={deleteEmpresa}
          onStatusChange={handleStatusChange}
          onExtratoChange={handleExtratoChange}
        />
      </main>

      {/* Form Dialog */}
      <EmpresaFormDialog
        key={editingEmpresa?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        empresa={editingEmpresa}
        onSave={addEmpresa}
        onUpdate={updateEmpresa}
      />
    </div>
  );
};

export default Index;
