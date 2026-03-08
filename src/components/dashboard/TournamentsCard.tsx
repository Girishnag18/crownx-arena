import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Loader2, User, Clock, Crown, Timer, Users, Swords } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Tournament {
  id: string;
  name: string;
  prize_pool: number;
  max_players: number;
  created_by?: string;
  status: string;
  tournament_type?: string;
  starts_at: string | null;
  registration_count?: { count: number }[];
}

interface RecentTournamentRow {
  id: string;
  name: string;
  prize_pool: number;
  player_count: number;
  tournament_type: string;
  status: string;
  ended_at?: string | null;
}

interface TournamentsCardProps {
  activeTournaments: Tournament[];
  recentTournaments: RecentTournamentRow[];
  registeredIds: string[];
  registeringId: string | null;
  userId: string;
  onRegister: (id: string) => void;
  onCancel: (t: Tournament) => void;
  onNavigateToTournament: (id: string) => void;
  showCreateForm: boolean;
  onToggleCreate: () => void;
  createFormProps: {
    name: string;
    setName: (v: string) => void;
    prizePool: string;
    setPrizePool: (v: string) => void;
    maxPlayers: string;
    setMaxPlayers: (v: string) => void;
    startsAt: string;
    setStartsAt: (v: string) => void;
    type: string;
    setType: (v: string) => void;
    loading: boolean;
    onCreate: () => void;
  };
}

