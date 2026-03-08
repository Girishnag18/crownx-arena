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
  /** Slide offset in square units — piece slides from this offset to (0,0) */
  slideFrom?: { dx: number; dy: number };
  /** Key that changes per move to retrigger slide animation */
  slideAnimKey?: number;
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
  slideFrom,
  slideAnimKey,
}: BoardSquareProps) => {
  const { theme, pieceSet, moveAnimation } = useBoardSettings();
  const hasPiece = !!pieceColor && !!pieceType;
  const spriteKey = hasPiece ? pieceColor + pieceType : "";
  const spriteUrl = hasPiece ? `${pieceSet.baseUrl}/${spriteKey}.png` : "";

  // Professional square coloring with state overlays
  const baseColor = isLight ? theme.lightSquare : theme.darkSquare;
  
  let overlayColor = "transparent";
  if (isKingInCheck) {
    overlayColor = "radial-gradient(ellipse at center, rgba(255,0,0,0.6) 0%, rgba(200,0,0,0.35) 50%, rgba(0,0,0,0) 100%)";
  } else if (isSelected) {
    overlayColor = "rgba(20,85,30,0.55)";
  } else if (isLastMove) {
    overlayColor = isLight ? "rgba(205,210,106,0.55)" : "rgba(170,162,58,0.55)";
  } else if (isPremove) {
    overlayColor = "rgba(96,165,250,0.4)";
  }

  const coordColor = isLight ? theme.darkSquare : theme.lightSquare;

  return (
    <button
      onClick={onClick}
      onTouchStart={onTouchStart}
      className="board-square relative flex items-center justify-center touch-none select-none"
      style={{
        backgroundColor: baseColor,
        backgroundImage: isKingInCheck ? overlayColor : "none",
        ...(overlayColor !== "transparent" && !isKingInCheck
          ? { backgroundColor: overlayColor }
          : {}),
        ...(isSelected || isLastMove || isPremove
          ? {}
          : { backgroundColor: baseColor }),
      }}
    >
      {/* Selected/last-move overlay */}
      {(isSelected || isLastMove || isPremove) && !isKingInCheck && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: overlayColor }}
        />
      )}

      {/* King in check radial gradient */}
      {isKingInCheck && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, rgba(255,0,0,0.6) 0%, rgba(200,0,0,0.35) 50%, transparent 100%)",
          }}
        />
      )}

      {/* Move destination pulse ring */}
      {isMoveDestination && (
        <motion.div
          className="absolute inset-[12%] rounded-full border-2"
          style={{ borderColor: "rgba(234, 179, 8, 0.7)" }}
          initial={{ scale: 0.7, opacity: 0.2 }}
          animate={{ scale: 1.1, opacity: 0 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
        />
      )}

      {/* Premove border pulse */}
      {isPremove && (
        <motion.div
          className="absolute inset-0 border-2 pointer-events-none"
          style={{ borderColor: "rgba(96,165,250,0.6)" }}
          initial={{ opacity: 0.4 }}
          animate={{ opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      {/* Legal move dot (empty square) */}
      {isLegal && !hasPiece && (
        <div className="absolute w-[26%] h-[26%] rounded-full bg-black/20 dark:bg-black/25" />
      )}

      {/* Legal move capture ring */}
      {isLegal && hasPiece && (
        <div
          className="absolute inset-[4%] rounded-full border-[3px] pointer-events-none"
          style={{ borderColor: "rgba(0,0,0,0.18)" }}
        />
      )}

      {/* Chess piece */}
      {hasPiece && (
        moveAnimation ? (
          <motion.img
            layout
            initial={{ scale: 0.92, opacity: 0.85 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, mass: 0.6 }}
            src={spriteUrl}
            alt={`${pieceColor === "w" ? "white" : "black"} ${pieceType}`}
            draggable={false}
            className="w-[85%] h-[85%] object-contain select-none pointer-events-none relative z-[1]"
            style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
          />
        ) : (
          <img
            src={spriteUrl}
            alt={`${pieceColor === "w" ? "white" : "black"} ${pieceType}`}
            draggable={false}
            className="w-[85%] h-[85%] object-contain select-none pointer-events-none relative z-[1]"
            style={{ filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.3))" }}
          />
        )
      )}

      {/* Coordinates */}
      {showRank && (
        <span
          className="absolute top-[2px] left-[3px] text-[0.6rem] font-bold leading-none pointer-events-none z-[2]"
          style={{ color: coordColor, opacity: 0.75 }}
        >
          {showRank}
        </span>
      )}
      {showFile && (
        <span
          className="absolute bottom-[2px] right-[3px] text-[0.6rem] font-bold leading-none pointer-events-none z-[2]"
          style={{ color: coordColor, opacity: 0.75 }}
        >
          {showFile}
        </span>
      )}
    </button>
  );
});

BoardSquare.displayName = "BoardSquare";

export default BoardSquare;
