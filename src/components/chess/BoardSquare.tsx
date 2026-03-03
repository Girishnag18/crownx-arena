import React from "react";
import { Square } from "chess.js";
import { motion } from "framer-motion";

const PIECE_SPRITES: Record<string, string> = {
  wp: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wp.png",
  wn: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wn.png",
  wb: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wb.png",
  wr: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wr.png",
  wq: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wq.png",
  wk: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/wk.png",
  bp: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bp.png",
  bn: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bn.png",
  bb: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bb.png",
  br: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/br.png",
  bq: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bq.png",
  bk: "https://images.chesscomfiles.com/chess-themes/pieces/neo/150/bk.png",
};

interface BoardSquareProps {
  square: Square;
  pieceColor?: string;
  pieceType?: string;
  isLight: boolean;
  isSelected: boolean;
  isLegal: boolean;
  isLastMove: boolean;
  isMoveDestination: boolean;
  isKingInCheck: boolean;
  showRank?: string;
  showFile?: string;
  onClick: () => void;
}

const BoardSquare = React.memo(({
  square,
  pieceColor,
  pieceType,
  isLight,
  isSelected,
  isLegal,
  isLastMove,
  isMoveDestination,
  isKingInCheck,
  showRank,
  showFile,
  onClick,
}: BoardSquareProps) => {
  const hasPiece = !!pieceColor && !!pieceType;
  const spriteKey = hasPiece ? pieceColor + pieceType : "";

  return (
    <button
      onClick={onClick}
      className={`board-square relative flex items-center justify-center transition-all duration-300 ${
        isLight ? "chess-board-light" : "chess-board-dark"
      } ${isSelected ? "!bg-primary/35" : ""} ${
        isLastMove ? "!bg-yellow-300/60" : ""
      } ${isKingInCheck ? "!bg-destructive/45" : ""}`}
    >
      {isMoveDestination && (
        <motion.div
          className="absolute inset-[14%] rounded-full border-2 border-yellow-400/80"
          initial={{ scale: 0.7, opacity: 0.2 }}
          animate={{ scale: 1.15, opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      {isLegal && !hasPiece && (
        <div className="absolute w-[28%] h-[28%] rounded-full bg-black/15" />
      )}
      {isLegal && hasPiece && (
        <div className="absolute inset-[5%] rounded-full border-[3px] border-yellow-500/45" />
      )}
      {hasPiece && (
        <motion.img
          layout
          initial={{ scale: 0.9, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16, mass: 0.7 }}
          src={PIECE_SPRITES[spriteKey]}
          alt={`${pieceColor === "w" ? "white" : "black"} ${pieceType}`}
          draggable={false}
          className="w-[82%] h-[82%] object-contain select-none"
          style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}
        />
      )}
      {showRank && (
        <span className={`absolute top-0.5 left-1 text-[0.55rem] font-bold ${isLight ? "text-amber-900/60" : "text-amber-100/60"}`}>
          {showRank}
        </span>
      )}
      {showFile && (
        <span className={`absolute bottom-0.5 right-1 text-[0.55rem] font-bold ${isLight ? "text-amber-900/60" : "text-amber-100/60"}`}>
          {showFile}
        </span>
      )}
    </button>
  );
});

BoardSquare.displayName = "BoardSquare";

export default BoardSquare;
