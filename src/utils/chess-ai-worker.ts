import { Chess } from "chess.js";

type Side = "w" | "b";
declare function importScripts(...urls: string[]): void;

type BestMoveRequest = {
  type: "bestMove";
  fen: string;
  depth: number;
  aiAccuracy: number;
  computerColor: Side;
};

type EvaluateRequest = {
  type: "evaluate";
  fen: string;
  depth: number;
};

type WorkerRequest = BestMoveRequest | EvaluateRequest;

type WorkerResponse =
  | { type: "bestMove"; move: { from: string; to: string; promotion?: string } | null; evalCp: number; using: "stockfish" | "fallback" }
  | { type: "evaluate"; evalCp: number; using: "stockfish" | "fallback" };

const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000 };

const scorePosition = (position: Chess, computerColor: Side) => {
  if (position.isCheckmate()) return position.turn() === computerColor ? -100_000 : 100_000;
  if (position.isDraw() || position.isStalemate() || position.isInsufficientMaterial()) return 0;

  let evaluation = 0;
  for (const row of position.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const value = pieceValues[piece.type] || 0;
      evaluation += piece.color === computerColor ? value : -value;
    }
  }

  const mobility = position.moves().length;
  evaluation += position.turn() === computerColor ? mobility * 2 : -mobility * 2;
  return evaluation;
};

const search = (position: Chess, depth: number, alpha: number, beta: number, maximizing: boolean, computerColor: Side): number => {
  if (depth === 0 || position.isGameOver()) return scorePosition(position, computerColor);

  const moves = position.moves({ verbose: true });
  if (maximizing) {
    let best = -Infinity;
    for (const candidate of moves) {
      position.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
      const tacticalBoost = (candidate.captured ? 35 : 0) + (candidate.san.includes("+") ? 25 : 0);
      const value = search(position, depth - 1, alpha, beta, false, computerColor) + tacticalBoost;
      position.undo();
      best = Math.max(best, value);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const candidate of moves) {
    position.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
    const tacticalPenalty = (candidate.captured ? 30 : 0) + (candidate.san.includes("+") ? 20 : 0);
    const value = search(position, depth - 1, alpha, beta, true, computerColor) - tacticalPenalty;
    position.undo();
    best = Math.min(best, value);
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return best;
};

const fallbackBestMove = (fen: string, depth: number, aiAccuracy: number, computerColor: Side) => {
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return { move: null, evalCp: scorePosition(game, computerColor) };

  const evaluated = moves
    .map((candidate) => {
      game.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
      const score = search(game, depth, -Infinity, Infinity, false, computerColor);
      game.undo();
      return { move: candidate, score };
    })
    .sort((a, b) => b.score - a.score);

  const bestWindow = Math.max(1, Math.ceil(((100 - aiAccuracy) / 140) * Math.min(3, evaluated.length)));
  const pick = evaluated[Math.floor(Math.random() * bestWindow)]?.move ?? evaluated[0].move;
  return {
    move: pick ? { from: pick.from, to: pick.to, promotion: pick.promotion } : null,
    evalCp: evaluated[0]?.score ?? 0,
  };
};

const fallbackEvaluate = (fen: string) => {
  const game = new Chess(fen);
  return scorePosition(game, "w");
};

type EngineResult = { bestMoveUci: string | null; evalCpWhite: number };
let stockfishEngine: { postMessage: (cmd: string) => void; onmessage: ((event: MessageEvent | string) => void) | null } | null = null;
let engineInitAttempted = false;
let engineQueue = Promise.resolve();

const parseScoreCp = (line: string): number | null => {
  const cpMatch = line.match(/score cp (-?\d+)/);
  if (cpMatch) return Number(cpMatch[1]);
  const mateMatch = line.match(/score mate (-?\d+)/);
  if (!mateMatch) return null;
  const mate = Number(mateMatch[1]);
  return mate > 0 ? 100_000 - Math.min(99, mate) * 100 : -100_000 + Math.min(99, Math.abs(mate)) * 100;
};

const ensureStockfish = (): boolean => {
  if (engineInitAttempted) return !!stockfishEngine;
  engineInitAttempted = true;
  try {
    // Prefer local bundled engine if present; fallback to CDN.
    importScripts("/stockfish/stockfish.js");
  } catch {
    try {
      importScripts("https://cdn.jsdelivr.net/npm/stockfish@16.0.0/src/stockfish.js");
    } catch {
      return false;
    }
  }

  const maybeFactory = (self as unknown as { Stockfish?: () => { postMessage: (cmd: string) => void; onmessage: ((event: MessageEvent | string) => void) | null } }).Stockfish;
  if (!maybeFactory) return false;
  stockfishEngine = maybeFactory();
  stockfishEngine.postMessage("uci");
  stockfishEngine.postMessage("isready");
  return true;
};

const runStockfish = (fen: string, depth: number): Promise<EngineResult> => {
  if (!stockfishEngine) return Promise.reject(new Error("Stockfish not loaded"));
  const game = new Chess(fen);

  return new Promise((resolve) => {
    let latestScoreCpSideToMove = 0;
    stockfishEngine!.onmessage = (event: MessageEvent | string) => {
      const line = typeof event === "string"
        ? event
        : typeof event.data === "string"
          ? event.data
          : "";
      if (!line) return;

      if (line.startsWith("info ")) {
        const scoreCp = parseScoreCp(line);
        if (scoreCp !== null) latestScoreCpSideToMove = scoreCp;
      } else if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        const uci = parts[1] && parts[1] !== "(none)" ? parts[1] : null;
        const evalCpWhite = game.turn() === "w" ? latestScoreCpSideToMove : -latestScoreCpSideToMove;
        resolve({ bestMoveUci: uci, evalCpWhite });
      }
    };
    stockfishEngine!.postMessage("ucinewgame");
    stockfishEngine!.postMessage(`position fen ${fen}`);
    stockfishEngine!.postMessage(`go depth ${Math.max(6, depth)}`);
  });
};

const queuedStockfish = (fen: string, depth: number): Promise<EngineResult> => {
  const task = engineQueue.then(() => runStockfish(fen, depth));
  engineQueue = task.then(() => undefined).catch(() => undefined);
  return task;
};

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const data = e.data;

  if (data.type === "evaluate") {
    if (ensureStockfish()) {
      try {
        const result = await queuedStockfish(data.fen, data.depth);
        const response: WorkerResponse = { type: "evaluate", evalCp: result.evalCpWhite, using: "stockfish" };
        self.postMessage(response);
        return;
      } catch {
        // Fall through to fallback evaluator.
      }
    }

    const response: WorkerResponse = { type: "evaluate", evalCp: fallbackEvaluate(data.fen), using: "fallback" };
    self.postMessage(response);
    return;
  }

  if (ensureStockfish()) {
    try {
      const result = await queuedStockfish(data.fen, data.depth + 6);
      const move = result.bestMoveUci
        ? {
            from: result.bestMoveUci.slice(0, 2),
            to: result.bestMoveUci.slice(2, 4),
            promotion: result.bestMoveUci.length > 4 ? result.bestMoveUci.slice(4, 5) : undefined,
          }
        : null;
      const response: WorkerResponse = { type: "bestMove", move, evalCp: result.evalCpWhite, using: "stockfish" };
      self.postMessage(response);
      return;
    } catch {
      // Fall through to fallback engine.
    }
  }

  const fallback = fallbackBestMove(data.fen, data.depth, data.aiAccuracy, data.computerColor);
  const response: WorkerResponse = { type: "bestMove", move: fallback.move, evalCp: fallback.evalCp, using: "fallback" };
  self.postMessage(response);
};
