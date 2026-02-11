import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useModules, Module } from "@/hooks/useModules";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, FileText, LayoutDashboard, Users } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";

const ICON_MAP: Record<string, typeof FileText> = {
  FileText,
  LayoutDashboard,
  Users,
};

function getModuleIcon(iconName: string | null) {
  return ICON_MAP[iconName ?? ""] ?? LayoutDashboard;
}

const MODULE_ROUTES: Record<string, string> = {
  "controle-fiscal": "/controle-fiscal",
  "clientes-pg": "/clientes/pg",
  "clientes-contmax": "/clientes/contmax",
};

export default function Portal() {
  const { signOut, user } = useAuth();
  const { isAdmin } = useUserRole();
  const { modules, loading } = useModules();
  const navigate = useNavigate();

  if (loading) {
    return <LoadingSkeleton variant="portal" />;
  }

  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "";

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        title="Portal Contmax"
        subtitle="Selecione um módulo para começar"
        showLogout
        userName={userName}
        actions={
          isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin")}
              className="text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10"
            >
              <Settings className="mr-1 h-4 w-4" /> Admin
            </Button>
          ) : undefined
        }
      />

      <main className="mx-auto max-w-5xl px-4 py-10 animate-slide-up">
        {modules.length === 0 ? (
          <div className="text-center py-20">
            <LayoutDashboard className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Nenhum módulo disponível</h2>
            <p className="text-sm text-muted-foreground mt-2">Contate o administrador para obter acesso aos módulos.</p>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 stagger-children">
            {modules.map((mod) => {
              const Icon = getModuleIcon(mod.icone);
              const route = MODULE_ROUTES[mod.slug] ?? "#";
              return (
                <Card
                  key={mod.id}
                  className="cursor-pointer card-hover accent-bar-left overflow-hidden border-border/60"
                  onClick={() => navigate(route)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-gradient-to-br from-primary to-primary/70 p-2.5 text-primary-foreground shadow-md">
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-base">{mod.nome}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>{mod.descricao ?? "Sem descrição"}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
