import { Empresa, MesKey, MES_LABELS } from "@/types/fiscal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileCheck } from "lucide-react";

interface DashboardSummaryProps {
  empresas: Empresa[];
  mesSelecionado: MesKey;
}

export function DashboardSummary({ empresas, mesSelecionado }: DashboardSummaryProps) {
  const totalEmpresas = empresas.length;

  const extratosEnviados = empresas.filter(
    (e) => e.meses[mesSelecionado].extratoEnviado === "sim"
  ).length;

  const cards = [
    { 
      title: "Empresas", 
      value: totalEmpresas, 
      icon: Building2, 
      accent: false 
    },
    {
      title: `Extratos Enviados - ${MES_LABELS[mesSelecionado]}`,
      value: `${extratosEnviados} / ${totalEmpresas}`,
      icon: FileCheck,
      accent: extratosEnviados < totalEmpresas,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
