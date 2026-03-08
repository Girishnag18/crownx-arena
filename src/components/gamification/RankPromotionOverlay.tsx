import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Star, Sparkles } from "lucide-react";

const RANK_CONFIG: Record<string, { emoji: string; color: string; glow: string }> = {
  Bronze: { emoji: "🥉", color: "text-amber-600", glow: "shadow-amber-600/30" },
  Silver: { emoji: "🥈", color: "text-slate-400", glow: "shadow-slate-400/30" },
  Gold: { emoji: "🥇", color: "text-yellow-500", glow: "shadow-yellow-500/30" },
  Platinum: { emoji: "💎", color: "text-cyan-400", glow: "shadow-cyan-400/30" },
  Diamond: { emoji: "💠", color: "text-violet-400", glow: "shadow-violet-400/30" },
  "Crown Master": { emoji: "👑", color: "text-primary", glow: "shadow-primary/30" },
};

interface RankPromotionOverlayProps {
  oldRank: string | null;
  newRank: string;
  onDismiss: () => void;
}

const RankPromotionOverlay = ({ oldRank, newRank, onDismiss }: RankPromotionOverlayProps) => {
  const [visible, setVisible] = useState(true);
  const config = RANK_CONFIG[newRank] || RANK_CONFIG.Bronze;

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 500);
    }, 4500);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => { setVisible(false); setTimeout(onDismiss, 500); }}
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0, rotateY: -90 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 12, stiffness: 150 }}
            className={`relative rounded-2xl border border-border/60 bg-card p-8 sm:p-12 text-center max-w-sm mx-4 shadow-2xl ${config.glow}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                animate={{
                  opacity: [0, 1, 0],
                  scale: [0, 1.5, 0],
                  x: [0, (Math.random() - 0.5) * 200],
                  y: [0, (Math.random() - 0.5) * 200],
                }}
                transition={{ delay: 0.3 + i * 0.1, duration: 1.5 }}
                className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full bg-primary"
              />
            ))}

            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
            >
              <Sparkles className={`w-8 h-8 mx-auto mb-2 ${config.color}`} />
            </motion.div>

            <p className="text-xs text-muted-foreground uppercase tracking-widest font-bold mb-3">
              Division Promotion
            </p>

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4, type: "spring", damping: 8 }}
              className="text-6xl mb-4"
            >
              {config.emoji}
            </motion.div>

            {oldRank && (
              <p className="text-xs text-muted-foreground mb-1">
                {RANK_CONFIG[oldRank]?.emoji || "🏅"} {oldRank} →
              </p>
            )}

            <h2 className={`font-display font-black text-2xl sm:text-3xl ${config.color}`}>
              {newRank}
            </h2>

            <div className="flex items-center justify-center gap-1.5 mt-3">
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + i * 0.15 }}
                >
                  <Star className={`w-4 h-4 ${config.color} fill-current`} />
                </motion.div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2 }}
              className="text-[10px] text-muted-foreground mt-4"
            >
              Tap anywhere to continue
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RankPromotionOverlay;
