import { Zap } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface XPProgressBarProps {
  xp: number;
  level: number;
}

const XPProgressBar = ({ xp, level }: XPProgressBarProps) => {
  const xpPerLevel = 500;
  const currentLevelXp = xp % xpPerLevel;
  const progress = (currentLevelXp / xpPerLevel) * 100;
  const xpToNext = xpPerLevel - currentLevelXp;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Zap className="w-3 h-3 text-primary" />
          <span className="font-display font-bold text-foreground">{xp} XP</span>
          <span>·</span>
          <span>{xpToNext} to Lvl {level + 1}</span>
        </div>
        <span className="font-display font-bold text-primary">{progress.toFixed(0)}%</span>
      </div>
      <Progress value={progress} className="h-1.5" />
    </div>
  );
};

export default XPProgressBar;
