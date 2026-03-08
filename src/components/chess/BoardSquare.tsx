import React from "react";
import { Square } from "chess.js";
import { motion } from "framer-motion";
import { useBoardSettings } from "@/contexts/BoardSettingsContext";

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
  isPremove?: boolean;
  showRank?: string;
  showFile?: string;
  onClick: () => void;
  onTouchStart?: (e: React.TouchEvent) => void;
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
  isPremove = false,
  showRank,
  showFile,
  onClick,
  onTouchStart,
}: BoardSquareProps) => {
  const { theme, pieceSet, moveAnimation } = useBoardSettings();
  const hasPiece = !!pieceColor && !!pieceType;
  const spriteKey = hasPiece ? pieceColor + pieceType : "";
  const spriteUrl = hasPiece ? `${pieceSet.baseUrl}/${spriteKey}.png` : "";

  const bgColor = isSelected
    ? "rgba(var(--primary-rgb, 139, 92, 246), 0.35)"
    : isLastMove
    ? "rgba(255, 255, 100, 0.45)"
    : isKingInCheck
    ? "rgba(239, 68, 68, 0.45)"
    : isPremove
    ? "rgba(96, 165, 250, 0.4)"
    : isLight
    ? theme.lightSquare
    : theme.darkSquare;

  const coordColor = isLight ? theme.darkSquare : theme.lightSquare;

  return (
    <button
      onClick={onClick}
      onTouchStart={onTouchStart}
      className="board-square relative flex items-center justify-center touch-none"
      style={{ backgroundColor: bgColor, transition: "background-color 0.15s" }}
    >
      {isMoveDestination && (
        <motion.div
          className="absolute inset-[14%] rounded-full border-2"
          style={{ borderColor: "rgba(234, 179, 8, 0.8)" }}
          initial={{ scale: 0.7, opacity: 0.2 }}
          animate={{ scale: 1.15, opacity: 0 }}
          transition={{ duration: 0.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
      {isPremove && (
        <motion.div
          className="absolute inset-0 border-2"
          style={{ borderColor: "rgba(96, 165, 250, 0.6)" }}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
      {isLegal && !hasPiece && (
        <div className="absolute w-[28%] h-[28%] rounded-full bg-black/15" />
      )}
      {isLegal && hasPiece && (
        <div className="absolute inset-[5%] rounded-full border-[3px]" style={{ borderColor: "rgba(234, 179, 8, 0.45)" }} />
      )}
      {hasPiece && (
        moveAnimation ? (
          <motion.img
            layout
            initial={{ scale: 0.9, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16, mass: 0.7 }}
            src={spriteUrl}
            alt={`${pieceColor === "w" ? "white" : "black"} ${pieceType}`}
            draggable={false}
            className="w-[82%] h-[82%] object-contain select-none pointer-events-none"
            style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}
          />
        ) : (
          <img
            src={spriteUrl}
            alt={`${pieceColor === "w" ? "white" : "black"} ${pieceType}`}
            draggable={false}
            className="w-[82%] h-[82%] object-contain select-none pointer-events-none"
            style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.35))" }}
          />
        )
      )}
      {showRank && (
        <span className="absolute top-0.5 left-1 text-[0.55rem] font-bold" style={{ color: coordColor, opacity: 0.7 }}>
          {showRank}
        </span>
      )}
      {showFile && (
        <span className="absolute bottom-0.5 right-1 text-[0.55rem] font-bold" style={{ color: coordColor, opacity: 0.7 }}>
          {showFile}
        </span>
      )}
    </button>
  );
});

BoardSquare.displayName = "BoardSquare";

export default BoardSquare;
