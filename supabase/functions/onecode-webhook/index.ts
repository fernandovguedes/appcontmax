import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-onecode-hook-secret, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Validate webhook secret
    const secret = req.headers.get("x-onecode-hook-secret");
    const expectedSecret = Deno.env.get("ONECODE_WEBHOOK_SECRET");

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

    // Extract message data - adapt to OneCode payload structure
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
    };

    if (!row.onecode_message_id || !row.ticket_id) {
      return new Response(
        JSON.stringify({ error: "Missing onecode_message_id or ticket_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role for writing
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

    return new Response(JSON.stringify({ ok: true }), {
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
