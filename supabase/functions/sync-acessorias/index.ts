import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const THROTTLE_MS = 750;

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function normalizeKey(raw: string): string {
  return raw.replace(/[.\-\/]/g, "").trim();
}

function formatCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return raw;
}

interface SyncCounters {
  totalRead: number;
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
}

async function updateJobProgress(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  counters: SyncCounters,
) {
  await supabase.from("sync_jobs").update({
    total_read: counters.totalRead,
    total_created: counters.totalCreated,
    total_updated: counters.totalUpdated,
    total_skipped: counters.totalSkipped,
    total_errors: counters.totalErrors,
  }).eq("id", jobId);
}

async function runSync(
  supabase: ReturnType<typeof createClient>,
  jobId: string,
  tenantId: string,
  tenantSlug: string,
  apiToken: string,
  baseUrl: string,
) {
  const c: SyncCounters = { totalRead: 0, totalCreated: 0, totalUpdated: 0, totalSkipped: 0, totalErrors: 0 };

  const logEntry = async (level: string, message: string, payload?: unknown) => {
    await supabase.from("sync_logs").insert({
      sync_job_id: jobId,
      level,
      message,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : null,
    });
  };

  try {
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      await sleep(THROTTLE_MS);

      const apiUrl = `${baseUrl}/companies/ListAll?page=${page}`;
      console.log(`[sync-acessorias] Fetching ${apiUrl}`);
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${apiToken}` },
      });

      if (!res.ok) {
        const errText = await res.text();
        await logEntry("error", `API error page ${page}: ${res.status}`, { body: errText });
        c.totalErrors++;
        break;
      }

      const data = await res.json();

      const companies = Array.isArray(data)
        ? data
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data?.items) ? data.items
        : [];

      if (companies.length === 0) {
        hasMore = false;
        break;
      }

      for (const company of companies) {
        c.totalRead++;
        try {
          const rawKey = company.cnpj || company.cpf || company.identificador || company.document || "";
          if (!rawKey) {
            await logEntry("warning", "Empresa sem CNPJ/CPF, ignorada", { company });
            c.totalSkipped++;
            continue;
          }

          const formattedKey = formatCnpj(rawKey);
          const nome = company.razaoSocial || company.razao_social || company.nome || company.name || "Sem nome";
          const sortedJson = JSON.stringify(company, Object.keys(company).sort());
          const hash = await sha256(sortedJson);

          const { data: existing } = await supabase
            .from("empresas")
            .select("id, hash_payload")
            .eq("organizacao_id", tenantId)
            .eq("cnpj", formattedKey)
            .maybeSingle();

          if (!existing) {
            const { error: insertErr } = await supabase.from("empresas").insert({
              organizacao_id: tenantId,
              cnpj: formattedKey,
              nome,
              regime_tributario: company.regimeTributario || "simples_nacional",
              emite_nota_fiscal: true,
              meses: {},
              obrigacoes: {},
              socios: [],
              external_source: "acessorias",
              external_key: normalizeKey(rawKey),
              raw_payload: company,
              hash_payload: hash,
              synced_at: new Date().toISOString(),
            });
            if (insertErr) {
              await logEntry("error", `Insert failed: ${formattedKey}`, { error: insertErr.message });
              c.totalErrors++;
            } else {
              c.totalCreated++;
            }
          } else if (existing.hash_payload !== hash) {
            const { error: updateErr } = await supabase
              .from("empresas")
              .update({
                nome,
                external_source: "acessorias",
                external_key: normalizeKey(rawKey),
                raw_payload: company,
                hash_payload: hash,
                synced_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
            if (updateErr) {
              await logEntry("error", `Update failed: ${formattedKey}`, { error: updateErr.message });
              c.totalErrors++;
            } else {
              c.totalUpdated++;
            }
          } else {
            c.totalSkipped++;
          }
        } catch (companyErr) {
          c.totalErrors++;
          await logEntry("error", `Error processing company`, { error: String(companyErr), company });
        }
      }

      await logEntry("info", `Page ${page} processed: ${companies.length} companies`);
      
      // Update progress after each page so frontend polling sees real-time counters
      await updateJobProgress(supabase, jobId, c);

      const totalPages = data?.totalPages || data?.total_pages;
      if (totalPages && page >= totalPages) {
        hasMore = false;
      } else {
        page++;
      }
    }

    await supabase.from("sync_jobs").update({
      status: "success",
      total_read: c.totalRead,
      total_created: c.totalCreated,
      total_updated: c.totalUpdated,
      total_skipped: c.totalSkipped,
      total_errors: c.totalErrors,
      finished_at: new Date().toISOString(),
    }).eq("id", jobId);
  } catch (syncErr) {
    await supabase.from("sync_jobs").update({
      status: "failed",
      total_read: c.totalRead,
      total_created: c.totalCreated,
      total_updated: c.totalUpdated,
      total_skipped: c.totalSkipped,
      total_errors: c.totalErrors,
      finished_at: new Date().toISOString(),
      error_message: String(syncErr),
    }).eq("id", jobId);
    await logEntry("error", "Sync failed", { error: String(syncErr) });
  }

  console.log(`[sync-acessorias] Sync complete: read=${c.totalRead} created=${c.totalCreated} updated=${c.totalUpdated} skipped=${c.totalSkipped} errors=${c.totalErrors}`);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  console.log(`[sync-acessorias] ${req.method} ${url.pathname}${url.search}`);

  if (req.method === "GET") {
    console.log("[sync-acessorias] PING request received");
    return new Response(
      JSON.stringify({ ok: true, timestamp: new Date().toISOString() }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: `Method ${req.method} not allowed` }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", detail: "Missing or invalid Authorization header." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized", detail: `JWT validation failed: ${claimsError?.message || "invalid token"}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const tenantSlug = body.tenant_slug;
    console.log(`[sync-acessorias] POST sync request - tenant_slug: ${tenantSlug}, userId: ${userId}`);

    if (!tenantSlug || !["contmax", "pg"].includes(tenantSlug)) {
      return new Response(
        JSON.stringify({ error: "Invalid tenant_slug", detail: `Received '${tenantSlug}'. Valid values: 'contmax', 'pg'` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: isAdmin } = await supabase.rpc("is_tenant_admin", {
      _user_id: userId,
      _tenant_slug: tenantSlug,
    });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden", detail: `User is not admin for tenant '${tenantSlug}'.` }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: tenant } = await supabase.from("organizacoes").select("id").eq("slug", tenantSlug).single();
    if (!tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const tenantId = tenant.id;

    const secretName = tenantSlug === "contmax" ? "ACESSORIAS_TOKEN_CONTMAX" : "ACESSORIAS_TOKEN_PG";
    const apiToken = Deno.env.get(secretName);
    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: "Configuration error", detail: `API token '${secretName}' not configured` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: integration } = await supabase
      .from("tenant_integrations")
      .select("base_url, is_enabled")
      .eq("tenant_id", tenantId)
      .eq("provider", "acessorias")
      .single();

    const baseUrl = integration?.base_url || "https://api.acessorias.com";
    if (integration && !integration.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Integration disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: job } = await supabase.from("sync_jobs").insert({
      tenant_id: tenantId,
      provider: "acessorias",
      entity: "companies",
      status: "running",
      created_by_user_id: userId,
    }).select("id").single();
    const jobId = job!.id;

    console.log(`[sync-acessorias] Job ${jobId} created, returning immediately. Processing in background.`);

    // @ts-ignore: EdgeRuntime.waitUntil is available in Supabase Edge
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(runSync(supabase, jobId, tenantId, tenantSlug, apiToken, baseUrl));
    } else {
      runSync(supabase, jobId, tenantId, tenantSlug, apiToken, baseUrl);
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        status: "running",
        message: "Sincronização iniciada em background. Acompanhe o status pelo histórico.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[sync-acessorias] Unhandled error:", String(err));
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
