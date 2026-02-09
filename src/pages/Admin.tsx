import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Plus, Shield, User, UserPlus } from "lucide-react";
import logo from "@/assets/logo_contmax.png";

interface Profile {
  id: string;
  nome: string;
  email: string;
  ativo: boolean;
}

interface UserRole {
  user_id: string;
  role: string;
}

interface Module {
  id: string;
  nome: string;
  slug: string;
}

interface UserModule {
  user_id: string;
  module_id: string;
}

export default function Admin() {
  const { user } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [userModules, setUserModules] = useState<UserModule[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newNome, setNewNome] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    const [profilesRes, rolesRes, modulesRes, userModulesRes] = await Promise.all([
      supabase.from("profiles").select("*").order("nome"),
      supabase.from("user_roles").select("*"),
      supabase.from("modules").select("*").order("ordem"),
      supabase.from("user_modules").select("*"),
    ]);
    setProfiles((profilesRes.data as Profile[]) ?? []);
    setRoles((rolesRes.data as UserRole[]) ?? []);
    setModules((modulesRes.data as Module[]) ?? []);
    setUserModules((userModulesRes.data as UserModule[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (!roleLoading && isAdmin) {
      fetchData();
    }
  }, [isAdmin, roleLoading, navigate, fetchData]);

  const isUserAdmin = (userId: string) => roles.some((r) => r.user_id === userId && r.role === "admin");

  const hasModule = (userId: string, moduleId: string) =>
    isUserAdmin(userId) || userModules.some((um) => um.user_id === userId && um.module_id === moduleId);

  const toggleModule = async (userId: string, moduleId: string) => {
    const exists = userModules.find((um) => um.user_id === userId && um.module_id === moduleId);
    if (exists) {
      await supabase.from("user_modules").delete().eq("user_id", userId).eq("module_id", moduleId);
      setUserModules((prev) => prev.filter((um) => !(um.user_id === userId && um.module_id === moduleId)));
    } else {
      const { data } = await supabase.from("user_modules").insert({ user_id: userId, module_id: moduleId }).select().single();
      if (data) setUserModules((prev) => [...prev, data as UserModule]);
    }
  };

  const toggleAdmin = async (userId: string) => {
    if (userId === user?.id) return; // Can't remove own admin
    const isAdm = isUserAdmin(userId);
    if (isAdm) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
      setRoles((prev) => prev.filter((r) => !(r.user_id === userId && r.role === "admin")));
    } else {
      const { data } = await supabase.from("user_roles").insert({ user_id: userId, role: "admin" }).select().single();
      if (data) setRoles((prev) => [...prev, data as UserRole]);
    }
  };

  const toggleAtivo = async (profile: Profile) => {
    await supabase.from("profiles").update({ ativo: !profile.ativo }).eq("id", profile.id);
    setProfiles((prev) => prev.map((p) => (p.id === profile.id ? { ...p, ativo: !p.ativo } : p)));
  };

  const handleCreateUser = async () => {
    if (!newEmail || !newPassword || !newNome) return;
    setCreating(true);
    try {
      const { error } = await supabase.functions.invoke("create-admin", {
        body: { email: newEmail, password: newPassword, nome: newNome },
      });
      if (error) throw error;
      toast({ title: "Usuário criado", description: `${newNome} foi adicionado ao sistema.` });
      setNewUserOpen(false);
      setNewEmail("");
      setNewNome("");
      setNewPassword("");
      // Refresh data after a short delay for trigger to create profile
      setTimeout(fetchData, 1500);
    } catch (err: any) {
      toast({ title: "Erro ao criar usuário", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  if (roleLoading || loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <img src={logo} alt="Contmax" className="h-9" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Administração</h1>
              <p className="text-xs text-muted-foreground">Usuários e Permissões</p>
            </div>
          </div>
          <Button onClick={() => setNewUserOpen(true)} className="bg-accent text-accent-foreground hover:bg-accent/90">
            <UserPlus className="mr-1 h-4 w-4" /> Novo Usuário
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" /> Usuários e Módulos
            </CardTitle>
            <CardDescription>Gerencie o acesso de cada usuário aos módulos do sistema. Admins têm acesso a todos os módulos automaticamente.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-primary/5 hover:bg-primary/5">
                    <TableHead>Nome</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-center">Ativo</TableHead>
                    <TableHead className="text-center">Admin</TableHead>
                    {modules.map((m) => (
                      <TableHead key={m.id} className="text-center">{m.nome}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map((p) => {
                    const adm = isUserAdmin(p.id);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.nome || "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                        <TableCell className="text-center">
                          <Switch checked={p.ativo} onCheckedChange={() => toggleAtivo(p)} />
                        </TableCell>
                        <TableCell className="text-center">
                          {p.id === user?.id ? (
                            <Badge variant="default" className="text-[10px]">
                              <Shield className="h-3 w-3 mr-1" /> Você
                            </Badge>
                          ) : (
                            <Checkbox checked={adm} onCheckedChange={() => toggleAdmin(p.id)} />
                          )}
                        </TableCell>
                        {modules.map((m) => (
                          <TableCell key={m.id} className="text-center">
                            {adm ? (
                              <Badge variant="secondary" className="text-[10px]">Auto</Badge>
                            ) : (
                              <Checkbox
                                checked={hasModule(p.id, m.id)}
                                onCheckedChange={() => toggleModule(p.id, m.id)}
                              />
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>

      <Dialog open={newUserOpen} onOpenChange={setNewUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>Crie um novo acesso ao sistema Contmax.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={newNome} onChange={(e) => setNewNome(e.target.value)} placeholder="Nome completo" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewUserOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateUser} disabled={creating || !newEmail || !newNome || !newPassword}>
              {creating ? "Criando..." : "Criar Usuário"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
