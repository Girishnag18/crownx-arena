import { useState, useCallback, useMemo } from "react";
import { Chess, Square } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Upload, Play, ChevronLeft, ChevronRight, BarChart3, Loader2, SkipBack, SkipForward } from "lucide-react";
import { toast } from "sonner";
import ChessBoard from "@/components/chess/ChessBoard";
import { stockfish, classifyMove, type MoveAnalysis, CLASSIFICATION_COLORS, CLASSIFICATION_ICONS } from "@/services/stockfishService";

interface ParsedMove {
  from: string;
  to: string;
  san: string;
  promotion?: string;
}

interface AnalysisResult {
  moves: MoveAnalysis[];
  whiteAccuracy: number;
  blackAccuracy: number;
}

const PgnAnalysis = () => {
  const [pgnInput, setPgnInput] = useState("");
  const [parsedMoves, setParsedMoves] = useState<ParsedMove[]>([]);
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [parsed, setParsed] = useState(false);

  const parsePgn = useCallback(() => {
    const pgn = pgnInput.trim();
    if (!pgn) { toast.error("Please paste a PGN."); return; }

    try {
      const game = new Chess();
      game.loadPgn(pgn);

      const verboseHistory = game.history({ verbose: true });
      if (verboseHistory.length === 0) {
        toast.error("No valid moves found in PGN.");
        return;
      }

      const moves: ParsedMove[] = verboseHistory.map((m) => ({
        from: m.from,
        to: m.to,
        san: m.san,
        promotion: m.promotion,
      }));

      // Extract headers
      const headerObj: Record<string, string> = {};
      const headerRegex = /\[(\w+)\s+"([^"]+)"\]/g;
      let match;
      while ((match = headerRegex.exec(pgn)) !== null) {
        headerObj[match[1]] = match[2];
      }

      setParsedMoves(moves);
      setHeaders(headerObj);
      setCurrentMoveIndex(-1);
      setAnalysis(null);
      setParsed(true);
      toast.success(`Loaded ${moves.length} moves`);
    } catch {
      toast.error("Failed to parse PGN. Check the format.");
    }
  }, [pgnInput]);

  // Build game state at current move index
  const gameAtIndex = useMemo(() => {
    const g = new Chess();
    for (let i = 0; i <= currentMoveIndex && i < parsedMoves.length; i++) {
      const m = parsedMoves[i];
      g.move({ from: m.from as Square, to: m.to as Square, promotion: m.promotion as any });
    }
    return g;
  }, [currentMoveIndex, parsedMoves]);

  const lastMove = useMemo(() => {
    if (currentMoveIndex < 0 || currentMoveIndex >= parsedMoves.length) return null;
    const m = parsedMoves[currentMoveIndex];
    return { from: m.from as Square, to: m.to as Square };
  }, [currentMoveIndex, parsedMoves]);

  const goToMove = (idx: number) => {
    setCurrentMoveIndex(Math.max(-1, Math.min(parsedMoves.length - 1, idx)));
  };

  const runAnalysis = useCallback(async () => {
    if (parsedMoves.length === 0) return;
    setAnalyzing(true);
    setAnalyzeProgress(0);

    const analyses: MoveAnalysis[] = [];
    const g = new Chess();
    let prevEval = 0;

    try {
      const startEval = await stockfish.evaluate(g.fen(), 12);
      prevEval = startEval.score;
    } catch {}

    for (let i = 0; i < parsedMoves.length; i++) {
      const move = parsedMoves[i];
      const fenBefore = g.fen();

      try {
        g.move({ from: move.from as Square, to: move.to as Square, promotion: move.promotion as any });
      } catch { break; }

      let evalAfter = 0;
      try {
        const posEval = await stockfish.evaluate(g.fen(), 12);
        evalAfter = posEval.score;
      } catch {}

      const isWhiteMove = i % 2 === 0;
      const evalDiff = isWhiteMove ? (prevEval - evalAfter) : (evalAfter - prevEval);
      const cpLoss = Math.max(0, evalDiff);
      const classification = classifyMove(cpLoss);

      const swing = isWhiteMove ? (evalAfter - prevEval) : (prevEval - evalAfter);

      analyses.push({
        move: move.san,
        fen: fenBefore,
        evalBefore: prevEval,
        evalAfter,
        classification: swing > 150 ? "brilliant" : classification,
      });

      prevEval = evalAfter;
      setAnalyzeProgress(Math.round(((i + 1) / parsedMoves.length) * 100));
    }

    // Calculate accuracy for both sides
    const calcAccuracy = (side: "w" | "b") => {
      const sideMoves = analyses.filter((_, i) => side === "w" ? i % 2 === 0 : i % 2 === 1);
      const totalLoss = sideMoves.reduce((sum, a) => {
        const loss = side === "w" ? a.evalBefore - a.evalAfter : a.evalAfter - a.evalBefore;
        return sum + Math.max(0, loss);
      }, 0);
      const avg = sideMoves.length > 0 ? totalLoss / sideMoves.length : 0;
      return Math.max(0, Math.min(100, Math.round(103.1668 * Math.exp(-0.04354 * avg))));
    };

    setAnalysis({
      moves: analyses,
      whiteAccuracy: calcAccuracy("w"),
      blackAccuracy: calcAccuracy("b"),
    });
    setAnalyzing(false);
  }, [parsedMoves]);

  const movePairs = useMemo(() => {
    const pairs: { num: number; white: { san: string; idx: number; analysis?: MoveAnalysis }; black?: { san: string; idx: number; analysis?: MoveAnalysis } }[] = [];
    for (let i = 0; i < parsedMoves.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: { san: parsedMoves[i].san, idx: i, analysis: analysis?.moves[i] },
        black: parsedMoves[i + 1] ? { san: parsedMoves[i + 1].san, idx: i + 1, analysis: analysis?.moves[i + 1] } : undefined,
      });
    }
    return pairs;
  }, [parsedMoves, analysis]);

  // Import view
  if (!parsed) {
    return (
      <div className="page-container">
        <div className="page-content page-content--compact">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold mb-2">PGN Analysis</h1>
              <p className="text-sm text-muted-foreground">
                Paste a PGN to replay moves and get full engine analysis
              </p>
            </div>

            <div className="glass-card p-6 space-y-4">
              <label className="font-display font-bold text-sm">Paste PGN</label>
              <textarea
                value={pgnInput}
                onChange={(e) => setPgnInput(e.target.value)}
                placeholder={`[Event "Casual Game"]\n[White "Player1"]\n[Black "Player2"]\n\n1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 ...`}
                className="w-full h-48 rounded-lg border border-border bg-card p-4 font-mono text-xs resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                onClick={parsePgn}
                disabled={!pgnInput.trim()}
                className="w-full bg-primary text-primary-foreground font-display font-bold py-3 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" /> Load PGN
              </button>
            </div>

            {/* Example */}
            <div className="glass-card p-5">
              <p className="font-display font-bold text-xs mb-2 text-muted-foreground">Example — Immortal Game</p>
              <button
                onClick={() =>
                  setPgnInput(
                    `[Event "Immortal Game"]\n[White "Anderssen"]\n[Black "Kieseritzky"]\n[Result "1-0"]\n\n1. e4 e5 2. f4 exf4 3. Bc4 Qh4+ 4. Kf1 b5 5. Bxb5 Nf6 6. Nf3 Qh6 7. d3 Nh5 8. Nh4 Qg5 9. Nf5 c6 10. g4 Nf6 11. Rg1 cxb5 12. h4 Qg6 13. h5 Qg5 14. Qf3 Ng8 15. Bxf4 Qf6 16. Nc3 Bc5 17. Nd5 Qxb2 18. Bd6 Bxg1 19. e5 Qxa1+ 20. Ke2 Na6 21. Nxg7+ Kd8 22. Qf6+ Nxf6 23. Be7# 1-0`
                  )
                }
                className="text-xs text-primary hover:underline"
              >
                Load this example
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Analysis view
  return (
    <div className="page-container">
      <div className="page-content page-content--wide">
        <button
          onClick={() => { setParsed(false); setParsedMoves([]); setAnalysis(null); }}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          ← Load another PGN
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Board */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {/* Game info */}
            {(headers.White || headers.Black) && (
              <div className="w-full max-w-[min(80vw,480px)] mb-3 rounded-lg border border-border/60 bg-secondary/20 px-4 py-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-display font-bold">
                    {headers.White || "White"} vs {headers.Black || "Black"}
                  </span>
                  <span className="text-muted-foreground">{headers.Event || ""} {headers.Date || ""}</span>
                </div>
                {headers.Result && (
                  <p className="text-[10px] text-muted-foreground">Result: {headers.Result}</p>
                )}
              </div>
            )}

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <ChessBoard
                game={gameAtIndex}
                onMove={() => false}
                flipped={false}
                disabled={true}
                lastMove={lastMove}
                sizeClassName="max-w-[min(80vw,480px)]"
              />
            </motion.div>

            {/* Navigation controls */}
            <div className="flex items-center gap-2 mt-4">
              <button onClick={() => goToMove(-1)} className="glass-card px-3 py-2 hover:border-primary/30" title="Start">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => goToMove(currentMoveIndex - 1)} className="glass-card px-3 py-2 hover:border-primary/30" title="Back">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground font-mono px-2">
                {currentMoveIndex < 0 ? "Start" : `Move ${currentMoveIndex + 1}/${parsedMoves.length}`}
              </span>
              <button onClick={() => goToMove(currentMoveIndex + 1)} className="glass-card px-3 py-2 hover:border-primary/30" title="Next">
                <ChevronRight className="w-4 h-4" />
              </button>
              <button onClick={() => goToMove(parsedMoves.length - 1)} className="glass-card px-3 py-2 hover:border-primary/30" title="End">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Eval bar for current position */}
            {analysis && currentMoveIndex >= 0 && analysis.moves[currentMoveIndex] && (
              <div className="w-full max-w-[min(80vw,480px)] mt-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Eval:</span>
                  <span className="font-mono font-bold">
                    {analysis.moves[currentMoveIndex].evalAfter > 0 ? "+" : ""}
                    {(analysis.moves[currentMoveIndex].evalAfter / 100).toFixed(1)}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                    style={{
                      backgroundColor: `${CLASSIFICATION_COLORS[analysis.moves[currentMoveIndex].classification]}20`,
                      color: CLASSIFICATION_COLORS[analysis.moves[currentMoveIndex].classification],
                    }}
                  >
                    {CLASSIFICATION_ICONS[analysis.moves[currentMoveIndex].classification]}{" "}
                    {analysis.moves[currentMoveIndex].classification}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-5 space-y-4">
            {/* Analyze button */}
            {!analysis && !analyzing && (
              <button
                onClick={runAnalysis}
                className="w-full bg-primary text-primary-foreground font-display font-bold py-3 rounded-lg flex items-center justify-center gap-2"
              >
                <BarChart3 className="w-4 h-4" /> Run Engine Analysis
              </button>
            )}

            {/* Progress */}
            {analyzing && (
              <div className="glass-card p-5 text-center space-y-3">
                <Loader2 className="w-6 h-6 text-primary mx-auto animate-spin" />
                <p className="font-display font-bold text-sm">Analyzing...</p>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div className="bg-primary h-2 rounded-full transition-all" style={{ width: `${analyzeProgress}%` }} />
                </div>
                <p className="text-[10px] text-muted-foreground">{analyzeProgress}%</p>
              </div>
            )}

            {/* Accuracy cards */}
            {analysis && (
              <div className="grid grid-cols-2 gap-3">
                <div className="glass-card p-4 text-center border-glow">
                  <div className="w-3 h-3 rounded-full bg-white border border-border mx-auto mb-1" />
                  <p className="font-display font-black text-2xl">{analysis.whiteAccuracy}%</p>
                  <p className="text-[10px] text-muted-foreground">White Accuracy</p>
                </div>
                <div className="glass-card p-4 text-center border-glow">
                  <div className="w-3 h-3 rounded-full bg-gray-900 border border-border mx-auto mb-1" />
                  <p className="font-display font-black text-2xl">{analysis.blackAccuracy}%</p>
                  <p className="text-[10px] text-muted-foreground">Black Accuracy</p>
                </div>
              </div>
            )}

            {/* Move list */}
            <div className="glass-card p-5">
              <h3 className="font-display font-bold text-sm mb-3">Moves</h3>
              <div className="max-h-96 overflow-y-auto space-y-0.5">
                {movePairs.map((pair) => (
                  <div key={pair.num} className="flex items-center gap-1 text-sm">
                    <span className="text-muted-foreground w-7 text-right text-xs font-mono">{pair.num}.</span>
                    <button
                      onClick={() => goToMove(pair.white.idx)}
                      className={`flex-1 px-1.5 py-0.5 rounded text-left font-mono text-xs flex items-center gap-1 hover:bg-secondary/60 ${
                        currentMoveIndex === pair.white.idx ? "bg-primary/15 text-primary" : ""
                      }`}
                    >
                      {pair.white.san}
                      {pair.white.analysis && analysis && (
                        <span
                          className="text-[9px] font-bold ml-auto"
                          style={{ color: CLASSIFICATION_COLORS[pair.white.analysis.classification] }}
                        >
                          {CLASSIFICATION_ICONS[pair.white.analysis.classification]}
                        </span>
                      )}
                    </button>
                    {pair.black && (
                      <button
                        onClick={() => goToMove(pair.black!.idx)}
                        className={`flex-1 px-1.5 py-0.5 rounded text-left font-mono text-xs flex items-center gap-1 hover:bg-secondary/60 ${
                          currentMoveIndex === pair.black!.idx ? "bg-primary/15 text-primary" : ""
                        }`}
                      >
                        {pair.black.san}
                        {pair.black.analysis && analysis && (
                          <span
                            className="text-[9px] font-bold ml-auto"
                            style={{ color: CLASSIFICATION_COLORS[pair.black.analysis.classification] }}
                          >
                            {CLASSIFICATION_ICONS[pair.black.analysis.classification]}
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Classification summary */}
            {analysis && (
              <div className="glass-card p-5">
                <h3 className="font-display font-bold text-sm mb-3">Move Classification</h3>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {(["brilliant", "great", "best", "good", "inaccuracy", "mistake", "blunder"] as const).map((cls) => {
                    const count = analysis.moves.filter((m) => m.classification === cls).length;
                    if (count === 0) return null;
                    return (
                      <div key={cls} className="bg-secondary/40 rounded-lg p-2">
                        <span className="text-sm font-bold" style={{ color: CLASSIFICATION_COLORS[cls] }}>
                          {CLASSIFICATION_ICONS[cls]}
                        </span>
                        <p className="font-display font-bold text-xs mt-0.5">{count}</p>
                        <p className="text-[9px] text-muted-foreground capitalize">{cls}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PgnAnalysis;
