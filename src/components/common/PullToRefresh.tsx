import { useState, useRef, useCallback, type ReactNode } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";
import { Loader2 } from "lucide-react";

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
}

const THRESHOLD = 80;

const PullToRefresh = ({ onRefresh, children }: PullToRefreshProps) => {
  const [refreshing, setRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const startY = useRef(0);
  const pulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const indicatorOpacity = useTransform(pullY, [0, 40, THRESHOLD], [0, 0.5, 1]);
  const indicatorScale = useTransform(pullY, [0, THRESHOLD], [0.6, 1]);
  const rotate = useTransform(pullY, [0, THRESHOLD], [0, 180]);

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
    // Dampened pull
    pullY.set(Math.min(dy * 0.45, THRESHOLD + 20));
  }, [refreshing, pullY]);

  const handleTouchEnd = useCallback(async () => {
    if (!pulling.current || refreshing) return;
    pulling.current = false;
    if (pullY.get() >= THRESHOLD) {
      setRefreshing(true);
      pullY.set(50);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
        pullY.set(0);
      }
    } else {
      pullY.set(0);
    }
  }, [refreshing, onRefresh, pullY]);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className="relative"
    >
      {/* Pull indicator */}
      <motion.div
        style={{ opacity: indicatorOpacity, scale: indicatorScale, y: useTransform(pullY, (v) => v - 40) }}
        className="absolute top-0 left-1/2 -translate-x-1/2 z-50 w-10 h-10 rounded-full bg-card border border-border/40 flex items-center justify-center shadow-lg"
      >
        {refreshing ? (
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        ) : (
          <motion.svg
            style={{ rotate }}
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-primary"
          >
            <path d="M12 5v14M19 12l-7 7-7-7" />
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
