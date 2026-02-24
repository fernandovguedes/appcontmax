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

export interface SyncError {
  message: string;
  status?: number;
  detail?: string;
}

export interface PingResult {
  ok: boolean;
  timestamp: string;
  url: string;
}

export function useSyncAcessorias(tenantSlug: string | undefined, tenantId: string | undefined) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<SyncJob | null>(null);
  const [error, setError] = useState<SyncError | null>(null);
  const [history, setHistory] = useState<SyncJob[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);
  const [pinging, setPinging] = useState(false);

  const functionUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sync-acessorias`;

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

  const pingSync = useCallback(async () => {
    setPinging(true);
    setPingResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("sync-acessorias", {
        method: "GET",
      });
      if (fnError) throw fnError;
      setPingResult({ ...data, url: functionUrl });
    } catch (err: any) {
      setPingResult(null);
      setError({ message: err.message ?? "Ping failed", detail: String(err) });
    } finally {
      setPinging(false);
    }
  }, [functionUrl]);

  const triggerSync = useCallback(async () => {
    if (!tenantSlug) return;
    setSyncing(true);
    setError(null);
    setResult(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("sync-acessorias", {
        body: { tenant_slug: tenantSlug },
      });
      
      if (fnError) {
        // Try to parse error details from the response
        throw fnError;
      }
      
      // Check if response contains an error field (4xx/5xx with JSON body)
      if (data?.error) {
        setError({
          message: data.error,
          detail: data.detail || undefined,
          status: data.status,
        });
        return;
      }
      
      setResult(data as SyncJob);
      await fetchHistory();
    } catch (err: any) {
      const msg = err.message ?? "Erro ao sincronizar";
      setError({
        message: msg,
        detail: err.context?.body ? JSON.stringify(err.context.body) : undefined,
        status: err.context?.status,
      });
    } finally {
      setSyncing(false);
    }
  }, [tenantSlug, fetchHistory]);

  return { syncing, result, error, history, loadingHistory, triggerSync, fetchHistory, pingSync, pingResult, pinging, functionUrl };
}
