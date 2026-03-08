import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Globe, Users, ArrowLeft, Copy, Check, Loader2, Crown, Bot, Eye, Timer, Shuffle, ChevronRight, Zap, Flame, Clock, Trophy, MessageSquare, Send, UserCheck, BrainCircuit, GraduationCap, Rocket } from "lucide-react";
import { TimeControlSelector, TIME_CONTROLS, type TimeControl } from "@/components/chess/ChessClock";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { usePrivateRoom } from "@/hooks/usePrivateRoom";
import { supabase } from "@/integrations/supabase/client";
import WorldChatMessageItem, { type ChatMessage } from "@/components/chat/WorldChatMessage";

type Mode = null | "quick_play" | "world_arena" | "private" | "vs_computer";
type AIDifficulty = "beginner" | "intermediate" | "advanced";
type WorldChatMessage = ChatMessage;

const cardMotion = {
  initial: { opacity: 0, y: 16, filter: "blur(4px)" },
  animate: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -12, filter: "blur(3px)" },
  transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
};

const CATEGORY_META: Record<string, { icon: typeof Zap; color: string }> = {
  bullet: { icon: Zap, color: "text-destructive" },
  blitz: { icon: Flame, color: "text-amber-400" },
  rapid: { icon: Clock, color: "text-emerald-400" },
  classical: { icon: Crown, color: "text-primary" },
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
  const [selectedTimeControl, setSelectedTimeControl] = useState<TimeControl | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [chess960, setChess960] = useState(false);
  const [roomPreview, setRoomPreview] = useState<{ host_username: string | null; duration_seconds: number | null } | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const worldChatChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

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

  // World Arena presence & chat
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
        setOnlineUserIds(new Set<string>(Object.keys(state)));
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
      worldChatChannelRef.current?.send({
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
      worldChatChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [mode, user?.user_metadata?.username]);

  // Auto scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [worldChatMessages]);

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
    await worldChatChannelRef.current?.send({ type: "broadcast", event: "message", payload: message });
  };

  const handleBack = () => {
    if (matchmaking.state === "searching") matchmaking.cancelSearch();
    privateRoom.reset();
    setMode(null);
    setJoinCode("");
    setRoomPreview(null);
  };

  // Fetch room preview when a valid 6-char code is entered
  useEffect(() => {
    if (joinCode.length !== 6 || mode !== "private") {
      setRoomPreview(null);
      return;
    }
    const sanitized = joinCode.trim().toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(sanitized)) return;

    let cancelled = false;
    setFetchingPreview(true);
    (async () => {
      const { data: room } = await supabase
        .from("game_rooms")
        .select("duration_seconds, increment_seconds, host_id")
        .eq("room_code", sanitized)
        .eq("status", "waiting")
        .single();

      if (cancelled) return;
      if (!room) {
        setRoomPreview(null);
        setFetchingPreview(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", room.host_id)
        .single();

      if (cancelled) return;
      setRoomPreview({
        host_username: profile?.username ?? "Unknown",
        duration_seconds: (room as any).duration_seconds ?? null,
      });
      setFetchingPreview(false);
    })();

    return () => { cancelled = true; };
  }, [joinCode, mode]);

  const durationFromTC = selectedTimeControl ? selectedTimeControl.initialSeconds : null;

  const gameModes = [
    { id: "quick_play" as Mode, icon: Swords, title: "Quick Play", desc: "Instant match at your skill level", accent: true },
    { id: "world_arena" as Mode, icon: Globe, title: "World Arena", desc: "Global ranked competition" },
    { id: "private" as Mode, icon: Users, title: "Private Room", desc: "Invite a friend with a room code" },
  ];

  const secondaryModes = [
    { icon: Bot, title: "vs Computer", desc: "Practice against AI", onClick: () => setMode("vs_computer") },
    { icon: Shuffle, title: "Chess960", desc: "Fischer Random", onClick: () => navigate(`/play?mode=computer&variant=chess960${selectedTimeControl ? `&tc=${selectedTimeControl.label}` : ""}`) },
    { icon: Crown, title: "Local Play", desc: "Same device", onClick: () => { const p = new URLSearchParams(); if (selectedTimeControl) p.set("tc", selectedTimeControl.label); if (chess960) p.set("variant", "chess960"); navigate(`/play${p.toString() ? `?${p}` : ""}`); } },
    { icon: Eye, title: "Spectate", desc: "Watch live games", onClick: () => navigate("/spectate") },
  ];

  // --------------- MODE SELECTION ---------------
  const renderModeSelection = () => (
    <motion.div key="modes" {...cardMotion} className="space-y-6">
      {/* Hero header */}
      <div className="text-center relative">
        <div className="absolute inset-0 -top-20 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/6 blur-[120px]" />
        </div>
        <div className="relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-4 gold-glow">
            <Swords className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight">Choose Game Mode</h1>
          <p className="text-sm text-muted-foreground mt-1.5">Select how you want to play</p>
        </div>
      </div>

      <div className="space-y-3">
        {gameModes.map((gm, i) => (
          <motion.button
            key={gm.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setMode(gm.id)}
            className={`w-full rounded-xl border p-4 text-left group transition-all duration-300 flex items-center gap-4 backdrop-blur-sm ${
              gm.accent
                ? "bg-primary/5 border-primary/25 hover:bg-primary/10 hover:border-primary/40 shadow-[0_0_24px_-8px_hsl(var(--primary)/0.3)]"
                : "glass-card hover:border-primary/20"
            }`}
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
              gm.accent ? "bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 group-hover:shadow-sm group-hover:shadow-primary/15" : "bg-secondary/60 group-hover:bg-secondary/80"
            }`}>
              <gm.icon className={`w-5 h-5 ${gm.accent ? "text-primary" : "text-muted-foreground group-hover:text-foreground"} transition-colors`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display font-bold text-sm">{gm.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{gm.desc}</p>
            </div>
            <ChevronRight className={`w-4 h-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1 ${gm.accent ? "text-primary/50" : "text-muted-foreground/30"}`} />
          </motion.button>
        ))}
      </div>

      {/* Secondary modes */}
      <div>
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3 px-1">More Ways to Play</p>
        <div className="grid grid-cols-2 gap-3">
          {secondaryModes.map((sm, i) => (
            <motion.button
              key={sm.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.06, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={sm.onClick}
              className="glass-card p-4 text-left hover:border-primary/20 transition-all duration-300 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-secondary/60 group-hover:bg-primary/10 flex items-center justify-center mb-3 transition-colors duration-300 border border-border/30 group-hover:border-primary/15">
                  <sm.icon className="w-4.5 h-4.5 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                </div>
                <h3 className="font-display font-bold text-xs">{sm.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{sm.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );

  // --------------- QUICK PLAY ---------------
  const renderQuickPlay = () => (
    <motion.div key="quick_play" {...cardMotion} className="space-y-4">
      <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-3 gold-glow">
          <Swords className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold">Quick Play</h2>
        <p className="text-xs text-muted-foreground mt-1">Choose time control and find a match</p>
      </div>

      {/* Time control integrated here */}
      <div className="glass-card p-4">
        <TimeControlSelector selected={selectedTimeControl} onSelect={setSelectedTimeControl} />
      </div>

      {/* Chess960 toggle */}
      <div className="glass-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shuffle className="w-3.5 h-3.5 text-primary" />
          <span className="font-display text-xs font-bold">Chess960</span>
          <span className="text-[10px] text-muted-foreground">Fischer Random</span>
        </div>
        <button onClick={() => setChess960((v) => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${chess960 ? "bg-primary" : "bg-secondary border border-border"}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-transform ${chess960 ? "translate-x-4" : ""}`} />
        </button>
      </div>

      {/* Selected summary */}
      {selectedTimeControl && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-3">
          {(() => {
            const meta = CATEGORY_META[selectedTimeControl.category];
            const Icon = meta.icon;
            return <Icon className={`w-4 h-4 ${meta.color}`} />;
          })()}
          <div className="flex-1">
            <span className="font-display font-bold text-sm">{selectedTimeControl.label}</span>
            <span className="text-xs text-muted-foreground ml-2">
              {selectedTimeControl.initialSeconds / 60}min{selectedTimeControl.incrementSeconds > 0 ? ` +${selectedTimeControl.incrementSeconds}s` : ""}
            </span>
          </div>
          <span className={`text-[10px] uppercase tracking-wider font-bold ${CATEGORY_META[selectedTimeControl.category].color}`}>
            {selectedTimeControl.category}
          </span>
        </div>
      )}

      {/* Action */}
      {matchmaking.state === "idle" && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => matchmaking.startSearch("quick_play", durationFromTC)}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-sm tracking-wider py-4 transition-all gold-glow hover:shadow-lg hover:shadow-primary/25"
        >
          {selectedTimeControl ? `FIND ${selectedTimeControl.label} MATCH` : "FIND MATCH"}
        </motion.button>
      )}

      {matchmaking.state === "searching" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-8 text-center space-y-4">
          <Loader2 className="w-10 h-10 text-primary mx-auto animate-spin" />
          <h3 className="font-display font-bold text-lg">Searching…</h3>
          <p className="text-sm text-muted-foreground">Looking for players near your rating</p>
          {selectedTimeControl && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-secondary/60 border border-border/40 rounded-lg px-3 py-1.5 font-display font-bold">
              <Timer className="w-3 h-3 text-primary" />
              {selectedTimeControl.label} · {selectedTimeControl.category}
            </span>
          )}
          <div className="space-y-3 pt-2">
            <button onClick={() => matchmaking.cancelSearch()} className="text-sm text-muted-foreground hover:text-destructive transition-colors">Cancel Search</button>
            <div className="border-t border-border/30 pt-4">
              <p className="text-xs text-muted-foreground mb-2">No opponents?</p>
              <button
                onClick={() => { matchmaking.cancelSearch(); navigate(`/play?mode=computer&ranked=true${selectedTimeControl ? `&tc=${selectedTimeControl.label}` : ""}`); }}
                className="inline-flex items-center gap-2 border border-primary/30 text-primary px-4 py-2 rounded-lg text-sm font-display font-bold hover:bg-primary/10 transition-colors"
              >
                <Bot className="w-4 h-4" /> Play vs AI
              </button>
            </div>
          </div>
        </div>
      )}

      {matchmaking.state === "error" && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-destructive text-sm">{matchmaking.error}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => matchmaking.startSearch("quick_play", durationFromTC)} className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg">RETRY</button>
            <button onClick={() => navigate("/play?mode=computer")} className="border border-primary/30 text-primary font-display font-bold text-xs px-6 py-2.5 rounded-lg hover:bg-primary/10">
              <Bot className="w-4 h-4 inline mr-1" /> vs AI
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );

  // --------------- WORLD ARENA ---------------
  const renderWorldArena = () => (
    <motion.div key="world_arena" {...cardMotion} className="space-y-4">
      <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>

      {/* Arena Header */}
      <div className="glass-card p-6 text-center relative overflow-hidden border-glow">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.08),transparent_70%)]" />
        <div className="relative">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/25 mb-3 gold-glow">
            <Globe className="w-8 h-8 text-primary" />
          </div>
          <h2 className="font-display text-2xl font-black tracking-tight">World Arena</h2>
          <p className="text-xs text-muted-foreground mt-1.5">Compete globally for leaderboard rankings</p>
        </div>
      </div>

      {/* Online & Leaderboard strip */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="rounded-xl border border-border/40 bg-card/60 p-3.5 flex items-center gap-3">
          <div className="relative">
            <span className="flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
            </span>
          </div>
          <div>
            <span className="font-display font-bold text-lg block leading-none">{onlineUserIds.size}</span>
            <span className="text-[10px] text-muted-foreground">Online Now</span>
          </div>
        </div>
        <button
          onClick={() => navigate("/leaderboard")}
          className="glass-card p-3.5 flex items-center gap-3 hover:border-primary/20 transition-all group"
        >
          <Trophy className="w-5 h-5 text-primary" />
          <div className="text-left">
            <span className="font-display font-bold text-xs block">Leaderboard</span>
            <span className="text-[10px] text-muted-foreground">View rankings</span>
          </div>
        </button>
      </div>

      {/* Time Control - integrated */}
      <div className="glass-card p-4">
        <TimeControlSelector selected={selectedTimeControl} onSelect={setSelectedTimeControl} />
      </div>

      {/* Chess960 toggle */}
      <div className="glass-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shuffle className="w-3.5 h-3.5 text-primary" />
          <span className="font-display text-xs font-bold">Chess960</span>
        </div>
        <button onClick={() => setChess960((v) => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${chess960 ? "bg-primary" : "bg-secondary border border-border"}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-transform ${chess960 ? "translate-x-4" : ""}`} />
        </button>
      </div>

      {/* Match action */}
      {matchmaking.state === "idle" && (
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => matchmaking.startSearch("world_arena", durationFromTC)}
          className="w-full rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-sm tracking-wider py-4 transition-all gold-glow hover:shadow-lg hover:shadow-primary/25 flex items-center justify-center gap-2"
        >
          <Globe className="w-4 h-4" />
          {selectedTimeControl ? `ENTER ARENA · ${selectedTimeControl.label}` : "ENTER ARENA"}
        </motion.button>
      )}

      {matchmaking.state === "searching" && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
          <h3 className="font-display font-bold">Searching…</h3>
          {selectedTimeControl && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-secondary/60 border border-border/40 rounded-lg px-3 py-1.5 font-display font-bold">
              <Timer className="w-3 h-3 text-primary" />{selectedTimeControl.label}
            </span>
          )}
          <button onClick={() => matchmaking.cancelSearch()} className="block mx-auto text-sm text-muted-foreground hover:text-destructive transition-colors">Cancel</button>
        </div>
      )}

      {matchmaking.state === "error" && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-center space-y-3">
          <p className="text-destructive text-sm">{matchmaking.error}</p>
          <button onClick={() => matchmaking.startSearch("world_arena", durationFromTC)} className="bg-primary text-primary-foreground font-display font-bold text-xs px-6 py-2.5 rounded-lg">
            RETRY
          </button>
        </div>
      )}

      {/* World Chat */}
      <div className="glass-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="font-display font-bold text-sm">World Chat</span>
          </div>
          <div className="flex items-center gap-1.5">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            <span className="text-[10px] text-muted-foreground">{onlineUserIds.size} online</span>
          </div>
        </div>
        <div className="h-44 overflow-y-auto p-3 space-y-1 text-xs">
          {worldChatMessages.length === 0 && <p className="text-muted-foreground text-center py-8">No messages yet — say hello!</p>}
          {worldChatMessages.map((msg) => (
            <WorldChatMessageItem key={msg.id} msg={msg} onlineUserIds={onlineUserIds} />
          ))}
          <div ref={chatEndRef} />
        </div>
        <div className="px-3 pb-3">
          <div className="flex gap-2">
            <input
              value={worldChatInput}
              onChange={(e) => setWorldChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendWorldMessage()}
              placeholder="Type a message…"
              className="flex-1 bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40 transition-all"
            />
            <button onClick={sendWorldMessage} className="bg-primary/15 text-primary p-2 rounded-lg hover:bg-primary/25 transition-colors">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // --------------- PRIVATE ROOM ---------------
  const renderPrivateRoom = () => (
    <motion.div key="private" {...cardMotion} className="space-y-4">
      <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-3 gold-glow">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold">Private Room</h2>
        <p className="text-xs text-muted-foreground mt-1">Create or join a private match</p>
      </div>

      {/* Time control integrated */}
      <div className="glass-card p-4">
        <TimeControlSelector selected={selectedTimeControl} onSelect={setSelectedTimeControl} />
      </div>

      {/* Chess960 */}
      <div className="glass-card px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shuffle className="w-3.5 h-3.5 text-primary" />
          <span className="font-display text-xs font-bold">Chess960</span>
        </div>
        <button onClick={() => setChess960((v) => !v)} className={`relative w-9 h-5 rounded-full transition-colors ${chess960 ? "bg-primary" : "bg-secondary border border-border"}`}>
          <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-primary-foreground transition-transform ${chess960 ? "translate-x-4" : ""}`} />
        </button>
      </div>

      {/* Selected TC preview */}
      {selectedTimeControl && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 flex items-center gap-2">
          <Timer className="w-3.5 h-3.5 text-primary" />
          <span className="font-display font-bold text-xs">{selectedTimeControl.label}</span>
          <span className="text-[10px] text-muted-foreground">{selectedTimeControl.category}</span>
        </div>
      )}

      {privateRoom.status === "idle" && (
        <div className="space-y-3">
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            onClick={async () => { setCreatingRoom(true); await privateRoom.createRoom(durationFromTC, selectedTimeControl?.incrementSeconds ?? null); setCreatingRoom(false); }}
            disabled={creatingRoom}
            className="w-full glass-card p-6 text-center disabled:opacity-70 transition-all hover:border-primary/25 border-glow"
          >
            {creatingRoom
              ? <Loader2 className="w-7 h-7 text-primary mx-auto mb-2 animate-spin" />
              : <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 flex items-center justify-center mx-auto mb-3 gold-glow"><Users className="w-7 h-7 text-primary" /></div>
            }
            <h3 className="font-display font-bold text-sm">Create Room</h3>
            <p className="text-xs text-muted-foreground mt-1">Get a code to share with a friend</p>
          </motion.button>

          <div className="relative flex items-center gap-3 py-1">
            <div className="flex-1 h-px bg-border/30" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">or</span>
            <div className="flex-1 h-px bg-border/30" />
          </div>

          <div className="glass-card p-5">
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
                onClick={async () => { setJoiningRoom(true); await privateRoom.joinRoom(joinCode, durationFromTC, chess960 ? "chess960" : null); setJoiningRoom(false); }}
                disabled={joinCode.length < 6 || joiningRoom || fetchingPreview}
                className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg disabled:opacity-40 transition-all hover:opacity-90"
              >
                {joiningRoom ? <Loader2 className="w-4 h-4 animate-spin" /> : "JOIN"}
              </button>
            </div>

            {/* Room preview */}
            {fetchingPreview && joinCode.length === 6 && (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> Looking up room…
              </div>
            )}
            {roomPreview && !fetchingPreview && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 space-y-1.5"
              >
                <div className="flex items-center gap-2">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  <span className="font-display font-bold text-xs">Host: {roomPreview.host_username}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="w-3.5 h-3.5 text-primary" />
                  <span className="font-display font-bold text-xs">
                    {roomPreview.duration_seconds
                      ? (() => {
                          const tc = TIME_CONTROLS.find((t) => t.initialSeconds === roomPreview.duration_seconds);
                          return tc ? `${tc.label} (${tc.category})` : `${roomPreview.duration_seconds / 60} min`;
                        })()
                      : "No time limit"}
                  </span>
                </div>
              </motion.div>
            )}
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
            <button onClick={handleCopyCode} className="p-2 rounded-lg bg-secondary/60 hover:bg-primary/15 transition-colors border border-border/40">
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      )}

      {privateRoom.error && <p className="text-destructive text-sm text-center">{privateRoom.error}</p>}
    </motion.div>
  );

  // --------------- VS COMPUTER ---------------
  const AI_DIFFICULTIES: { id: AIDifficulty; icon: typeof GraduationCap; title: string; desc: string; elo: string; color: string }[] = [
    { id: "beginner", icon: GraduationCap, title: "Beginner", desc: "Plays casually with frequent mistakes", elo: "~400-800", color: "text-emerald-400" },
    { id: "intermediate", icon: BrainCircuit, title: "Intermediate", desc: "Solid play with occasional inaccuracies", elo: "~1000-1400", color: "text-amber-400" },
    { id: "advanced", icon: Rocket, title: "Advanced", desc: "Strong engine play — very challenging", elo: "~1800-2200", color: "text-destructive" },
  ];

  const renderVsComputer = () => (
    <motion.div key="vs_computer" {...cardMotion} className="space-y-5">
      <button onClick={handleBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back
      </button>

      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 mb-3 gold-glow">
          <Bot className="w-7 h-7 text-primary" />
        </div>
        <h2 className="font-display text-xl font-bold">Play vs Computer</h2>
        <p className="text-xs text-muted-foreground mt-1">Choose AI difficulty level</p>
      </div>

      <div className="space-y-3">
        {AI_DIFFICULTIES.map((diff, i) => (
          <motion.button
            key={diff.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate(`/play?mode=computer&difficulty=${diff.id}${selectedTimeControl ? `&tc=${selectedTimeControl.label}` : ""}`)}
            className="w-full rounded-xl border glass-card p-4 text-left group hover:border-primary/20 transition-all duration-300 flex items-center gap-4"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary/60 group-hover:bg-primary/10 flex items-center justify-center shrink-0 transition-colors duration-300 border border-border/30 group-hover:border-primary/15">
              <diff.icon className={`w-5 h-5 ${diff.color} transition-colors`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-display font-bold text-sm">{diff.title}</h3>
                <span className={`text-[10px] font-bold ${diff.color}`}>{diff.elo}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{diff.desc}</p>
            </div>
            <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground/30 group-hover:translate-x-1 group-hover:text-primary/50 transition-all duration-300" />
          </motion.button>
        ))}
      </div>

      {/* Time control */}
      <div className="glass-card p-4">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-3">Time Control (optional)</p>
        <TimeControlSelector selected={selectedTimeControl} onSelect={setSelectedTimeControl} />
      </div>
    </motion.div>
  );

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-xl">
        <AnimatePresence mode="wait">
          {!mode && renderModeSelection()}
          {mode === "quick_play" && renderQuickPlay()}
          {mode === "world_arena" && renderWorldArena()}
          {mode === "private" && renderPrivateRoom()}
          {mode === "vs_computer" && renderVsComputer()}
        </AnimatePresence>
      </div>
    </div>
  );
};


export default Lobby;
