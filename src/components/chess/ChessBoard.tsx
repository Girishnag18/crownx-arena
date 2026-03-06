import { useState, useCallback, useMemo } from "react";
import { Chess, Square, Move } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import BoardSquare from "./BoardSquare";
import {
  BOARD_THEME_STYLES,
  PIECE_THEME_SPRITES,
  PIECE_UNICODE,
  type BoardTheme,
  type PieceTheme,
} from "@/utils/chessThemes";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square, promotion?: string) => boolean | Promise<boolean>;
  flipped?: boolean;
  disabled?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  sizeClassName?: string;
  maxBoardSizePx?: number;
  boardTheme?: BoardTheme;
  pieceTheme?: PieceTheme;
}

const ChessBoard = ({
  game,
  onMove,
  flipped = false,
  disabled = false,
  lastMove,
  sizeClassName,
  maxBoardSizePx,
  boardTheme = "wood",
  pieceTheme = "neo",
}: ChessBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);

  const files = flipped ? [...FILES].reverse() : FILES;
  const ranks = flipped ? [...RANKS].reverse() : RANKS;
  const boardStyles = BOARD_THEME_STYLES[boardTheme];
  const pieceSprites = PIECE_THEME_SPRITES[pieceTheme];
  const isInCheck = game.isCheck();

  const kingSquare = useMemo(() => {
    if (!isInCheck) return null;
    for (let r = 0; r < 8; r += 1) {
      for (let f = 0; f < 8; f += 1) {
        const sq = (FILES[f] + RANKS[r]) as Square;
        const p = game.get(sq);
        if (p && p.type === "k" && p.color === game.turn()) return sq;
      }
    }
    return null;
  }, [game, isInCheck]);

  const clearSelection = () => {
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handleSquareClick = useCallback((square: Square) => {
    if (disabled || promotionPending) return;

    const piece = game.get(square);

    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }) as Move[];
      setLegalMoves(moves.map((m) => m.to as Square));
      return;
    }

    if (selectedSquare) {
      const selectedPiece = game.get(selectedSquare);
      if (
        selectedPiece?.type === "p" &&
        ((selectedPiece.color === "w" && square[1] === "8") ||
          (selectedPiece.color === "b" && square[1] === "1"))
      ) {
        setPromotionPending({ from: selectedSquare, to: square });
        return;
      }

      const result = onMove(selectedSquare, square);
      if (result instanceof Promise) {
        result.finally(clearSelection);
      } else {
        clearSelection();
      }
    }
  }, [disabled, game, onMove, promotionPending, selectedSquare]);

  const handlePromotion = useCallback((piece: string) => {
    if (!promotionPending) return;
    void onMove(promotionPending.from, promotionPending.to, piece);
    setPromotionPending(null);
    clearSelection();
  }, [onMove, promotionPending]);

  return (
    <div
      className={`relative w-full aspect-square ${sizeClassName || "max-w-[min(80vw,560px)]"}`}
      style={maxBoardSizePx ? { maxWidth: `${maxBoardSizePx}px` } : undefined}
    >
      <AnimatePresence>
        {promotionPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center rounded-xl bg-background/80 backdrop-blur-sm"
          >
            <div className="glass-card border-glow p-6">
              <p className="mb-4 text-center font-display text-sm font-bold">Promote to:</p>
              <div className="flex gap-3">
                {["q", "r", "b", "n"].map((piece) => (
                  <button
                    key={piece}
                    type="button"
                    onClick={() => handlePromotion(piece)}
                    className="flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-secondary text-3xl transition-colors hover:border-primary/40 hover:bg-primary/20"
                  >
                    {PIECE_UNICODE[`${game.turn()}${piece}`]}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="chess-board-shell grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border shadow-2xl"
        style={{
          background: boardStyles.shellBackground,
          boxShadow: boardStyles.shellShadow,
          borderColor: boardStyles.borderColor,
        }}
      >
        {ranks.map((rank, ri) =>
          files.map((file, fi) => {
            const square = (file + rank) as Square;
            const piece = game.get(square);
            const origRi = RANKS.indexOf(rank);
            const origFi = FILES.indexOf(file);
            const isLight = (origRi + origFi) % 2 === 0;
            const spriteKey = piece ? `${piece.color}${piece.type}` : "";

            return (
              <BoardSquare
                key={square}
                square={square}
                pieceColor={piece?.color}
                pieceType={piece?.type}
                squareColor={isLight ? boardStyles.lightSquare : boardStyles.darkSquare}
                coordinateColor={isLight ? boardStyles.coordinateLight : boardStyles.coordinateDark}
                pieceSprite={spriteKey ? pieceSprites[spriteKey] : undefined}
                isSelected={selectedSquare === square}
                isLegal={legalMoves.includes(square)}
                isLastMove={lastMove?.from === square || lastMove?.to === square}
                isMoveDestination={lastMove?.to === square}
                isKingInCheck={kingSquare === square}
                showRank={fi === 0 ? rank : undefined}
                showFile={ri === 7 ? file : undefined}
                onClick={() => handleSquareClick(square)}
              />
            );
          }),
        )}
      </div>
    </div>
  );
};

export default ChessBoard;
