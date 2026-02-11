import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useModules, Module } from "@/hooks/useModules";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Settings, FileText, LayoutDashboard, Users } from "lucide-react";
import logo from "@/assets/logo_contmax.png";

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
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { modules, loading } = useModules();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Contmax" className="h-9" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Portal Contmax</h1>
              <p className="text-xs text-muted-foreground">Selecione um módulo</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                <Settings className="mr-1 h-4 w-4" /> Admin
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10">
        {modules.length === 0 ? (
          <div className="text-center py-20">
            <LayoutDashboard className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground">Nenhum módulo disponível</h2>
            <p className="text-sm text-muted-foreground mt-2">Contate o administrador para obter acesso aos módulos.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {modules.map((mod) => {
              const Icon = getModuleIcon(mod.icone);
              const route = MODULE_ROUTES[mod.slug] ?? "#";
              return (
                <Card
                  key={mod.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 hover:-translate-y-0.5"
                  onClick={() => navigate(route)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        <Icon className="h-6 w-6 text-primary" />
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
