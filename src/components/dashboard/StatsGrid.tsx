import { BarChart3, Flame, Gamepad2, Shield, Target, Trophy } from "lucide-react";

interface StatsGridProps {
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winStreak: number;
  globalRank: number | null;
  totalPlayers: number;
  puzzlesSolved: number;
}

const StatsGrid = ({
  gamesPlayed,
  wins,
  losses,
  draws,
  winStreak,
  globalRank,
  totalPlayers,
  puzzlesSolved,
}: StatsGridProps) => {
  const winRate = gamesPlayed > 0 ? `${((wins / gamesPlayed) * 100).toFixed(1)}%` : "0.0%";

  const stats = [
    { label: "Games played", value: gamesPlayed, icon: Gamepad2, tone: "text-primary" },
    { label: "Wins", value: wins, icon: Trophy, tone: "text-emerald-400" },
    { label: "Losses", value: losses, icon: BarChart3, tone: "text-destructive" },
    { label: "Draws", value: draws, icon: Target, tone: "text-muted-foreground" },
    { label: "Win rate", value: winRate, icon: Target, tone: "text-primary" },
    { label: "Current streak", value: winStreak, icon: Flame, tone: "text-amber-400" },
    { label: "Global rank", value: globalRank ? `#${globalRank}` : "-", icon: Shield, tone: "text-primary" },
    { label: "Puzzles solved", value: puzzlesSolved, icon: Target, tone: "text-sky-400" },
  ];

  return (
    <section className="surface-section space-y-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="kicker-label">Performance</p>
          <h3 className="section-heading">Competitive overview</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          {globalRank ? `Ranked #${globalRank} out of ${totalPlayers} tracked players` : "Play more rated games to enter the rankings"}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="surface-muted px-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                <p className={`font-display text-3xl font-black ${stat.tone}`}>{stat.value}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/40 bg-secondary/45 text-primary">
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};

export default StatsGrid;
