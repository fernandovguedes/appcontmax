import { useState, useCallback, useEffect } from "react";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useModulePermissions } from "@/hooks/useModulePermissions";
import { Empresa, RegimeTributario, REGIME_LABELS } from "@/types/fiscal";
import { supabase } from "@/integrations/supabase/client";
import { EmpresaFormDialog } from "@/components/EmpresaFormDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, Filter, ArrowLeft, Pencil, Trash2, Archive, RotateCcw, FileText, FileX, CalendarIcon } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import logo from "@/assets/logo_contmax.png";

export default function Clientes() {
  const navigate = useNavigate();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const { canEdit } = useModulePermissions(`clientes-${orgSlug}`);

  const [orgInfo, setOrgInfo] = useState<{ id: string; nome: string } | null>(null);
  useEffect(() => {
    if (!orgSlug) return;
    supabase
      .from("organizacoes")
      .select("id, nome")
      .eq("slug", orgSlug)
      .single()
      .then(({ data }) => {
        if (data) setOrgInfo(data);
      });
  }, [orgSlug]);

  const { empresas, loading, addEmpresa, updateEmpresa, deleteEmpresa, baixarEmpresa, reativarEmpresa } = useEmpresas(orgInfo?.id);

  const [search, setSearch] = useState("");
  const [regimeFilter, setRegimeFilter] = useState<RegimeTributario | "todos">("todos");
  const [formOpen, setFormOpen] = useState(false);
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string; nome: string }>({ open: false, id: "", nome: "" });
  const [baixaDialog, setBaixaDialog] = useState<{ open: boolean; empresa: Empresa | null }>({ open: false, empresa: null });
  const [baixaDate, setBaixaDate] = useState<Date>(new Date());

  const filtered = empresas.filter((e) => {
    const matchesSearch = e.nome.toLowerCase().includes(search.toLowerCase()) || e.cnpj.includes(search);
    const matchesRegime = regimeFilter === "todos" || e.regimeTributario === regimeFilter;
    return matchesSearch && matchesRegime;
  });

  const handleEdit = useCallback((empresa: Empresa) => {
    setEditingEmpresa(empresa);
    setFormOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditingEmpresa(null);
    setFormOpen(true);
  }, []);

  if (loading || !orgInfo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

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
              <h1 className="text-lg font-bold leading-tight">Clientes {orgInfo.nome}</h1>
              <p className="text-xs text-muted-foreground">Gerenciamento da base de clientes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button onClick={handleNew} className="bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="mr-1 h-4 w-4" /> Nova Empresa
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <div className="flex items-center gap-2 flex-wrap">
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

        <div className="rounded-lg border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-primary/5 hover:bg-primary/5">
                <TableHead className="w-12">Nº</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead className="w-20 text-center">Regime</TableHead>
                <TableHead className="w-10 text-center">NF</TableHead>
                <TableHead>Início Competência</TableHead>
                {canEdit && <TableHead className="w-24 text-center">Ações</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={canEdit ? 7 : 6} className="h-24 text-center text-muted-foreground">
                    Nenhuma empresa encontrada.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((empresa) => (
                <TableRow key={empresa.id}>
                  <TableCell className="font-medium">{empresa.numero}</TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className={empresa.dataBaixa ? "text-destructive" : ""}>{empresa.nome}</span>
                      {empresa.dataBaixa && (
                        <Badge variant="destructive" className="text-[9px] px-1.5 whitespace-nowrap">
                          BAIXADA EM {format(new Date(empresa.dataBaixa), "dd/MM/yyyy")}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{empresa.cnpj}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={empresa.regimeTributario === "simples_nacional" ? "secondary" : "outline"} className="text-[10px] px-1.5">
                      {empresa.regimeTributario === "simples_nacional" ? "SN" : "LP"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {empresa.emiteNotaFiscal ? (
                            <FileText className="h-4 w-4 text-success mx-auto" />
                          ) : (
                            <FileX className="h-4 w-4 text-muted-foreground mx-auto" />
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {empresa.emiteNotaFiscal ? "Emite NF" : "Não emite NF"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="text-sm">{empresa.inicioCompetencia || "—"}</TableCell>
                  {canEdit && (
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(empresa)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        {empresa.dataBaixa ? (
                          <Button variant="ghost" size="icon" onClick={() => reativarEmpresa(empresa.id)} title="Reativar empresa" className="text-success hover:text-success">
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" onClick={() => { setBaixaDate(new Date()); setBaixaDialog({ open: true, empresa }); }} title="Baixar empresa" className="text-warning hover:text-warning">
                            <Archive className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => setDeleteConfirm({ open: true, id: empresa.id, nome: empresa.nome })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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
              onClick={() => { deleteEmpresa(deleteConfirm.id); setDeleteConfirm({ open: false, id: "", nome: "" }); }}
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

      <Dialog open={baixaDialog.open} onOpenChange={(open) => setBaixaDialog((prev) => ({ ...prev, open }))}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Baixar Empresa</DialogTitle>
            <DialogDescription>
              Confirme a data de encerramento da empresa <strong>{baixaDialog.empresa?.nome}</strong>.
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
                <Calendar mode="single" selected={baixaDate} onSelect={(d) => d && setBaixaDate(d)} initialFocus className="p-3 pointer-events-auto" locale={ptBR} />
              </PopoverContent>
            </Popover>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBaixaDialog({ open: false, empresa: null })}>Cancelar</Button>
            <Button variant="destructive" onClick={() => {
              if (baixaDialog.empresa) {
                baixarEmpresa(baixaDialog.empresa.id, format(baixaDate, "yyyy-MM-dd"));
                setBaixaDialog({ open: false, empresa: null });
              }
            }}>
              Confirmar Baixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
