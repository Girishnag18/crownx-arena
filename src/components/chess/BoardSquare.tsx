import React from "react";
import { Square } from "chess.js";
import { motion } from "framer-motion";
import { PIECE_UNICODE } from "@/utils/chessThemes";

interface BoardSquareProps {
  square: Square;
  pieceColor?: string;
  pieceType?: string;
  squareColor: string;
  coordinateColor: string;
  pieceSprite?: string;
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
  squareColor,
  coordinateColor,
  pieceSprite,
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
  const pieceGlyph = hasPiece ? PIECE_UNICODE[spriteKey] : "";

  return (
    <button
      onClick={onClick}
      type="button"
      aria-label={hasPiece ? `${pieceColor === "w" ? "white" : "black"} ${pieceType} on ${square}` : square}
      className={`board-square relative flex items-center justify-center transition-all duration-300 ${isSelected ? "!bg-primary/35" : ""} ${
        isLastMove ? "!bg-yellow-300/60" : ""
      } ${isKingInCheck ? "!bg-destructive/45" : ""}`}
      style={{ backgroundColor: squareColor }}
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
      {hasPiece && pieceSprite && (
        <motion.img
          layout
          initial={{ scale: 0.9, opacity: 0.85 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 16, mass: 0.7 }}
          src={pieceSprite}
          alt={`${pieceColor === "w" ? "white" : "black"} ${pieceType}`}
          draggable={false}
          className="w-[82%] h-[82%] object-contain select-none"
          style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}
        />
      )}
      {hasPiece && !pieceSprite && (
        <span
          className={`select-none text-[2.3rem] leading-none ${pieceColor === "w" ? "text-white" : "text-slate-900"}`}
          style={{ textShadow: "0 2px 8px rgba(0,0,0,0.28)" }}
        >
          {pieceGlyph}
        </span>
      )}
      {showRank && (
        <span className="absolute top-0.5 left-1 text-[0.55rem] font-bold" style={{ color: coordinateColor }}>
          {showRank}
        </span>
      )}
      {showFile && (
        <span className="absolute bottom-0.5 right-1 text-[0.55rem] font-bold" style={{ color: coordinateColor }}>
          {showFile}
        </span>
      )}
    </button>
  );
});

BoardSquare.displayName = "BoardSquare";

export default BoardSquare;
