import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { Chess, Square, Move } from "chess.js";
import { motion, AnimatePresence } from "framer-motion";
import BoardSquare from "./BoardSquare";
<<<<<<< HEAD
import {
  BOARD_THEME_STYLES,
  PIECE_THEME_SPRITES,
  PIECE_UNICODE,
  type BoardTheme,
  type PieceTheme,
} from "@/utils/chessThemes";
=======
import BoardArrows from "./BoardArrows";

const PIECE_UNICODE: Record<string, string> = {
  wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔",
  bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚",
};
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const RANKS = ["8", "7", "6", "5", "4", "3", "2", "1"];

interface Premove {
  from: Square;
  to: Square;
  promotion?: string;
}

interface ChessBoardProps {
  game: Chess;
  onMove: (from: Square, to: Square, promotion?: string) => boolean | Promise<boolean>;
  flipped?: boolean;
  disabled?: boolean;
  lastMove?: { from: Square; to: Square } | null;
  sizeClassName?: string;
  maxBoardSizePx?: number;
<<<<<<< HEAD
  boardTheme?: BoardTheme;
  pieceTheme?: PieceTheme;
=======
  arrows?: Array<{ from: string; to: string; color?: string }>;
  premovesEnabled?: boolean;
  playerColor?: "w" | "b" | null;
  streamerMode?: boolean;
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
}

const ChessBoard = ({
  game,
  onMove,
  flipped = false,
  disabled = false,
  lastMove,
  sizeClassName,
  maxBoardSizePx,
<<<<<<< HEAD
  boardTheme = "wood",
  pieceTheme = "neo",
=======
  arrows = [],
  premovesEnabled = false,
  playerColor = null,
  streamerMode = false,
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
}: ChessBoardProps) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [legalMoves, setLegalMoves] = useState<Square[]>([]);
  const [promotionPending, setPromotionPending] = useState<{ from: Square; to: Square } | null>(null);
  const [premove, setPremove] = useState<Premove | null>(null);
  const [dragState, setDragState] = useState<{
    piece: string;
    from: Square;
    x: number;
    y: number;
  } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const prevTurnRef = useRef(game.turn());

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

<<<<<<< HEAD
  const clearSelection = () => {
    setSelectedSquare(null);
    setLegalMoves([]);
  };

  const handleSquareClick = useCallback((square: Square) => {
    if (disabled || promotionPending) return;
=======
  // Execute premove when it becomes our turn
  useEffect(() => {
    if (!premovesEnabled || !premove || !playerColor) return;
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d

    const currentTurn = game.turn();
    if (prevTurnRef.current !== currentTurn && currentTurn === playerColor) {
      // It's now our turn — try executing the premove
      const { from, to, promotion } = premove;
      setPremove(null);

      // Validate the premove is still legal
      try {
        const testGame = new Chess(game.fen());
        const result = testGame.move({ from, to, promotion: promotion || undefined });
        if (result) {
          onMove(from, to, promotion);
        }
      } catch {
        // Premove was illegal in this position
      }
    }
    prevTurnRef.current = currentTurn;
  }, [game, premove, premovesEnabled, playerColor, onMove]);

  // Get square from touch/mouse coordinates
  const getSquareFromCoords = useCallback(
    (clientX: number, clientY: number): Square | null => {
      if (!boardRef.current) return null;
      const rect = boardRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const squareSize = rect.width / 8;

      let fileIdx = Math.floor(x / squareSize);
      let rankIdx = Math.floor(y / squareSize);

      if (fileIdx < 0 || fileIdx > 7 || rankIdx < 0 || rankIdx > 7) return null;

      const file = files[fileIdx];
      const rank = ranks[rankIdx];
      return (file + rank) as Square;
    },
    [files, ranks]
  );

  const handleSquareClick = useCallback(
    (square: Square) => {
      if (promotionPending) return;

      const piece = game.get(square);
      const isMyTurn = !playerColor || game.turn() === playerColor;

      // Premove logic: if it's not our turn but premoves are enabled
      if (premovesEnabled && playerColor && !isMyTurn && !disabled) {
        if (selectedSquare) {
          // Set premove
          setPremove({ from: selectedSquare, to: square });
          setSelectedSquare(null);
          setLegalMoves([]);
          return;
        }
        // Select own piece for premove
        if (piece && piece.color === playerColor) {
          setSelectedSquare(square);
          setLegalMoves([]); // No legal move dots for premoves
          return;
        }
        return;
      }

<<<<<<< HEAD
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
=======
      if (disabled) return;

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
          result.finally(() => {
            setSelectedSquare(null);
            setLegalMoves([]);
          });
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    },
    [game, selectedSquare, onMove, disabled, promotionPending, premovesEnabled, playerColor]
  );

  const handlePromotion = useCallback(
    (piece: string) => {
      if (promotionPending) {
        onMove(promotionPending.from, promotionPending.to, piece);
        setPromotionPending(null);
        setSelectedSquare(null);
        setLegalMoves([]);
      }
    },
    [promotionPending, onMove]
  );

  // Touch drag handlers for mobile
  const handleTouchStart = useCallback(
    (e: React.TouchEvent, square: Square) => {
      if (disabled && !premovesEnabled) return;
      const piece = game.get(square);
      const isMyPiece = piece && (piece.color === game.turn() || (premovesEnabled && playerColor && piece.color === playerColor));
      if (!isMyPiece) return;

      const touch = e.touches[0];
      setDragState({
        piece: piece.color + piece.type,
        from: square,
        x: touch.clientX,
        y: touch.clientY,
      });
      setSelectedSquare(square);

      if (game.turn() === piece.color) {
        const moves = game.moves({ square, verbose: true }) as Move[];
        setLegalMoves(moves.map((m) => m.to as Square));
      }
    },
    [game, disabled, premovesEnabled, playerColor]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragState) return;
      e.preventDefault();
      const touch = e.touches[0];
      setDragState((prev) => (prev ? { ...prev, x: touch.clientX, y: touch.clientY } : null));
    },
    [dragState]
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!dragState) return;
      const touch = e.changedTouches[0];
      const targetSquare = getSquareFromCoords(touch.clientX, touch.clientY);

      if (targetSquare && targetSquare !== dragState.from) {
        const isMyTurn = !playerColor || game.turn() === playerColor;

        if (premovesEnabled && playerColor && !isMyTurn) {
          setPremove({ from: dragState.from, to: targetSquare });
        } else {
          const selectedPiece = game.get(dragState.from);
          if (
            selectedPiece?.type === "p" &&
            ((selectedPiece.color === "w" && targetSquare[1] === "8") ||
              (selectedPiece.color === "b" && targetSquare[1] === "1"))
          ) {
            setPromotionPending({ from: dragState.from, to: targetSquare });
          } else {
            onMove(dragState.from, targetSquare);
          }
        }
      }

      setDragState(null);
      setSelectedSquare(null);
      setLegalMoves([]);
    },
    [dragState, getSquareFromCoords, game, onMove, premovesEnabled, playerColor]
  );

  const cancelPremove = useCallback(() => {
    setPremove(null);
  }, []);

  const boardClasses = streamerMode
    ? "relative grid grid-cols-8 grid-rows-8 w-full h-full rounded-none overflow-hidden border-0"
    : "chess-board-shell relative grid grid-cols-8 grid-rows-8 w-full h-full rounded-xl overflow-hidden border border-glass-border/60 shadow-2xl";
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d

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

