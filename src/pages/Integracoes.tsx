import { AppHeader } from "@/components/AppHeader";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useIntegrations, IntegrationWithProvider } from "@/hooks/useIntegrations";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Settings, ScrollText, Plug, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  success: { label: "Ativo", variant: "default" },
  running: { label: "Executando", variant: "secondary" },
  error: { label: "Erro", variant: "destructive" },
};

const CATEGORY_LABELS: Record<string, string> = {
  fiscal: "Fiscal",
  financeiro: "Financeiro",
  messaging: "Mensageria",
  banking: "Bancário",
  general: "Geral",
};

function IntegrationCard({
  integration,
  onRun,
  onNavigate,
}: {
  integration: IntegrationWithProvider;
  onRun: () => void;
  onNavigate: () => void;
}) {
  const provider = integration.providerData;
  const name = provider?.name ?? integration.provider;
  const category = provider?.category ?? "general";
  const statusInfo = STATUS_MAP[integration.last_status ?? ""] ?? { label: integration.is_enabled ? "Configurado" : "Desativado", variant: "outline" as const };

  return (
    <Card className="card-hover accent-bar-left overflow-hidden border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-gradient-to-br from-primary to-primary/70 p-2.5 text-primary-foreground shadow-md">
              <Plug className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">{name}</CardTitle>
              <p className="text-xs text-muted-foreground">{CATEGORY_LABELS[category] ?? category}</p>
            </div>
          </div>
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {provider?.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{provider.description}</p>
        )}

        {integration.last_run && (
          <p className="text-xs text-muted-foreground">
            Última execução:{" "}
            {formatDistanceToNow(new Date(integration.last_run), { addSuffix: true, locale: ptBR })}
          </p>
        )}

        {integration.last_error && integration.last_status === "error" && (
          <p className="text-xs text-destructive truncate" title={integration.last_error}>
            {integration.last_error}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="default" onClick={onRun} disabled={!integration.is_enabled}>
            <Play className="h-3 w-3 mr-1" /> Executar
          </Button>
          <Button size="sm" variant="outline" onClick={onNavigate}>
            <Settings className="h-3 w-3 mr-1" /> Configurar
          </Button>
          <Button size="sm" variant="ghost" onClick={onNavigate}>
            <ScrollText className="h-3 w-3 mr-1" /> Logs
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Integracoes() {
  const { user } = useAuth();
  const { integrations, loading, runIntegration } = useIntegrations();
  const navigate = useNavigate();

  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "";

  if (loading) return <LoadingSkeleton variant="portal" />;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Integrações"
        subtitle="Gerenciamento central de integrações API"
        showBack
        backTo="/"
        userName={userName}
      />

      <main className="mx-auto max-w-6xl px-4 py-8 animate-slide-up">
        {integrations.length === 0 ? (
          <div className="text-center py-20">
            <Plug className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Nenhuma integração configurada</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Nenhuma integração foi configurada para seus tenants.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {integrations.map((integ) => (
              <IntegrationCard
                key={integ.id}
                integration={integ}
                onRun={() => runIntegration(integ.tenant_id, integ.providerData?.slug ?? integ.provider)}
                onNavigate={() =>
                  navigate(`/integracoes/${integ.providerData?.slug ?? integ.provider}?tenant=${integ.tenant_id}`)
                }
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
