import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Globe, Users, ArrowLeft, Copy, Check, Loader2, Crown, Bot, Clock3, Eye, Timer, Shuffle, ChevronRight } from "lucide-react";
import { TimeControlSelector, type TimeControl } from "@/components/chess/ChessClock";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { usePrivateRoom } from "@/hooks/usePrivateRoom";
import { supabase } from "@/integrations/supabase/client";
import WorldChatMessageItem, { type ChatMessage } from "@/components/chat/WorldChatMessage";

type Mode = null | "quick_play" | "world_arena" | "private";

type WorldChatMessage = ChatMessage;

const TIME_LIMIT_OPTIONS = [
  { label: "No limit", value: null },
  { label: "10 min", value: 10 * 60 },
  { label: "15 min", value: 15 * 60 },
  { label: "20 min", value: 20 * 60 },
  { label: "30 min", value: 30 * 60 },
];

const cardMotion = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.25 },
};

const Lobby = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(null);
  const [joinCode, setJoinCode] = useState("");
  const [copied, setCopied] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [worldChatInput, setWorldChatInput] = useState("");
  const [worldChatMessages, setWorldChatMessages] = useState<WorldChatMessage[]>([]);
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null);
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [chess960, setChess960] = useState(false);
  const worldChatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const matchmaking = useMatchmaking();
  const privateRoom = usePrivateRoom();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (matchmaking.gameId) navigate(`/play?game=${matchmaking.gameId}`);
  }, [matchmaking.gameId, navigate]);

  useEffect(() => {
    if (privateRoom.gameId) navigate(`/play?game=${privateRoom.gameId}${chess960 ? "&variant=chess960" : ""}`);
  }, [privateRoom.gameId, navigate, chess960]);

  const handleCopyCode = () => {
    if (!privateRoom.roomCode) return;
    navigator.clipboard.writeText(privateRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (mode !== "world_arena") return;

    const channel = supabase.channel("world-matchmaking-chat", {
        config: { presence: { key: user?.id || "anon" } },
      })
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setWorldChatMessages((prev) => [...prev.slice(-59), payload as WorldChatMessage]);
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const ids = new Set<string>(Object.keys(state));
        setOnlineUserIds(ids);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: user?.id, username: user?.user_metadata?.username });
          const joinMessage: WorldChatMessage = {
            id: crypto.randomUUID(),
            sender: "Arena",
            text: `${user?.user_metadata?.username || "Player"} entered World Arena`,
            createdAt: Date.now(),
            kind: "system",
          };
          await channel.send({ type: "broadcast", event: "message", payload: joinMessage });
        }
      });

    worldChatChannelRef.current = channel;

    return () => {
      if (worldChatChannelRef.current) {
        worldChatChannelRef.current.send({
          type: "broadcast",
          event: "message",
          payload: {
            id: crypto.randomUUID(),
            sender: "Arena",
            text: `${user?.user_metadata?.username || "Player"} left World Arena`,
            createdAt: Date.now(),
            kind: "system",
          } satisfies WorldChatMessage,
        });
      }
      worldChatChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [mode, user?.user_metadata?.username]);

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
    { id: "quick_play" as Mode, icon: Swords, title: "Quick Play", desc: "Find an opponent matched to your skill level", accent: true },
    { id: "world_arena" as Mode, icon: Globe, title: "World Arena", desc: "Compete globally for leaderboard rankings" },
    { id: "private" as Mode, icon: Users, title: "Private Room", desc: "Invite a friend with a shareable room code" },
  ];

  const secondaryModes = [
    { icon: Bot, title: "vs Computer", desc: "Practice against AI", onClick: () => navigate(`/play?mode=computer${selectedTimeControl ? `&tc=${selectedTimeControl.label}` : ""}`) },
    { icon: Shuffle, title: "Chess960 vs AI", desc: "Randomized starting position", onClick: () => navigate(`/play?mode=computer&variant=chess960${selectedTimeControl ? `&tc=${selectedTimeControl.label}` : ""}`) },
    { icon: Crown, title: "Local Play", desc: "Play on the same device", onClick: () => { const params = new URLSearchParams(); if (selectedTimeControl) params.set("tc", selectedTimeControl.label); if (chess960) params.set("variant", "chess960"); navigate(`/play${params.toString() ? `?${params}` : ""}`); } },
    { icon: Eye, title: "Spectate", desc: "Watch live games", onClick: () => navigate("/spectate") },
  ];

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-xl">
        <AnimatePresence mode="wait">
          {!mode ? (
            <motion.div key="modes" {...cardMotion} className="space-y-5">
              {/* Header */}
              <div className="text-center mb-2">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
                  <Swords className="w-7 h-7 text-primary" />
                </div>
                <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight">Choose Game Mode</h1>
                <p className="text-sm text-muted-foreground mt-1">Select how you want to play</p>
              </div>

              {/* Primary modes */}
              <div className="space-y-2.5">
                {gameModes.map((gm, i) => (
                  <motion.button
                    key={gm.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setMode(gm.id)}
                    className={`w-full rounded-xl border p-4 text-left group transition-all duration-200 flex items-center gap-4 ${
                      gm.accent
                        ? "bg-primary/5 border-primary/25 hover:bg-primary/10 hover:border-primary/40 shadow-[0_0_20px_-8px_hsl(var(--primary)/0.3)]"
                        : "bg-card/60 border-border/40 hover:bg-card/80 hover:border-border/60"
                    }`}
                  >
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      gm.accent ? "bg-primary/15 group-hover:bg-primary/25" : "bg-secondary/60 group-hover:bg-secondary/80"
                    }`}>
                      <gm.icon className={`w-5 h-5 ${gm.accent ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-bold text-sm">{gm.title}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{gm.desc}</p>
                    </div>
                    <ChevronRight className={`w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5 ${
                      gm.accent ? "text-primary/50" : "text-muted-foreground/30"
                    }`} />
                  </motion.button>
                ))}
              </div>

              {/* Time control & variant */}
              <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
                <TimeControlSelector selected={selectedTimeControl} onSelect={setSelectedTimeControl} />
                <div className="flex items-center justify-between pt-3 border-t border-border/20">
                  <div className="flex items-center gap-2">
                    <Shuffle className="w-3.5 h-3.5 text-primary" />
                    <span className="font-display text-xs font-bold">Chess960</span>
                    <span className="text-[10px] text-muted-foreground">Fischer Random</span>
                  </div>
                  <button onClick={() => setChess960((v) => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${chess960 ? "bg-primary" : "bg-secondary border border-border"}`}>
                    <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-transform ${chess960 ? "translate-x-4" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Secondary modes */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-2.5 px-1">More Ways to Play</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {secondaryModes.map((sm, i) => (
                    <motion.button
                      key={sm.title}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={sm.onClick}
                      className="rounded-xl border border-border/40 bg-card/60 p-4 text-left hover:bg-card/80 hover:border-border/60 transition-all group"
                    >
                      <div className="w-9 h-9 rounded-lg bg-secondary/60 group-hover:bg-secondary/80 flex items-center justify-center mb-2.5 transition-colors">
                        <sm.icon className="w-4.5 h-4.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </div>
                      <h3 className="font-display font-bold text-xs">{sm.title}</h3>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{sm.desc}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : mode === "private" ? (
            <motion.div key="private" {...cardMotion} className="space-y-5">
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-3">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <h2 className="font-display text-xl font-bold">Private Room</h2>
                <p className="text-xs text-muted-foreground mt-1">Create or join a private match</p>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                <p className="font-display text-sm font-bold mb-2.5 flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-primary" />Time Limit
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIME_LIMIT_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setDurationSeconds(option.value)}
                      className={`text-xs px-3.5 py-1.5 rounded-lg border font-medium transition-all ${
                        durationSeconds === option.value
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-secondary/40 border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {privateRoom.status === "idle" && (
                <div className="space-y-3">
                  <motion.button
                    whileHover={{ scale: 1.005 }}
                    whileTap={{ scale: 0.995 }}
                    onClick={async () => { setCreatingRoom(true); await privateRoom.createRoom(durationSeconds); setCreatingRoom(false); }}
                    disabled={creatingRoom}
                    className="w-full rounded-xl border border-primary/25 bg-primary/5 hover:bg-primary/10 p-6 text-center disabled:opacity-70 transition-all shadow-[0_0_20px_-8px_hsl(var(--primary)/0.3)]"
                  >
                    {creatingRoom
                      ? <Loader2 className="w-7 h-7 text-primary mx-auto mb-2 animate-spin" />
                      : <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center mx-auto mb-3"><Users className="w-6 h-6 text-primary" /></div>
                    }
                    <h3 className="font-display font-bold text-sm">Create Room</h3>
                    <p className="text-xs text-muted-foreground mt-1">Get a code to share with a friend</p>
                  </motion.button>

                  <div className="relative flex items-center gap-3 py-1">
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">or</span>
                    <div className="flex-1 h-px bg-border/30" />
                  </div>

                  <div className="rounded-xl border border-border/40 bg-card/60 p-5">
                    <h3 className="font-display font-bold text-sm mb-3">Join a Room</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="ENTER CODE"
                        maxLength={6}
                        className="flex-1 bg-secondary/60 border border-border/50 rounded-lg px-4 py-2.5 font-mono text-lg tracking-[0.25em] text-center uppercase focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30 transition-all placeholder:text-muted-foreground/40 placeholder:text-sm placeholder:tracking-widest"
                      />
                      <button
                        onClick={async () => { setJoiningRoom(true); await privateRoom.joinRoom(joinCode, durationSeconds, chess960 ? "chess960" : null); setJoiningRoom(false); }}
                        disabled={joinCode.length < 6 || joiningRoom}
                        className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg disabled:opacity-40 transition-all hover:opacity-90"
                      >
                        {joiningRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : "JOIN"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {(privateRoom.status === "waiting" || privateRoom.status === "joined") && privateRoom.roomCode && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
                  <Loader2 className="w-8 h-8 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="font-display font-bold mb-1">
                    {privateRoom.status === "joined" ? "Opponent Connected" : "Waiting for Opponent…"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-5">
                    {privateRoom.status === "joined" ? "Launching game room…" : "Share this code with a friend"}
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="font-mono text-3xl tracking-[0.3em] font-bold text-primary">{privateRoom.roomCode}</span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 rounded-lg bg-secondary/60 hover:bg-primary/15 transition-colors border border-border/40"
                    >
                      {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
                    </button>
                  </div>
                </div>
              )}

              {privateRoom.error && <p className="text-destructive text-sm text-center">{privateRoom.error}</p>}
            </motion.div>
          ) : (
            <motion.div key="searching" {...cardMotion} className="space-y-5">
              <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back
              </button>

              {mode === "world_arena" && (
                <div className="rounded-xl border border-border/40 bg-card/60 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                    </span>
                    <span className="text-sm font-display font-bold">{onlineUserIds.size} player{onlineUserIds.size !== 1 ? "s" : ""} online</span>
                  </div>
                  <Globe className="w-4 h-4 text-muted-foreground" />
                </div>
              )}

              <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                <p className="font-display text-sm font-bold mb-2.5 flex items-center gap-2">
                  <Clock3 className="w-4 h-4 text-primary" />Time Limit
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIME_LIMIT_OPTIONS.map((option) => (
                    <button
                      key={option.label}
                      onClick={() => setDurationSeconds(option.value)}
                      className={`text-xs px-3.5 py-1.5 rounded-lg border font-medium transition-all ${
                        durationSeconds === option.value
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "bg-secondary/40 border-border/50 hover:border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {matchmaking.state === "idle" && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
                    {mode === "world_arena" ? <Globe className="w-8 h-8 text-primary" /> : <Swords className="w-8 h-8 text-primary" />}
                  </div>
                  <h2 className="font-display text-xl font-bold mb-1">{mode === "world_arena" ? "World Arena" : "Quick Play"}</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    {mode === "world_arena" ? "Compete against players worldwide for leaderboard glory" : "Find an opponent matched to your skill level"}
                  </p>
                  <button
                    onClick={() => matchmaking.startSearch(mode!, durationSeconds)}
                    className="bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider px-8 py-3 rounded-xl hover:opacity-90 transition-all shadow-[0_0_24px_-6px_hsl(var(--primary)/0.4)]"
                  >
                    FIND MATCH
                  </button>
                </div>
              )}

              {matchmaking.state === "searching" && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center">
                  <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="font-display font-bold text-lg mb-1">Searching for Opponent…</h3>
                  <p className="text-sm text-muted-foreground mb-5">Looking for players near your rating</p>
                  <button onClick={() => matchmaking.cancelSearch()} className="text-sm text-muted-foreground hover:text-destructive transition-colors">
                    Cancel
                  </button>
                  <div className="border-t border-border/30 mt-6 pt-4">
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
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
                  <p className="text-destructive text-sm mb-4">{matchmaking.error}</p>
                  <div className="flex gap-3 justify-center">
                    <button onClick={() => matchmaking.startSearch(mode!, durationSeconds)} className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg">
                      TRY AGAIN
                    </button>
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
                <div className="rounded-xl border border-border/40 bg-card/60 p-4">
                  <p className="font-display font-bold text-sm mb-2.5">World Chat</p>
                  <div className="h-36 overflow-y-auto bg-secondary/30 rounded-lg p-2.5 space-y-1 text-xs border border-border/20">
                    {worldChatMessages.length === 0 && <p className="text-muted-foreground text-center py-4">No messages yet</p>}
                    {worldChatMessages.map((msg) => (
                      <WorldChatMessageItem key={msg.id} msg={msg} onlineUserIds={onlineUserIds} />
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2.5">
                    <input
                      value={worldChatInput}
                      onChange={(e) => setWorldChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendWorldMessage()}
                      placeholder="Type a message…"
                      className="flex-1 bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
                    />
                    <button onClick={sendWorldMessage} className="bg-primary/15 text-primary px-4 rounded-lg text-xs font-display font-bold hover:bg-primary/25 transition-colors">
                      Send
                    </button>
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
