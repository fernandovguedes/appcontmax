import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "@/hooks/use-toast";

export interface IntegrationProvider {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  is_global: boolean;
  config_schema: any[];
  created_at: string;
}

export interface TenantIntegration {
  id: string;
  tenant_id: string;
  provider_id: string | null;
  provider: string;
  is_enabled: boolean;
  base_url: string;
  last_run: string | null;
  last_status: string | null;
  last_error: string | null;
  plan_feature_code: string | null;
  config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface IntegrationLog {
  id: string;
  tenant_id: string;
  integration: string;
  provider_slug: string | null;
  execution_id: string;
  status: string;
  execution_time_ms: number | null;
  total_processados: number;
  total_matched: number;
  total_ignored: number;
  total_review: number;
  error_message: string | null;
  payload: any;
  response: any;
  created_at: string;
}

export interface IntegrationWithProvider extends TenantIntegration {
  providerData?: IntegrationProvider;
}

export function useIntegrations(tenantId?: string) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [providers, setProviders] = useState<IntegrationProvider[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationWithProvider[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    try {
      // Fetch providers
      const { data: provData } = await supabase
        .from("integration_providers")
        .select("*")
        .order("name");

      // Fetch tenant integrations
      let query = supabase.from("tenant_integrations").select("*");
      if (tenantId) query = query.eq("tenant_id", tenantId);
      const { data: tiData } = await query;

      const provs = (provData ?? []) as IntegrationProvider[];
      const tis = (tiData ?? []) as TenantIntegration[];

      setProviders(provs);

      // Merge provider data into integrations
      const merged: IntegrationWithProvider[] = tis.map((ti) => ({
        ...ti,
        providerData: provs.find((p) => p.id === ti.provider_id),
      }));

      setIntegrations(merged);
    } catch (err) {
      console.error("useIntegrations error:", err);
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, tenantId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleIntegration = async (integrationId: string, enabled: boolean) => {
    const { error } = await supabase
      .from("tenant_integrations")
      .update({ is_enabled: enabled })
      .eq("id", integrationId);

    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: enabled ? "Integração ativada" : "Integração desativada" });
    fetchData();
  };

  const runIntegration = async (tenantIdParam: string, providerSlug: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("run-integration", {
        body: { tenant_id: tenantIdParam, provider_slug: providerSlug },
      });

      if (error) throw error;

      toast({ title: "Execução iniciada", description: `Integração ${providerSlug} em andamento.` });
      // Refresh after a short delay
      setTimeout(fetchData, 2000);
      return data;
    } catch (err: any) {
      toast({ title: "Erro ao executar", description: err.message, variant: "destructive" });
    }
  };

  return { providers, integrations, loading, refetch: fetchData, toggleIntegration, runIntegration };
}

export function useIntegrationLogs(tenantId?: string, providerSlug?: string, limit = 50) {
  const { user } = useAuth();
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchLogs = async () => {
      let query = supabase
        .from("integration_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (tenantId) query = query.eq("tenant_id", tenantId);
      if (providerSlug) query = query.eq("integration", providerSlug);

      const { data } = await query;
      setLogs((data ?? []) as IntegrationLog[]);
      setLoading(false);
    };

    fetchLogs();
  }, [user, tenantId, providerSlug, limit]);

  return { logs, loading };
}
