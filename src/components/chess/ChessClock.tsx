import { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Timer } from "lucide-react";

export interface TimeControl {
  label: string;
  category: "bullet" | "blitz" | "rapid" | "classical";
  initialSeconds: number;
  incrementSeconds: number;
}

export const TIME_CONTROLS: TimeControl[] = [
  { label: "1+0", category: "bullet", initialSeconds: 60, incrementSeconds: 0 },
  { label: "1+1", category: "bullet", initialSeconds: 60, incrementSeconds: 1 },
  { label: "2+1", category: "bullet", initialSeconds: 120, incrementSeconds: 1 },
  { label: "3+0", category: "blitz", initialSeconds: 180, incrementSeconds: 0 },
  { label: "3+2", category: "blitz", initialSeconds: 180, incrementSeconds: 2 },
  { label: "5+0", category: "blitz", initialSeconds: 300, incrementSeconds: 0 },
  { label: "5+3", category: "blitz", initialSeconds: 300, incrementSeconds: 3 },
  { label: "10+0", category: "rapid", initialSeconds: 600, incrementSeconds: 0 },
  { label: "10+5", category: "rapid", initialSeconds: 600, incrementSeconds: 5 },
  { label: "15+10", category: "rapid", initialSeconds: 900, incrementSeconds: 10 },
  { label: "30+0", category: "classical", initialSeconds: 1800, incrementSeconds: 0 },
];

const CATEGORY_COLORS: Record<string, string> = {
  bullet: "text-destructive",
  blitz: "text-amber-400",
  rapid: "text-emerald-400",
  classical: "text-primary",
};

const CATEGORY_ICONS: Record<string, string> = {
  bullet: "⚡",
  blitz: "🔥",
  rapid: "⏱️",
  classical: "♔",
};

interface ChessClockProps {
  timeControl: TimeControl | null;
  activeSide: "w" | "b" | null; // which side's clock is ticking
  gameStarted: boolean;
  gameOver: boolean;
  onTimeUp?: (side: "w" | "b") => void;
  onTick?: (whiteMs: number, blackMs: number) => void;
  flipped?: boolean;
  moveCount?: { w: number; b: number };
}

