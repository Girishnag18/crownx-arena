import { type ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  Crown,
  Loader2,
  Plus,
  Swords,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

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

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft("");
      return;
    }

    const update = () => {
      const diff = new Date(targetDate).getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("Starting now");
        return;
      }

      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (hours >= 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    };

    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

const CountdownBadge = ({ startsAt }: { startsAt: string | null }) => {
  const timeLeft = useCountdown(startsAt);

  if (!timeLeft) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
        timeLeft === "Starting now" ? "bg-emerald-500/12 text-emerald-400" : "bg-primary/10 text-primary",
      )}
    >
      <Timer className="h-3 w-3" />
      {timeLeft}
    </span>
  );
};

const TypeBadge = ({ type }: { type?: string }) => (
  <span className="rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
    {type === "arena" ? "Arena" : "Swiss"}
  </span>
);

const TournamentsCard = ({
  activeTournaments,
  recentTournaments,
  registeredIds,
  registeringId,
  userId,
  onRegister,
  onCancel,
  onNavigateToTournament,
  showCreateForm,
  onToggleCreate,
  createFormProps,
}: TournamentsCardProps) => {
  const [tab, setTab] = useState<"active" | "recent">("active");

  return (
    <section className="surface-section space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker-label">Events</p>
          <h3 className="section-heading">Tournaments</h3>
          <p className="text-sm text-muted-foreground">
            Join active brackets, watch events go live, or launch a new tournament.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-2xl border border-border/50 bg-background/55 p-1">
            <button
              onClick={() => setTab("active")}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-all",
                tab === "active" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Active
            </button>
            <button
              onClick={() => setTab("recent")}
              className={cn(
                "rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-all",
                tab === "recent" ? "bg-primary/12 text-primary" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Recent
            </button>
          </div>

          <button
            onClick={onToggleCreate}
            className="inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/14"
          >
            <Plus className="h-3.5 w-3.5" />
            {showCreateForm ? "Close form" : "Create"}
          </button>
        </div>
      </div>

      <AnimateCreate open={showCreateForm}>
        <div className="grid gap-3 rounded-[24px] border border-border/45 bg-background/45 p-4 backdrop-blur sm:grid-cols-2">
          <input
            value={createFormProps.name}
            onChange={(event) => createFormProps.setName(event.target.value)}
            placeholder="Tournament name"
            className="rounded-2xl border border-border/45 bg-card/70 px-4 py-3 text-sm outline-none ring-0 transition-all placeholder:text-muted-foreground/55 focus:border-primary/30"
          />
          <select
            value={createFormProps.type}
            onChange={(event) => createFormProps.setType(event.target.value)}
            className="rounded-2xl border border-border/45 bg-card/70 px-4 py-3 text-sm outline-none transition-all focus:border-primary/30"
          >
            <option value="swiss">Swiss</option>
            <option value="arena">Arena</option>
          </select>
          <input
            value={createFormProps.prizePool}
            onChange={(event) => createFormProps.setPrizePool(event.target.value)}
            type="number"
            placeholder="Prize pool"
            className="rounded-2xl border border-border/45 bg-card/70 px-4 py-3 text-sm outline-none transition-all focus:border-primary/30"
          />
          <input
            value={createFormProps.maxPlayers}
            onChange={(event) => createFormProps.setMaxPlayers(event.target.value)}
            type="number"
            placeholder="Max players"
            className="rounded-2xl border border-border/45 bg-card/70 px-4 py-3 text-sm outline-none transition-all focus:border-primary/30"
          />
          <input
            type="datetime-local"
            value={createFormProps.startsAt}
            onChange={(event) => createFormProps.setStartsAt(event.target.value)}
            className="rounded-2xl border border-border/45 bg-card/70 px-4 py-3 text-sm outline-none transition-all focus:border-primary/30 sm:col-span-2"
          />
          <button
            onClick={createFormProps.onCreate}
            disabled={createFormProps.loading || !createFormProps.name.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-4 py-3 text-sm font-display font-bold uppercase tracking-[0.18em] text-primary-foreground transition-all hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-55 sm:col-span-2"
          >
            {createFormProps.loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>{createFormProps.loading ? "Creating" : "Create tournament"}</span>
          </button>
        </div>
      </AnimateCreate>

      {tab === "active" ? (
        activeTournaments.length === 0 ? (
          <EmptyState
            icon={Trophy}
            title="No active tournaments"
            description="Create the first bracket or check back when a new event opens."
          />
        ) : (
          <div className="space-y-3">
            {activeTournaments.map((tournament) => {
              const count = tournament.registration_count?.[0]?.count || 0;
              const isRegistered = registeredIds.includes(tournament.id);
              const isFull = count >= tournament.max_players;
              const isLive = tournament.starts_at ? Date.now() >= new Date(tournament.starts_at).getTime() : false;
              const progress = tournament.max_players > 0 ? Math.min((count / tournament.max_players) * 100, 100) : 0;

              return (
                <article
                  key={tournament.id}
                  className="surface-muted space-y-4 px-4 py-4 transition-all hover:border-primary/25 hover:bg-secondary/35"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                          <Swords className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-display text-lg font-bold text-foreground">{tournament.name}</h4>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <TypeBadge type={tournament.tournament_type} />
                            {isLive ? (
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                                Live
                              </span>
                            ) : (
                              <CountdownBadge startsAt={tournament.starts_at} />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {isLive && (
                        <button
                          onClick={() => onNavigateToTournament(tournament.id)}
                          className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-400 transition-colors hover:bg-emerald-500/16"
                        >
                          Watch
                        </button>
                      )}
                      <button
                        onClick={() => onRegister(tournament.id)}
                        disabled={isRegistered || isFull || registeringId === tournament.id}
                        className={cn(
                          "inline-flex min-w-[136px] items-center justify-center rounded-2xl px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] transition-all",
                          isRegistered
                            ? "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                            : isFull
                              ? "border border-border/40 bg-background/55 text-muted-foreground"
                              : "bg-primary text-primary-foreground hover:translate-y-[-1px]",
                        )}
                      >
                        {registeringId === tournament.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isRegistered ? (
                          "Joined"
                        ) : isFull ? (
                          "Full"
                        ) : (
                          "Join for 2 crowns"
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <Users className="h-3.5 w-3.5" />
                          {count}/{tournament.max_players} players
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays className="h-3.5 w-3.5" />
                          {tournament.starts_at
                            ? new Date(tournament.starts_at).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Schedule pending"}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between rounded-2xl border border-border/45 bg-background/50 px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Prize pool</p>
                        <p className="font-display text-lg font-bold text-foreground">Rs {tournament.prize_pool}</p>
                      </div>
                      <Crown className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  {tournament.created_by === userId && (
                    <button
                      onClick={() => onCancel(tournament)}
                      className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-destructive transition-colors hover:bg-destructive/14"
                    >
                      Cancel and refund
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )
      ) : recentTournaments.length === 0 ? (
        <EmptyState
          icon={Timer}
          title="No recent tournaments"
          description="Completed and cancelled events will show up here once matches wrap up."
        />
      ) : (
        <div className="space-y-3">
          {recentTournaments.map((tournament) => {
            const isCancelled = tournament.status === "cancelled";

            return (
              <article key={tournament.id} className="surface-muted flex items-center gap-4 px-4 py-4">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl border",
                    isCancelled
                      ? "border-destructive/20 bg-destructive/10 text-destructive"
                      : "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
                  )}
                >
                  <Trophy className="h-5 w-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-display text-sm font-bold text-foreground">{tournament.name}</h4>
                    <TypeBadge type={tournament.tournament_type} />
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {tournament.player_count} players
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Crown className="h-3.5 w-3.5" />
                      Rs {tournament.prize_pool}
                    </span>
                    {tournament.ended_at && (
                      <span>
                        {new Date(tournament.ended_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                  </div>
                </div>

                <span
                  className={cn(
                    "rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em]",
                    isCancelled ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-400",
                  )}
                >
                  {isCancelled ? "Cancelled" : "Completed"}
                </span>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

const AnimateCreate = ({ open, children }: { open: boolean; children: ReactNode }) =>
  open ? (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
      {children}
    </motion.div>
  ) : null;

const EmptyState = ({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Trophy;
  title: string;
  description: string;
}) => (
  <div className="surface-muted flex flex-col items-center justify-center gap-3 px-4 py-12 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/40 bg-secondary/40">
      <Icon className="h-6 w-6 text-muted-foreground/60" />
    </div>
    <div className="space-y-1">
      <p className="font-display text-base font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  </div>
);

export default TournamentsCard;
