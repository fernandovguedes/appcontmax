import { useState } from "react";
import { Empresa, MesKey, MES_LABELS, StatusExtrato, StatusQuestor, MesesData, calcularFaturamento } from "@/types/fiscal";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FaturamentoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empresa: Empresa;
  onUpdate: (id: string, data: Partial<Empresa>) => void;
}

export function FaturamentoFormDialog({ open, onOpenChange, empresa, onUpdate }: FaturamentoFormDialogProps) {
  const [meses, setMeses] = useState<MesesData>({ ...empresa.meses });

  const updateMes = (mes: MesKey, field: string, value: number | StatusExtrato | StatusQuestor) => {
    setMeses((prev) => {
      const current = prev[mes];
      const updated = { ...current, [field]: value };

      if (typeof value === "number") {
        const recalc = calcularFaturamento({
          extratoEnviado: updated.extratoEnviado,
          faturamentoNacional: updated.faturamentoNacional,
          faturamentoNotaFiscal: updated.faturamentoNotaFiscal,
          faturamentoExterior: updated.faturamentoExterior,
          lancadoQuestor: updated.lancadoQuestor,
        });
        return { ...prev, [mes]: recalc };
      }

      return { ...prev, [mes]: updated };
    });
  };

  const handleSave = () => {
    onUpdate(empresa.id, { meses });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Faturamento Mensal — {empresa.nome}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="janeiro">
          <TabsList className="flex flex-wrap h-auto gap-1">
            {(Object.keys(MES_LABELS) as MesKey[]).map((m) => (
              <TabsTrigger key={m} value={m} className="text-xs px-2 py-1">{MES_LABELS[m].substring(0, 3)}</TabsTrigger>
            ))}
          </TabsList>
          {(Object.keys(MES_LABELS) as MesKey[]).map((m) => (
            <TabsContent key={m} value={m} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1">
                  <Label className="text-xs">Lançado no Questor</Label>
                  <Select value={meses[m].lancadoQuestor} onValueChange={(v) => updateMes(m, "lancadoQuestor", v as StatusQuestor)}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ok">✅ OK</SelectItem>
                      <SelectItem value="sem_faturamento">➖ Sem Faturamento</SelectItem>
                      <SelectItem value="pendente">❌ Pendente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
