import { Socio, calcularDistribuicaoSocios } from "@/types/fiscal";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Users, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DistribuicaoSociosPopoverProps {
  socios: Socio[];
  distribuicaoTotal: number;
  label?: string;
  isTrimestral?: boolean;
}

const LIMITE_ALERTA = 50000;

export function DistribuicaoSociosPopover({ socios, distribuicaoTotal, label, isTrimestral }: DistribuicaoSociosPopoverProps) {
  const sociosComDistribuicao = calcularDistribuicaoSocios(socios, distribuicaoTotal);
  const temAlerta = sociosComDistribuicao.some(s => (s.distribuicaoLucros ?? 0) > LIMITE_ALERTA);

  if (distribuicaoTotal === 0) {
    return (
      <span className="text-muted-foreground text-sm">R$ 0,00</span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className={`h-auto p-1 gap-2 font-medium ${isTrimestral ? "text-primary" : "text-accent"} hover:text-accent`}>
          {distribuicaoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          {temAlerta ? (
            <AlertTriangle className="h-4 w-4 text-destructive" />
          ) : (
            <Users className="h-3.5 w-3.5 opacity-50" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">
              {isTrimestral ? "Distribuição Trimestral por Sócio" : "Distribuição por Sócio"}
            </h4>
            <span className="text-xs text-muted-foreground">75% do faturamento</span>
          </div>
          <div className="space-y-2">
            {sociosComDistribuicao.map((socio, i) => {
              const valor = socio.distribuicaoLucros ?? 0;
              const acima50k = valor > LIMITE_ALERTA;
              return (
                <div 
                  key={i} 
                  className={`flex items-center justify-between p-2 rounded-md ${acima50k ? "bg-destructive/10 border border-destructive/20" : "bg-muted/50"}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{socio.nome || "Sócio sem nome"}</p>
                    <p className="text-xs text-muted-foreground">{socio.percentual}% · CPF: {socio.cpf || "—"}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-semibold ${acima50k ? "text-destructive" : "text-foreground"}`}>
                      {valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </p>
                    {acima50k && (
                      <p className="text-xs text-destructive flex items-center gap-1 justify-end">
                        <AlertTriangle className="h-3 w-3" /> Acima de R$ 50k
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="pt-2 border-t flex justify-between text-sm">
            <span className="text-muted-foreground">Total {isTrimestral ? "trimestral" : "distribuído"}:</span>
            <span className={`font-semibold ${isTrimestral ? "text-primary" : "text-accent"}`}>
              {distribuicaoTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
