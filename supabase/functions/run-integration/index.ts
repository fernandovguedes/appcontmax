import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FUNCTION_MAP: Record<string, string> = {
  acessorias: "sync-acessorias",
  bomcontrole: "sync-bomcontrole",
  onecode: "sync-onecode-contacts",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate user
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { tenant_id, provider_slug } = await req.json();
    if (!tenant_id || !provider_slug) {
      return new Response(
        JSON.stringify({ error: "tenant_id and provider_slug are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // Verify integration is enabled
    const { data: ti, error: tiError } = await admin
      .from("tenant_integrations")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("provider", provider_slug)
      .maybeSingle();

    if (tiError || !ti) {
      return new Response(
        JSON.stringify({ error: "Integration not found for this tenant" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!ti.is_enabled) {
      return new Response(
        JSON.stringify({ error: "Integration is disabled" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update status to running
    await admin
      .from("tenant_integrations")
      .update({ last_status: "running", last_run: new Date().toISOString(), last_error: null })
      .eq("id", ti.id);

    const executionId = crypto.randomUUID();
    const startTime = Date.now();

    // Delegate to specific function
    const functionName = FUNCTION_MAP[provider_slug];
    if (!functionName) {
      const errMsg = `No function mapped for provider: ${provider_slug}`;
      await admin
        .from("tenant_integrations")
        .update({ last_status: "error", last_error: errMsg })
        .eq("id", ti.id);

      await admin.from("integration_logs").insert({
        tenant_id,
        integration: provider_slug,
        provider_slug,
        execution_id: executionId,
        status: "error",
        error_message: errMsg,
        execution_time_ms: Date.now() - startTime,
      });

      return new Response(JSON.stringify({ error: errMsg }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call the specific edge function
    const fnUrl = `${supabaseUrl}/functions/v1/${functionName}`;
    let fnStatus = "success";
    let fnError: string | null = null;
    let fnResponse: any = null;

    try {
      const fnBody: any = { tenant_id };
      // acessorias needs org slug
      if (provider_slug === "acessorias") {
        const { data: org } = await admin
          .from("organizacoes")
          .select("slug")
          .eq("id", tenant_id)
          .single();
        if (org) fnBody.org_slug = org.slug;
      }

      const resp = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify(fnBody),
      });

      fnResponse = await resp.json().catch(() => ({ status: resp.status }));

      if (!resp.ok) {
        fnStatus = "error";
        fnError = fnResponse?.error ?? `HTTP ${resp.status}`;
      }
    } catch (e: any) {
      fnStatus = "error";
      fnError = e.message ?? "Unknown error";
    }

    const executionTime = Date.now() - startTime;

    // Update tenant_integrations
    await admin
      .from("tenant_integrations")
      .update({
        last_status: fnStatus,
        last_error: fnError,
      })
      .eq("id", ti.id);

    // Log execution
    await admin.from("integration_logs").insert({
      tenant_id,
      integration: provider_slug,
      provider_slug,
      execution_id: executionId,
      status: fnStatus,
      error_message: fnError,
      execution_time_ms: executionTime,
      total_processados: fnResponse?.total_processados ?? 0,
      total_matched: fnResponse?.total_matched ?? 0,
      total_ignored: fnResponse?.total_ignored ?? 0,
      total_review: fnResponse?.total_review ?? 0,
      response: fnResponse,
    });

    return new Response(
      JSON.stringify({ status: fnStatus, execution_id: executionId, execution_time_ms: executionTime }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("run-integration error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
