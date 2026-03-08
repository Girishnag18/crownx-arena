import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { stockfish, StockfishEval } from "@/services/stockfishService";

interface EvalBarProps {
  fen: string | null;
  height?: number;
}

const EvalBar = ({ fen, height = 400 }: EvalBarProps) => {
  const [evaluation, setEvaluation] = useState<StockfishEval | null>(null);
  const [loading, setLoading] = useState(false);
  const evalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!fen) return;

    // Debounce eval requests
    if (evalTimer.current) clearTimeout(evalTimer.current);
    setLoading(true);

    evalTimer.current = setTimeout(async () => {
      try {
        const result = await stockfish.evaluate(fen, 14);
        setEvaluation(result);
      } catch {
        // Stockfish may not be available
      }
      setLoading(false);
    }, 300);

    return () => {
      if (evalTimer.current) clearTimeout(evalTimer.current);
    };
  }, [fen]);

  const getWhitePercentage = () => {
    if (!evaluation) return 50;
    if (evaluation.mate !== null) {
      return evaluation.mate > 0 ? 98 : 2;
    }
    // Sigmoid-like mapping: cp → percentage
    const cp = evaluation.score;
    const pct = 50 + 50 * (2 / (1 + Math.exp(-0.004 * cp)) - 1);
    return Math.max(2, Math.min(98, pct));
  };

  const getEvalText = () => {
    if (!evaluation) return "0.0";
    if (evaluation.mate !== null) {
      return `M${Math.abs(evaluation.mate)}`;
    }
    const score = evaluation.score / 100;
    const sign = score > 0 ? "+" : "";
    return `${sign}${score.toFixed(1)}`;
  };

  const whitePct = getWhitePercentage();
  const isWhiteAdvantage = whitePct >= 50;

  return (
    <div
      className="relative rounded-md overflow-hidden border border-border/60 flex flex-col"
      style={{ width: 28, height }}
    >
      {/* Black portion (top) */}
      <motion.div
        className="bg-foreground/90"
        animate={{ flex: 100 - whitePct }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ minHeight: 2 }}
      />
      {/* White portion (bottom) */}
      <motion.div
        className="bg-background border-t border-border/30"
        animate={{ flex: whitePct }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        style={{ minHeight: 2 }}
      />

      {/* Eval label */}
      <div
        className={`absolute left-1/2 -translate-x-1/2 text-[9px] font-bold font-mono leading-none ${
          isWhiteAdvantage ? "bottom-1 text-foreground" : "top-1 text-background"
        }`}
      >
        {loading ? "…" : getEvalText()}
      </div>
    </div>
  );
};

export default EvalBar;
