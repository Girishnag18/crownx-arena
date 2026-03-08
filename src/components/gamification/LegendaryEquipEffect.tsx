import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface LegendaryEquipEffectProps {
  show: boolean;
  icon: string;
  name: string;
  onComplete: () => void;
}

const PARTICLE_COUNT = 14;

const LegendaryEquipEffect = ({ show, icon, name, onComplete }: LegendaryEquipEffectProps) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onComplete, 2200);
      return () => clearTimeout(timer);
    }
  }, [show, onComplete]);

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
          {/* Backdrop glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm pointer-events-none"
          />

          {/* Central burst */}
          <div className="relative">
            {/* Expanding ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border-2 border-primary"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0.5 }}
              animate={{ scale: 3, opacity: 0 }}
              transition={{ duration: 1.4, ease: "easeOut", delay: 0.1 }}
              className="absolute inset-0 w-32 h-32 -translate-x-1/2 -translate-y-1/2 left-1/2 top-1/2 rounded-full border border-accent"
            />

            {/* Golden shimmer background */}
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              className="relative w-36 h-36 rounded-full flex items-center justify-center"
              style={{
                background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.05) 60%, transparent 80%)",
                boxShadow: "0 0 80px 20px hsl(var(--primary) / 0.25), 0 0 120px 40px hsl(var(--primary) / 0.1)",
              }}
            >
              {/* Spinning glow ring */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-full"
                style={{
                  background: "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.4), transparent, hsl(var(--accent) / 0.3), transparent)",
                }}
              />

              {/* Icon */}
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ duration: 0.6, delay: 0.2, type: "spring", stiffness: 200 }}
                className="text-5xl relative z-10 drop-shadow-[0_0_20px_hsl(var(--primary)/0.6)]"
              >
                {icon}
              </motion.span>
            </motion.div>

            {/* Particles */}
            {Array.from({ length: PARTICLE_COUNT }).map((_, i) => {
              const angle = (i / PARTICLE_COUNT) * 360;
              const distance = 80 + Math.random() * 60;
              const size = 3 + Math.random() * 5;
              const delay = Math.random() * 0.4;
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
                  transition={{ duration: 1 + Math.random() * 0.5, delay: 0.3 + delay, ease: "easeOut" }}
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{
                    width: size,
                    height: size,
                    background: i % 3 === 0
                      ? "hsl(var(--primary))"
                      : i % 3 === 1
                      ? "hsl(var(--accent))"
                      : "hsl(45, 100%, 70%)",
                    boxShadow: `0 0 ${size * 2}px hsl(var(--primary) / 0.5)`,
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
              <p className="font-display font-black text-sm bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent drop-shadow-lg">
                {name}
              </p>
              <p className="text-[10px] text-primary/70 font-display font-bold mt-0.5 uppercase tracking-widest">
                ⭐ Legendary Equipped
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LegendaryEquipEffect;
