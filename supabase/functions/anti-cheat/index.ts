import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface MoveData {
  san: string;
  from?: string;
  to?: string;
  timeMs?: number;
  classification?: string;
}

/**
 * Analyse a completed game for suspicious patterns:
 *  1. Move-time consistency (very low variance = bot-like)
 *  2. High accuracy with fast moves
 *  3. Unusual blunder-to-brilliant ratio
 *  4. Identical move timing (bot fingerprint)
 */
function analyseGame(moves: MoveData[]): { score: number; flags: string[]; details: Record<string, unknown> } {
  const flags: string[] = [];
  let score = 0;

  if (!moves || moves.length < 10) {
    return { score: 0, flags: ["too_few_moves"], details: { moveCount: moves?.length ?? 0 } };
  }

  // --- 1. Move timing analysis ---
  const timings = moves.filter((m) => typeof m.timeMs === "number").map((m) => m.timeMs!);
  let avgTime = 0;
  let timeStdDev = 0;
  let identicalTimingCount = 0;

  if (timings.length > 5) {
    avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    timeStdDev = Math.sqrt(timings.reduce((a, t) => a + (t - avgTime) ** 2, 0) / timings.length);

    // Very low variance relative to mean → robotic
    if (avgTime > 0 && timeStdDev / avgTime < 0.15) {
      flags.push("low_time_variance");
      score += 30;
    }

    // Extremely fast average (< 500ms per move)
    if (avgTime < 500) {
      flags.push("ultra_fast_moves");
      score += 25;
    }

    // Count identical timings (within 50ms)
    const timingBuckets = new Map<number, number>();
    for (const t of timings) {
      const bucket = Math.round(t / 50) * 50;
      timingBuckets.set(bucket, (timingBuckets.get(bucket) || 0) + 1);
    }
    identicalTimingCount = Math.max(...timingBuckets.values());
    if (identicalTimingCount > timings.length * 0.5) {
      flags.push("identical_timing_pattern");
      score += 20;
    }
  }

  // --- 2. Classification analysis ---
  const classifications = moves.filter((m) => m.classification).map((m) => m.classification!);
  if (classifications.length > 5) {
    const counts: Record<string, number> = {};
    for (const c of classifications) {
      counts[c] = (counts[c] || 0) + 1;
    }

    const total = classifications.length;
    const bestMoves = (counts["best"] || 0) + (counts["brilliant"] || 0) + (counts["great"] || 0);
    const bestRatio = bestMoves / total;

    // Suspiciously high best-move ratio
    if (bestRatio > 0.85 && total > 15) {
      flags.push("superhuman_accuracy");
      score += 35;
    } else if (bestRatio > 0.75 && total > 15) {
      flags.push("high_accuracy");
      score += 15;
    }

    // Zero blunders in long game with high accuracy
    const blunders = counts["blunder"] || 0;
    if (blunders === 0 && total > 20 && bestRatio > 0.7) {
      flags.push("zero_blunders_long_game");
      score += 10;
    }
  }

  // --- 3. Combined suspicion: fast + accurate ---
  if (flags.includes("ultra_fast_moves") && (flags.includes("superhuman_accuracy") || flags.includes("high_accuracy"))) {
    flags.push("fast_and_accurate_combo");
    score += 20;
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    score,
    flags,
    details: {
      moveCount: moves.length,
      avgTimeMs: Math.round(avgTime),
      timeStdDev: Math.round(timeStdDev),
      identicalTimingCount,
      classifications: moves.filter((m) => m.classification).length,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { game_id } = await req.json();
    if (!game_id) {
      return new Response(JSON.stringify({ error: "game_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Fetch game
    const { data: game, error: gameErr } = await supabase
      .from("games")
      .select("*")
      .eq("id", game_id)
      .single();

    if (gameErr || !game) {
      return new Response(JSON.stringify({ error: "Game not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const moves = (game.moves as MoveData[]) || [];
    const analysis = analyseGame(moves);

    // Auto-create a report if score is high
    if (analysis.score >= 60) {
      // Determine which player to flag (the one with higher accuracy if available)
      const reportedPlayer = game.player_white || game.player1_id;

      await supabase.from("game_reports").upsert(
        {
          game_id,
          reporter_id: "00000000-0000-0000-0000-000000000000", // system
          reported_player_id: reportedPlayer,
          reason: "auto_detected",
          suspicion_score: analysis.score,
          analysis: analysis,
          status: "pending",
        },
        { onConflict: "id" }
      );
    }

    return new Response(JSON.stringify({ game_id, ...analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
