import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { tournament_id, action } = await req.json();

    if (!tournament_id) {
      return new Response(JSON.stringify({ error: 'tournament_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get tournament
    const { data: tournament, error: tErr } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournament_id)
      .single();

    if (tErr || !tournament) {
      return new Response(JSON.stringify({ error: 'Tournament not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Only creator can start/advance rounds
    if (tournament.created_by !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the tournament creator can manage rounds' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'start' || action === 'next_round') {
      const nextRound = (tournament.current_round || 0) + 1;

      if (nextRound > tournament.max_rounds) {
        // Tournament complete
        await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournament_id);
        return new Response(JSON.stringify({ completed: true, message: 'Tournament completed!' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get registered players
      const { data: registrations } = await supabase
        .from('tournament_registrations')
        .select('player_id')
        .eq('tournament_id', tournament_id);

      const playerIds = (registrations || []).map((r: any) => r.player_id);

      if (playerIds.length < 2) {
        return new Response(JSON.stringify({ error: 'Need at least 2 players' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Swiss pairing: sort by wins then pair adjacent
      const { data: existingMatches } = await supabase
        .from('tournament_matches')
        .select('*')
        .eq('tournament_id', tournament_id);

      // Calculate standings
      const standings = new Map<string, { wins: number; points: number; opponents: Set<string> }>();
      playerIds.forEach((id: string) => standings.set(id, { wins: 0, points: 0, opponents: new Set() }));

      (existingMatches || []).forEach((m: any) => {
        if (m.result === 'pending') return;
        const p1 = standings.get(m.player1_id);
        const p2 = m.player2_id ? standings.get(m.player2_id) : null;
        if (p1 && m.player2_id) p1.opponents.add(m.player2_id);
        if (p2) p2.opponents.add(m.player1_id);

        if (m.winner_id) {
          const winner = standings.get(m.winner_id);
          if (winner) { winner.wins += 1; winner.points += 1; }
        } else if (m.result === 'draw') {
          if (p1) p1.points += 0.5;
          if (p2) p2.points += 0.5;
        }
      });

      // Sort by points descending
      const sorted = [...standings.entries()]
        .sort(([, a], [, b]) => b.points - a.points)
        .map(([id]) => id);

      // Pair players (Swiss: pair adjacent, avoid rematches if possible)
      const pairs: Array<{ player1_id: string; player2_id: string | null }> = [];
      const paired = new Set<string>();

      for (let i = 0; i < sorted.length; i++) {
        if (paired.has(sorted[i])) continue;
        let found = false;
        for (let j = i + 1; j < sorted.length; j++) {
          if (paired.has(sorted[j])) continue;
          const s = standings.get(sorted[i]);
          // Prefer opponents not yet faced
          if (!s?.opponents.has(sorted[j]) || j === i + 1) {
            pairs.push({ player1_id: sorted[i], player2_id: sorted[j] });
            paired.add(sorted[i]);
            paired.add(sorted[j]);
            found = true;
            break;
          }
        }
        // If no fresh opponent, pair with next available
        if (!found) {
          for (let j = i + 1; j < sorted.length; j++) {
            if (!paired.has(sorted[j])) {
              pairs.push({ player1_id: sorted[i], player2_id: sorted[j] });
              paired.add(sorted[i]);
              paired.add(sorted[j]);
              break;
            }
          }
          // Bye if odd player
          if (!paired.has(sorted[i])) {
            pairs.push({ player1_id: sorted[i], player2_id: null });
            paired.add(sorted[i]);
          }
        }
      }

      // Create games and matches for each pair
      const matchInserts = [];
      for (const pair of pairs) {
        let gameId = null;

        if (pair.player2_id) {
          // Create a game for the match
          const isWhite = Math.random() > 0.5;
          const whiteId = isWhite ? pair.player1_id : pair.player2_id;
          const blackId = isWhite ? pair.player2_id : pair.player1_id;

          const { data: game } = await supabase
            .from('games')
            .insert({
              player1_id: whiteId,
              player2_id: blackId,
              player_white: whiteId,
              player_black: blackId,
              game_mode: 'tournament',
              result_type: 'in_progress',
              current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
              moves: [],
            })
            .select('id')
            .single();

          gameId = game?.id || null;
        }

        matchInserts.push({
          tournament_id,
          round: nextRound,
          player1_id: pair.player1_id,
          player2_id: pair.player2_id,
          game_id: gameId,
          result: pair.player2_id ? 'pending' : 'bye',
          winner_id: pair.player2_id ? null : pair.player1_id, // Bye = auto-win
        });
      }

      await supabase.from('tournament_matches').insert(matchInserts);

      // Update tournament state
      await supabase.from('tournaments').update({
        current_round: nextRound,
        status: 'live',
      }).eq('id', tournament_id);

      return new Response(JSON.stringify({
        round: nextRound,
        pairings: pairs.length,
        message: `Round ${nextRound} started with ${pairs.length} pairings`,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "start" or "next_round"' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
