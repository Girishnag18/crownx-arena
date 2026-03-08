/**
 * Stockfish Engine Singleton Service
 * Manages a single Web Worker instance across the entire app lifecycle.
 */

type EvalCallback = (info: StockfishEval) => void;

export interface StockfishEval {
  depth: number;
  score: number; // centipawns from white's perspective
  mate: number | null;
  pv: string; // principal variation (best line)
  bestMove: string;
}

export interface MoveAnalysis {
  move: string;
  fen: string;
  evalBefore: number;
  evalAfter: number;
  classification: "brilliant" | "great" | "best" | "good" | "inaccuracy" | "mistake" | "blunder" | "book";
}

class StockfishService {
  private worker: Worker | null = null;
  private ready = false;
  private pendingResolve: ((val: string) => void) | null = null;
  private evalListeners: EvalCallback[] = [];
  private bestMoveResolve: ((move: string) => void) | null = null;
  private currentEval: Partial<StockfishEval> = {};

  async init(): Promise<void> {
    if (this.worker && this.ready) return;
    if (this.worker) return; // already initializing

    return new Promise((resolve) => {
      this.worker = new Worker("/stockfish/stockfish.js");
      this.worker.onmessage = (e: MessageEvent<string>) => {
        const msg = e.data;

        if (msg === "uciok") {
          this.ready = true;
          resolve();
          return;
        }

        if (msg.startsWith("info") && msg.includes("score")) {
          this.parseInfo(msg);
        }

        if (msg.startsWith("bestmove")) {
          const bestMove = msg.split(" ")[1];
          this.currentEval.bestMove = bestMove;
          
          const fullEval: StockfishEval = {
            depth: this.currentEval.depth || 0,
            score: this.currentEval.score || 0,
            mate: this.currentEval.mate || null,
            pv: this.currentEval.pv || "",
            bestMove,
          };

          this.evalListeners.forEach((cb) => cb(fullEval));

          if (this.bestMoveResolve) {
            this.bestMoveResolve(bestMove);
            this.bestMoveResolve = null;
          }
        }

        if (this.pendingResolve) {
          this.pendingResolve(msg);
          this.pendingResolve = null;
        }
      };

      this.send("uci");
    });
  }

  private parseInfo(msg: string) {
    const depthMatch = msg.match(/depth (\d+)/);
    const scoreMatch = msg.match(/score cp (-?\d+)/);
    const mateMatch = msg.match(/score mate (-?\d+)/);
    const pvMatch = msg.match(/ pv (.+)/);

    if (depthMatch) this.currentEval.depth = parseInt(depthMatch[1]);
    if (scoreMatch) {
      this.currentEval.score = parseInt(scoreMatch[1]);
      this.currentEval.mate = null;
    }
    if (mateMatch) {
      this.currentEval.mate = parseInt(mateMatch[1]);
      this.currentEval.score = parseInt(mateMatch[1]) > 0 ? 10000 : -10000;
    }
    if (pvMatch) this.currentEval.pv = pvMatch[1];
  }

  private send(cmd: string) {
    this.worker?.postMessage(cmd);
  }

  async evaluate(fen: string, depth = 15): Promise<StockfishEval> {
    await this.init();
    this.currentEval = {};
    this.send("stop");
    this.send("ucinewgame");
    this.send(`position fen ${fen}`);

    return new Promise((resolve) => {
      this.bestMoveResolve = () => {
        resolve({
          depth: this.currentEval.depth || depth,
          score: this.currentEval.score || 0,
          mate: this.currentEval.mate || null,
          pv: this.currentEval.pv || "",
          bestMove: this.currentEval.bestMove || "",
        });
      };
      this.send(`go depth ${depth}`);
    });
  }

  async getBestMove(fen: string, depth = 12): Promise<string> {
    const result = await this.evaluate(fen, depth);
    return result.bestMove;
  }

  onEval(cb: EvalCallback) {
    this.evalListeners.push(cb);
    return () => {
      this.evalListeners = this.evalListeners.filter((l) => l !== cb);
    };
  }

  stop() {
    this.send("stop");
  }

  destroy() {
    this.stop();
    this.worker?.terminate();
    this.worker = null;
    this.ready = false;
  }
}

// Singleton
export const stockfish = new StockfishService();

/**
 * Classify a move based on centipawn loss
 */
export function classifyMove(cpLoss: number): MoveAnalysis["classification"] {
  if (cpLoss <= 0) return "best";
  if (cpLoss <= 10) return "great";
  if (cpLoss <= 30) return "good";
  if (cpLoss <= 80) return "inaccuracy";
  if (cpLoss <= 200) return "mistake";
  return "blunder";
}

export const CLASSIFICATION_COLORS: Record<MoveAnalysis["classification"], string> = {
  brilliant: "#1bada6",
  great: "#5c8bb0",
  best: "#96bc4b",
  good: "#96bc4b",
  inaccuracy: "#f7c631",
  mistake: "#e68a2e",
  blunder: "#ca3431",
  book: "#a88765",
};

export const CLASSIFICATION_ICONS: Record<MoveAnalysis["classification"], string> = {
  brilliant: "⭐",
  great: "!",
  best: "✓",
  good: "○",
  inaccuracy: "?!",
  mistake: "?",
  blunder: "??",
  book: "📖",
};
