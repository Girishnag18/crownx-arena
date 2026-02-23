import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type MatchState = "idle" | "searching" | "matched" | "error";

export const useMatchmaking = () => {
  const { user } = useAuth();
  const [state, setState] = useState<MatchState>("idle");
  const [gameId, setGameId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSearch = useCallback(async (gameMode = "quick_play") => {
    if (!user) return;
    setState("searching");
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("matchmake", {
        body: { game_mode: gameMode },
      });

      if (fnError) throw fnError;

      if (data.matched) {
        setState("matched");
        setGameId(data.game.id);
        return;
      }

      // Poll for match via realtime on games table
      pollingRef.current = setInterval(async () => {
        // Check if we got matched (a game was created with us as a player)
        const { data: games } = await supabase
          .from("games")
          .select("id")
          .eq("result_type", "in_progress")
          .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (games && games.length > 0) {
          setState("matched");
          setGameId(games[0].id);
          if (pollingRef.current) clearInterval(pollingRef.current);
        }
      }, 2000);
    } catch (err: any) {
      setState("error");
      setError(err.message || "Matchmaking failed");
    }
  }, [user]);

  const cancelSearch = useCallback(async () => {
    if (!user) return;
    if (pollingRef.current) clearInterval(pollingRef.current);
    await supabase.from("matchmaking_queue").delete().eq("player_id", user.id);
    setState("idle");
    setGameId(null);
  }, [user]);

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return { state, gameId, error, startSearch, cancelSearch };
};
