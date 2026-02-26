import { useRef, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Globe, Users, ArrowLeft, Copy, Check, Loader2, Crown, Bot, Clock3 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useMatchmaking } from "@/hooks/useMatchmaking";
import { usePrivateRoom } from "@/hooks/usePrivateRoom";
import { supabase } from "@/integrations/supabase/client";

type Mode = null | "quick_play" | "world_arena" | "private";

interface WorldChatMessage {
  id: string;
  sender: string;
  text: string;
  createdAt: number;
  kind?: "chat" | "system";
}

const TIME_LIMIT_OPTIONS = [
  { label: "No limit", value: null },
  { label: "10 min", value: 10 * 60 },
  { label: "15 min", value: 15 * 60 },
  { label: "20 min", value: 20 * 60 },
  { label: "30 min", value: 30 * 60 },
];

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
    if (privateRoom.gameId) navigate(`/play?game=${privateRoom.gameId}`);
  }, [privateRoom.gameId, navigate]);

  const handleCopyCode = () => {
    if (!privateRoom.roomCode) return;
    navigator.clipboard.writeText(privateRoom.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    if (mode !== "world_arena") return;

    const channel = supabase.channel("world-matchmaking-chat")
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setWorldChatMessages((prev) => [...prev.slice(-59), payload as WorldChatMessage]);
      })
      .subscribe(async () => {
        const joinMessage: WorldChatMessage = {
          id: crypto.randomUUID(),
          sender: "Arena",
          text: `${user?.user_metadata?.username || "Player"} entered World Arena`,
          createdAt: Date.now(),
          kind: "system",
        };
        await channel.send({ type: "broadcast", event: "message", payload: joinMessage });
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
              </div>

              {privateRoom.status === "idle" && (
                <div className="space-y-4">
                  <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }} onClick={async () => { setCreatingRoom(true); await privateRoom.createRoom(durationSeconds); setCreatingRoom(false); }} disabled={creatingRoom} className="w-full glass-card p-6 border-primary/30 gold-glow text-center disabled:opacity-70">
                    {creatingRoom ? <Loader2 className="w-8 h-8 text-primary mx-auto mb-2 animate-spin" /> : <Users className="w-8 h-8 text-primary mx-auto mb-2" />}
                    <h3 className="font-display font-bold">Create Room</h3>
                    <p className="text-sm text-muted-foreground">Get a code to share with a friend</p>
                  </motion.button>

                  <div className="glass-card p-6">
                    <h3 className="font-display font-bold text-sm mb-3">Join a Room</h3>
                    <div className="flex gap-2">
                      <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} placeholder="Enter room code" maxLength={6} className="flex-1 bg-secondary border border-border rounded-lg px-4 py-2.5 font-mono text-lg tracking-widest text-center uppercase focus:outline-none focus:ring-2 focus:ring-primary" />
                      <button onClick={async () => { setJoiningRoom(true); await privateRoom.joinRoom(joinCode, durationSeconds); setJoiningRoom(false); }} disabled={joinCode.length < 6 || joiningRoom} className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg disabled:opacity-50 transition-all hover:scale-105">
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

              <div className="glass-card p-4">
                <p className="font-display text-sm font-bold mb-2 flex items-center gap-2"><Clock3 className="w-4 h-4 text-primary" />Match Time Limit</p>
                <div className="flex flex-wrap gap-2">
                  {TIME_LIMIT_OPTIONS.map((option) => (
                    <button key={option.label} onClick={() => setDurationSeconds(option.value)} className={`text-xs px-3 py-1.5 rounded-md border ${durationSeconds === option.value ? "bg-primary/20 border-primary text-primary" : "bg-secondary/40 border-border"}`}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {matchmaking.state === "idle" && (
                <div className="glass-card p-8 border-glow text-center">
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">{mode === "world_arena" ? <Globe className="w-8 h-8 text-primary" /> : <Swords className="w-8 h-8 text-primary" />}</div>
                  <h2 className="font-display text-xl font-bold mb-2">{mode === "world_arena" ? "World Arena" : "Quick Play"}</h2>
                  <p className="text-sm text-muted-foreground mb-6">{mode === "world_arena" ? "Compete against players worldwide for leaderboard glory" : "Find an opponent matched to your skill level"}</p>
                  <button onClick={() => matchmaking.startSearch(mode!, durationSeconds)} className="bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider px-8 py-3 rounded-lg gold-glow hover:scale-105 transition-transform">FIND MATCH</button>
                </div>
              )}

              {matchmaking.state === "searching" && (
                <div className="glass-card p-8 border-glow text-center">
                  <Loader2 className="w-10 h-10 text-primary mx-auto mb-4 animate-spin" />
                  <h3 className="font-display font-bold text-lg mb-2">Searching for opponent...</h3>
                  <p className="text-sm text-muted-foreground mb-6">Looking for players near your rating and selected time control</p>
                  <button onClick={() => { matchmaking.cancelSearch(); }} className="text-sm text-muted-foreground hover:text-destructive transition-colors">Cancel</button>
                </div>
              )}

              {matchmaking.state === "error" && (
                <div className="glass-card p-8 text-center">
                  <p className="text-destructive mb-4">{matchmaking.error}</p>
                  <button onClick={() => matchmaking.startSearch(mode!, durationSeconds)} className="bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-6 py-2.5 rounded-lg">TRY AGAIN</button>
                </div>
              )}

              {mode === "world_arena" && (
                <div className="glass-card p-4">
                  <p className="font-display font-bold text-sm mb-2">World Matchmaking Chat</p>
                  <div className="h-36 overflow-y-auto bg-secondary/40 rounded-md p-2 space-y-1 text-xs">
                    {worldChatMessages.length === 0 && <p className="text-muted-foreground">No messages yet.</p>}
                    {worldChatMessages.map((msg) => (
                      <p key={msg.id} className={msg.kind === "system" ? "text-primary/90 italic" : ""}>
                        {msg.kind === "system" ? msg.text : <><span className="text-primary font-semibold">{msg.sender}:</span> {msg.text}</>}
                      </p>
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
