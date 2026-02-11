import { useState, useCallback, useEffect } from "react";
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
import { filtrarEmpresasVisiveis } from "@/lib/empresaUtils";
import { supabase } from "@/integrations/supabase/client";
import { DashboardSummary } from "@/components/DashboardSummary";
import { EmpresaTable } from "@/components/EmpresaTable";
import { EmpresaFormDialog } from "@/components/EmpresaFormDialog";
import { FaturamentoFormDialog } from "@/components/FaturamentoFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Filter, LogOut, Download, AlertTriangle, FileText, ArrowLeft, CalendarIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { isMesFechamentoTrimestre, getMesesTrimestre, calcularFaturamentoTrimestre, isMesDctfPosFechamento, getTrimestreFechamentoAnterior } from "@/types/fiscal";
import { exportToExcel } from "@/lib/exportExcel";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logo from "@/assets/logo_contmax.png";
import { useModulePermissions } from "@/hooks/useModulePermissions";

const MES_INDEX: Record<MesKey, number> = {
  janeiro: 0, fevereiro: 1, marco: 2,
  abril: 3, maio: 4, junho: 5,
  julho: 6, agosto: 7, setembro: 8,
  outubro: 9, novembro: 10, dezembro: 11,
};

const Index = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { canEdit } = useModulePermissions("controle-fiscal");

  // Fetch organizacao_id for this module
  const [organizacaoId, setOrganizacaoId] = useState<string | undefined>();
  useEffect(() => {
    supabase
      .from("modules")
      .select("organizacao_id")
      .eq("slug", "controle-fiscal")
      .single()
      .then(({ data }) => {
        if (data?.organizacao_id) setOrganizacaoId(data.organizacao_id);
      });
  }, []);

  const { empresas, loading, addEmpresa, updateEmpresa, deleteEmpresa, baixarEmpresa, reativarEmpresa } = useEmpresas(organizacaoId);
  const [mesSelecionado, setMesSelecionado] = useState<MesKey>("janeiro");
  const [search, setSearch] = useState("");
  const [regimeFilter, setRegimeFilter] = useState<RegimeTributario | "todos">("todos");
  const [reinfFilter, setReinfFilter] = useState(false);
  const [nfFilter, setNfFilter] = useState(false);
  const [exteriorFilter, setExteriorFilter] = useState(false);
  const [alugueisFilter, setAlugueisFilter] = useState(false);
  const [dctfSmFilter, setDctfSmFilter] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [faturamentoEmpresa, setFaturamentoEmpresa] = useState<Empresa | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; nome: string }>({ open: false, id: "", nome: "" });
  const [baixaDialog, setBaixaDialog] = useState<{ open: boolean; empresa: Empresa | null }>({ open: false, empresa: null });
  const [baixaDate, setBaixaDate] = useState<Date>(new Date());

  const isFechamento = isMesFechamentoTrimestre(mesSelecionado);
  const isDctfPos = isMesDctfPosFechamento(mesSelecionado);
  const trimestreAnterior = getTrimestreFechamentoAnterior(mesSelecionado);

  // Use centralized visibility filter, then apply module-specific filters
  const visibleEmpresas = filtrarEmpresasVisiveis(empresas, mesSelecionado);

  const filtered = visibleEmpresas.filter((e) => {
    const matchesSearch = e.nome.toLowerCase().includes(search.toLowerCase()) || e.cnpj.includes(search);
    const matchesRegime = regimeFilter === "todos" || e.regimeTributario === regimeFilter;

    let matchesReinf = true;
    if (reinfFilter && isFechamento) {
      const fatTrimestre = calcularFaturamentoTrimestre(e, mesSelecionado);
      matchesReinf = fatTrimestre > 0;
    }

    let matchesNfExterior = true;
    if (nfFilter || exteriorFilter || alugueisFilter) {
      const dados = e.meses[mesSelecionado];
      const passNf = !nfFilter || dados.faturamentoNotaFiscal > 0;
      const passExt = !exteriorFilter || dados.faturamentoExterior > 0;
      const passAlug = !alugueisFilter || (dados.faturamentoAlugueis || 0) > 0;
      matchesNfExterior = passNf && passExt && passAlug;
    }

    let matchesDctfSm = true;
    if (dctfSmFilter && isDctfPos && trimestreAnterior) {
      const fatTrimAnterior = calcularFaturamentoTrimestre(e, trimestreAnterior);
      matchesDctfSm = fatTrimAnterior > 0;
    }

    return matchesSearch && matchesRegime && matchesReinf && matchesNfExterior && matchesDctfSm;
  });

  const handleEdit = useCallback((empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setFormOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingEmpresa(null);
    setFormOpen(true);
  }, []);

  const handleFaturamento = useCallback((empresa: Empresa) => {
    setFaturamentoEmpresa(empresa);
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

  const handleMesFieldChange = useCallback(
    (empresaId: string, mes: MesKey, campo: string, valor: any) => {
      const empresa = empresas.find((e) => e.id === empresaId);
      if (!empresa) return;
      updateEmpresa(empresaId, {
        meses: {
          ...empresa.meses,
          [mes]: { ...empresa.meses[mes], [campo]: valor },
        },
      });
    },
    [empresas, updateEmpresa],
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} title="Voltar ao Portal">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={logo} alt="Contmax" className="h-9" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Controle Fiscal</h1>
              <p className="text-xs text-muted-foreground">Contmax · 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => exportToExcel(filtered, mesSelecionado)}>
              <Download className="mr-1 h-4 w-4" /> Excel
            </Button>
            {canEdit && (
              <Button onClick={handleNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="mr-1 h-4 w-4" /> Nova Empresa
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <DashboardSummary empresas={filtered} mesSelecionado={mesSelecionado} />

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
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1.5 text-sm cursor-pointer border rounded-md px-3 py-1.5 bg-card hover:bg-muted/50 transition-colors">
              <Checkbox checked={nfFilter} onCheckedChange={(v) => setNfFilter(!!v)} />
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Nota Fiscal</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer border rounded-md px-3 py-1.5 bg-card hover:bg-muted/50 transition-colors">
              <Checkbox checked={exteriorFilter} onCheckedChange={(v) => setExteriorFilter(!!v)} />
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Exterior</span>
            </label>
            <label className="flex items-center gap-1.5 text-sm cursor-pointer border rounded-md px-3 py-1.5 bg-card hover:bg-muted/50 transition-colors">
              <Checkbox checked={alugueisFilter} onCheckedChange={(v) => setAlugueisFilter(!!v)} />
              <FileText className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Aluguéis</span>
            </label>
            {isFechamento && (
              <label className="flex items-center gap-1.5 text-sm cursor-pointer border rounded-md px-3 py-1.5 bg-card hover:bg-muted/50 transition-colors">
                <Checkbox checked={reinfFilter} onCheckedChange={(v) => setReinfFilter(!!v)} />
                <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">REINF obrigatória</span>
              </label>
            )}
            {isDctfPos && (
              <label className="flex items-center gap-1.5 text-sm cursor-pointer border rounded-md px-3 py-1.5 bg-card hover:bg-muted/50 transition-colors">
                <Checkbox checked={dctfSmFilter} onCheckedChange={(v) => setDctfSmFilter(!!v)} />
                <FileText className="h-3.5 w-3.5 text-accent" />
                <span className="text-muted-foreground">DCTF S/Mov</span>
              </label>
            )}
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

        <EmpresaTable
          empresas={filtered}
          mesSelecionado={mesSelecionado}
          canEdit={canEdit}
          onEdit={handleEdit}
          onFaturamento={handleFaturamento}
          onDelete={(id) => {
            const emp = empresas.find((e) => e.id === id);
            setDeleteConfirm({ open: true, id, nome: emp?.nome ?? "" });
          }}
          onBaixar={(empresa) => {
            setBaixaDate(new Date());
            setBaixaDialog({ open: true, empresa });
          }}
          onReativar={(empresa) => {
            reativarEmpresa(empresa.id);
          }}
          onStatusChange={handleStatusChange}
          onExtratoChange={handleExtratoChange}
          onMesFieldChange={handleMesFieldChange}
        />
      </main>

      <AlertDialog open={deleteConfirm.open} onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa <strong>{deleteConfirm.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                deleteEmpresa(deleteConfirm.id);
                setDeleteConfirm({ open: false, id: "", nome: "" });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <EmpresaFormDialog
        key={editingEmpresa?.id ?? "new"}
        open={formOpen}
        onOpenChange={setFormOpen}
        empresa={editingEmpresa}
        onSave={addEmpresa}
        onUpdate={updateEmpresa}
      />

      {faturamentoEmpresa && (
        <FaturamentoFormDialog
          key={faturamentoEmpresa.id}
          open={!!faturamentoEmpresa}
          onOpenChange={(open) => { if (!open) setFaturamentoEmpresa(null); }}
          empresa={faturamentoEmpresa}
          mesSelecionado={mesSelecionado}
          onUpdate={updateEmpresa}
        />
      )}

      <Dialog open={baixaDialog.open} onOpenChange={(open) => setBaixaDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baixar Empresa</DialogTitle>
            <DialogDescription>
              Confirme a data de encerramento da empresa <strong>{baixaDialog.empresa?.nome}</strong>. Ela continuará visível até o próximo fechamento trimestral.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Data da Baixa</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !baixaDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {baixaDate ? format(baixaDate, "dd/MM/yyyy") : "Selecione a data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={baixaDate}
                  onSelect={(d) => d && setBaixaDate(d)}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaDialog({ open: false, empresa: null })}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (baixaDialog.empresa) {
                  const dateStr = format(baixaDate, "yyyy-MM-dd");
                  baixarEmpresa(baixaDialog.empresa.id, dateStr);
                  setBaixaDialog({ open: false, empresa: null });
                }
              }}
            >
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;
