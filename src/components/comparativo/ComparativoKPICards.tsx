import { DollarSign, TrendingDown, Award, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { ComparativoData } from "@/types/comparativo";
import { formatBRL } from "@/lib/formatUtils";

interface Props {
  data: ComparativoData;
}

const CARDS = [
  { key: "presumido", title: "Lucro Presumido", subtitle: "Carga total anterior", icon: DollarSign, variant: "neutral" },
  { key: "real", title: "Lucro Real", subtitle: "Carga total atual", icon: TrendingDown, variant: "gain" },
  { key: "economia", title: "Economia", subtitle: "Diferença absoluta", icon: Award, variant: "gold" },
  { key: "reducao", title: "Redução", subtitle: "Percentual de economia", icon: Percent, variant: "gain" },
] as const;

const VARIANT_STYLES: Record<string, string> = {
  neutral: "bg-muted/20 text-muted-foreground",
  gain: "bg-primary/10 text-primary",
  gold: "bg-accent text-accent-foreground",
};

export function ComparativoKPICards({ data }: Props) {
  const values: Record<string, string> = {
    presumido: formatBRL(data.lucroPresumido.total),
    real: formatBRL(data.lucroReal.total),
    economia: formatBRL(data.economiaTotal),
    reducao: `${data.percentualReducao.toFixed(1)}%`,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
      {CARDS.map((c) => {
        const Icon = c.icon;
        return (
          <Card key={c.key} className="overflow-hidden">
            <CardContent className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className={`rounded-lg p-2 ${VARIANT_STYLES[c.variant]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-muted-foreground">{c.title}</span>
              </div>
              <p className="text-2xl font-bold tracking-tight">{values[c.key]}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.subtitle}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
