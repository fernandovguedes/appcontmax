import { Empresa, MesKey, MES_LABELS, isMesFechamentoTrimestre, MESES_FECHAMENTO_TRIMESTRE, calcularFaturamentoTrimestre } from "@/types/fiscal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileCheck, FileWarning, CheckCircle2 } from "lucide-react";

interface DashboardSummaryProps {
  empresas: Empresa[];
  mesSelecionado: MesKey;
}

export function DashboardSummary({ empresas, mesSelecionado }: DashboardSummaryProps) {
  const totalEmpresas = empresas.length;

  const extratosEnviados = empresas.filter(
    (e) => e.meses[mesSelecionado].extratoEnviado === "sim"
  ).length;

  const isFechamento = isMesFechamentoTrimestre(mesSelecionado);
  const mesFechamento = mesSelecionado as typeof MESES_FECHAMENTO_TRIMESTRE[number];

  // Contar empresas com REINF obrigatória (faturamento no trimestre > 0)
  const empresasComReinf = isFechamento
    ? empresas.filter((e) => calcularFaturamentoTrimestre(e, mesFechamento) > 0)
    : [];

  const reinfOk = empresasComReinf.filter((e) => e.obrigacoes[mesFechamento]?.reinf === "ok").length;
  const reinfPendente = empresasComReinf.length - reinfOk;

  const dcftOk = empresasComReinf.filter((e) => e.obrigacoes[mesFechamento]?.dcftWeb === "ok").length;
  const dcftPendente = empresasComReinf.length - dcftOk;

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

  if (isFechamento) {
    cards.push(
      {
        title: `REINF - ${MES_LABELS[mesSelecionado]}`,
        value: `✅ ${reinfOk}  ⏳ ${reinfPendente}  (de ${empresasComReinf.length})`,
        icon: FileWarning,
        accent: reinfPendente > 0,
      },
      {
        title: `DCTFWeb - ${MES_LABELS[mesSelecionado]}`,
        value: `✅ ${dcftOk}  ⏳ ${dcftPendente}  (de ${empresasComReinf.length})`,
        icon: CheckCircle2,
        accent: dcftPendente > 0,
      },
    );
  }

  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${isFechamento ? "lg:grid-cols-4" : ""}`}>
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
