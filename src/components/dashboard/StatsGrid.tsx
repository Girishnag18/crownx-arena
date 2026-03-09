import { Gamepad2, Trophy, Target, Flame, Shield, BarChart3 } from "lucide-react";

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

const StatsGrid = ({ gamesPlayed, wins, losses, draws, winStreak, globalRank, totalPlayers, puzzlesSolved }: StatsGridProps) => {
  const winRate = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : "0.0";

  const stats = [
    { label: "Games", value: gamesPlayed, icon: Gamepad2, color: "text-primary" },
    { label: "Wins", value: wins, icon: Trophy, color: "text-emerald-400" },
    { label: "Losses", value: losses, icon: BarChart3, color: "text-destructive" },
    { label: "Draws", value: draws, icon: Target, color: "text-muted-foreground" },
    { label: "Win Rate", value: `${winRate}%`, icon: Target, color: "text-primary" },
    { label: "Streak", value: winStreak, icon: Flame, color: "text-amber-400" },
    { label: "Rank", value: globalRank ? `#${globalRank}` : "—", icon: Shield, color: "text-primary" },
    { label: "Puzzles", value: puzzlesSolved, icon: Target, color: "text-violet-400" },
  ];

  return (
    <div className="rounded-xl bg-card/80 border border-border/30 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-primary" />
        <h3 className="font-display font-bold text-sm">Stats</h3>
        {globalRank && (
          <span className="ml-auto text-[10px] text-muted-foreground">
            #{globalRank} / {totalPlayers}
          </span>
        )}
      </div>
      <div className="grid grid-cols-4 divide-x divide-border/15">
        {stats.slice(0, 4).map((s) => (
          <div key={s.label} className="px-3 py-3 text-center">
            <div className={`font-display font-black text-lg ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-4 divide-x divide-border/15 border-t border-border/15">
        {stats.slice(4).map((s) => (
          <div key={s.label} className="px-3 py-3 text-center">
            <div className={`font-display font-black text-lg ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsGrid;
