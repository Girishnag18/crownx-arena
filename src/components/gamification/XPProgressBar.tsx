import { motion } from "framer-motion";
import { Zap, TrendingUp } from "lucide-react";
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
    <div className="glass-card p-4 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Level</p>
            <p className="font-display font-bold text-lg leading-none">{level}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="font-display font-bold text-sm">{xp} XP</span>
          </div>
          <p className="text-[10px] text-muted-foreground">{xpToNext} XP to level {level + 1}</p>
        </div>
      </div>
      <Progress value={progress} className="h-2.5" />
    </div>
  );
};

export default XPProgressBar;
