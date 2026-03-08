import { motion } from "framer-motion";
import { Shield, Target } from "lucide-react";

interface PlacementBadgeProps {
  gamesPlayed: number;
  placementTotal?: number;
}

const PlacementBadge = ({ gamesPlayed, placementTotal = 10 }: PlacementBadgeProps) => {
  const isInPlacement = gamesPlayed < placementTotal;
  const progress = Math.min(gamesPlayed / placementTotal, 1);

  if (!isInPlacement) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 space-y-3"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-lg bg-amber-500/15 flex items-center justify-center">
          <Shield className="w-4.5 h-4.5 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-xs flex items-center gap-1.5">
            <Target className="w-3 h-3 text-amber-500" />
            Placement Matches
          </p>
          <p className="text-[10px] text-muted-foreground">
            {gamesPlayed}/{placementTotal} games — rank assigned after {placementTotal}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-secondary/60 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-amber-500 to-primary rounded-full"
        />
      </div>

      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>{placementTotal - gamesPlayed} games remaining</span>
        <span className="text-amber-500 font-bold">{Math.round(progress * 100)}%</span>
      </div>
    </motion.div>
  );
};

export default PlacementBadge;
