import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Crown, Swords, BarChart3, Bot, ArrowLeft, RotateCcw, X, Loader2, Check, XCircle } from "lucide-react";

interface ResignDialogProps {
  open: boolean;
  onConfirmResign: () => Promise<void> | void;
  onCancel: () => void;
}

export const ResignConfirmDialog = ({ open, onConfirmResign, onCancel }: ResignDialogProps) => {
  const [loading, setLoading] = useState(false);

  const handleResign = async () => {
    setLoading(true);
    await onConfirmResign();
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-[90vw] max-w-sm rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl"
          >
            <button onClick={onCancel} className="absolute right-3 top-3 p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-4 h-4" />
            </button>

            <div className="text-center space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto">
                <Flag className="w-7 h-7 text-destructive" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg">Resign Game?</h3>
                <p className="text-sm text-muted-foreground mt-1">This will count as a loss. Are you sure?</p>
              </div>
              <div className="flex gap-2.5 pt-1">
                <button
                  onClick={onCancel}
                  className="flex-1 rounded-xl border border-border/60 bg-secondary/50 py-2.5 font-display font-bold text-xs tracking-wider hover:bg-secondary/80 transition-colors"
                >
                  CONTINUE
                </button>
                <button
                  onClick={handleResign}
                  disabled={loading}
                  className="flex-1 rounded-xl bg-destructive text-destructive-foreground py-2.5 font-display font-bold text-xs tracking-wider hover:opacity-90 transition-opacity disabled:opacity-60"
                >
                  {loading ? "RESIGNING…" : "RESIGN"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export type RematchState = "idle" | "offered" | "waiting" | "declined";

interface GameOverPopupProps {
  open: boolean;
  result: string;
  moveCount: number;
  timeControlLabel?: string;
  isOnline: boolean;
  rematchState?: RematchState;
  onNewGame: () => void;
  onRematch: () => void;
  onAcceptRematch?: () => void;
  onDeclineRematch?: () => void;
  onAnalyze: () => void;
  onAICoach: () => void;
  onBackToLobby: () => void;
}

export const GameOverPopup = ({
  open,
  result,
  moveCount,
  timeControlLabel,
  isOnline,
  rematchState = "idle",
  onNewGame,
  onRematch,
  onAcceptRematch,
  onDeclineRematch,
  onAnalyze,
  onAICoach,
  onBackToLobby,
}: GameOverPopupProps) => {
  const isWin = result.toLowerCase().includes("win") || result.toLowerCase().includes("checkmate!");
  const isDraw = result.toLowerCase().includes("draw") || result.toLowerCase().includes("stalemate");

  const renderRematchButton = () => {
    if (!isOnline) {
      return (
        <button
          onClick={onRematch}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-display font-bold text-xs tracking-wider hover:opacity-90 transition-opacity"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Rematch
        </button>
      );
    }

    switch (rematchState) {
      case "waiting":
        return (
          <button
            disabled
            className="flex items-center justify-center gap-2 rounded-xl bg-primary/20 border border-primary/30 text-primary py-3 font-display font-bold text-xs tracking-wider"
          >
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Waiting…
          </button>
        );
      case "offered":
        return (
          <div className="col-span-2 flex gap-2">
            <button
              onClick={onAcceptRematch}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-display font-bold text-xs tracking-wider hover:opacity-90 transition-opacity"
            >
              <Check className="w-3.5 h-3.5" />
              Accept Rematch
            </button>
            <button
              onClick={onDeclineRematch}
              className="flex items-center justify-center gap-2 rounded-xl border border-destructive/30 text-destructive py-3 px-4 font-display font-bold text-xs tracking-wider hover:bg-destructive/10 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      case "declined":
        return (
          <button
            disabled
            className="flex items-center justify-center gap-2 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive/60 py-3 font-display font-bold text-xs tracking-wider"
          >
            <XCircle className="w-3.5 h-3.5" />
            Declined
          </button>
        );
      default:
        return (
          <button
            onClick={onRematch}
            className="flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 font-display font-bold text-xs tracking-wider hover:opacity-90 transition-opacity"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Rematch
          </button>
        );
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 30 }}
            transition={{ type: "spring", damping: 22, stiffness: 300 }}
            className="w-[92vw] max-w-sm rounded-2xl border border-primary/20 bg-card p-6 shadow-2xl space-y-5"
          >
            {/* Result header */}
            <div className="text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 12, delay: 0.15 }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                  isWin ? "bg-primary/15 border border-primary/25" : isDraw ? "bg-amber-500/10 border border-amber-500/20" : "bg-destructive/10 border border-destructive/20"
                }`}
              >
                {isWin ? (
                  <Crown className="w-8 h-8 text-primary" />
                ) : isDraw ? (
                  <Swords className="w-8 h-8 text-amber-500" />
                ) : (
                  <Flag className="w-8 h-8 text-destructive" />
                )}
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="font-display font-black text-xl"
              >
                {isWin ? "Victory!" : isDraw ? "Draw" : "Defeat"}
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-sm text-muted-foreground mt-1"
              >
                {result}
              </motion.p>
            </div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.35 }}
              className="flex justify-center gap-6 text-xs text-muted-foreground"
            >
              <div className="text-center">
                <span className="block font-display font-bold text-foreground text-lg">{moveCount}</span>
                <span>moves</span>
              </div>
              {timeControlLabel && (
                <div className="text-center">
                  <span className="block font-display font-bold text-foreground text-lg">{timeControlLabel}</span>
                  <span>time</span>
                </div>
              )}
            </motion.div>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-2"
            >
              <div className="grid grid-cols-2 gap-2">
                {rematchState === "offered" ? (
                  renderRematchButton()
                ) : (
                  <>
                    {renderRematchButton()}
                    <button
                      onClick={onNewGame}
                      className="flex items-center justify-center gap-2 rounded-xl border border-primary/30 text-primary py-3 font-display font-bold text-xs tracking-wider hover:bg-primary/10 transition-colors"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      New Game
                    </button>
                  </>
                )}
              </div>
              {rematchState === "offered" && (
                <button
                  onClick={onNewGame}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 text-primary py-3 font-display font-bold text-xs tracking-wider hover:bg-primary/10 transition-colors"
                >
                  <Swords className="w-3.5 h-3.5" />
                  New Game
                </button>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={onAnalyze}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-secondary/40 py-2.5 font-display font-bold text-xs hover:bg-secondary/60 transition-colors"
                >
                  <BarChart3 className="w-3.5 h-3.5 text-primary" />
                  Analysis
                </button>
                <button
                  onClick={onAICoach}
                  className="flex items-center justify-center gap-2 rounded-xl border border-border/50 bg-secondary/40 py-2.5 font-display font-bold text-xs hover:bg-secondary/60 transition-colors"
                >
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  AI Coach
                </button>
              </div>
              <button
                onClick={onBackToLobby}
                className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Lobby
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
