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

    // Get the user from auth
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

    const { game_mode = 'quick_play' } = await req.json().catch(() => ({}));

    // Get player's rating
    const { data: profile } = await supabase
      .from('profiles')
      .select('crown_score')
      .eq('id', user.id)
      .single();

    const playerRating = profile?.crown_score || 1200;

    // Look for a match in the queue (within 200 rating points, same game mode)
    const { data: candidates } = await supabase
      .from('matchmaking_queue')
      .select('*')
      .eq('game_mode', game_mode)
      .neq('player_id', user.id)
      .gte('rating', playerRating - 200)
      .lte('rating', playerRating + 200)
      .order('created_at', { ascending: true })
      .limit(1);

    if (candidates && candidates.length > 0) {
      const opponent = candidates[0];

      // Randomly assign colors
      const isWhite = Math.random() > 0.5;
      const whiteId = isWhite ? user.id : opponent.player_id;
      const blackId = isWhite ? opponent.player_id : user.id;

      // Create the game
      const { data: game, error: gameError } = await supabase
        .from('games')
        .insert({
          player1_id: whiteId,
          player2_id: blackId,
          player_white: whiteId,
          player_black: blackId,
          game_mode,
          result_type: 'in_progress',
          current_fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          moves: [],
        })
        .select()
        .single();

      if (gameError) {
        return new Response(JSON.stringify({ error: gameError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Remove both players from queue
      await supabase.from('matchmaking_queue').delete().eq('player_id', opponent.player_id);
      await supabase.from('matchmaking_queue').delete().eq('player_id', user.id);

      return new Response(JSON.stringify({ matched: true, game }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // No match found — add to queue (upsert)
    const { error: queueError } = await supabase
      .from('matchmaking_queue')
      .upsert({
        player_id: user.id,
        game_mode,
        rating: playerRating,
      }, { onConflict: 'player_id' });

    if (queueError) {
      return new Response(JSON.stringify({ error: queueError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ matched: false, queued: true }), {
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
