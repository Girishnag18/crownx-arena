import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { moves, playerColor, accuracy, blunders, mistakes, inaccuracies, brilliants } = await req.json();

    if (!moves || !Array.isArray(moves)) {
      return new Response(JSON.stringify({ error: "moves array required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build a concise game summary for the AI
    const moveList = moves.map((m: any, i: number) => {
      const num = Math.floor(i / 2) + 1;
      const prefix = i % 2 === 0 ? `${num}.` : "";
      const tag = m.classification && m.classification !== "book" && m.classification !== "good" && m.classification !== "best"
        ? ` (${m.classification})`
        : "";
      return `${prefix}${m.san || m.move}${tag}`;
    }).join(" ");

    const systemPrompt = `You are an expert chess coach. Analyze the game and provide actionable improvement advice.
Keep your response concise (under 300 words). Use markdown formatting.
Structure your response as:
## Game Summary
Brief overview of how the game went.

## Key Moments
2-3 critical moments with move numbers and what went wrong/right.

## Improvement Tips
2-3 specific, actionable tips for the player to improve.

Be encouraging but honest. Reference specific moves by number.`;

    const userPrompt = `I played as ${playerColor === "w" ? "White" : "Black"}. Here are my game stats:
- Accuracy: ${accuracy}%
- Brilliant moves: ${brilliants}
- Blunders: ${blunders}
- Mistakes: ${mistakes}  
- Inaccuracies: ${inaccuracies}

Game moves: ${moveList}

Please analyze my play and give me coaching advice.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI analysis unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chess-coach error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
