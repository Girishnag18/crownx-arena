import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const DECAY_DAYS = 7;
  const DECAY_AMOUNT = 15;
  const cutoff = new Date(Date.now() - DECAY_DAYS * 86400000).toISOString();

  // Find players with games but none in the last 7 days
  const { data: activePlayers } = await supabase
    .from("games")
    .select("player1_id, player2_id")
    .gte("created_at", cutoff);

  const recentPlayerIds = new Set<string>();
  (activePlayers || []).forEach((g: any) => {
    if (g.player1_id) recentPlayerIds.add(g.player1_id);
    if (g.player2_id) recentPlayerIds.add(g.player2_id);
  });

  // Get all players with games_played > 10 (past placement) and crown_score > 100
  const { data: allPlayers } = await supabase
    .from("profiles")
    .select("id, crown_score, username, games_played")
    .gt("games_played", 10)
    .gt("crown_score", 100);

  const decayed: string[] = [];

  for (const player of allPlayers || []) {
    if (recentPlayerIds.has(player.id)) continue;

    const newScore = Math.max(100, player.crown_score - DECAY_AMOUNT);
    if (newScore === player.crown_score) continue;

    await supabase
      .from("profiles")
      .update({ crown_score: newScore })
      .eq("id", player.id);

    // Send warning notification
    await supabase.from("player_notifications").insert({
      user_id: player.id,
      title: "⚠️ ELO Decay Warning",
      message: `You lost ${DECAY_AMOUNT} CrownScore due to ${DECAY_DAYS} days of inactivity. Play a game to stop decay!`,
      kind: "warning",
    });

    decayed.push(player.id);
  }

  return new Response(
    JSON.stringify({ decayed_count: decayed.length, decayed_ids: decayed }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
