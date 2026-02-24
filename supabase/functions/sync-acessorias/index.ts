import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const THROTTLE_MS = 750; // ~80 req/min

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
    return digits.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      "$1.$2.$3/$4-$5"
    );
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
  }
  return raw;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // --- Auth: validate JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // --- Parse body ---
    const body = await req.json();
    const tenantSlug = body.tenant_slug;
    if (!tenantSlug || !["contmax", "pg"].includes(tenantSlug)) {
      return new Response(
        JSON.stringify({ error: "Invalid tenant_slug. Use 'contmax' or 'pg'" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Service role client for DB operations ---
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Check admin permission ---
    const { data: isAdmin } = await supabase.rpc("is_tenant_admin", {
      _user_id: userId,
      _tenant_slug: tenantSlug,
    });
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: "Forbidden: tenant admin required" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Resolve tenant ---
    const { data: tenant } = await supabase
      .from("organizacoes")
      .select("id")
      .eq("slug", tenantSlug)
      .single();
    if (!tenant) {
      return new Response(JSON.stringify({ error: "Tenant not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const tenantId = tenant.id;

    // --- Load token ---
    const secretName =
      tenantSlug === "contmax"
        ? "ACESSORIAS_TOKEN_CONTMAX"
        : "ACESSORIAS_TOKEN_PG";
    const apiToken = Deno.env.get(secretName);
    if (!apiToken) {
      return new Response(
        JSON.stringify({ error: `Token not configured for ${tenantSlug}` }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Get base_url from tenant_integrations ---
    const { data: integration } = await supabase
      .from("tenant_integrations")
      .select("base_url, is_enabled")
      .eq("tenant_id", tenantId)
      .eq("provider", "acessorias")
      .single();

    const baseUrl = integration?.base_url || "https://api.acessorias.com";
    if (integration && !integration.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Integration disabled for this tenant" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // --- Create sync_job ---
    const { data: job } = await supabase
      .from("sync_jobs")
      .insert({
        tenant_id: tenantId,
        provider: "acessorias",
        entity: "companies",
        status: "running",
        created_by_user_id: userId,
      })
      .select("id")
      .single();
    const jobId = job!.id;

    // --- Counters ---
    let totalRead = 0;
    let totalCreated = 0;
    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    const logEntry = async (
      level: string,
      message: string,
      payload?: unknown
    ) => {
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
        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${apiToken}` },
        });

        if (!res.ok) {
          const errText = await res.text();
          await logEntry("error", `API error page ${page}: ${res.status}`, {
            body: errText,
          });
          totalErrors++;
          break;
        }

        const data = await res.json();

        // Handle different response shapes
        const companies = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.items)
          ? data.items
          : [];

        if (companies.length === 0) {
          hasMore = false;
          break;
        }

        for (const company of companies) {
          totalRead++;
          try {
            // Extract key (CNPJ or CPF)
            const rawKey =
              company.cnpj ||
              company.cpf ||
              company.identificador ||
              company.document ||
              "";
            if (!rawKey) {
              await logEntry("warning", "Empresa sem CNPJ/CPF, ignorada", {
                company,
              });
              totalSkipped++;
              continue;
            }

            const formattedKey = formatCnpj(rawKey);
            const nome =
              company.razaoSocial ||
              company.razao_social ||
              company.nome ||
              company.name ||
              "Sem nome";

            // Calculate hash
            const sortedJson = JSON.stringify(company, Object.keys(company).sort());
            const hash = await sha256(sortedJson);

            // Check existing
            const { data: existing } = await supabase
              .from("empresas")
              .select("id, hash_payload")
              .eq("organizacao_id", tenantId)
              .eq("cnpj", formattedKey)
              .maybeSingle();

            if (!existing) {
              // INSERT
              const { error: insertErr } = await supabase
                .from("empresas")
                .insert({
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
                await logEntry("error", `Insert failed: ${formattedKey}`, {
                  error: insertErr.message,
                });
                totalErrors++;
              } else {
                totalCreated++;
              }
            } else if (existing.hash_payload !== hash) {
              // UPDATE
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
                await logEntry("error", `Update failed: ${formattedKey}`, {
                  error: updateErr.message,
                });
                totalErrors++;
              } else {
                totalUpdated++;
              }
            } else {
              totalSkipped++;
            }
          } catch (companyErr) {
            totalErrors++;
            await logEntry("error", `Error processing company`, {
              error: String(companyErr),
              company,
            });
          }
        }

        // Log page processed
        await logEntry("info", `Page ${page} processed: ${companies.length} companies`);

        // Check pagination end
        const totalPages = data?.totalPages || data?.total_pages;
        if (totalPages && page >= totalPages) {
          hasMore = false;
        } else {
          page++;
        }
      }

      // Finalize job
      await supabase
        .from("sync_jobs")
        .update({
          status: "success",
          total_read: totalRead,
          total_created: totalCreated,
          total_updated: totalUpdated,
          total_skipped: totalSkipped,
          total_errors: totalErrors,
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);
    } catch (syncErr) {
      await supabase
        .from("sync_jobs")
        .update({
          status: "failed",
          total_read: totalRead,
          total_created: totalCreated,
          total_updated: totalUpdated,
          total_skipped: totalSkipped,
          total_errors: totalErrors,
          finished_at: new Date().toISOString(),
          error_message: String(syncErr),
        })
        .eq("id", jobId);

      await logEntry("error", "Sync failed", { error: String(syncErr) });
    }

    return new Response(
      JSON.stringify({
        success: true,
        job_id: jobId,
        total_read: totalRead,
        total_created: totalCreated,
        total_updated: totalUpdated,
        total_skipped: totalSkipped,
        total_errors: totalErrors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
