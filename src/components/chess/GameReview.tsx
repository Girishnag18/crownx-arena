import { useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import { motion } from "framer-motion";
import { Crown, BarChart3, Target, AlertTriangle, Zap, CheckCircle2, Loader2 } from "lucide-react";
import { stockfish, classifyMove, type MoveAnalysis, CLASSIFICATION_COLORS, CLASSIFICATION_ICONS } from "@/services/stockfishService";

interface GameReviewProps {
  pgn?: string;
  moves: Array<{ from: string; to: string; san: string; promotion?: string }>;
  startingFen?: string;
  playerColor: "w" | "b";
  onClose?: () => void;
}

interface ReviewResult {
  accuracy: number;
  moveAnalyses: MoveAnalysis[];
  brilliantCount: number;
  greatCount: number;
  blunderCount: number;
  mistakeCount: number;
  inaccuracyCount: number;
}

const GameReview = ({ moves, startingFen, playerColor, onClose }: GameReviewProps) => {
  const [analyzing, setAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);

  const analyzeGame = useCallback(async () => {
    if (moves.length === 0) return;

    const analyses: MoveAnalysis[] = [];
    const fen = startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const game = new Chess(fen);

    // Evaluate starting position
    let prevEval = 0;
    try {
      const startEval = await stockfish.evaluate(game.fen(), 12);
      prevEval = startEval.score;
    } catch {
      // use 0
    }

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const fenBefore = game.fen();
      const isPlayerMove = (i % 2 === 0 && playerColor === "w") || (i % 2 === 1 && playerColor === "b");

      try {
        game.move({ from: move.from as any, to: move.to as any, promotion: move.promotion });
      } catch {
        break;
      }

      // Evaluate position after move
      let evalAfter = 0;
      try {
        const posEval = await stockfish.evaluate(game.fen(), 12);
        evalAfter = posEval.score;
      } catch {
        // use 0
      }

      // Calculate centipawn loss from player's perspective
      const evalDiff = playerColor === "w"
        ? prevEval - evalAfter
        : evalAfter - prevEval;

      const cpLoss = isPlayerMove ? Math.max(0, evalDiff) : 0;
      const classification = isPlayerMove ? classifyMove(cpLoss) : "book";

      // Check for brilliant moves (significant positive swing)
      const swing = isPlayerMove
        ? (playerColor === "w" ? evalAfter - prevEval : prevEval - evalAfter)
        : 0;

      analyses.push({
        move: move.san,
        fen: fenBefore,
        evalBefore: prevEval,
        evalAfter: evalAfter,
        classification: isPlayerMove && swing > 150 ? "brilliant" : classification,
      });

      prevEval = evalAfter;
      setProgress(Math.round(((i + 1) / moves.length) * 100));
    }

    // Calculate accuracy (simplified model based on centipawn loss)
    const playerMoves = analyses.filter((_, i) =>
      (i % 2 === 0 && playerColor === "w") || (i % 2 === 1 && playerColor === "b")
    );

    const totalCpLoss = playerMoves.reduce((sum, a) => {
      const loss = playerColor === "w"
        ? a.evalBefore - a.evalAfter
        : a.evalAfter - a.evalBefore;
      return sum + Math.max(0, loss);
    }, 0);

    const avgCpLoss = playerMoves.length > 0 ? totalCpLoss / playerMoves.length : 0;
    const accuracy = Math.max(0, Math.min(100, Math.round(103.1668 * Math.exp(-0.04354 * avgCpLoss))));

    const brilliantCount = playerMoves.filter(a => a.classification === "brilliant").length;
    const greatCount = playerMoves.filter(a => a.classification === "great").length;
    const blunderCount = playerMoves.filter(a => a.classification === "blunder").length;
    const mistakeCount = playerMoves.filter(a => a.classification === "mistake").length;
    const inaccuracyCount = playerMoves.filter(a => a.classification === "inaccuracy").length;

    setResult({
      accuracy,
      moveAnalyses: analyses,
      brilliantCount,
      greatCount,
      blunderCount,
      mistakeCount,
      inaccuracyCount,
    });
    setAnalyzing(false);
  }, [moves, startingFen, playerColor]);

  useEffect(() => {
    analyzeGame();
  }, [analyzeGame]);

  if (analyzing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-primary/30 text-center space-y-4"
      >
        <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
        <div>
          <p className="font-display font-bold text-sm">Analyzing Game...</p>
          <p className="text-xs text-muted-foreground mt-1">Stockfish is evaluating each move</p>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">{progress}% complete</p>
      </motion.div>
    );
  }

  if (!result) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 border border-primary/30 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" />
          Game Review
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Close
          </button>
        )}
      </div>

      {/* Accuracy Score */}
      <div className="text-center py-4">
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-24 h-24" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke={result.accuracy >= 80 ? "hsl(var(--success))" : result.accuracy >= 50 ? "hsl(var(--accent))" : "hsl(var(--destructive))"}
              strokeWidth="6"
              strokeDasharray={`${(result.accuracy / 100) * 264} 264`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="absolute font-display font-black text-2xl">{result.accuracy}%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Accuracy</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-secondary/40 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1">
            <Zap className="w-3 h-3" style={{ color: CLASSIFICATION_COLORS.brilliant }} />
            <span className="font-display font-bold text-sm">{result.brilliantCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Brilliant</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" style={{ color: CLASSIFICATION_COLORS.great }} />
            <span className="font-display font-bold text-sm">{result.greatCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Great</p>
        </div>
        <div className="bg-secondary/40 rounded-lg p-2">
          <div className="flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" style={{ color: CLASSIFICATION_COLORS.blunder }} />
            <span className="font-display font-bold text-sm">{result.blunderCount}</span>
          </div>
          <p className="text-[10px] text-muted-foreground">Blunders</p>
        </div>
      </div>

      <div className="flex justify-between text-xs text-muted-foreground px-1">
        <span>Inaccuracies: {result.inaccuracyCount}</span>
        <span>Mistakes: {result.mistakeCount}</span>
      </div>

      {/* Move-by-move list */}
      <div className="max-h-48 overflow-y-auto space-y-0.5">
        {result.moveAnalyses.map((analysis, i) => {
          const isPlayerMove = (i % 2 === 0 && playerColor === "w") || (i % 2 === 1 && playerColor === "b");
          if (!isPlayerMove) return null;

          const moveNum = Math.floor(i / 2) + 1;
          const color = CLASSIFICATION_COLORS[analysis.classification];
          const icon = CLASSIFICATION_ICONS[analysis.classification];

          return (
            <button
              key={i}
              onClick={() => setSelectedMoveIndex(selectedMoveIndex === i ? null : i)}
              className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-secondary/60 transition-colors ${selectedMoveIndex === i ? "bg-secondary/60" : ""}`}
            >
              <span className="text-muted-foreground w-6 text-right">{moveNum}.</span>
              <span className="font-mono font-bold w-12">{analysis.move}</span>
              <span
                className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {icon} {analysis.classification}
              </span>
              <span className="ml-auto text-muted-foreground text-[10px]">
                {analysis.evalAfter > 0 ? "+" : ""}{(analysis.evalAfter / 100).toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>
    </motion.div>
  );
};

export default GameReview;
