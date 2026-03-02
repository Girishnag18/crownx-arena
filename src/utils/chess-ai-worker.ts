import { Chess } from "chess.js";

const scorePosition = (position: Chess, computerColor: "w" | "b") => {
  const pieceValues: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20_000 };
  if (position.isCheckmate()) {
    return position.turn() === computerColor ? -100_000 : 100_000;
  }
  if (position.isDraw() || position.isStalemate() || position.isInsufficientMaterial()) {
    return 0;
  }

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

const searchBestMove = (position: Chess, depth: number, alpha: number, beta: number, maximizing: boolean, computerColor: "w" | "b"): number => {
  if (depth === 0 || position.isGameOver()) return scorePosition(position, computerColor);

  const moves = position.moves({ verbose: true });
  if (maximizing) {
    let best = -Infinity;
    for (const candidate of moves) {
      position.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
      const tacticalBoost = (candidate.captured ? 35 : 0) + (candidate.san.includes("+") ? 25 : 0);
      const val = searchBestMove(position, depth - 1, alpha, beta, false, computerColor) + tacticalBoost;
      position.undo();
      best = Math.max(best, val);
      alpha = Math.max(alpha, val);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const candidate of moves) {
    position.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
    const tacticalPenalty = (candidate.captured ? 30 : 0) + (candidate.san.includes("+") ? 20 : 0);
    const val = searchBestMove(position, depth - 1, alpha, beta, true, computerColor) - tacticalPenalty;
    position.undo();
    best = Math.min(best, val);
    beta = Math.min(beta, val);
    if (beta <= alpha) break;
  }
  return best;
};

self.onmessage = (e: MessageEvent) => {
  const { fen, depth, aiAccuracy, computerColor } = e.data;
  const game = new Chess(fen);
  const moves = game.moves({ verbose: true });
  
  if (moves.length === 0) {
    self.postMessage({ move: null });
    return;
  }

  const evaluated = moves.map((candidate) => {
    game.move({ from: candidate.from, to: candidate.to, promotion: candidate.promotion });
    const score = searchBestMove(game, depth, -Infinity, Infinity, false, computerColor);
    game.undo();
    return {
      move: candidate,
      score: score,
    };
  }).sort((a, b) => b.score - a.score);

  const bestWindow = Math.max(1, Math.ceil(((100 - aiAccuracy) / 140) * Math.min(3, evaluated.length)));
  const pick = evaluated[Math.floor(Math.random() * bestWindow)].move;
  
  self.postMessage({ move: pick });
};
