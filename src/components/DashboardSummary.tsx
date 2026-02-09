import { Empresa, MesKey, MES_LABELS } from "@/types/fiscal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileCheck, AlertTriangle, TrendingUp } from "lucide-react";

interface DashboardSummaryProps {
  empresas: Empresa[];
  mesSelecionado: MesKey;
}

export function DashboardSummary({ empresas, mesSelecionado }: DashboardSummaryProps) {
  const totalEmpresas = empresas.length;

  const totalFaturamento = empresas.reduce(
    (sum, e) => sum + e.meses[mesSelecionado].faturamentoTotal, 0
  );

  const totalObrigacoes = empresas.length * 4;
  const concluidas = empresas.reduce((sum, e) => {
    const ob = e.obrigacoes[mesSelecionado];
    return sum + [ob.lancamentoFiscal, ob.reinf, ob.dcftWeb, ob.mit].filter((s) => s === "ok").length;
  }, 0);
  const pendentes = totalObrigacoes - concluidas;

  const cards = [
    { title: "Empresas", value: totalEmpresas, icon: Building2, accent: false },
    {
      title: `Faturamento ${MES_LABELS[mesSelecionado]}`,
      value: totalFaturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
      icon: TrendingUp,
      accent: false,
    },
    { title: "Obrigações Concluídas", value: `${concluidas}/${totalObrigacoes}`, icon: FileCheck, accent: true },
    { title: "Pendências", value: pendentes, icon: AlertTriangle, accent: pendentes > 0 },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.title} className={c.accent ? "border-accent/40 shadow-[0_0_20px_hsl(var(--accent)/0.08)]" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
            <c.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tracking-tight">{c.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
