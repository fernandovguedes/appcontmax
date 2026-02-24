import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    // Validate JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { ticket_id } = await req.json();
    if (!ticket_id) {
      return new Response(JSON.stringify({ error: "ticket_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for full access
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch messages for the ticket (including organizacao_id)
    const { data: messages, error: msgError } = await supabase
      .from("onecode_messages_raw")
      .select("from_me, body, created_at_onecode, user_id, user_name, organizacao_id")
      .eq("ticket_id", ticket_id)
      .order("created_at_onecode", { ascending: true });

    if (msgError) throw new Error(msgError.message);
    if (!messages || messages.length === 0) {
      return new Response(JSON.stringify({ error: "No messages found for this ticket" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get organizacao_id from the first message
    const organizacaoId = messages[0].organizacao_id;

    // Build transcript
    const attendantName = messages.find((m) => m.from_me)?.user_name || "Atendente";
    const transcript = messages
      .map((m) => {
        const role = m.from_me ? `[ATENDENTE - ${attendantName}]` : "[CLIENTE]";
        return `${role}: ${m.body || "(mensagem sem texto)"}`;
      })
      .join("\n");

    const attendantUserId = messages.find((m) => m.from_me)?.user_id || null;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const systemPrompt = `Você é um avaliador de qualidade de atendimento ao cliente via WhatsApp.
Avalie a conversa a seguir nos 5 critérios abaixo, atribuindo notas de 0 a 10 (com 1 casa decimal).
Gere também um feedback construtivo em português (máximo 200 palavras).

Critérios:
1. Clareza - Comunicação clara e sem ambiguidade
2. Cordialidade - Educação, empatia e tom amigável
3. Objetividade - Foco na resolução sem divagações
4. Resolução - Efetividade em resolver o problema do cliente
5. Conformidade - Profissionalismo e aderência a boas práticas

Considere: se o atendente não respondeu ou houve apenas mensagens do cliente, atribua notas baixas.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Avalie esta conversa de atendimento:\n\n${transcript}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_evaluation",
              description: "Submit the evaluation scores and feedback for the customer service conversation.",
              parameters: {
                type: "object",
                properties: {
                  clareza: { type: "number", description: "Score 0-10 for clarity" },
                  cordialidade: { type: "number", description: "Score 0-10 for cordiality" },
                  objetividade: { type: "number", description: "Score 0-10 for objectivity" },
                  resolucao: { type: "number", description: "Score 0-10 for resolution" },
                  conformidade: { type: "number", description: "Score 0-10 for compliance/professionalism" },
                  feedback: { type: "string", description: "Constructive feedback in Portuguese, max 200 words" },
                },
                required: ["clareza", "cordialidade", "objetividade", "resolucao", "conformidade", "feedback"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_evaluation" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos ao workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured evaluation");
    }

    const evaluation = typeof toolCall.function.arguments === "string"
      ? JSON.parse(toolCall.function.arguments)
      : toolCall.function.arguments;

    // Calculate weighted score
    const score_final =
      (evaluation.clareza * 0.25 +
        evaluation.cordialidade * 0.15 +
        evaluation.objetividade * 0.20 +
        evaluation.resolucao * 0.30 +
        evaluation.conformidade * 0.10) *
      10;

    const scoreRow = {
      ticket_id,
      user_id: attendantUserId,
      user_name: attendantName,
      clareza: Math.round(evaluation.clareza * 10) / 10,
      cordialidade: Math.round(evaluation.cordialidade * 10) / 10,
      objetividade: Math.round(evaluation.objetividade * 10) / 10,
      resolucao: Math.round(evaluation.resolucao * 10) / 10,
      conformidade: Math.round(evaluation.conformidade * 10) / 10,
      score_final: Math.round(score_final * 10) / 10,
      feedback: evaluation.feedback,
      model_used: "google/gemini-3-flash-preview",
      organizacao_id: organizacaoId,
    };

    const { data: inserted, error: insertError } = await supabase
      .from("onecode_ticket_scores")
      .insert(scoreRow)
      .select()
      .single();

    if (insertError) throw new Error(insertError.message);

    return new Response(JSON.stringify({ ok: true, score: inserted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Score error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
