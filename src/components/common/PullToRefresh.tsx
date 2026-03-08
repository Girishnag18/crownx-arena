import { useState, useRef, useCallback, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 80;

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const [ready, setReady] = useState(false);
  const pullY = useMotionValue(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const indicatorOpacity = useTransform(pullY, [0, 30, THRESHOLD], [0, 0.6, 1]);
  const indicatorScale = useTransform(pullY, [0, THRESHOLD * 0.5, THRESHOLD], [0.4, 0.8, 1]);
  const indicatorY = useTransform(pullY, (v) => v - 44);
  const rotate = useTransform(pullY, [0, THRESHOLD], [0, 180]);
  const progressRing = useTransform(pullY, [0, THRESHOLD], [0, 1]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (refreshing) return;
    const scrollTop = containerRef.current?.scrollTop ?? window.scrollY;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      pulling.current = true;
    }
  }, [refreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!pulling.current || refreshing) return;
    const dy = Math.max(0, e.touches[0].clientY - startY.current);
    const dampened = Math.min(dy * 0.45, THRESHOLD + 20);
    pullY.set(dampened);
    setReady(dampened >= THRESHOLD);
  }, [refreshing, pullY]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshing) return;
    pulling.current = false;
    setReady(false);
    if (pullY.get() >= THRESHOLD) {
      setRefreshing(true);
      animate(pullY, 50, { type: "spring", stiffness: 300, damping: 25 });
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        animate(pullY, 0, { type: "spring", stiffness: 400, damping: 30 });
      }
    } else {
      animate(pullY, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }, [refreshing, onRefresh, pullY]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative overflow-hidden"
    >
      {/* Pull indicator */}
      <motion.div
        style={{ opacity: indicatorOpacity, scale: indicatorScale, y: indicatorY }}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-11 h-11 rounded-full bg-card border border-border/50 flex items-center justify-center shadow-xl"
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <motion.div style={{ rotate }} className="relative flex items-center justify-center">
            <ArrowDown className={`w-5 h-5 transition-colors duration-150 ${ready ? "text-primary" : "text-muted-foreground"}`} />
          </motion.div>
        )}
        {/* Progress ring */}
        {!refreshing && (
          <motion.svg
            className="absolute inset-0 w-full h-full -rotate-90"
            viewBox="0 0 44 44"
          >
            <motion.circle
              cx="22"
              cy="22"
              r="20"
              fill="none"
              strokeWidth="2"
              className="stroke-primary/40"
              strokeLinecap="round"
              style={{
                pathLength: progressRing,
              }}
            />
          </motion.svg>
        )}
      </motion.div>

      <motion.div style={{ y: pullY }}>
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh;
