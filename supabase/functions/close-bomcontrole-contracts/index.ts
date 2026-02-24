import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BC_BASE = "https://apinewintegracao.bomcontrole.com.br/integracao";
const BATCH_SIZE = 20;

function getApiKey(tenantId: string): string {
  const envKey = `BOMCONTROLE_API_KEY_${tenantId.toUpperCase()}`;
  const key = Deno.env.get(envKey);
  if (!key) throw new Error(`Secret ${envKey} not configured`);
  return key;
}

function sanitizeForLog(obj: unknown): unknown {
  if (!obj) return obj;
  const s = JSON.stringify(obj);
  return JSON.parse(s.replace(/ApiKey\s+[^\s"]+/gi, "ApiKey ***"));
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      if (i === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error("Unreachable");
}

// deno-lint-ignore no-explicit-any
async function logAction(supabase: any, tenantId: string, competencia: string | null, portalCompanyId: string | null, action: string, ok: boolean, durationMs: number, requestJson: unknown, responseJson: unknown) {
  await supabase.from("bc_sync_log").insert({
    tenant_id: tenantId, competencia, portal_company_id: portalCompanyId, action, ok,
    duration_ms: durationMs, request_json: sanitizeForLog(requestJson), response_json: sanitizeForLog(responseJson),
  });
}

interface ContractDetail {
  bc_contract_id: number;
  portal_company_id: string;
  status: string;
  message?: string;
}

// deno-lint-ignore no-explicit-any
function hasPaidFutureInvoice(faturas: any[], competenciaCorte: string): boolean {
  const corteDate = new Date(`${competenciaCorte}-01T00:00:00Z`);
  // deno-lint-ignore no-explicit-any
  return faturas.some((f: any) => {
    const comp = f.DataCompetencia ? new Date(f.DataCompetencia) : null;
    if (!comp || comp < corteDate) return false;
    return f.Quitado === true || f.DataPagamento != null || (f.ValorPagamento != null && f.ValorPagamento > 0);
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const { tenant_id, competencia_corte, execute } = body as { tenant_id: string; competencia_corte: string; execute: boolean };

    if (!tenant_id || !competencia_corte) {
      return new Response(JSON.stringify({ error: "Missing tenant_id or competencia_corte" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = getApiKey(tenant_id);

    // Fetch legacy active contracts
    const { data: contracts, error: dbErr } = await supabase
      .from("bc_contracts")
      .select("bc_contract_id, portal_company_id")
      .eq("tenant_id", tenant_id)
      .eq("active", true)
      .eq("legacy", true)
      .limit(BATCH_SIZE);

    if (dbErr) throw new Error(`DB error: ${dbErr.message}`);
    if (!contracts || contracts.length === 0) {
      return new Response(JSON.stringify({ summary: { total_analisados: 0, total_ok: 0, total_bloqueados: 0 }, details: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const details: ContractDetail[] = [];

    // Phase 1: Dry-run check for all contracts
    for (const c of contracts) {
      const t0 = Date.now();
      try {
        const url = `${BC_BASE}/VendaContrato/Obter/${c.bc_contract_id}`;
        const res = await fetchWithRetry(url, {
          headers: { Authorization: `ApiKey ${apiKey}`, "Content-Type": "application/json" },
        });

        if (!res.ok) {
          const errText = await res.text();
          details.push({ bc_contract_id: c.bc_contract_id, portal_company_id: c.portal_company_id, status: "error_api", message: `HTTP ${res.status}: ${errText.substring(0, 200)}` });
          await logAction(supabase, tenant_id, competencia_corte, c.portal_company_id, "dry_close_check", false, Date.now() - t0, { url }, { status: res.status });
          continue;
        }

        const data = await res.json();
        // deno-lint-ignore no-explicit-any
        const faturas: any[] = data?.Faturas ?? [];
        const blocked = hasPaidFutureInvoice(faturas, competencia_corte);
        const status = blocked ? "blocked_paid_future" : "ok_to_close";

        details.push({ bc_contract_id: c.bc_contract_id, portal_company_id: c.portal_company_id, status });
        await logAction(supabase, tenant_id, competencia_corte, c.portal_company_id, "dry_close_check", true, Date.now() - t0, { url }, { faturas_count: faturas.length, status });
      } catch (err) {
        details.push({ bc_contract_id: c.bc_contract_id, portal_company_id: c.portal_company_id, status: "error_api", message: String(err).substring(0, 300) });
        await logAction(supabase, tenant_id, competencia_corte, c.portal_company_id, "dry_close_check", false, Date.now() - t0, null, { error: String(err).substring(0, 500) });
      }
    }

    const totalOk = details.filter((d) => d.status === "ok_to_close").length;
    const totalBloqueados = details.filter((d) => d.status === "blocked_paid_future").length;

    // Phase 2: If dry-run, return report
    if (!execute) {
      return new Response(JSON.stringify({
        summary: { total_analisados: details.length, total_ok: totalOk, total_bloqueados: totalBloqueados },
        details,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Phase 3: Execute close for ok_to_close contracts
    let totalEncerrados = 0;
    let totalFalhas = 0;

    for (const d of details) {
      if (d.status !== "ok_to_close") continue;
      const t0 = Date.now();
      try {
        const url = `${BC_BASE}/VendaContrato/Encerrar/${d.bc_contract_id}`;
        const res = await fetchWithRetry(url, {
          method: "DELETE",
          headers: { Authorization: `ApiKey ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            DataCompetencia: `${competencia_corte}-01 00:00:00`,
            Motivo: "Encerramento para migracao contrato unico Contmax",
          }),
        });

        const resText = await res.text();

        if (res.ok) {
          await supabase.from("bc_contracts").update({
            active: false, closed_at: new Date().toISOString(), closed_competencia: competencia_corte,
          }).eq("bc_contract_id", d.bc_contract_id).eq("tenant_id", tenant_id);

          d.status = "closed";
          totalEncerrados++;
          await logAction(supabase, tenant_id, competencia_corte, d.portal_company_id, "execute_close", true, Date.now() - t0, { url }, { status: res.status });
        } else {
          d.status = "error_close";
          d.message = `HTTP ${res.status}: ${resText.substring(0, 200)}`;
          totalFalhas++;
          await logAction(supabase, tenant_id, competencia_corte, d.portal_company_id, "execute_close", false, Date.now() - t0, { url }, { status: res.status, body: resText.substring(0, 500) });
        }
      } catch (err) {
        d.status = "error_close";
        d.message = String(err).substring(0, 300);
        totalFalhas++;
        await logAction(supabase, tenant_id, competencia_corte, d.portal_company_id, "execute_close", false, Date.now() - t0, null, { error: String(err).substring(0, 500) });
      }
    }

    return new Response(JSON.stringify({
      summary: { total_analisados: details.length, total_ok: totalOk, total_bloqueados: totalBloqueados, total_encerrados: totalEncerrados, total_falhas: totalFalhas },
      details,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("close-bomcontrole-contracts error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