const formatTime = (ms: number): string => {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalSeconds < 10) {
    // Show tenths when under 10s
    const tenths = Math.floor((ms % 1000) / 100);
    return `0:${String(seconds).padStart(2, "0")}.${tenths}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

const ChessClock = ({
  timeControl,
  activeSide,
  gameStarted,
  gameOver,
  onTimeUp,
  flipped = false,
  moveCount = { w: 0, b: 0 },
}: ChessClockProps) => {
  const [whiteMs, setWhiteMs] = useState(0);
  const [blackMs, setBlackMs] = useState(0);
  const lastTickRef = useRef<number | null>(null);
  const prevActiveSideRef = useRef<"w" | "b" | null>(null);
  const animFrameRef = useRef<number>(0);

  // Initialize clocks
  useEffect(() => {
    if (!timeControl) return;
    setWhiteMs(timeControl.initialSeconds * 1000);
    setBlackMs(timeControl.initialSeconds * 1000);
    lastTickRef.current = null;
    prevActiveSideRef.current = null;
  }, [timeControl]);

  // Apply increment when side changes (move made)
  useEffect(() => {
    if (!timeControl || !gameStarted || gameOver) return;
    const prev = prevActiveSideRef.current;
    if (prev && prev !== activeSide && timeControl.incrementSeconds > 0) {
      const inc = timeControl.incrementSeconds * 1000;
      if (prev === "w") setWhiteMs((t) => t + inc);
      else setBlackMs((t) => t + inc);
    }
    prevActiveSideRef.current = activeSide;
    lastTickRef.current = performance.now();
  }, [activeSide, gameStarted, gameOver, timeControl]);

  // Tick loop
  useEffect(() => {
    if (!timeControl || !gameStarted || gameOver || !activeSide) return;

    const tick = () => {
      const now = performance.now();
      const elapsed = lastTickRef.current ? now - lastTickRef.current : 0;
      lastTickRef.current = now;

      if (activeSide === "w") {
        setWhiteMs((prev) => {
          const next = Math.max(0, prev - elapsed);
          if (next <= 0) onTimeUp?.("w");
          return next;
        });
      } else {
        setBlackMs((prev) => {
          const next = Math.max(0, prev - elapsed);
          if (next <= 0) onTimeUp?.("b");
          return next;
        });
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animFrameRef.current);
  }, [timeControl, activeSide, gameStarted, gameOver, onTimeUp]);

  if (!timeControl) return null;

  const isWhiteLow = whiteMs < 30000 && whiteMs > 0;
  const isBlackLow = blackMs < 30000 && blackMs > 0;
  const isWhiteDead = whiteMs <= 0;
  const isBlackDead = blackMs <= 0;

  const ClockFace = ({ side, ms, isActive, isLow, isDead }: {
    side: "w" | "b";
    ms: number;
    isActive: boolean;
    isLow: boolean;
    isDead: boolean;
  }) => (
    <div
      className={`flex items-center justify-between rounded-md px-3 py-1.5 font-mono text-sm font-bold transition-colors ${
        isDead
          ? "bg-destructive/20 text-destructive"
          : isActive
          ? isLow
            ? "bg-destructive/15 text-destructive animate-pulse"
            : "bg-primary/15 text-primary"
          : "bg-secondary/50 text-muted-foreground"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <div className={`w-2.5 h-2.5 rounded-full ${side === "w" ? "bg-white border border-border" : "bg-gray-900 border border-border"}`} />
        <Timer className="w-3 h-3" />
      </div>
      <span className="tabular-nums tracking-tight">{formatTime(ms)}</span>
    </div>
  );

  const topSide = flipped ? "w" : "b";
  const bottomSide = flipped ? "b" : "w";
  const topMs = topSide === "w" ? whiteMs : blackMs;
  const bottomMs = bottomSide === "w" ? whiteMs : blackMs;

  return (
    <div className="flex flex-col gap-1 w-full">
      <ClockFace
        side={topSide}
        ms={topMs}
        isActive={activeSide === topSide && gameStarted && !gameOver}
        isLow={topSide === "w" ? isWhiteLow : isBlackLow}
        isDead={topSide === "w" ? isWhiteDead : isBlackDead}
      />
      <div className="flex-1" />
      <ClockFace
        side={bottomSide}
        ms={bottomMs}
        isActive={activeSide === bottomSide && gameStarted && !gameOver}
        isLow={bottomSide === "w" ? isWhiteLow : isBlackLow}
        isDead={bottomSide === "w" ? isWhiteDead : isBlackDead}
      />
    </div>
  );
};

// Time control selector component
export const TimeControlSelector = ({
  selected,
  onSelect,
}: {
  selected: TimeControl | null;
  onSelect: (tc: TimeControl | null) => void;
}) => {
  const categories = ["bullet", "blitz", "rapid", "classical"] as const;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Timer className="w-4 h-4 text-primary" />
        <span className="font-display font-bold text-sm">Time Control</span>
      </div>
      {categories.map((cat) => {
        const controls = TIME_CONTROLS.filter((tc) => tc.category === cat);
        return (
          <div key={cat}>
            <p className={`text-[10px] uppercase tracking-wider font-bold mb-1.5 ${CATEGORY_COLORS[cat]}`}>
              {CATEGORY_ICONS[cat]} {cat}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {controls.map((tc) => (
                <button
                  key={tc.label}
                  onClick={() => onSelect(selected?.label === tc.label ? null : tc)}
                  className={`text-xs px-2.5 py-1.5 rounded-md border font-display font-bold transition-colors ${
                    selected?.label === tc.label
                      ? "bg-primary/20 border-primary text-primary"
                      : "bg-secondary/40 border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tc.label}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {selected && (
        <p className="text-[10px] text-muted-foreground">
          {selected.initialSeconds / 60} min + {selected.incrementSeconds}s increment per move
        </p>
      )}
    </div>
  );
};

export default ChessClock;
