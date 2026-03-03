import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Chess } from "https://esm.sh/chess.js@1.4.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

const evaluateMaterialCp = (game: Chess): number => {
  let sum = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = pieceValues[piece.type] ?? 0;
      sum += piece.color === "w" ? value : -value;
    }
  }
  return sum;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json().catch(() => ({}));
    const maxJobs = Math.max(1, Math.min(20, Number(payload?.max_jobs ?? 3) || 3));

    const { data: jobs, error: jobsError } = await supabase
      .from("analysis_jobs")
      .select("id, game_id")
      .eq("status", "queued")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(maxJobs);

    if (jobsError) throw jobsError;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: "No queued jobs" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const processed: Array<{ job_id: string; game_id: string }> = [];

    for (const job of jobs) {
      try {
        await supabase.from("analysis_jobs").update({ status: "running", started_at: new Date().toISOString() }).eq("id", job.id);

        const { data: game, error: gameError } = await supabase
          .from("games")
          .select("id, player_white, player_black, moves, result_type")
          .eq("id", job.game_id)
          .single();

        if (gameError || !game) throw gameError ?? new Error("Game not found");

        const moves = Array.isArray(game.moves) ? game.moves as Array<{ from: string; to: string; promotion?: string | null; san?: string; moved_at?: string }> : [];
        const replay = new Chess();
        let cplWhite = 0;
        let cplBlack = 0;
        let moveTimeSamplesWhite = 0;
        let moveTimeSamplesBlack = 0;
        let moveTimeTotalWhite = 0;
        let moveTimeTotalBlack = 0;
        let prevMovedAt: number | null = null;

        for (let i = 0; i < moves.length; i += 1) {
          const beforeFen = replay.fen();
          const beforeEval = evaluateMaterialCp(replay);
          const mover = replay.turn();
          const move = moves[i];

          replay.move({
            from: move.from,
            to: move.to,
            promotion: move.promotion ?? undefined,
          });

          const afterEval = evaluateMaterialCp(replay);
          const cpl = Math.max(0, mover === "w" ? beforeEval - afterEval : afterEval - beforeEval);

          if (mover === "w") cplWhite += cpl;
          else cplBlack += cpl;

          if (move.moved_at) {
            const ts = new Date(move.moved_at).getTime();
            if (prevMovedAt !== null) {
              const dt = Math.max(0, ts - prevMovedAt);
              if (mover === "w") {
                moveTimeSamplesWhite += 1;
                moveTimeTotalWhite += dt;
              } else {
                moveTimeSamplesBlack += 1;
                moveTimeTotalBlack += dt;
              }
            }
            prevMovedAt = ts;
          }

          await supabase.from("game_engine_analysis").upsert({
            game_id: game.id,
            ply: i + 1,
            fen_before: beforeFen,
            played_move_uci: `${move.from}${move.to}${move.promotion ?? ""}`,
            eval_cp_before: beforeEval,
            eval_cp_after: afterEval,
            cpl,
            tags: cpl >= 180 ? ["blunder"] : cpl >= 90 ? ["mistake"] : cpl >= 40 ? ["inaccuracy"] : ["best"],
          }, { onConflict: "game_id,ply" });
        }

        const totalPlies = Math.max(1, moves.length);
        const avgCplWhite = cplWhite / Math.max(1, Math.ceil(totalPlies / 2));
        const avgCplBlack = cplBlack / Math.max(1, Math.floor(totalPlies / 2));
        const whiteMoveMs = moveTimeSamplesWhite > 0 ? moveTimeTotalWhite / moveTimeSamplesWhite : 0;
        const blackMoveMs = moveTimeSamplesBlack > 0 ? moveTimeTotalBlack / moveTimeSamplesBlack : 0;

        const mkRisk = (avgCpl: number, avgMs: number) => {
          const cplScore = Math.max(0, Math.min(100, (50 - avgCpl) * 1.5));
          const moveTimeScore = avgMs > 0 ? Math.max(0, Math.min(100, 70 - Math.abs(avgMs - 4500) / 80)) : 0;
          const correlationScore = Math.max(0, Math.min(100, cplScore * 0.7 + moveTimeScore * 0.3));
          const overallRisk = Math.round(cplScore * 0.45 + moveTimeScore * 0.2 + correlationScore * 0.35);
          return { cplScore, moveTimeScore, correlationScore, overallRisk };
        };

        const whiteRisk = mkRisk(avgCplWhite, whiteMoveMs);
        const blackRisk = mkRisk(avgCplBlack, blackMoveMs);

        await supabase.from("anti_cheat_reports").upsert([
          {
            game_id: game.id,
            player_id: game.player_white,
            move_time_score: whiteRisk.moveTimeScore,
            cpl_score: whiteRisk.cplScore,
            correlation_score: whiteRisk.correlationScore,
            overall_risk: whiteRisk.overallRisk,
            model_version: "v1-heuristic",
            evidence: {
              avg_cpl: avgCplWhite,
              avg_move_ms: whiteMoveMs,
              plies: Math.ceil(totalPlies / 2),
            },
          },
          {
            game_id: game.id,
            player_id: game.player_black,
            move_time_score: blackRisk.moveTimeScore,
            cpl_score: blackRisk.cplScore,
            correlation_score: blackRisk.correlationScore,
            overall_risk: blackRisk.overallRisk,
            model_version: "v1-heuristic",
            evidence: {
              avg_cpl: avgCplBlack,
              avg_move_ms: blackMoveMs,
              plies: Math.floor(totalPlies / 2),
            },
          },
        ], { onConflict: "game_id" });

        await supabase.from("analysis_jobs").update({
          status: "done",
          completed_at: new Date().toISOString(),
          engine_version: "material-v1",
          error_message: null,
        }).eq("id", job.id);

        processed.push({ job_id: job.id, game_id: game.id });
      } catch (jobErr) {
        const msg = jobErr instanceof Error ? jobErr.message : "Unknown job error";
        await supabase.from("analysis_jobs").update({
          status: "failed",
          completed_at: new Date().toISOString(),
          error_message: msg,
        }).eq("id", job.id);
      }
    }

    return new Response(JSON.stringify({ ok: true, processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
