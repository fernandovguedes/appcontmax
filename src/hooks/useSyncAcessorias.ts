import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SyncJob {
  id: string;
  status: string;
  total_read: number;
  total_created: number;
  total_updated: number;
  total_skipped: number;
  total_errors: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export function useSyncAcessorias(tenantSlug: string | undefined, tenantId: string | undefined) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncJob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<SyncJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!tenantId) return;
    setLoadingHistory(true);
    const { data } = await supabase
      .from("sync_jobs")
      .select("id, status, total_read, total_created, total_updated, total_skipped, total_errors, error_message, started_at, finished_at")
      .eq("tenant_id", tenantId)
      .order("started_at", { ascending: false })
      .limit(10);
    setHistory((data as SyncJob[]) ?? []);
    setLoadingHistory(false);
  }, [tenantId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const triggerSync = useCallback(async () => {
    if (!tenantSlug) return;
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("sync-acessorias", {
        body: { tenant_slug: tenantSlug },
      });
      if (fnError) throw fnError;
      setResult(data as SyncJob);
      await fetchHistory();
    } catch (err: any) {
      setError(err.message ?? "Erro ao sincronizar");
    } finally {
      setSyncing(false);
    }
  }, [tenantSlug, fetchHistory]);

  return { syncing, result, error, history, loadingHistory, triggerSync, fetchHistory };
}
