/**
 * Chess960 (Fischer Random) starting position generator.
 *
 * Rules:
 * 1. Bishops must be on opposite-color squares
 * 2. The king must be between the two rooks
 * 3. Pawns are always in their normal starting positions
 */

const PIECES = ["r", "n", "b", "q", "k", "b", "n", "r"];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Generate a random Chess960 back-rank arrangement.
 * Returns an array of 8 piece chars like ["r","n","b","q","k","b","n","r"].
 */
export function generateChess960BackRank(): string[] {
  // Use the direct generation method for guaranteed valid positions
  const rank: string[] = new Array(8).fill("");

  // 1. Place bishops on opposite-color squares
  const lightSquares = [0, 2, 4, 6]; // even indices = light squares
  const darkSquares = [1, 3, 5, 7];  // odd indices = dark squares
  const bishop1 = lightSquares[Math.floor(Math.random() * 4)];
  const bishop2 = darkSquares[Math.floor(Math.random() * 4)];
  rank[bishop1] = "b";
  rank[bishop2] = "b";

  // 2. Place queen on a random empty square
  const emptyAfterBishops = rank.map((v, i) => (v === "" ? i : -1)).filter(i => i >= 0);
  const queenIdx = emptyAfterBishops[Math.floor(Math.random() * emptyAfterBishops.length)];
  rank[queenIdx] = "q";

  // 3. Place knights on random empty squares
  const emptyAfterQueen = rank.map((v, i) => (v === "" ? i : -1)).filter(i => i >= 0);
  const shuffledEmpty = shuffle(emptyAfterQueen);
  rank[shuffledEmpty[0]] = "n";
  rank[shuffledEmpty[1]] = "n";

  // 4. Place rook, king, rook on the remaining 3 squares (in order, ensuring king is between rooks)
  const remaining = rank.map((v, i) => (v === "" ? i : -1)).filter(i => i >= 0).sort((a, b) => a - b);
  rank[remaining[0]] = "r";
  rank[remaining[1]] = "k";
  rank[remaining[2]] = "r";

  return rank;
}

/**
 * Generate a full Chess960 FEN string.
 */
export function generateChess960Fen(): string {
  const backRank = generateChess960BackRank();

  const blackRank = backRank.join("");
  const whiteRank = backRank.map(p => p.toUpperCase()).join("");

  // Find rook and king positions for castling rights
  const kingIdx = backRank.indexOf("k");
  const rook1Idx = backRank.indexOf("r");
  const rook2Idx = backRank.lastIndexOf("r");

  // Use standard castling notation for Chess960
  // White castling: uppercase file letters of the rooks
  // Black castling: lowercase file letters of the rooks
  const files = "abcdefgh";
  const castling =
    files[rook2Idx].toUpperCase() +
    files[rook1Idx].toUpperCase() +
    files[rook2Idx] +
    files[rook1Idx];

  return `${blackRank}/pppppppp/8/8/8/8/PPPPPPPP/${whiteRank} w ${castling} - 0 1`;
}

/**
 * Check if a FEN represents a Chess960 position (non-standard back rank).
 */
export function isChess960Fen(fen: string): boolean {
  const standardFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR";
  return !fen.startsWith(standardFen);
}
