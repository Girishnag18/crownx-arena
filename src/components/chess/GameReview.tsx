import { useState, useEffect, useCallback } from "react";
import { Chess } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, AlertTriangle, Zap, CheckCircle2, Loader2, BrainCircuit, ChevronDown, ChevronUp } from "lucide-react";
import { stockfish, classifyMove, type MoveAnalysis, CLASSIFICATION_COLORS, CLASSIFICATION_ICONS } from "@/services/stockfishService";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

interface GameReviewProps {
  pgn?: string;
  moves: Array<{ from: string; to: string; san: string; promotion?: string }>;
  startingFen?: string;
  playerColor: "w" | "b";
  onClose?: () => void;
  onSelectMove?: (moveIndex: number, fen: string) => void;
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

const COACH_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chess-coach`;

const GameReview = ({ moves, startingFen, playerColor, onClose, onSelectMove }: GameReviewProps) => {
  const [analyzing, setAnalyzing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);
  const [coachText, setCoachText] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachExpanded, setCoachExpanded] = useState(false);
  const [moveListExpanded, setMoveListExpanded] = useState(false);

  const analyzeGame = useCallback(async () => {
    if (moves.length === 0) return;

    const analyses: MoveAnalysis[] = [];
    const fen = startingFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    const game = new Chess(fen);

    let prevEval = 0;
    try {
      const startEval = await stockfish.evaluate(game.fen(), 12);
      prevEval = startEval.score;
    } catch { /* use 0 */ }

    for (let i = 0; i < moves.length; i++) {
      const move = moves[i];
      const fenBefore = game.fen();
      const isPlayerMove = (i % 2 === 0 && playerColor === "w") || (i % 2 === 1 && playerColor === "b");

      try {
        game.move({ from: move.from as any, to: move.to as any, promotion: move.promotion });
      } catch { break; }

      let evalAfter = 0;
      try {
        const posEval = await stockfish.evaluate(game.fen(), 12);
        evalAfter = posEval.score;
      } catch { /* use 0 */ }

      const evalDiff = playerColor === "w" ? prevEval - evalAfter : evalAfter - prevEval;
      const cpLoss = isPlayerMove ? Math.max(0, evalDiff) : 0;
      const classification = isPlayerMove ? classifyMove(cpLoss) : "book";
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

    const playerMoves = analyses.filter((_, i) =>
      (i % 2 === 0 && playerColor === "w") || (i % 2 === 1 && playerColor === "b")
    );

    const totalCpLoss = playerMoves.reduce((sum, a) => {
      const loss = playerColor === "w" ? a.evalBefore - a.evalAfter : a.evalAfter - a.evalBefore;
      return sum + Math.max(0, loss);
    }, 0);

    const avgCpLoss = playerMoves.length > 0 ? totalCpLoss / playerMoves.length : 0;
    const accuracy = Math.max(0, Math.min(100, Math.round(103.1668 * Math.exp(-0.04354 * avgCpLoss))));

    const reviewResult: ReviewResult = {
      accuracy,
      moveAnalyses: analyses,
      brilliantCount: playerMoves.filter(a => a.classification === "brilliant").length,
      greatCount: playerMoves.filter(a => a.classification === "great").length,
      blunderCount: playerMoves.filter(a => a.classification === "blunder").length,
      mistakeCount: playerMoves.filter(a => a.classification === "mistake").length,
      inaccuracyCount: playerMoves.filter(a => a.classification === "inaccuracy").length,
    };

    setResult(reviewResult);
    setAnalyzing(false);

    // Auto-trigger AI coaching
    fetchCoaching(analyses, reviewResult);
  }, [moves, startingFen, playerColor]);

  const fetchCoaching = async (analyses: MoveAnalysis[], reviewResult: ReviewResult) => {
    setCoachLoading(true);
    setCoachExpanded(true);
    try {
      const resp = await fetch(COACH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          moves: analyses.map(a => ({ san: a.move, classification: a.classification })),
          playerColor,
          accuracy: reviewResult.accuracy,
          blunders: reviewResult.blunderCount,
          mistakes: reviewResult.mistakeCount,
          inaccuracies: reviewResult.inaccuracyCount,
          brilliants: reviewResult.brilliantCount,
        }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 429) toast.error("Rate limit reached. Try again shortly.");
        else if (resp.status === 402) toast.error("AI credits exhausted.");
        else toast.error("AI coaching unavailable");
        setCoachLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setCoachText(fullText);
            }
          } catch { /* partial */ }
        }
      }
    } catch (e) {
      console.error("Coach streaming error:", e);
    }
    setCoachLoading(false);
  };

  useEffect(() => { analyzeGame(); }, [analyzeGame]);

  const handleMoveClick = (index: number) => {
    const newIdx = selectedMoveIndex === index ? null : index;
    setSelectedMoveIndex(newIdx);
    if (newIdx !== null && result && onSelectMove) {
      onSelectMove(newIdx, result.moveAnalyses[newIdx].fen);
    }
  };

  if (analyzing) {
    return (
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card p-6 border border-primary/30 text-center space-y-4">
        <Loader2 className="w-8 h-8 text-primary mx-auto animate-spin" />
        <div>
          <p className="font-display font-bold text-sm">Analyzing Game...</p>
          <p className="text-xs text-muted-foreground mt-1">Stockfish is evaluating each move</p>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div className="bg-primary h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-xs text-muted-foreground">{progress}% complete</p>
      </motion.div>
    );
  }

  if (!result) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="glass-card p-5 border border-primary/30 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Game Review
        </h3>
        {onClose && (
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">Close</button>
        )}
      </div>

      {/* Accuracy Score */}
      <div className="text-center py-4">
        <div className="relative inline-flex items-center justify-center">
          <svg className="w-24 h-24" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--secondary))" strokeWidth="6" />
            <circle cx="50" cy="50" r="42" fill="none"
              stroke={result.accuracy >= 80 ? "hsl(120, 60%, 45%)" : result.accuracy >= 50 ? "hsl(45, 90%, 55%)" : "hsl(var(--destructive))"}
              strokeWidth="6" strokeDasharray={`${(result.accuracy / 100) * 264} 264`}
              strokeLinecap="round" transform="rotate(-90 50 50)" />
          </svg>
          <span className="absolute font-display font-black text-2xl">{result.accuracy}%</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Accuracy</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-1.5 text-center">
        {[
          { label: "Brilliant", count: result.brilliantCount, icon: <Zap className="w-3 h-3" />, color: CLASSIFICATION_COLORS.brilliant },
          { label: "Great", count: result.greatCount, icon: <CheckCircle2 className="w-3 h-3" />, color: CLASSIFICATION_COLORS.great },
          { label: "Inaccuracy", count: result.inaccuracyCount, icon: null, color: CLASSIFICATION_COLORS.inaccuracy },
          { label: "Mistake", count: result.mistakeCount, icon: null, color: CLASSIFICATION_COLORS.mistake },
          { label: "Blunder", count: result.blunderCount, icon: <AlertTriangle className="w-3 h-3" />, color: CLASSIFICATION_COLORS.blunder },
        ].map(s => (
          <div key={s.label} className="bg-secondary/40 rounded-lg p-2">
            <div className="flex items-center justify-center gap-0.5">
              {s.icon && <span style={{ color: s.color }}>{s.icon}</span>}
              <span className="font-display font-bold text-sm" style={{ color: s.color }}>{s.count}</span>
            </div>
            <p className="text-[9px] text-muted-foreground truncate">{s.label}</p>
          </div>
        ))}
      </div>

      {/* AI Coach Section */}
      <div className="border border-primary/20 rounded-xl overflow-hidden">
        <button onClick={() => setCoachExpanded(!coachExpanded)}
          className="w-full flex items-center justify-between px-3 py-2.5 bg-primary/5 hover:bg-primary/10 transition-colors">
          <span className="flex items-center gap-2 text-sm font-display font-bold">
            <BrainCircuit className="w-4 h-4 text-primary" />
            AI Coach Insights
            {coachLoading && <Loader2 className="w-3 h-3 animate-spin text-primary" />}
          </span>
          {coachExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        <AnimatePresence>
          {coachExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="p-3 max-h-64 overflow-y-auto text-xs leading-relaxed prose prose-sm prose-invert max-w-none
                prose-headings:text-sm prose-headings:font-display prose-headings:font-bold prose-headings:text-foreground
                prose-p:text-muted-foreground prose-li:text-muted-foreground prose-strong:text-foreground">
                {coachText ? (
                  <ReactMarkdown>{coachText}</ReactMarkdown>
                ) : coachLoading ? (
                  <p className="text-muted-foreground italic">Generating coaching advice...</p>
                ) : (
                  <p className="text-muted-foreground italic">No coaching data available.</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Move-by-move list */}
      <div>
        <button onClick={() => setMoveListExpanded(!moveListExpanded)}
          className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground mb-1">
          <span>Move-by-Move ({result.moveAnalyses.filter((_, i) => (i % 2 === 0 && playerColor === "w") || (i % 2 === 1 && playerColor === "b")).length} moves)</span>
          {moveListExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
        <AnimatePresence>
          {moveListExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="max-h-48 overflow-y-auto space-y-0.5">
                {result.moveAnalyses.map((analysis, i) => {
                  const isPlayerMove = (i % 2 === 0 && playerColor === "w") || (i % 2 === 1 && playerColor === "b");
                  if (!isPlayerMove) return null;
                  const moveNum = Math.floor(i / 2) + 1;
                  const color = CLASSIFICATION_COLORS[analysis.classification];
                  const icon = CLASSIFICATION_ICONS[analysis.classification];

                  return (
                    <button key={i} onClick={() => handleMoveClick(i)}
                      className={`w-full flex items-center gap-2 px-2 py-1 rounded text-xs hover:bg-secondary/60 transition-colors ${selectedMoveIndex === i ? "bg-secondary/60" : ""}`}>
                      <span className="text-muted-foreground w-6 text-right">{moveNum}.</span>
                      <span className="font-mono font-bold w-12">{analysis.move}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold" style={{ backgroundColor: `${color}20`, color }}>
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
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default GameReview;
