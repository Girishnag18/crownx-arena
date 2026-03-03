import { useRef, useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Globe, Users, ArrowLeft, Copy, Check, Loader2, Crown, Bot, Clock3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { usePrivateRoom } from "@/hooks/usePrivateRoom";
import { supabase } from "@/integrations/supabase/client";
import WorldChatMessageItem, { type ChatMessage } from "@/components/chat/WorldChatMessage";
import { toast } from "sonner";
import { trackArenaEvent } from "@/services/arenaAnalytics";

type Mode = null | "quick_play" | "world_arena" | "private";

type WorldChatMessage = ChatMessage;
type FeaturedArenaGame = {
  id: string;
  createdAt: string;
  durationSeconds: number | null;
  resultType: string;
  winnerId: string | null;
  whiteName: string;
  blackName: string;
  winnerName: string | null;
};
type ArenaSnapshotRow = {
  searching_now: number;
  avg_wait_seconds: number;
  recent_matches: number;
  my_rating: number | null;
  my_region: string | null;
  best_opponent_rating: number | null;
  best_opponent_region: string | null;
  balance_percent: number | null;
  quality_score: number | null;
  strict_local_wait_seconds: number | null;
  live_games: Array<{
    id: string;
    created_at: string;
    duration_seconds: number | null;
    result_type: string;
    winner_id: string | null;
    white_name: string | null;
    black_name: string | null;
  }> | null;
  recent_winners: Array<{
    id: string;
    created_at: string;
    duration_seconds: number | null;
    result_type: string;
    winner_id: string | null;
    winner_name: string | null;
  }> | null;
};
type MatchmakingQueueRow = {
  player_id: string;
  rating: number;
  region: string | null;
  created_at: string;
};

const TIME_LIMIT_OPTIONS = [
  { label: "No limit", value: null },
  { label: "10 min", value: 10 * 60 },
  { label: "15 min", value: 15 * 60 },
  { label: "20 min", value: 20 * 60 },
  { label: "30 min", value: 30 * 60 },
];

const TIME_MODE_OPTIONS: Array<{ label: string; value: "none" | "fischer" | "delay" | "bronstein" }> = [
  { label: "None", value: "none" },
  { label: "Fischer", value: "fischer" },
  { label: "Delay", value: "delay" },
  { label: "Bronstein", value: "bronstein" },
];

const Lobby = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mode, setMode] = useState<Mode>(null);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [worldChatInput, setWorldChatInput] = useState("");
  const [worldChatMessages, setWorldChatMessages] = useState<WorldChatMessage[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [timeControlMode, setTimeControlMode] = useState<"none" | "fischer" | "delay" | "bronstein">("none");
  const [incrementMs, setIncrementMs] = useState(0);
  const [delayMs, setDelayMs] = useState(0);
  const [preferLocalRegion, setPreferLocalRegion] = useState(true);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [arenaStats, setArenaStats] = useState({
    searchingNow: 0,
    avgWaitSeconds: 0,
    recentMatches: 0,
  });
  const [matchQuality, setMatchQuality] = useState<{
    myRating: number | null;
    myRegion: string | null;
    opponentRating: number | null;
    ratingDelta: number | null;
    expectedScore: number | null;
    balancePercent: number | null;
    qualityScore: number | null;
    estimatedStrictWaitSeconds: number | null;
  }>({
    myRating: null,
    myRegion: null,
    opponentRating: null,
    ratingDelta: null,
    expectedScore: null,
    balancePercent: null,
    qualityScore: null,
    estimatedStrictWaitSeconds: null,
  });
  const [arenaProgress, setArenaProgress] = useState({
    dailyStreakDays: 0,
    winStreak: 0,
    winMultiplier: 1,
    dailyBonusMultiplier: 1,
    badgeLabel: "Bronze",
    nextBadgeLabel: "Silver",
    pointsToNextBadge: 200,
  });
  const [featuredArenaGames, setFeaturedArenaGames] = useState<{
    live: FeaturedArenaGame[];
    recentFinished: FeaturedArenaGame[];
  }>({
    live: [],
    recentFinished: [],
  });
  const [searchStartedAt, setSearchStartedAt] = useState<number | null>(null);
  const [searchElapsedSeconds, setSearchElapsedSeconds] = useState(0);
  const worldChatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const profileNameCacheRef = useRef<Map<string, string>>(new Map());
  const lastPresenceSystemAtRef = useRef<number>(0);
  const challengeQueryHandledRef = useRef(false);
  const trackedLobbyOpenRef = useRef(false);

  const matchmaking = useMatchmaking();
  const privateRoom = usePrivateRoom();
  const prevMatchStateRef = useRef(matchmaking.state);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (mode === "world_arena" && user?.id && !trackedLobbyOpenRef.current) {
      trackedLobbyOpenRef.current = true;
      void trackArenaEvent(user.id, "lobby_open", { mode: "world_arena" });
    }
    if (mode !== "world_arena") trackedLobbyOpenRef.current = false;
  }, [mode, user?.id]);

  useEffect(() => {
    if (matchmaking.gameId) navigate(`/play?game=${matchmaking.gameId}`);
  }, [matchmaking.gameId, navigate]);

  useEffect(() => {
    if (!user?.id || mode !== "world_arena") return;
    const prev = prevMatchStateRef.current;
    if (prev !== matchmaking.state) {
      if (matchmaking.state === "searching") {
        void trackArenaEvent(user.id, "queue_started", {
          duration_seconds: durationSeconds,
          prefer_local_region: preferLocalRegion,
          challenge_target: matchmaking.challengeTargetId,
        });
      } else if (prev === "searching" && matchmaking.state === "idle") {
        void trackArenaEvent(user.id, "queue_cancelled", {
          elapsed_seconds: searchElapsedSeconds,
        });
      } else if (matchmaking.state === "matched" && matchmaking.gameId) {
        void trackArenaEvent(user.id, "match_found_client", {
          game_id: matchmaking.gameId,
          elapsed_seconds: searchElapsedSeconds,
        });
      } else if (matchmaking.state === "error") {
        void trackArenaEvent(user.id, "queue_error", {
          message: matchmaking.error,
        });
      }
      prevMatchStateRef.current = matchmaking.state;
    }
  }, [durationSeconds, matchmaking.challengeTargetId, matchmaking.error, matchmaking.gameId, matchmaking.state, mode, preferLocalRegion, searchElapsedSeconds, user?.id]);

  useEffect(() => {
    if (privateRoom.gameId) navigate(`/play?game=${privateRoom.gameId}`);
  }, [privateRoom.gameId, navigate]);

  const handleCopyCode = () => {
    if (!privateRoom.roomCode) return;
    navigator.clipboard.writeText(privateRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const fetchArenaStats = useCallback(async () => {
    const fiveMinutesAgoIso = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [queueResult, recentMatchesResult] = await Promise.all([
      supabase
        .from("matchmaking_queue")
        .select("created_at")
        .eq("game_mode", "world_arena"),
      supabase
        .from("games")
        .select("id", { count: "exact", head: true })
        .eq("game_mode", "world_arena")
        .gte("created_at", fiveMinutesAgoIso),
    ]);

    if (queueResult.error || recentMatchesResult.error) {
      setArenaStats((prev) => ({ ...prev }));
      return;
    }
    const queueRows = queueResult.data ?? [];
    const searchingNow = queueRows.length;
    const avgWaitSeconds = queueRows.length === 0
      ? 0
      : Math.max(
          0,
          Math.round(
            queueRows.reduce((sum, row) => {
              return sum + (Date.now() - new Date(row.created_at).getTime()) / 1000;
            }, 0) / queueRows.length,
          ),
        );

    setArenaStats({
      searchingNow,
      avgWaitSeconds,
      recentMatches: recentMatchesResult.count ?? 0,
    });
  }, []);

  const fetchMatchQuality = useCallback(async () => {
    if (!user?.id) return;

    const profileResult = await supabase
      .from("profiles")
      .select("crown_score, country")
      .eq("id", user.id)
      .single();

    const queueClient = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string | number) => {
            is: (column: string, value: null) => Promise<{ data: MatchmakingQueueRow[] | null }>;
            eq: (column: string, value: number | string) => Promise<{ data: MatchmakingQueueRow[] | null }>;
          };
        };
      };
    };

    const queueBase = queueClient
      .from("matchmaking_queue")
      .select("player_id, rating, region, created_at")
      .eq("game_mode", "world_arena");
    const queueResult = durationSeconds === null
      ? await queueBase.is("duration_seconds", null)
      : await queueBase.eq("duration_seconds", durationSeconds);

    const myRating = profileResult.data?.crown_score ?? null;
    const myRegion = profileResult.data?.country ?? null;
    const candidates = (queueResult.data ?? []).filter((row) => row.player_id !== user.id);

    if (!myRating || candidates.length === 0) {
      setMatchQuality({
        myRating,
        myRegion,
        opponentRating: null,
        ratingDelta: null,
        expectedScore: null,
        balancePercent: null,
        qualityScore: null,
        estimatedStrictWaitSeconds: null,
      });
      return;
    }

    const bestCandidate = candidates.reduce((best, current) => {
      if (!best) return current;
      const currentWait = Math.max(0, Math.floor((Date.now() - new Date(current.created_at).getTime()) / 1000));
      const bestWait = Math.max(0, Math.floor((Date.now() - new Date(best.created_at).getTime()) / 1000));
      const currentScore = Math.abs(current.rating - myRating) - Math.min(currentWait, 120) * 0.25 + (preferLocalRegion && myRegion && current.region !== myRegion ? 30 : 0);
      const bestScore = Math.abs(best.rating - myRating) - Math.min(bestWait, 120) * 0.25 + (preferLocalRegion && myRegion && best.region !== myRegion ? 30 : 0);
      return currentScore < bestScore ? current : best;
    }, null as (typeof candidates)[number] | null);

    if (!bestCandidate) return;

    const ratingDelta = bestCandidate.rating - myRating;
    const expectedScore = 1 / (1 + Math.pow(10, ratingDelta / 400));
    const balancePercent = Math.round((1 - Math.abs(expectedScore - 0.5) * 2) * 100);
    const bestWait = Math.max(0, Math.floor((Date.now() - new Date(bestCandidate.created_at).getTime()) / 1000));
    const regionPenalty = preferLocalRegion && myRegion && bestCandidate.region !== myRegion ? 15 : 0;
    const qualityScore = Math.max(0, Math.min(100, Math.round(balancePercent - regionPenalty + Math.min(bestWait, 90) * 0.1)));
    const localCandidates = candidates.filter((c) => !myRegion || c.region === myRegion);
    const estimatedStrictWaitSeconds = localCandidates.length > 0 ? Math.round(localCandidates.reduce((sum, c) => sum + Math.max(0, (Date.now() - new Date(c.created_at).getTime()) / 1000), 0) / localCandidates.length) : null;

    setMatchQuality({
      myRating,
      myRegion,
      opponentRating: bestCandidate.rating,
      ratingDelta,
      expectedScore,
      balancePercent,
      qualityScore,
      estimatedStrictWaitSeconds,
    });
  }, [durationSeconds, preferLocalRegion, user?.id]);

  const fetchArenaProgress = useCallback(async () => {
    if (!user?.id) return;

    const seasonKey = new Date().toISOString().slice(0, 7);
    const arenaProgressClient = supabase as unknown as {
      from: (table: string) => {
        select: (columns: string) => {
          eq: (column: string, value: string) => {
            eq: (column2: string, value2: string) => {
              maybeSingle: () => Promise<{
                data: { daily_streak?: number; win_streak?: number; points?: number } | null;
                error: unknown;
              }>;
            };
          };
        };
      };
    };
    const { data: persistedProgress, error: persistedError } = await arenaProgressClient
      .from("arena_progress")
      .select("daily_streak, win_streak, points")
      .eq("user_id", user.id)
      .eq("season_key", seasonKey)
      .maybeSingle();

    if (!persistedError && persistedProgress) {
      const persistedPoints = persistedProgress.points ?? 0;
      const badgeTiers = [
        { label: "Bronze", minScore: 0 },
        { label: "Silver", minScore: 300 },
        { label: "Gold", minScore: 700 },
        { label: "Platinum", minScore: 1200 },
        { label: "Diamond", minScore: 1800 },
      ];
      let activeTier = badgeTiers[0];
      let nextTier = badgeTiers[1];
      for (let i = 0; i < badgeTiers.length; i += 1) {
        if (persistedPoints >= badgeTiers[i].minScore) {
          activeTier = badgeTiers[i];
          nextTier = badgeTiers[Math.min(i + 1, badgeTiers.length - 1)];
        }
      }
      setArenaProgress({
        dailyStreakDays: persistedProgress.daily_streak ?? 0,
        winStreak: persistedProgress.win_streak ?? 0,
        winMultiplier: 1 + Math.min((persistedProgress.win_streak ?? 0) * 0.03, 0.3),
        dailyBonusMultiplier: 1 + Math.min(Math.max((persistedProgress.daily_streak ?? 0) - 1, 0) * 0.05, 0.25),
        badgeLabel: activeTier.label,
        nextBadgeLabel: nextTier.label,
        pointsToNextBadge: nextTier.label === activeTier.label ? 0 : Math.max(0, nextTier.minScore - persistedPoints),
      });
      return;
    }

    const [profileResult, gamesResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("crown_score, win_streak")
        .eq("id", user.id)
        .single(),
      supabase
        .from("games")
        .select("created_at")
        .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
        .neq("result_type", "in_progress")
        .order("created_at", { ascending: false })
        .limit(90),
    ]);

    const crownScore = profileResult.data?.crown_score ?? 400;
    const winStreak = profileResult.data?.win_streak ?? 0;
    const playedDates = new Set(
      (gamesResult.data ?? []).map((g) => {
        const d = new Date(g.created_at);
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      }),
    );

    let dailyStreakDays = 0;
    for (let i = 0; i < 30; i += 1) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
      if (!playedDates.has(key)) break;
      dailyStreakDays += 1;
    }

    const winMultiplier = 1 + Math.min(winStreak * 0.03, 0.3);
    const dailyBonusMultiplier = 1 + Math.min(Math.max(dailyStreakDays - 1, 0) * 0.05, 0.25);

    const badgeTiers = [
      { label: "Bronze", minScore: 0 },
      { label: "Silver", minScore: 700 },
      { label: "Gold", minScore: 1000 },
      { label: "Platinum", minScore: 1300 },
      { label: "Diamond", minScore: 1700 },
    ];

    let activeTier = badgeTiers[0];
    let nextTier = badgeTiers[1];
    for (let i = 0; i < badgeTiers.length; i += 1) {
      if (crownScore >= badgeTiers[i].minScore) {
        activeTier = badgeTiers[i];
        nextTier = badgeTiers[Math.min(i + 1, badgeTiers.length - 1)];
      }
    }

    const pointsToNextBadge = nextTier.label === activeTier.label
      ? 0
      : Math.max(0, nextTier.minScore - crownScore);

    setArenaProgress({
      dailyStreakDays,
      winStreak,
      winMultiplier,
      dailyBonusMultiplier,
      badgeLabel: activeTier.label,
      nextBadgeLabel: nextTier.label,
      pointsToNextBadge,
    });
  }, [user?.id]);

  const fetchFeaturedArenaGames = useCallback(async () => {
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("id, created_at, duration_seconds, result_type, winner_id, player_white, player_black")
      .eq("game_mode", "world_arena")
      .order("created_at", { ascending: false })
      .limit(30);

    if (gamesError || !games || games.length === 0) {
      setFeaturedArenaGames({ live: [], recentFinished: [] });
      return;
    }

    const profileIds = Array.from(
      new Set(
        games.flatMap((g) => [g.player_white, g.player_black, g.winner_id]).filter(Boolean) as string[],
      ),
    );

    const missingIds = profileIds.filter((id) => !profileNameCacheRef.current.has(id));
    if (missingIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", missingIds);
      (profiles ?? []).forEach((p) => {
        profileNameCacheRef.current.set(p.id, p.username || "Player");
      });
    }

    const mapped: FeaturedArenaGame[] = games.map((g) => ({
      id: g.id,
      createdAt: g.created_at,
      durationSeconds: g.duration_seconds,
      resultType: g.result_type,
      winnerId: g.winner_id,
      whiteName: profileNameCacheRef.current.get(g.player_white) || "White",
      blackName: profileNameCacheRef.current.get(g.player_black) || "Black",
      winnerName: g.winner_id ? profileNameCacheRef.current.get(g.winner_id) || "Winner" : null,
    }));

    setFeaturedArenaGames({
      live: mapped.filter((g) => g.resultType === "in_progress").slice(0, 4),
      recentFinished: mapped.filter((g) => (g.resultType === "checkmate" || g.resultType === "resignation") && !!g.winnerId).slice(0, 3),
    });
  }, []);

  const fetchArenaSnapshot = useCallback(async () => {
    if (!user?.id) return;
    const snapshotClient = supabase as unknown as {
      rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: ArenaSnapshotRow[] | null; error: unknown }>;
    };
    const { data, error } = await snapshotClient.rpc("get_world_arena_snapshot", {
      p_user_id: user.id,
      p_duration_seconds: durationSeconds,
      p_prefer_local_region: preferLocalRegion,
    });

    if (error || !data || data.length === 0) {
      void fetchArenaStats();
      void fetchMatchQuality();
      void fetchFeaturedArenaGames();
      return;
    }

    const row = data[0];
    setArenaStats({
      searchingNow: row.searching_now ?? 0,
      avgWaitSeconds: row.avg_wait_seconds ?? 0,
      recentMatches: row.recent_matches ?? 0,
    });

    const bestOpponentRating = row.best_opponent_rating;
    const expectedScore = (bestOpponentRating === null || row.my_rating === null)
      ? null
      : 1 / (1 + Math.pow(10, (bestOpponentRating - row.my_rating) / 400));
    setMatchQuality({
      myRating: row.my_rating,
      myRegion: row.my_region,
      opponentRating: bestOpponentRating,
      ratingDelta: bestOpponentRating !== null && row.my_rating !== null ? bestOpponentRating - row.my_rating : null,
      expectedScore,
      balancePercent: row.balance_percent,
      qualityScore: row.quality_score,
      estimatedStrictWaitSeconds: row.strict_local_wait_seconds,
    });

    const live = (row.live_games ?? []).map((g) => ({
      id: g.id,
      createdAt: g.created_at,
      durationSeconds: g.duration_seconds,
      resultType: g.result_type,
      winnerId: g.winner_id,
      whiteName: g.white_name || "White",
      blackName: g.black_name || "Black",
      winnerName: null,
    }));
    const recentFinished = (row.recent_winners ?? []).map((w) => ({
      id: w.id,
      createdAt: w.created_at,
      durationSeconds: w.duration_seconds,
      resultType: w.result_type,
      winnerId: w.winner_id,
      whiteName: "",
      blackName: "",
      winnerName: w.winner_name || "Winner",
    }));
    setFeaturedArenaGames({ live, recentFinished });
  }, [durationSeconds, fetchArenaStats, fetchFeaturedArenaGames, fetchMatchQuality, preferLocalRegion, user?.id]);

  useEffect(() => {
    if (mode !== "world_arena") return;

    fetchArenaSnapshot();
    fetchArenaProgress();

    const scheduleRefresh = () => {
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      refreshDebounceRef.current = setTimeout(() => {
        void fetchArenaSnapshot();
        void fetchArenaProgress();
      }, 500);
    };

    const statsChannel = supabase
      .channel("world-arena-stats")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "matchmaking_queue", filter: "game_mode=eq.world_arena" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "games", filter: "game_mode=eq.world_arena" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "games", filter: "game_mode=eq.world_arena" },
        scheduleRefresh,
      )
      .subscribe();

    const statsPoll = setInterval(() => {
      void fetchArenaSnapshot();
      void fetchArenaProgress();
    }, 15000);

    return () => {
      clearInterval(statsPoll);
      if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
      supabase.removeChannel(statsChannel);
    };
  }, [fetchArenaProgress, fetchArenaSnapshot, mode]);

  useEffect(() => {
    if (matchmaking.state === "searching" && !searchStartedAt) setSearchStartedAt(Date.now());
    if (matchmaking.state !== "searching") {
      setSearchStartedAt(null);
      setSearchElapsedSeconds(0);
    }
  }, [matchmaking.state, searchStartedAt]);

  useEffect(() => {
    if (!searchStartedAt) return;
    const id = setInterval(() => {
      setSearchElapsedSeconds(Math.max(0, Math.floor((Date.now() - searchStartedAt) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [searchStartedAt]);

  useEffect(() => {
    if (
      matchmaking.challengeStatus === "pending" &&
      matchmaking.challengeTargetId &&
      matchmaking.state === "searching" &&
      searchElapsedSeconds > 120
    ) {
      if (user?.id) {
        void trackArenaEvent(user.id, "challenge_expired_client", {
          target_player_id: matchmaking.challengeTargetId,
        });
      }
      toast.warning("Challenge expired. Retrying in open queue mode can be faster.");
    }
  }, [matchmaking.challengeStatus, matchmaking.challengeTargetId, matchmaking.state, searchElapsedSeconds, user?.id]);

  const formatAvgWait = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getQualityTier = (balancePercent: number | null) => {
    if (balancePercent === null) {
      return {
        label: "Unknown",
        className: "border-border/70 bg-secondary/40 text-muted-foreground",
      };
    }
    if (balancePercent >= 85) {
      return {
        label: "Excellent",
        className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
      };
    }
    if (balancePercent >= 65) {
      return {
        label: "Good",
        className: "border-amber-500/40 bg-amber-500/10 text-amber-300",
      };
    }
    return {
      label: "Risky",
      className: "border-rose-500/40 bg-rose-500/10 text-rose-300",
    };
  };

  useEffect(() => {
    if (mode !== "world_arena") return;

    const channel = supabase.channel("world-matchmaking-chat", {
        config: { presence: { key: user?.id || "anon" } },
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        const incoming = payload as WorldChatMessage;
        setWorldChatMessages((prev) => {
          const recentDuplicate = prev.slice(-5).some((msg) =>
            msg.sender === incoming.sender &&
            msg.kind === incoming.kind &&
            msg.text === incoming.text &&
            Math.abs(msg.createdAt - incoming.createdAt) < 5000,
          );
          if (recentDuplicate) return prev;
          return [...prev.slice(-59), incoming];
        });
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user?.id, username: user?.user_metadata?.username });
          const now = Date.now();
          if (now - lastPresenceSystemAtRef.current > 30000) {
            lastPresenceSystemAtRef.current = now;
            const joinMessage: WorldChatMessage = {
              id: crypto.randomUUID(),
              sender: "Arena",
              text: `${user?.user_metadata?.username || "Player"} entered World Arena`,
              createdAt: now,
              kind: "system",
            };
            await channel.send({ type: "broadcast", event: "message", payload: joinMessage });
          }
        }
      });

    worldChatChannelRef.current = channel;

    return () => {
      if (worldChatChannelRef.current) {
        const now = Date.now();
        if (now - lastPresenceSystemAtRef.current > 30000) {
          lastPresenceSystemAtRef.current = now;
          worldChatChannelRef.current.send({
            type: "broadcast",
            event: "message",
            payload: {
              id: crypto.randomUUID(),
              sender: "Arena",
              text: `${user?.user_metadata?.username || "Player"} left World Arena`,
              createdAt: now,
              kind: "system",
            } satisfies WorldChatMessage,
          });
        }
      }
      worldChatChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [mode, user?.id, user?.user_metadata?.username]);

  useEffect(() => {
    if (!user?.id || challengeQueryHandledRef.current) return;
    const challengeWinner = searchParams.get("challengeWinner");
    if (!challengeWinner) return;
    challengeQueryHandledRef.current = true;
    const durationParam = searchParams.get("duration");
    const parsedDuration = durationParam ? Number(durationParam) : null;
    setMode("world_arena");
    if (parsedDuration && [600, 900, 1200, 1800].includes(parsedDuration)) {
      setDurationSeconds(parsedDuration);
    }
    void matchmaking.startSearch("world_arena", parsedDuration && [600, 900, 1200, 1800].includes(parsedDuration) ? parsedDuration : null, {
      preferLocalRegion,
      targetPlayerId: challengeWinner,
      timeControlMode,
      incrementMs,
      delayMs,
    });
    toast.success("Direct challenge queued");
    setSearchParams({}, { replace: true });
  }, [delayMs, incrementMs, matchmaking, preferLocalRegion, searchParams, setSearchParams, timeControlMode, user?.id]);

  const sendWorldMessage = async () => {
    const text = worldChatInput.trim();
    if (!text) return;

    const message: WorldChatMessage = {
      id: crypto.randomUUID(),
      sender: user?.user_metadata?.username || "Player",
      senderId: user?.id,
      text,
      createdAt: Date.now(),
      kind: "chat",
    };

    setWorldChatMessages((prev) => [...prev.slice(-59), message]);
    setWorldChatInput("");

    await worldChatChannelRef.current?.send({
      type: "broadcast",
      event: "message",
      payload: message,
    });
  };

  const handleBack = () => {
    if (matchmaking.state === "searching") matchmaking.cancelSearch();
    privateRoom.reset();
    setMode(null);
    setJoinCode("");
  };

  const gameModes = [
    { id: "quick_play" as Mode, icon: Swords, title: "Quick Play", desc: "Find an opponent based on your rating", accent: true },
    { id: "world_arena" as Mode, icon: Globe, title: "World Arena", desc: "Global matchmaking with leaderboards" },
    { id: "private" as Mode, icon: Users, title: "Private Room", desc: "Create or join a room with an invite code" },
  ];

  const qualityTier = getQualityTier(matchQuality.balancePercent);
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "No limit";
    return `${Math.round(seconds / 60)}m`;
  };
  const queueChallengeWinner = async (game: FeaturedArenaGame) => {
    if (!game.winnerId) {
      toast.error("Winner is unavailable for challenge");
      return;
    }
    await matchmaking.startSearch("world_arena", game.durationSeconds ?? null, {
      preferLocalRegion,
      targetPlayerId: game.winnerId,
      timeControlMode,
      incrementMs,
      delayMs,
    });
    toast.success(`Queued to challenge ${game.winnerName || "winner"} (${formatDuration(game.durationSeconds)})`);
  };

  const renderTimeControlConfig = () => (
    <>
      <div className="mt-3">
        <p className="text-xs text-muted-foreground mb-1">Clock mode</p>
        <div className="flex flex-wrap gap-2">
          {TIME_MODE_OPTIONS.map((option) => (
            <button key={option.value} onClick={() => setTimeControlMode(option.value)} className={`text-xs px-2.5 py-1 rounded-md border ${timeControlMode === option.value ? "bg-primary/20 border-primary text-primary" : "bg-secondary/40 border-border"}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>
      {timeControlMode !== "none" && (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <label className="space-y-1">
            <span className="text-muted-foreground">{timeControlMode === "fischer" ? "Increment (sec)" : "Delay (sec)"}</span>
            <input
              type="number"
              min={0}
              max={60}
              value={timeControlMode === "fischer" ? Math.floor(incrementMs / 1000) : Math.floor(delayMs / 1000)}
              onChange={(e) => {
                const sec = Math.max(0, Math.min(60, Number(e.target.value) || 0));
                if (timeControlMode === "fischer") setIncrementMs(sec * 1000);
                else setDelayMs(sec * 1000);
              }}
              className="w-full bg-secondary border border-border rounded-md px-2 py-1.5"
            />
          </label>
          <label className="space-y-1">
            <span className="text-muted-foreground">Preset</span>
            <select
              className="w-full bg-secondary border border-border rounded-md px-2 py-1.5"
              value=""
              onChange={(e) => {
                const sec = Number(e.target.value);
                if (!sec) return;
                if (timeControlMode === "fischer") setIncrementMs(sec * 1000);
                else setDelayMs(sec * 1000);
              }}
            >
              <option value="">Select</option>
              <option value="2">2s</option>
              <option value="3">3s</option>
              <option value="5">5s</option>
              <option value="10">10s</option>
            </select>
          </label>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <AnimatePresence mode="wait">
          {!mode ? (
            <motion.div key="modes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-4">
              <div className="text-center mb-8">
                <h1 className="font-display text-2xl font-bold mb-2">Choose Game Mode</h1>
                <p className="text-sm text-muted-foreground">Select how you want to play</p>
              </div>

              {gameModes.map((gm) => (
                <motion.button key={gm.id} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => setMode(gm.id)} className={`w-full glass-card p-6 text-left group transition-all duration-300 ${gm.accent ? "border-primary/30 gold-glow" : "hover:border-primary/20"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${gm.accent ? "bg-primary/20" : "bg-secondary"}`}>
                      <gm.icon className={`w-6 h-6 ${gm.accent ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-display font-bold">{gm.title}</h3>
                      <p className="text-sm text-muted-foreground">{gm.desc}</p>
                    </div>
                  </div>
                </motion.button>
              ))}

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => navigate("/play?mode=computer")} className="w-full glass-card p-6 text-left hover:border-primary/20 transition-all duration-300">
                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-lg flex items-center justify-center bg-secondary"><Bot className="w-6 h-6 text-muted-foreground" /></div><div><h3 className="font-display font-bold">vs Computer</h3><p className="text-sm text-muted-foreground">Practice with a built-in chess bot</p></div></div>
              </motion.button>

              <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={() => navigate("/play")} className="w-full glass-card p-6 text-left hover:border-primary/20 transition-all duration-300">
                <div className="flex items-center gap-4"><div className="w-12 h-12 rounded-lg flex items-center justify-center bg-secondary"><Crown className="w-6 h-6 text-muted-foreground" /></div><div><h3 className="font-display font-bold">Local Play</h3><p className="text-sm text-muted-foreground">Play against a friend on this device</p></div></div>
              </motion.button>
            </motion.div>
          ) : mode === "private" ? (
            <motion.div key="private" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>
              <div className="text-center mb-4"><h2 className="font-display text-xl font-bold">Private Room</h2></div>

              <div className="glass-card p-4">
                <p className="font-display text-sm font-bold mb-2 flex items-center gap-2"><Clock3 className="w-4 h-4 text-primary" />Match Time Limit</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_LIMIT_OPTIONS.map((option) => (
                    <button key={option.label} onClick={() => setDurationSeconds(option.value)} className={`text-xs px-3 py-1.5 rounded-md border ${durationSeconds === option.value ? "bg-primary/20 border-primary text-primary" : "bg-secondary/40 border-border"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {renderTimeControlConfig()}
              </div>

              {privateRoom.status === "idle" && (
                <div className="space-y-4">
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={async () => { setCreatingRoom(true); await privateRoom.createRoom(durationSeconds, { mode: timeControlMode, incrementMs, delayMs }); setCreatingRoom(false); }} disabled={creatingRoom} className="w-full glass-card p-6 border-primary/30 gold-glow text-center disabled:opacity-70">
                    {creatingRoom ? <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" /> : <Users className="w-8 h-8 text-primary mx-auto mb-2" />}
                    <h3 className="font-display font-bold">Create Room</h3>
                    <p className="text-sm text-muted-foreground">Get a code to share with a friend</p>
                  </motion.button>

                  <div className="glass-card p-6">
                    <h3 className="font-display font-bold text-sm mb-3">Join a Room</h3>
                    <div className="flex gap-2">
                      <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter room code" maxLength={6} className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 font-mono text-lg tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-primary" />
                      <button onClick={async () => { setJoiningRoom(true); await privateRoom.joinRoom(joinCode, durationSeconds, { mode: timeControlMode, incrementMs, delayMs }); setJoiningRoom(false); }} disabled={joinCode.length < 6 || joiningRoom} className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg disabled:opacity-50 transition-all hover:scale-105">
                        {joiningRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : "JOIN"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(privateRoom.status === "waiting" || privateRoom.status === "joined") && privateRoom.roomCode && (
                <div className="glass-card p-8 border-glow text-center">
                  <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="font-display font-bold mb-2">{privateRoom.status === "joined" ? "Opponent connected" : "Waiting for opponent..."}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{privateRoom.status === "joined" ? "Launching the game room in real-time..." : "Share this code with a friend"}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl tracking-[0.3em] font-bold text-primary">{privateRoom.roomCode}</span>
                    <button onClick={handleCopyCode} className="p-2 rounded-lg bg-secondary hover:bg-primary/20 transition-colors">{copied ? <Check className="w-5 h-5 text-success" /> : <Copy className="w-5 h-5" />}</button>
                  </div>
                </div>
              )}

              {privateRoom.error && <p className="text-destructive text-sm text-center">{privateRoom.error}</p>}
            </motion.div>
          ) : (
            <motion.div key="searching" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"><ArrowLeft className="w-4 h-4" /> Back</button>

              {mode === "world_arena" && (
                <div className="glass-card px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-sm font-display font-bold">{onlineUserIds.size} player{onlineUserIds.size !== 1 ? "s" : ""} online</span>
                  </div>
                  <Globe className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

              <div className="glass-card p-4">
                <p className="font-display text-sm font-bold mb-2 flex items-center gap-2"><Clock3 className="w-4 h-4 text-primary" />Match Time Limit</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_LIMIT_OPTIONS.map((option) => (
                    <button key={option.label} onClick={() => setDurationSeconds(option.value)} className={`text-xs px-3 py-1.5 rounded-md border ${durationSeconds === option.value ? "bg-primary/20 border-primary text-primary" : "bg-secondary/40 border-border"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
                {renderTimeControlConfig()}
                {mode === "world_arena" && (
                  <label className="mt-3 flex items-center justify-between gap-3 rounded-md border border-border/70 bg-secondary/30 px-3 py-2 text-xs">
                    <span className="text-muted-foreground">Prefer local region (lower ping)</span>
                    <button
                      type="button"
                      onClick={() => setPreferLocalRegion((prev) => !prev)}
                      className={`rounded-md px-2 py-1 font-display font-bold transition-colors ${preferLocalRegion ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40" : "bg-secondary text-muted-foreground border border-border"}`}
                    >
                      {preferLocalRegion ? "ON" : "OFF"}
                    </button>
                  </label>
                )}
              </div>

              {matchmaking.state === "idle" && (
                <div className="glass-card p-8 border-glow text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">{mode === "world_arena" ? <Globe className="w-8 h-8 text-primary" /> : <Swords className="w-8 h-8 text-primary" />}</div>
                  <h2 className="font-display text-xl font-bold mb-2 flex items-center justify-center gap-2">
                    {mode === "world_arena" ? "World Arena" : "Quick Play"}
                    {mode === "world_arena" && (
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
                        {onlineUserIds.size} online
                      </span>
                    )}
                  </h2>
                  <p className="text-sm text-muted-foreground mb-6">{mode === "world_arena" ? "Compete against players worldwide for leaderboard glory" : "Find an opponent matched to your skill level"}</p>
                  {mode === "world_arena" && (
                    <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs">
                      <span className="rounded-md border border-border/70 bg-secondary/40 px-2.5 py-1">Searching now: {arenaStats.searchingNow}</span>
                      <span className="rounded-md border border-border/70 bg-secondary/40 px-2.5 py-1">Avg wait: {formatAvgWait(arenaStats.avgWaitSeconds)}</span>
                      <span className="rounded-md border border-border/70 bg-secondary/40 px-2.5 py-1">Started (5m): {arenaStats.recentMatches}</span>
                    </div>
                  )}
                  {mode === "world_arena" && (
                    <div className="mb-6 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-center">
                      {matchQuality.opponentRating === null || matchQuality.expectedScore === null || matchQuality.balancePercent === null ? (
                        <span className="text-muted-foreground">Match quality: waiting for comparable opponents in queue.</span>
                      ) : (
                        <div className="flex flex-wrap items-center justify-center gap-2">
                          <span className={`rounded-md border px-2 py-0.5 ${qualityTier.className}`}>{qualityTier.label}</span>
                          <span>
                            {matchQuality.balancePercent}% balanced | Rating delta: {matchQuality.ratingDelta && matchQuality.ratingDelta > 0 ? "+" : ""}{matchQuality.ratingDelta} | Win chance: {Math.round(matchQuality.expectedScore * 100)}%
                          </span>
                          {matchQuality.qualityScore !== null && (
                            <span className="rounded-md border border-border/70 bg-secondary/40 px-2 py-0.5">Quality score: {matchQuality.qualityScore}</span>
                          )}
                          {preferLocalRegion && (
                            <span className="rounded-md border border-border/70 bg-secondary/40 px-2 py-0.5">
                              Strict local wait: {matchQuality.estimatedStrictWaitSeconds === null ? "N/A" : formatAvgWait(matchQuality.estimatedStrictWaitSeconds)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  {mode === "world_arena" && (
                    <div className="mb-6 rounded-md border border-border/70 bg-secondary/30 p-3 text-xs">
                      <p className="font-display font-bold mb-2">Arena Streak Rewards</p>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="rounded-md border border-border/70 bg-background/60 px-2.5 py-1">Daily streak: {arenaProgress.dailyStreakDays} day{arenaProgress.dailyStreakDays !== 1 ? "s" : ""}</span>
                        <span className="rounded-md border border-border/70 bg-background/60 px-2.5 py-1">Win streak: {arenaProgress.winStreak}</span>
                        <span className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">Win multiplier: x{arenaProgress.winMultiplier.toFixed(2)}</span>
                        <span className="rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-amber-300">Daily bonus: x{arenaProgress.dailyBonusMultiplier.toFixed(2)}</span>
                      </div>
                      <p className="text-muted-foreground mt-2">
                        Seasonal badge: <span className="text-foreground font-semibold">{arenaProgress.badgeLabel}</span>
                        {arenaProgress.pointsToNextBadge > 0 && ` | ${arenaProgress.pointsToNextBadge} score to ${arenaProgress.nextBadgeLabel}`}
                      </p>
                    </div>
                  )}
                  {mode === "world_arena" && (
                    <div className="mb-6 rounded-md border border-border/70 bg-secondary/20 p-3 text-xs text-left">
                      <p className="font-display font-bold mb-2">Top Live Games</p>
                      {featuredArenaGames.live.length === 0 ? (
                        <p className="text-muted-foreground">No live matches to spectate right now.</p>
                      ) : (
                        <div className="space-y-2 mb-3">
                          {featuredArenaGames.live.map((game) => (
                            <div key={game.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/50 px-2.5 py-2">
                              <span className="truncate">{game.whiteName} vs {game.blackName} ({formatDuration(game.durationSeconds)})</span>
                              <button onClick={() => navigate(`/play?game=${game.id}&spectate=true`)} className="shrink-0 rounded border border-primary/30 bg-primary/10 px-2 py-1 text-primary font-display font-bold">
                                Spectate
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="font-display font-bold mb-2">Challenge Winners</p>
                      {featuredArenaGames.recentFinished.length === 0 ? (
                        <p className="text-muted-foreground">No finished arena games yet.</p>
                      ) : (
                        <div className="space-y-2">
                          {featuredArenaGames.recentFinished.map((game) => (
                            <div key={`${game.id}-winner`} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/50 px-2.5 py-2">
                              <span className="truncate">{game.winnerName || "Winner"} won ({formatDuration(game.durationSeconds)})</span>
                              <button
                                onClick={() => { void queueChallengeWinner(game); }}
                                disabled={matchmaking.state === "searching"}
                                className="shrink-0 rounded border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-emerald-300 font-display font-bold disabled:opacity-60"
                              >
                                Challenge
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {mode === "world_arena" && matchmaking.challengeTargetId && (
                    <div className="mb-4 flex items-center justify-center text-xs">
                      <span className={`rounded-md border px-2.5 py-1 ${
                        matchmaking.challengeStatus === "accepted"
                          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                          : matchmaking.challengeStatus === "expired"
                            ? "border-rose-500/40 bg-rose-500/10 text-rose-300"
                            : "border-amber-500/40 bg-amber-500/10 text-amber-300"
                      }`}>
                        Challenge {matchmaking.challengeStatus}
                      </span>
                    </div>
                  )}
                  <button onClick={() => matchmaking.startSearch(mode!, durationSeconds, { preferLocalRegion: mode === "world_arena" ? preferLocalRegion : false, timeControlMode, incrementMs, delayMs })} className="bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider px-8 py-3 rounded-lg gold-glow hover:scale-105 transition-transform">FIND MATCH</button>
                </div>
              )}

              {matchmaking.state === "searching" && (
                <div className="glass-card p-8 border-glow text-center">
                  <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="font-display font-bold text-lg mb-2">Searching for opponent...</h3>
                  <p className="text-sm text-muted-foreground mb-4">Looking for players near your rating and selected time control</p>
                  {mode === "world_arena" && (
                    <div className="mb-4 flex flex-wrap items-center justify-center gap-2 text-xs">
                      <span className="rounded-md border border-border/70 bg-secondary/40 px-2 py-1">Elapsed: {formatAvgWait(searchElapsedSeconds)}</span>
                      <span className="rounded-md border border-border/70 bg-secondary/40 px-2 py-1">
                        {matchmaking.queueScope === "global"
                          ? "Search expanded globally"
                          : searchElapsedSeconds >= 20
                            ? "Expanding search radius soon"
                            : "Searching nearby rating range"}
                      </span>
                    </div>
                  )}
                  <button onClick={() => { matchmaking.cancelSearch(); }} className="text-sm text-muted-foreground hover:text-destructive transition-colors">Cancel</button>
                  <div className="border-t border-border/50 mt-6 pt-4">
                    <p className="text-xs text-muted-foreground mb-3">No opponents available?</p>
                    <button
                      onClick={() => { matchmaking.cancelSearch(); navigate("/play?mode=computer&ranked=true"); }}
                      className="inline-flex items-center gap-2 border border-primary/30 text-primary px-4 py-2 rounded-lg text-sm font-display font-bold hover:bg-primary/10 transition-colors"
                    >
                      <Bot className="w-4 h-4" /> Play vs AI (Ranked)
                    </button>
                  </div>
                </div>
              )}

              {matchmaking.state === "error" && (
                <div className="glass-card p-8 text-center">
                  <p className="text-destructive mb-4">{matchmaking.error}</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => matchmaking.startSearch(mode!, durationSeconds, { preferLocalRegion: mode === "world_arena" ? preferLocalRegion : false, timeControlMode, incrementMs, delayMs })} className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg">TRY AGAIN</button>
                    <button
                      onClick={() => navigate("/play?mode=computer&ranked=true")}
                      className="inline-flex items-center gap-2 border border-primary/30 text-primary font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg hover:bg-primary/10"
                    >
                      <Bot className="w-4 h-4" /> Play vs AI
                    </button>
                  </div>
                </div>
              )}

              {mode === "world_arena" && (
                <div className="glass-card p-4">
                  <p className="font-display font-bold text-sm mb-2">World Matchmaking Chat</p>
                  <div className="h-36 overflow-y-auto bg-secondary/40 rounded-md p-2 space-y-1 text-xs">
                    {worldChatMessages.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
                    {worldChatMessages.map((msg) => (
                      <WorldChatMessageItem key={msg.id} msg={msg} onlineUserIds={onlineUserIds} />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input value={worldChatInput} onChange={(e) => setWorldChatInput(e.target.value)} placeholder="Chat while finding your match..." className="flex-1 bg-secondary border border-border rounded-lg px-3 py-2 text-xs" />
                    <button onClick={sendWorldMessage} className="bg-primary/20 text-primary px-3 rounded-lg text-xs font-display font-bold">SEND</button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Lobby;
