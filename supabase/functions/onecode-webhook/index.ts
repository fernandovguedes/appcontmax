import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-onecode-secret, x-onecode-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  console.log("Webhook recebido");
  console.log("Method:", req.method);
  console.log("Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.error("Method not allowed:", req.method);
    return jsonResp({ error: "Method not allowed" }, 405);
  }

  try {
    // Init supabase with service role (bypasses RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    console.log("SUPABASE_URL presente:", !!supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY presente:", !!supabaseKey);

    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // Determine source
    const source = (req.headers.get("x-onecode-source") || "contmax").toLowerCase();
    const secret = req.headers.get("x-onecode-secret");
    console.log("Source recebido:", source);
    console.log("Secret recebido:", secret);

    const config = SOURCE_CONFIG[source];
    if (!config) {
      console.error("Unknown source:", source);
      return jsonResp({ error: `Unknown source: ${source}` }, 400);
    }

    // Validate webhook secret
    const expectedSecret = Deno.env.get(config.secretEnv);
    console.log("Expected secret env var:", config.secretEnv);
    console.log("Expected secret presente:", !!expectedSecret);
    console.log("Secrets match:", secret === expectedSecret);

    if (!expectedSecret || secret !== expectedSecret) {
      console.error("Secret inválido");
      return jsonResp({ error: "unauthorized" }, 401);
    }

    console.log("Secret validado com sucesso");

    // Parse body
    const payload = await req.json();
    console.log("Payload recebido:", JSON.stringify(payload));

    // Extract event info
    const event = payload.event ?? payload.type ?? null;
    const message = payload.data ?? payload.message ?? payload;
    const ticket = message.ticket ?? payload.ticket ?? {};
    const messageId = String(message.id ?? message.messageId ?? message._id ?? "");
    const ticketIdRaw = message.ticketId ?? ticket.id ?? null;
    const ticketIdNum = ticketIdRaw ? Number(ticketIdRaw) : null;

    let onecodeObject: string | null = null;
    let onecodeAction: string | null = null;
    if (event && typeof event === "string") {
      const parts = event.split(".");
      onecodeObject = parts[0] ?? null;
      onecodeAction = parts[1] ?? null;
    }

    console.log("Event:", event, "Object:", onecodeObject, "Action:", onecodeAction);
    console.log("MessageId:", messageId, "TicketId:", ticketIdNum);

    // 1) Persist raw event
    console.log("Iniciando persistência no banco - onecode_webhook_events");
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
      console.error("Failed to insert webhook event:", JSON.stringify(eventError));
      return jsonResp({ ok: true, warning: "event_log_failed", detail: eventError.message });
    }

    const eventId = insertedEvent.id;
    console.log("Evento salvo com id:", eventId);

    // 2) Process in background
    const processPromise = (async () => {
      try {
        // Only process messages.create events
        if (event && event !== "messages.create") {
          console.log("Evento ignorado (não é messages.create):", event);
          await supabase
            .from("onecode_webhook_events")
            .update({ processed: true })
            .eq("id", eventId);
          return;
        }

        console.log("Iniciando persistência no banco - onecode_messages_raw");
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

        if (upsertError) {
          console.error("Upsert error:", JSON.stringify(upsertError));
          throw upsertError;
        }

        console.log("Mensagem salva com sucesso, marcando evento como processed");
        await supabase
          .from("onecode_webhook_events")
          .update({ processed: true, error_message: null })
          .eq("id", eventId);
      } catch (procError: any) {
        console.error("Processing error:", procError.message ?? String(procError));
        await supabase
          .from("onecode_webhook_events")
          .update({ processed: false, error_message: procError.message ?? String(procError) })
          .eq("id", eventId);
      }
    })();

    // Use waitUntil if available, otherwise await inline
    if (typeof (globalThis as any).EdgeRuntime?.waitUntil === "function") {
      (globalThis as any).EdgeRuntime.waitUntil(processPromise);
    } else {
      processPromise.catch((e) => console.error("Background processing error:", e));
    }

    console.log("Retornando 200 OK");
    return jsonResp({ ok: true, source, event_id: eventId });
  } catch (err: any) {
    console.error("Erro geral webhook:", err.message ?? String(err));
    console.error("Stack:", err.stack ?? "no stack");
    return jsonResp({ error: err.message ?? "Unknown error" }, 500);
  }
});
