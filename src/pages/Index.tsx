import { useState, useCallback } from "react";
import { useEmpresas } from "@/hooks/useEmpresas";
import { Empresa, MesKey, MES_LABELS, StatusEntrega, StatusExtrato, MESES_FECHAMENTO_TRIMESTRE } from "@/types/fiscal";
import { DashboardSummary } from "@/components/DashboardSummary";
import { EmpresaTable } from "@/components/EmpresaTable";
import { EmpresaFormDialog } from "@/components/EmpresaFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search } from "lucide-react";

const Index = () => {
  const { empresas, addEmpresa, updateEmpresa, deleteEmpresa } = useEmpresas();
  const [mesSelecionado, setMesSelecionado] = useState<MesKey>("janeiro");
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);

  const filtered = empresas.filter(
    (e) =>
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.cnpj.includes(search)
  );

  const handleEdit = useCallback((empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setFormOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingEmpresa(null);
    setFormOpen(true);
  }, []);

  const handleStatusChange = useCallback(
    (empresaId: string, mesTrimestre: typeof MESES_FECHAMENTO_TRIMESTRE[number], campo: keyof Empresa["obrigacoes"]["marco"], valor: StatusEntrega) => {
      const empresa = empresas.find((e) => e.id === empresaId);
      if (!empresa) return;
      updateEmpresa(empresaId, {
        obrigacoes: {
          ...empresa.obrigacoes,
          [mesTrimestre]: { ...empresa.obrigacoes[mesTrimestre], [campo]: valor },
        },
      });
    },
    [empresas, updateEmpresa]
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
    [empresas, updateEmpresa]
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-sm">
              CF
            </div>
            <div>
              <h1 className="text-lg font-bold leading-tight">Controle Fiscal</h1>
              <p className="text-xs text-muted-foreground">Simples Nacional · 2026</p>
            </div>
          </div>
          <Button onClick={handleNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <Plus className="mr-1 h-4 w-4" /> Nova Empresa
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        {/* Summary */}
        <DashboardSummary empresas={empresas} mesSelecionado={mesSelecionado} />

        {/* Controls */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Tabs value={mesSelecionado} onValueChange={(v) => setMesSelecionado(v as MesKey)}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {(Object.keys(MES_LABELS) as MesKey[]).map((m) => (
                <TabsTrigger key={m} value={m} className="text-xs px-2 py-1">{MES_LABELS[m].substring(0, 3)}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
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
