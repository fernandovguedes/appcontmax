import { Empresa, MesKey } from "@/types/fiscal";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ReinfAlertProps {
  empresa: Empresa;
  mesSelecionado: MesKey;
}

// Calcula o faturamento acumulado do trimestre até o mês selecionado
function calcularFaturamentoTrimestre(empresa: Empresa): number {
  const { janeiro, fevereiro, marco } = empresa.meses;
  return janeiro.faturamentoTotal + fevereiro.faturamentoTotal + marco.faturamentoTotal;
}

export function ReinfAlert({ empresa, mesSelecionado }: ReinfAlertProps) {
  const faturamentoTrimestre = calcularFaturamentoTrimestre(empresa);
  const deveEntregar = faturamentoTrimestre > 0;
  
  // Só mostra o alerta no mês de março (fechamento do trimestre)
  const isFechamentoTrimestre = mesSelecionado === "marco";
  
  if (!isFechamentoTrimestre) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {deveEntregar ? (
            <AlertTriangle className="h-4 w-4 text-accent" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          )}
        </TooltipTrigger>
        <TooltipContent>
          {deveEntregar ? (
            <div className="text-xs">
              <p className="font-semibold text-accent">⚠️ REINF obrigatória</p>
              <p>Faturamento trimestral: {faturamentoTrimestre.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p>
              <p className="text-muted-foreground">DCTFWeb também será exigida</p>
            </div>
          ) : (
            <p className="text-xs">Sem faturamento no trimestre - REINF não obrigatória</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
