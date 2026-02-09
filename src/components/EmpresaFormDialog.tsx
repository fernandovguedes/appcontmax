import { useState } from "react";
import { Empresa, MesKey, MES_LABELS, Socio } from "@/types/fiscal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Trash2 } from "lucide-react";

interface EmpresaFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa?: Empresa | null;
  onSave: (data: Omit<Empresa, "id" | "numero">) => void;
  onUpdate: (id: string, data: Partial<Empresa>) => void;
}

const emptyMes = () => ({
  recebimentoExtrato: false,
  faturamentoNacional: 0,
  faturamentoExterior: 0,
  notasEmitidas: 0,
  faturamentoTotal: 0,
  distribuicaoLucros: 0,
});

const emptyObrigacoes = () => ({
  lancamentoFiscal: "pendente" as const,
  reinf: "pendente" as const,
  dcftWeb: "pendente" as const,
  mit: "pendente" as const,
});

export function EmpresaFormDialog({ open, onOpenChange, empresa, onSave, onUpdate }: EmpresaFormDialogProps) {
  const isEditing = !!empresa;

  const [nome, setNome] = useState(empresa?.nome ?? "");
  const [cnpj, setCnpj] = useState(empresa?.cnpj ?? "");
  const [dataAbertura, setDataAbertura] = useState(empresa?.dataAbertura ?? "");
  const [socios, setSocios] = useState<Socio[]>(empresa?.socios ?? [{ nome: "", percentual: 100, cpf: "" }]);
  const [meses, setMeses] = useState(empresa?.meses ?? { janeiro: emptyMes(), fevereiro: emptyMes(), marco: emptyMes() });

  const handleSave = () => {
    const data = {
      nome,
      cnpj,
      dataAbertura,
      socios,
      meses,
      obrigacoes: empresa?.obrigacoes ?? { janeiro: emptyObrigacoes(), fevereiro: emptyObrigacoes(), marco: emptyObrigacoes() },
    };
    if (isEditing && empresa) {
      onUpdate(empresa.id, data);
    } else {
      onSave(data);
    }
    onOpenChange(false);
  };

  const updateMes = (mes: MesKey, field: string, value: number) => {
    setMeses((prev) => {
      const updated = { ...prev, [mes]: { ...prev[mes], [field]: value } };
      updated[mes].faturamentoTotal = updated[mes].faturamentoNacional + updated[mes].faturamentoExterior;
      return updated;
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
            <TabsList>
              {(Object.keys(MES_LABELS) as MesKey[]).map((m) => (
                <TabsTrigger key={m} value={m}>{MES_LABELS[m]}</TabsTrigger>
              ))}
            </TabsList>
            {(Object.keys(MES_LABELS) as MesKey[]).map((m) => (
              <TabsContent key={m} value={m} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fat. Nacional (R$)</Label>
                    <Input type="number" value={meses[m].faturamentoNacional || ""} onChange={(e) => updateMes(m, "faturamentoNacional", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fat. Exterior (R$)</Label>
                    <Input type="number" value={meses[m].faturamentoExterior || ""} onChange={(e) => updateMes(m, "faturamentoExterior", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Notas Emitidas</Label>
                    <Input type="number" value={meses[m].notasEmitidas || ""} onChange={(e) => updateMes(m, "notasEmitidas", Number(e.target.value))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Distribuição Lucros (R$)</Label>
                    <Input type="number" value={meses[m].distribuicaoLucros || ""} onChange={(e) => updateMes(m, "distribuicaoLucros", Number(e.target.value))} />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">{meses[m].faturamentoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                </p>
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
