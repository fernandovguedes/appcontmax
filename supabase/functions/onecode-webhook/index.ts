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

function jsonResp(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  // Init supabase with service role (bypasses RLS)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let payload: any;
  let source = "unknown";
  let eventId: string | undefined;

  try {
    // Determine source
    source = (req.headers.get("x-onecode-source") || "contmax").toLowerCase();
    const config = SOURCE_CONFIG[source];

    if (!config) {
      return jsonResp({ error: `Unknown source: ${source}` }, 400);
    }

    // Validate webhook secret
    const secret = req.headers.get("x-onecode-hook-secret");
    const expectedSecret = Deno.env.get(config.secretEnv);

    if (!expectedSecret || secret !== expectedSecret) {
      return jsonResp({ error: "Unauthorized" }, 401);
    }

    payload = await req.json();

    // Extract event info for audit
    const event = payload.event ?? payload.type ?? null;
    const message = payload.data ?? payload.message ?? payload;
    const ticket = message.ticket ?? payload.ticket ?? {};
    const messageId = String(message.id ?? message.messageId ?? message._id ?? "");
    const ticketIdRaw = message.ticketId ?? ticket.id ?? null;
    const ticketIdNum = ticketIdRaw ? Number(ticketIdRaw) : null;

    // Parse object/action from event string (e.g. "messages.create" → object="messages", action="create")
    let onecodeObject: string | null = null;
    let onecodeAction: string | null = null;
    if (event && typeof event === "string") {
      const parts = event.split(".");
      onecodeObject = parts[0] ?? null;
      onecodeAction = parts[1] ?? null;
    }

    // 1) Always persist raw event first (idempotent via upsert on message_id when available)
    const eventRow = {
      source,
      onecode_object: onecodeObject,
      onecode_action: onecodeAction,
      message_id: messageId || null,
      ticket_id: ticketIdNum,
      payload_json: payload,
      processed: false,
      error_message: null,
    };

    const { data: insertedEvent, error: eventError } = await supabase
      .from("onecode_webhook_events")
      .insert(eventRow)
      .select("id")
      .single();

    if (eventError) {
      console.error("Failed to insert webhook event:", eventError);
      // Still return 200 to avoid webhook retries, but log the issue
      return jsonResp({ ok: true, warning: "event_log_failed", detail: eventError.message });
    }

    eventId = insertedEvent.id;

    // 2) Return 200 immediately — process the rest in the background
    const processPromise = (async () => {
      try {
        // Only process messages.create events
        if (event && event !== "messages.create") {
          await supabase
            .from("onecode_webhook_events")
            .update({ processed: true })
            .eq("id", eventId);
          return;
        }

        // Build row for onecode_messages_raw
        const row = {
          onecode_message_id: messageId,
          ticket_id: String(ticketIdRaw ?? ""),
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
          throw new Error("Missing onecode_message_id or ticket_id");
        }

        const { error: upsertError } = await supabase
          .from("onecode_messages_raw")
          .upsert(row, { onConflict: "onecode_message_id", ignoreDuplicates: true });

        if (upsertError) throw upsertError;

        // Mark event as processed
        await supabase
          .from("onecode_webhook_events")
          .update({ processed: true, error_message: null })
          .eq("id", eventId);
      } catch (procError: any) {
        console.error("Processing error:", procError);
        await supabase
          .from("onecode_webhook_events")
          .update({ processed: false, error_message: procError.message ?? String(procError) })
          .eq("id", eventId);
      }
    })();

    // Use waitUntil if available (edge runtime), otherwise just fire-and-forget
    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
      (globalThis as any).EdgeRuntime.waitUntil(processPromise);
    } else {
      // fallback: await inline (still returns 200 quickly for simple payloads)
      processPromise.catch((e) => console.error("Background processing error:", e));
    }

    return jsonResp({ ok: true, source, event_id: eventId });
  } catch (e: any) {
    console.error("Webhook error:", e);

    // Try to log the error in the event table
    if (eventId) {
      try {
        await supabase
          .from("onecode_webhook_events")
          .update({ error_message: e.message ?? String(e) })
          .eq("id", eventId);
      } catch (_) { /* best effort */ }
    }

    return jsonResp({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