<<<<<<< HEAD
      <div
        className="chess-board-shell grid h-full w-full grid-cols-8 grid-rows-8 overflow-hidden rounded-xl border shadow-2xl"
        style={{
          background: boardStyles.shellBackground,
          boxShadow: boardStyles.shellShadow,
          borderColor: boardStyles.borderColor,
        }}
      >
=======
      {/* Premove indicator */}
      {premove && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center">
          <button
            onClick={cancelPremove}
            className="bg-accent/90 text-accent-foreground text-[10px] font-display font-bold px-2 py-0.5 rounded-b-md hover:bg-destructive/80 transition-colors"
          >
            Premove queued · Click to cancel
          </button>
        </div>
      )}

      <div
        ref={boardRef}
        className={boardClasses}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <BoardArrows arrows={arrows} flipped={flipped} />
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
        {ranks.map((rank, ri) =>
          files.map((file, fi) => {
            const square = (file + rank) as Square;
            const piece = game.get(square);
            const origRi = RANKS.indexOf(rank);
            const origFi = FILES.indexOf(file);
            const isLight = (origRi + origFi) % 2 === 0;
<<<<<<< HEAD
            const spriteKey = piece ? `${piece.color}${piece.type}` : "";
=======
            const isPremoveSquare = premove?.from === square || premove?.to === square;
            const isDragSource = dragState?.from === square;
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d

            return (
              <BoardSquare
                key={square}
                square={square}
<<<<<<< HEAD
                pieceColor={piece?.color}
                pieceType={piece?.type}
                squareColor={isLight ? boardStyles.lightSquare : boardStyles.darkSquare}
                coordinateColor={isLight ? boardStyles.coordinateLight : boardStyles.coordinateDark}
                pieceSprite={spriteKey ? pieceSprites[spriteKey] : undefined}
=======
                pieceColor={isDragSource ? undefined : piece?.color}
                pieceType={isDragSource ? undefined : piece?.type}
                isLight={isLight}
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
                isSelected={selectedSquare === square}
                isLegal={legalMoves.includes(square)}
                isLastMove={lastMove?.from === square || lastMove?.to === square}
                isMoveDestination={lastMove?.to === square}
                isKingInCheck={kingSquare === square}
                isPremove={isPremoveSquare}
                showRank={!streamerMode && fi === 0 ? rank : undefined}
                showFile={!streamerMode && ri === 7 ? file : undefined}
                onClick={() => handleSquareClick(square)}
                onTouchStart={(e) => handleTouchStart(e, square)}
              />
            );
          }),
        )}
      </div>

      {/* Drag ghost piece */}
      {dragState && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: dragState.x - 30,
            top: dragState.y - 50,
            width: 60,
            height: 60,
          }}
        >
          <img
            src={`https://images.chesscomfiles.com/chess-themes/pieces/neo/150/${dragState.piece}.png`}
            alt="dragging"
            className="w-full h-full drop-shadow-lg"
            style={{ filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.5))" }}
          />
        </div>
      )}
    </div>
  );
};

export default ChessBoard;
