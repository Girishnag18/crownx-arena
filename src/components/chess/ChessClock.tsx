import { useState, useEffect, useRef, useCallback } from "react";
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

export const CATEGORY_ICONS: Record<string, string> = {
  bullet: "⚡",
  blitz: "🔥",
  rapid: "⏱️",
  classical: "♔",
};

const formatTime = (ms: number): string => {
  if (ms <= 0) return "0:00";
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (totalSeconds < 10) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `0:${String(seconds).padStart(2, "0")}.${tenths}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/** Hook that manages chess clock state */
export const useChessClock = (
  timeControl: TimeControl | null,
  activeSide: "w" | "b" | null,
  gameStarted: boolean,
  gameOver: boolean,
  onTimeUp?: (side: "w" | "b") => void,
) => {
  const [whiteMs, setWhiteMs] = useState(0);
  const [blackMs, setBlackMs] = useState(0);
  const lastTickRef = useRef<number | null>(null);
  const prevActiveSideRef = useRef<"w" | "b" | null>(null);
  const animFrameRef = useRef<number>(0);
  const timeUpFiredRef = useRef(false);

  // Initialize
  useEffect(() => {
    if (!timeControl) return;
    setWhiteMs(timeControl.initialSeconds * 1000);
    setBlackMs(timeControl.initialSeconds * 1000);
    lastTickRef.current = null;
    prevActiveSideRef.current = null;
    timeUpFiredRef.current = false;
  }, [timeControl]);

  // Apply increment on side switch
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

  // Tick
  useEffect(() => {
    if (!timeControl || !gameStarted || gameOver || !activeSide) return;

    const tick = () => {
      const now = performance.now();
      const elapsed = lastTickRef.current ? now - lastTickRef.current : 0;
      lastTickRef.current = now;

      const setter = activeSide === "w" ? setWhiteMs : setBlackMs;
      setter((prev) => {
        const next = Math.max(0, prev - elapsed);
        if (next <= 0 && !timeUpFiredRef.current) {
          timeUpFiredRef.current = true;
          onTimeUp?.(activeSide);
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTickRef.current = performance.now();
    animFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [timeControl, activeSide, gameStarted, gameOver, onTimeUp]);

  return { whiteMs, blackMs };
};

/** Single clock face to display in a player bar */
export const ClockFace = ({
  ms,
  isActive,
  side,
}: {
  ms: number;
  isActive: boolean;
  side: "w" | "b";
}) => {
  const isLow = ms < 30000 && ms > 0;
  const isDead = ms <= 0;

  return (
    <div
      className={`flex items-center justify-center rounded-md min-w-[72px] sm:min-w-[84px] px-2.5 sm:px-3 py-1.5 sm:py-2 font-mono text-sm sm:text-base font-bold tabular-nums tracking-tight transition-all duration-200 ${
        isDead
          ? "bg-destructive/25 text-destructive border border-destructive/30"
          : isActive
          ? isLow
            ? "bg-destructive/15 text-destructive border border-destructive/25 animate-pulse"
            : side === "w"
            ? "bg-white text-gray-900 border border-gray-200 shadow-sm"
            : "bg-gray-900 text-white border border-gray-700 shadow-sm"
          : "bg-secondary/60 text-muted-foreground border border-border/30"
      }`}
    >
      <span>{formatTime(ms)}</span>
    </div>
  );
};

/** Time control selector for lobby */
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
