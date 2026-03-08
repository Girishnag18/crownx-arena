import { useState } from "react";
import { motion } from "framer-motion";
import { Trophy, Plus, Loader2, User, ChevronDown, Clock } from "lucide-react";

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
        <div className="max-h-[22rem] overflow-y-auto">
          {activeTournaments.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Trophy className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No active tournaments</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {activeTournaments.map((t) => {
                const count = t.registration_count?.[0]?.count || 0;
                const isReg = registeredIds.includes(t.id);
                const isFull = count >= t.max_players;
                const isReady = t.starts_at ? Date.now() >= new Date(t.starts_at).getTime() : false;

                return (
                  <div key={t.id} className="px-4 py-3 hover:bg-secondary/6 transition-colors">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-display font-bold text-xs truncate">{t.name}</h4>
                          {isReady && (
                            <span className="inline-flex items-center gap-1 text-[8px] bg-emerald-500/12 text-emerald-500 font-bold px-1.5 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" />{count}/{t.max_players}</span>
                          <span>₹{t.prize_pool}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isReady && <button onClick={() => onNavigateToTournament(t.id)} className="text-[10px] px-2.5 py-1.5 rounded-lg bg-primary/8 text-primary font-display font-bold hover:bg-primary/12">View</button>}
                        <button onClick={() => onRegister(t.id)} disabled={isReg || isFull || registeringId === t.id}
                          className={`text-[10px] font-display font-bold px-3 py-1.5 rounded-lg transition-all ${isReg ? "bg-emerald-500/10 text-emerald-500" : isFull ? "bg-muted text-muted-foreground" : "bg-primary/8 text-primary hover:bg-primary/12 border border-primary/20"}`}>
                          {isReg ? "✓ Joined" : isFull ? "Full" : registeringId === t.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join · 2♛"}
                        </button>
                      </div>
                    </div>
                    {t.created_by === userId && (
                      <button onClick={() => onCancel(t)} className="mt-2 text-[10px] px-2.5 py-1 rounded-md bg-destructive/8 text-destructive font-semibold hover:bg-destructive/12">Cancel & Refund</button>
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
        <div className="max-h-[22rem] overflow-y-auto">
          {recentTournaments.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <Clock className="w-8 h-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">No recent tournaments</p>
            </div>
          ) : (
            <div className="divide-y divide-border/10">
              {recentTournaments.map((t) => (
                <div key={t.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="min-w-0">
                    <h4 className="font-display font-bold text-xs truncate">{t.name}</h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
                      <span className="capitalize">{t.tournament_type}</span>
                      <span>{t.player_count} players</span>
                      <span>₹{t.prize_pool}</span>
                    </div>
                  </div>
                  <span className={`text-[9px] font-display font-bold px-2 py-0.5 rounded-full ${t.status === "cancelled" ? "bg-destructive/10 text-destructive" : "bg-primary/8 text-primary"}`}>
                    {t.status === "cancelled" ? "CANCELLED" : "COMPLETED"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TournamentsCard;
