import { useState } from "react";
import { Empresa, MesKey, MES_LABELS, Socio, StatusExtrato, MesesData, ObrigacoesData, calcularFaturamento, RegimeTributario, REGIME_LABELS } from "@/types/fiscal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2 } from "lucide-react";

interface EmpresaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: Empresa | null;
  onSave: (data: Omit<Empresa, "id" | "numero">) => void;
  onUpdate: (id: string, data: Partial<Empresa>) => void;
}

const emptyMes = () => ({
  extratoEnviado: "nao" as StatusExtrato,
  faturamentoNacional: 0,
  faturamentoNotaFiscal: 0,
  faturamentoExterior: 0,
  faturamentoTotal: 0,
  distribuicaoLucros: 0,
});

const createEmptyMeses = (): MesesData => ({
  janeiro: emptyMes(),
  fevereiro: emptyMes(),
  marco: emptyMes(),
  abril: emptyMes(),
  maio: emptyMes(),
  junho: emptyMes(),
  julho: emptyMes(),
  agosto: emptyMes(),
  setembro: emptyMes(),
  outubro: emptyMes(),
  novembro: emptyMes(),
  dezembro: emptyMes(),
});

const emptyObrigacoes = () => ({
  lancamentoFiscal: "pendente" as const,
  reinf: "pendente" as const,
  dcftWeb: "pendente" as const,
  mit: "pendente" as const,
});

const createEmptyObrigacoes = (): ObrigacoesData => ({
  marco: emptyObrigacoes(),
  junho: emptyObrigacoes(),
  setembro: emptyObrigacoes(),
  dezembro: emptyObrigacoes(),
});

export function EmpresaFormDialog({ open, onOpenChange, empresa, onSave, onUpdate }: EmpresaFormDialogProps) {
  const isEditing = !!empresa;

  const [nome, setNome] = useState(empresa?.nome ?? "");
  const [cnpj, setCnpj] = useState(empresa?.cnpj ?? "");
  const [dataAbertura, setDataAbertura] = useState(empresa?.dataAbertura ?? "");
  const [emiteNotaFiscal, setEmiteNotaFiscal] = useState(empresa?.emiteNotaFiscal ?? true);
  const [regimeTributario, setRegimeTributario] = useState<RegimeTributario>(empresa?.regimeTributario ?? "simples_nacional");
  const [socios, setSocios] = useState<Socio[]>(empresa?.socios ?? [{ nome: "", percentual: 100, cpf: "" }]);
  const [meses, setMeses] = useState<MesesData>(empresa?.meses ?? createEmptyMeses());

  const handleSave = () => {
    const data = {
      nome,
      cnpj,
      dataAbertura,
      regimeTributario,
      emiteNotaFiscal,
      socios,
      meses,
      obrigacoes: empresa?.obrigacoes ?? createEmptyObrigacoes(),
    };
    if (isEditing && empresa) {
      onUpdate(empresa.id, data);
    } else {
      onSave(data);
    }
    onOpenChange(false);
  };

  const updateMes = (mes: MesKey, field: string, value: number | StatusExtrato) => {
    setMeses((prev) => {
      const current = prev[mes];
      const updated = { ...current, [field]: value };
      
      // Recalcular totais se for campo de faturamento
      if (typeof value === "number") {
        const recalc = calcularFaturamento({
          extratoEnviado: updated.extratoEnviado,
          faturamentoNacional: updated.faturamentoNacional,
          faturamentoNotaFiscal: updated.faturamentoNotaFiscal,
          faturamentoExterior: updated.faturamentoExterior,
        });
        return { ...prev, [mes]: recalc };
      }
      
      return { ...prev, [mes]: updated };
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Empresa" : "Nova Empresa"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Nome da Empresa</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Razão social" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>Data de Abertura</Label>
              <Input type="date" value={dataAbertura} onChange={(e) => setDataAbertura(e.target.value)} />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <Switch checked={emiteNotaFiscal} onCheckedChange={setEmiteNotaFiscal} id="emite-nf" />
              <Label htmlFor="emite-nf">Emite Nota Fiscal</Label>
            </div>
            <div className="space-y-2">
              <Label>Regime Tributário</Label>
              <Select value={regimeTributario} onValueChange={(v) => setRegimeTributario(v as RegimeTributario)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simples_nacional">Simples Nacional</SelectItem>
                  <SelectItem value="lucro_presumido">Lucro Presumido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sócios */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Sócios</Label>
              <Button variant="ghost" size="sm" onClick={() => setSocios((s) => [...s, { nome: "", percentual: 0, cpf: "" }])}>
                <Plus className="mr-1 h-3 w-3" /> Adicionar
              </Button>
            </div>
            {socios.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_80px_140px_32px] gap-2 items-end">
                <Input placeholder="Nome" value={s.nome} onChange={(e) => {
                  const copy = [...socios]; copy[i] = { ...copy[i], nome: e.target.value }; setSocios(copy);
                }} />
                <Input placeholder="%" type="number" value={s.percentual || ""} onChange={(e) => {
                  const copy = [...socios]; copy[i] = { ...copy[i], percentual: Number(e.target.value) }; setSocios(copy);
                }} />
                <Input placeholder="CPF" value={s.cpf} onChange={(e) => {
                  const copy = [...socios]; copy[i] = { ...copy[i], cpf: e.target.value }; setSocios(copy);
                }} />
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setSocios((s) => s.filter((_, idx) => idx !== i))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>

          {/* Faturamento por mês */}
          <Tabs defaultValue="janeiro">
            <TabsList className="flex flex-wrap h-auto gap-1">
              {(Object.keys(MES_LABELS) as MesKey[]).map((m) => (
                <TabsTrigger key={m} value={m} className="text-xs px-2 py-1">{MES_LABELS[m].substring(0, 3)}</TabsTrigger>
              ))}
            </TabsList>
            {(Object.keys(MES_LABELS) as MesKey[]).map((m) => (
              <TabsContent key={m} value={m} className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Envio do Extrato Bancário</Label>
                  <Select value={meses[m].extratoEnviado} onValueChange={(v) => updateMes(m, "extratoEnviado", v as StatusExtrato)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim">✅ Sim</SelectItem>
                      <SelectItem value="nao">❌ Não</SelectItem>
                      <SelectItem value="sem_faturamento">➖ Sem Faturamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fat. Nacional (R$)</Label>
                    <Input type="number" value={meses[m].faturamentoNacional || ""} onChange={(e) => updateMes(m, "faturamentoNacional", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fat. Nota Fiscal (R$)</Label>
                    <Input type="number" value={meses[m].faturamentoNotaFiscal || ""} onChange={(e) => updateMes(m, "faturamentoNotaFiscal", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fat. Exterior (R$)</Label>
                    <Input type="number" value={meses[m].faturamentoExterior || ""} onChange={(e) => updateMes(m, "faturamentoExterior", Number(e.target.value))} />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
                  <p className="text-sm text-muted-foreground">
                    <strong>Total:</strong> <span className="font-semibold text-foreground">{meses[m].faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Distribuição Lucros (75%):</strong> <span className="font-semibold text-accent">{meses[m].distribuicaoLucros.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>{isEditing ? "Salvar" : "Cadastrar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
