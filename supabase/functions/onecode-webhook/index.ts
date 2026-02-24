import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-onecode-hook-secret, x-onecode-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Source → secret env var name + organizacao_id mapping
const SOURCE_CONFIG: Record<string, { secretEnv: string; organizacaoId: string }> = {
  contmax: {
    secretEnv: "ONECODE_WEBHOOK_SECRET",
    organizacaoId: "d84e2150-0ae0-4462-880c-da8cec89e96a",
  },
  pg: {
    secretEnv: "ONECODE_WEBHOOK_SECRET_PG",
    organizacaoId: "30e6da4c-ed58-47ce-8a83-289b58ca15ab",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Determine source from header (default to "contmax" for backward compat)
    const source = (req.headers.get("x-onecode-source") || "contmax").toLowerCase();
    const config = SOURCE_CONFIG[source];

    if (!config) {
      return new Response(JSON.stringify({ error: `Unknown source: ${source}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate webhook secret for this source
    const secret = req.headers.get("x-onecode-hook-secret");
    const expectedSecret = Deno.env.get(config.secretEnv);

    if (!expectedSecret || secret !== expectedSecret) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await req.json();

    // Only process messages.create events
    const event = payload.event ?? payload.type;
    if (event && event !== "messages.create") {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract message data
    const message = payload.data ?? payload.message ?? payload;
    const ticket = message.ticket ?? payload.ticket ?? {};

    const row = {
      onecode_message_id: String(message.id ?? message.messageId ?? message._id ?? ""),
      ticket_id: String(message.ticketId ?? ticket.id ?? ""),
      contact_id: message.contactId ? String(message.contactId) : null,
      from_me: Boolean(message.fromMe ?? message.from_me ?? false),
      body: message.body ?? message.text ?? null,
      created_at_onecode: message.createdAt ?? message.created_at ?? null,
      whatsapp_id: message.whatsappId ?? message.wid ?? null,
      user_id: ticket.userId ? String(ticket.userId) : null,
      user_name: ticket.user?.name ?? ticket.userName ?? null,
      payload_json: payload,
      organizacao_id: config.organizacaoId,
    };

    if (!row.onecode_message_id || !row.ticket_id) {
      return new Response(
        JSON.stringify({ error: "Missing onecode_message_id or ticket_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase
      .from("onecode_messages_raw")
      .upsert(row, { onConflict: "onecode_message_id", ignoreDuplicates: true });

    if (error) {
      console.error("Insert error:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, source }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