/* ─── Countdown Hook ─── */
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) { setTimeLeft(""); return; }

    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft("Starting now"); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      if (h > 24) {
        const d = Math.floor(h / 24);
        setTimeLeft(`${d}d ${h % 24}h`);
      } else if (h > 0) {
        setTimeLeft(`${h}h ${m}m`);
      } else {
        setTimeLeft(`${m}m ${s}s`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

/* ─── Player fill bar ─── */
const FillBar = ({ count, max }: { count: number; max: number }) => {
  const pct = max > 0 ? Math.min((count / max) * 100, 100) : 0;
  return (
    <div className="flex items-center gap-2 w-full">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
        <Users className="w-3 h-3" />
        <span className="font-display font-bold text-foreground">{count}</span>/{max}
      </div>
      <Progress value={pct} className="h-1.5 flex-1" />
    </div>
  );
};

/* ─── Countdown Badge ─── */
const CountdownBadge = ({ startsAt }: { startsAt: string | null }) => {
  const timeLeft = useCountdown(startsAt);
  if (!timeLeft) return null;

  const isStarting = timeLeft === "Starting now";
  return (
    <span className={`inline-flex items-center gap-1 text-[9px] font-display font-bold px-2 py-0.5 rounded-full ${
      isStarting
        ? "bg-emerald-500/12 text-emerald-400"
        : "bg-accent/10 text-accent"
    }`}>
      <Timer className="w-2.5 h-2.5" />
      {timeLeft}
    </span>
  );
};

/* ─── Player Avatars Stack ─── */
const PlayerAvatarStack = ({ count }: { count: number }) => {
  const shown = Math.min(count, 5);
  const extra = count - shown;

  return (
    <div className="flex items-center -space-x-1.5">
      {Array.from({ length: shown }).map((_, i) => (
        <div
          key={i}
          className="w-6 h-6 rounded-full border-2 border-card bg-secondary/80 flex items-center justify-center"
          style={{ zIndex: shown - i }}
        >
          <User className="w-3 h-3 text-muted-foreground" />
        </div>
      ))}
      {extra > 0 && (
        <div className="w-6 h-6 rounded-full border-2 border-card bg-primary/10 flex items-center justify-center text-[8px] font-display font-bold text-primary" style={{ zIndex: 0 }}>
          +{extra}
        </div>
      )}
    </div>
  );
};

/* ─── Format type badge ─── */
const TypeBadge = ({ type }: { type?: string }) => (
  <span className="text-[8px] uppercase tracking-widest font-display font-bold text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
    {type === "arena" ? "Arena" : "Swiss"}
  </span>
);

const TournamentsCard = ({
  activeTournaments, recentTournaments, registeredIds, registeringId,
  userId, onRegister, onCancel, onNavigateToTournament,
  showCreateForm, onToggleCreate, createFormProps,
}: TournamentsCardProps) => {
  const [tab, setTab] = useState<"active" | "recent">("active");

  return (
    <div className="rounded-xl bg-card/80 border border-border/30 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-border/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h3 className="font-display font-bold text-sm">Tournaments</h3>
          {activeTournaments.length > 0 && (
            <span className="text-[9px] bg-primary/12 text-primary font-bold px-2 py-0.5 rounded-full">{activeTournaments.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-secondary/40 rounded-lg p-0.5">
            <button onClick={() => setTab("active")} className={`text-[10px] font-display font-bold px-2.5 py-1 rounded-md transition-all ${tab === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Active</button>
            <button onClick={() => setTab("recent")} className={`text-[10px] font-display font-bold px-2.5 py-1 rounded-md transition-all ${tab === "recent" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}`}>Recent</button>
          </div>
          <button onClick={onToggleCreate} className="flex items-center gap-1 text-xs font-display font-bold text-primary hover:text-primary/80 px-2 py-1 rounded-lg hover:bg-primary/5 transition-colors">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="border-b border-border/15 px-4 py-4 bg-secondary/5">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="col-span-2">
              <input value={createFormProps.name} onChange={(e) => createFormProps.setName(e.target.value)} placeholder="Tournament Name" className="w-full bg-background border border-border/30 rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/25" />
            </div>
            <input value={createFormProps.prizePool} onChange={(e) => createFormProps.setPrizePool(e.target.value)} type="number" placeholder="Prize Pool" className="bg-background border border-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
            <input value={createFormProps.maxPlayers} onChange={(e) => createFormProps.setMaxPlayers(e.target.value)} type="number" placeholder="Max Players" className="bg-background border border-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
            <input type="datetime-local" value={createFormProps.startsAt} onChange={(e) => createFormProps.setStartsAt(e.target.value)} className="bg-background border border-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25" />
            <select value={createFormProps.type} onChange={(e) => createFormProps.setType(e.target.value)} className="bg-background border border-border/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/25">
              <option value="swiss">Swiss</option>
              <option value="arena">Arena</option>
            </select>
            <button onClick={createFormProps.onCreate} disabled={createFormProps.loading || !createFormProps.name.trim()} className="col-span-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-xs font-display font-bold tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90">
              {createFormProps.loading ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating...</> : "Create Tournament"}
            </button>
          </div>
        </motion.div>
      )}

      {/* Active Tournaments */}
      {tab === "active" && (
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 20rem)" }}>
          {activeTournaments.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No active tournaments</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Create one to get started</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {activeTournaments.map((t) => {
                const count = t.registration_count?.[0]?.count || 0;
                const isReg = registeredIds.includes(t.id);
                const isFull = count >= t.max_players;
                const isReady = t.starts_at ? Date.now() >= new Date(t.starts_at).getTime() : false;

                return (
                  <div key={t.id} className="px-4 py-3.5 hover:bg-secondary/6 transition-colors">
                    {/* Row 1: Title + badges */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/15 flex items-center justify-center shrink-0">
                        <Swords className="w-4 h-4 text-primary" />
                      </div>
                      <h4 className="font-display font-bold text-sm truncate flex-1 min-w-0">{t.name}</h4>
                      <TypeBadge type={t.tournament_type} />
                      {isReady ? (
                        <span className="inline-flex items-center gap-1 text-[8px] bg-emerald-500/12 text-emerald-400 font-bold px-1.5 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> LIVE
                        </span>
                      ) : (
                        <CountdownBadge startsAt={t.starts_at} />
                      )}
                    </div>

                    {/* Row 2: Details */}
                    <div className="mt-2.5 flex items-center gap-4">
                      <PlayerAvatarStack count={count} />
                      <div className="flex-1">
                        <FillBar count={count} max={t.max_players} />
                      </div>
                    </div>

                    {/* Row 3: Prize + schedule + actions */}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1 font-display font-bold text-primary">
                          <Crown className="w-3 h-3" /> ₹{t.prize_pool}
                        </span>
                        {t.starts_at && !isReady && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(t.starts_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })} · {new Date(t.starts_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isReady && (
                          <button onClick={() => onNavigateToTournament(t.id)} className="text-[10px] px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 font-display font-bold hover:bg-emerald-500/15 border border-emerald-500/20 transition-all">
                            Watch
                          </button>
                        )}
                        <button onClick={() => onRegister(t.id)} disabled={isReg || isFull || registeringId === t.id}
                          className={`text-[10px] font-display font-bold px-3.5 py-1.5 rounded-lg transition-all ${
                            isReg
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : isFull
                                ? "bg-muted text-muted-foreground"
                                : "bg-primary/10 text-primary hover:bg-primary/15 border border-primary/20"
                          }`}>
                          {isReg ? "✓ Joined" : isFull ? "Full" : registeringId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join · 2♛"}
                        </button>
                      </div>
                    </div>

                    {/* Owner cancel */}
                    {t.created_by === userId && (
                      <button onClick={() => onCancel(t)} className="mt-2 text-[10px] px-2.5 py-1 rounded-md bg-destructive/8 text-destructive font-semibold hover:bg-destructive/12 transition-colors">
                        Cancel & Refund
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recent Tournaments */}
      {tab === "recent" && (
        <div className="overflow-y-auto" style={{ maxHeight: "calc(100vh - 20rem)" }}>
          {recentTournaments.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Clock className="w-10 h-10 text-muted-foreground/15 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">No recent tournaments</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1">Completed and cancelled events appear here</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {recentTournaments.map((t) => {
                const isCancelled = t.status === "cancelled";
                return (
                  <div key={t.id} className="px-4 py-3 flex items-center gap-3 hover:bg-secondary/6 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCancelled ? "bg-destructive/8" : "bg-primary/8"}`}>
                      <Trophy className={`w-4 h-4 ${isCancelled ? "text-destructive" : "text-primary"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-bold text-xs truncate">{t.name}</h4>
                        <TypeBadge type={t.tournament_type} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{t.player_count} players</span>
                        <span className="flex items-center gap-1"><Crown className="w-2.5 h-2.5" />₹{t.prize_pool}</span>
                        {t.ended_at && (
                          <span>{new Date(t.ended_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                        )}
                      </div>
                    </div>
                    <span className={`text-[9px] font-display font-bold px-2.5 py-1 rounded-full ${isCancelled ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-400"}`}>
                      {isCancelled ? "CANCELLED" : "COMPLETED"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentsCard;
