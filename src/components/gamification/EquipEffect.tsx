import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

type EffectRarity = "legendary" | "rare" | "uncommon";

interface EquipEffectProps {
  show: boolean;
  icon: string;
  name: string;
  rarity: EffectRarity;
  onComplete: () => void;
}

const RARITY_CONFIG: Record<EffectRarity, {
  particleCount: number;
  duration: number;
  ringColor: string;
  glowColor: string;
  particleColors: string[];
  label: string;
  labelIcon: string;
  bgGradient: string;
  conicGradient: string;
  shadow: string;
}> = {
  legendary: {
    particleCount: 14,
    duration: 2200,
    ringColor: "border-primary",
    glowColor: "hsl(var(--primary) / 0.25)",
    particleColors: ["hsl(var(--primary))", "hsl(var(--accent))", "hsl(45, 100%, 70%)"],
    label: "Legendary Equipped",
    labelIcon: "⭐",
    bgGradient: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.05) 60%, transparent 80%)",
    conicGradient: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.4), transparent, hsl(var(--accent) / 0.3), transparent)",
    shadow: "0 0 80px 20px hsl(var(--primary) / 0.25), 0 0 120px 40px hsl(var(--primary) / 0.1)",
  },
  rare: {
    particleCount: 10,
    duration: 1800,
    ringColor: "border-blue-500",
    glowColor: "rgba(59, 130, 246, 0.2)",
    particleColors: ["rgb(59, 130, 246)", "rgb(96, 165, 250)", "rgb(147, 197, 253)"],
    label: "Rare Equipped",
    labelIcon: "💎",
    bgGradient: "radial-gradient(circle, rgba(59,130,246,0.25) 0%, rgba(59,130,246,0.04) 60%, transparent 80%)",
    conicGradient: "conic-gradient(from 0deg, transparent, rgba(59,130,246,0.35), transparent, rgba(96,165,250,0.25), transparent)",
    shadow: "0 0 60px 15px rgba(59,130,246,0.2), 0 0 100px 30px rgba(59,130,246,0.08)",
  },
  uncommon: {
    particleCount: 8,
    duration: 1500,
    ringColor: "border-emerald-500",
    glowColor: "rgba(16, 185, 129, 0.2)",
    particleColors: ["rgb(16, 185, 129)", "rgb(52, 211, 153)", "rgb(110, 231, 183)"],
    label: "Uncommon Equipped",
    labelIcon: "🟢",
    bgGradient: "radial-gradient(circle, rgba(16,185,129,0.2) 0%, rgba(16,185,129,0.03) 60%, transparent 80%)",
    conicGradient: "conic-gradient(from 0deg, transparent, rgba(16,185,129,0.3), transparent, rgba(52,211,153,0.2), transparent)",
    shadow: "0 0 50px 12px rgba(16,185,129,0.18), 0 0 80px 25px rgba(16,185,129,0.06)",
  },
};

const EquipEffect = ({ show, icon, name, rarity, onComplete }: EquipEffectProps) => {
  const config = RARITY_CONFIG[rarity];

  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, config.duration);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete, config.duration]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[60] flex items-center justify-center pointer-events-none"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: rarity === "legendary" ? 0.6 : rarity === "rare" ? 0.45 : 0.35 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-none"
          />

          <div className="relative">
            {/* Expanding rings */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: rarity === "legendary" ? 4 : 3, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className={`absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border-2 ${config.ringColor}`}
            />
            {rarity !== "uncommon" && (
              <motion.div
                initial={{ scale: 0, opacity: 0.5 }}
                animate={{ scale: rarity === "legendary" ? 3 : 2.5, opacity: 0 }}
                transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
                className={`absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border ${config.ringColor} opacity-50`}
              />
            )}

            {/* Glow background */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className={`relative ${rarity === "legendary" ? "w-36 h-36" : rarity === "rare" ? "w-32 h-32" : "w-28 h-28"} rounded-full flex items-center justify-center`}
              style={{
                background: config.bgGradient,
                boxShadow: config.shadow,
              }}
            >
              {/* Spinning conic gradient */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: rarity === "legendary" ? 3 : rarity === "rare" ? 4 : 5, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full"
                style={{ background: config.conicGradient }}
              />

              {/* Icon */}
              <motion.span
                initial={{ scale: 0, rotate: rarity === "legendary" ? -180 : -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 200 }}
                className={`${rarity === "legendary" ? "text-5xl" : rarity === "rare" ? "text-4xl" : "text-3xl"} relative z-10`}
                style={{ filter: `drop-shadow(0 0 ${rarity === "legendary" ? "20px" : "12px"} ${config.glowColor})` }}
              >
                {icon}
              </motion.span>
            </motion.div>

            {/* Particles */}
            {Array.from({ length: config.particleCount }).map((_, i) => {
              const angle = (i / config.particleCount) * 360;
              const distance = (rarity === "legendary" ? 80 : 60) + Math.random() * (rarity === "legendary" ? 60 : 40);
              const size = (rarity === "legendary" ? 3 : 2) + Math.random() * (rarity === "legendary" ? 5 : 3);
              const delay = Math.random() * 0.4;
              const color = config.particleColors[i % config.particleColors.length];
              return (
                <motion.div
                  key={i}
                  initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                  animate={{
                    x: Math.cos((angle * Math.PI) / 180) * distance,
                    y: Math.sin((angle * Math.PI) / 180) * distance,
                    opacity: 0,
                    scale: 0,
                  }}
                  transition={{ duration: 0.8 + Math.random() * 0.5, delay: 0.3 + delay, ease: "easeOut" }}
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background: color,
                    boxShadow: `0 0 ${size * 2}px ${color}`,
                  }}
                />
              );
            })}

            {/* Name label */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
              className="absolute -bottom-14 left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
            >
              <p className="font-display font-black text-sm bg-clip-text text-transparent drop-shadow-lg"
                style={{
                  backgroundImage: rarity === "legendary"
                    ? "linear-gradient(to right, hsl(var(--primary)), hsl(var(--accent)), hsl(var(--primary)))"
                    : rarity === "rare"
                    ? "linear-gradient(to right, rgb(59,130,246), rgb(147,197,253), rgb(59,130,246))"
                    : "linear-gradient(to right, rgb(16,185,129), rgb(110,231,183), rgb(16,185,129))",
                }}
              >
                {name}
              </p>
              <p className="text-[10px] font-display font-bold mt-0.5 uppercase tracking-widest"
                style={{
                  color: rarity === "legendary"
                    ? "hsl(var(--primary) / 0.7)"
                    : rarity === "rare"
                    ? "rgba(96,165,250,0.7)"
                    : "rgba(52,211,153,0.7)",
                }}
              >
                {config.labelIcon} {config.label}
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default EquipEffect;
