import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";

const SEGMENTS = [
  { label: "5", value: 5, color: "hsl(var(--muted))" },
  { label: "10", value: 10, color: "hsl(var(--secondary))" },
  { label: "25", value: 25, color: "hsl(var(--primary) / 0.3)" },
  { label: "5", value: 5, color: "hsl(var(--muted))" },
  { label: "15", value: 15, color: "hsl(var(--secondary))" },
  { label: "50", value: 50, color: "hsl(var(--primary) / 0.5)" },
  { label: "10", value: 10, color: "hsl(var(--muted))" },
  { label: "100", value: 100, color: "hsl(var(--primary) / 0.7)" },
];

interface SpinWheelProps {
  onReward: (amount: number) => void;
  disabled?: boolean;
  spinning?: boolean;
}

const SpinWheel = ({ onReward, disabled, spinning: externalSpinning }: SpinWheelProps) => {
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const segAngle = 360 / SEGMENTS.length;

  const spin = () => {
    if (spinning || disabled) return;
    setSpinning(true);
    setResult(null);

    // Weighted random — lower values more likely
    const weights = SEGMENTS.map(s => s.value <= 10 ? 4 : s.value <= 25 ? 2 : 1);
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    let winIdx = 0;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { winIdx = i; break; }
    }

    const extraSpins = 5 + Math.floor(Math.random() * 3);
    const targetAngle = 360 * extraSpins + (360 - winIdx * segAngle - segAngle / 2);
    setRotation(prev => prev + targetAngle);

    setTimeout(() => {
      setSpinning(false);
      setResult(SEGMENTS[winIdx].value);
      onReward(SEGMENTS[winIdx].value);
    }, 3800);
  };

  const isDisabled = spinning || disabled || externalSpinning;
  const size = 220;
  const center = size / 2;
  const radius = size / 2 - 4;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
          <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[16px] border-l-transparent border-r-transparent border-t-primary" />
        </div>

        {/* Wheel */}
        <motion.svg
          width={size}
          height={size}
          animate={{ rotate: rotation }}
          transition={{ duration: 3.5, ease: [0.17, 0.67, 0.12, 0.99] }}
          className="drop-shadow-lg"
        >
          {SEGMENTS.map((seg, i) => {
            const startAngle = (i * segAngle * Math.PI) / 180;
            const endAngle = ((i + 1) * segAngle * Math.PI) / 180;
            const x1 = center + radius * Math.cos(startAngle);
            const y1 = center + radius * Math.sin(startAngle);
            const x2 = center + radius * Math.cos(endAngle);
            const y2 = center + radius * Math.sin(endAngle);
            const largeArc = segAngle > 180 ? 1 : 0;
            const midAngle = (startAngle + endAngle) / 2;
            const textR = radius * 0.65;
            const tx = center + textR * Math.cos(midAngle);
            const ty = center + textR * Math.sin(midAngle);

            return (
              <g key={i}>
                <path
                  d={`M${center},${center} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
                  fill={seg.color}
                  stroke="hsl(var(--border))"
                  strokeWidth="1"
                />
                <text
                  x={tx}
                  y={ty}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="13"
                  fontWeight="bold"
                  fill="hsl(var(--foreground))"
                  className="font-display"
                >
                  {seg.label}
                </text>
              </g>
            );
          })}
          <circle cx={center} cy={center} r="18" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
          <text x={center} y={center} textAnchor="middle" dominantBaseline="central" fontSize="10" fill="hsl(var(--primary))">
            👑
          </text>
        </motion.svg>
      </div>

      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={spin}
        disabled={isDisabled}
        className="flex items-center gap-2 bg-gradient-to-r from-primary to-accent text-primary-foreground px-6 py-3 rounded-xl font-display font-bold text-sm disabled:opacity-40 transition-all shadow-lg shadow-primary/20"
      >
        {spinning ? (
          <>
            <Sparkles className="w-4 h-4 animate-spin" />
            Spinning...
          </>
        ) : result !== null ? (
          <>
            <Crown className="w-4 h-4" />
            +{result} Crowns Won!
          </>
        ) : (
          <>
            <Crown className="w-4 h-4" />
            Spin the Wheel
          </>
        )}
      </motion.button>
    </div>
  );
};

export default SpinWheel;
