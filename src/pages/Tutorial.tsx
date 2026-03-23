import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Chess } from "chess.js";
import ChessBoard from "@/components/chess/ChessBoard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronRight, ChevronLeft, Crown, Swords, Brain, Target, Sparkles, CheckCircle } from "lucide-react";
import type { Square } from "chess.js";

interface TutorialStep {
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  fen?: string;
  highlightSquares?: Square[];
  interactiveTask?: {
    instruction: string;
    expectedMove?: { from: Square; to: Square };
  };
}

const Tutorial = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [game, setGame] = useState<Chess>(new Chess());
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  const steps: TutorialStep[] = [
    {
      title: "Welcome to CrownX Arena",
      icon: <Crown className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <p className="text-base">Welcome, champion! CrownX Arena is your ultimate chess platform for competitive play, learning, and climbing the ranks.</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-1">
              <Swords className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Play Online</p>
              <p className="text-xs text-muted-foreground">Challenge players worldwide in real-time matches</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-1">
              <Brain className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Train & Learn</p>
              <p className="text-xs text-muted-foreground">Puzzles, openings, and AI-powered analysis</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-1">
              <Target className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Daily Challenges</p>
              <p className="text-xs text-muted-foreground">Earn Crowns with daily & weekly missions</p>
            </div>
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-1">
              <Sparkles className="w-5 h-5 text-primary" />
              <p className="text-sm font-semibold">Climb the Ranks</p>
              <p className="text-xs text-muted-foreground">From Beginner to Grand Master</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "The Chess Board",
      icon: <span className="text-3xl">♟️</span>,
      content: (
        <div className="space-y-3">
          <p className="text-sm">Chess is played on an 8×8 board. Each player starts with 16 pieces:</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <span className="text-xl">♔</span>
              <p className="text-xs font-semibold mt-1">King (1)</p>
              <p className="text-[10px] text-muted-foreground">Protect at all costs</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <span className="text-xl">♕</span>
              <p className="text-xs font-semibold mt-1">Queen (1)</p>
              <p className="text-[10px] text-muted-foreground">Most powerful piece</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <span className="text-xl">♖</span>
              <p className="text-xs font-semibold mt-1">Rook (2)</p>
              <p className="text-[10px] text-muted-foreground">Moves in lines</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <span className="text-xl">♗</span>
              <p className="text-xs font-semibold mt-1">Bishop (2)</p>
              <p className="text-[10px] text-muted-foreground">Moves diagonally</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <span className="text-xl">♘</span>
              <p className="text-xs font-semibold mt-1">Knight (2)</p>
              <p className="text-[10px] text-muted-foreground">L-shaped jumps</p>
            </div>
            <div className="rounded-lg bg-secondary/30 p-2 text-center">
              <span className="text-xl">♙</span>
              <p className="text-xs font-semibold mt-1">Pawn (8)</p>
              <p className="text-[10px] text-muted-foreground">Forward soldiers</p>
            </div>
          </div>
        </div>
      ),
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
    },
    {
      title: "Make Your First Move",
      icon: <span className="text-3xl">🎯</span>,
      content: (
        <div className="space-y-3">
          <p className="text-sm">In chess, White always moves first. The most popular opening move is <strong>e4</strong> — pushing the King's pawn two squares forward.</p>
          <p className="text-sm text-muted-foreground">Try it! Click the pawn on <strong>e2</strong> and move it to <strong>e4</strong>.</p>
        </div>
      ),
      fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      interactiveTask: {
        instruction: "Move the pawn from e2 to e4",
        expectedMove: { from: "e2" as Square, to: "e4" as Square },
      },
    },
    {
      title: "Checkmate — The Goal",
      icon: <span className="text-3xl">👑</span>,
      content: (
        <div className="space-y-3">
          <p className="text-sm">The goal of chess is to <strong>checkmate</strong> your opponent's King — put it under attack with no escape.</p>
          <p className="text-sm">Here's a famous example: <strong>Scholar's Mate</strong> — checkmate in just 4 moves!</p>
          <p className="text-sm text-muted-foreground">The White Queen on f7 attacks the King with support from the Bishop. The King has no safe squares — that's checkmate!</p>
        </div>
      ),
      fen: "r1bqkb1r/pppp1Qpp/2n2n2/4p3/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 0 4",
    },
    {
      title: "Your CrownScore™",
      icon: <Crown className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm">Every player starts with a <strong>CrownScore™ of 400</strong>. Win games to climb through the skill tiers:</p>
          <div className="space-y-2">
            {[
              { tier: "Beginner", range: "< 500", color: "bg-secondary" },
              { tier: "Apprentice", range: "500+", color: "bg-blue-500/20" },
              { tier: "Intermediate", range: "800+", color: "bg-green-500/20" },
              { tier: "Expert", range: "1200+", color: "bg-amber-500/20" },
              { tier: "Grand Master", range: "1600+", color: "bg-primary/20" },
            ].map((t) => (
              <div key={t.tier} className={`rounded-lg ${t.color} border border-border px-4 py-2 flex items-center justify-between`}>
                <span className="text-sm font-semibold">{t.tier}</span>
                <span className="text-xs text-muted-foreground font-mono">{t.range}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "You're Ready!",
      icon: <CheckCircle className="w-8 h-8 text-primary" />,
      content: (
        <div className="space-y-4 text-center">
          <p className="text-lg font-display font-bold">Congratulations! 🎉</p>
          <p className="text-sm text-muted-foreground">You've completed the basics. Here's what to do next:</p>
          <div className="space-y-2">
            <button onClick={() => navigate("/lobby")} className="w-full rounded-xl border border-primary/40 bg-primary/10 p-4 text-left hover:bg-primary/20 transition-colors">
              <p className="font-semibold text-sm text-primary">⚔️ Play Your First Game</p>
              <p className="text-xs text-muted-foreground">Jump into a quick match against another player</p>
            </button>
            <button onClick={() => navigate("/puzzles")} className="w-full rounded-xl border border-border bg-secondary/30 p-4 text-left hover:bg-secondary/50 transition-colors">
              <p className="font-semibold text-sm">🧩 Solve Puzzles</p>
              <p className="text-xs text-muted-foreground">Sharpen your tactical skills</p>
            </button>
            <button onClick={() => navigate("/challenges")} className="w-full rounded-xl border border-border bg-secondary/30 p-4 text-left hover:bg-secondary/50 transition-colors">
              <p className="font-semibold text-sm">🎯 Daily Challenges</p>
              <p className="text-xs text-muted-foreground">Earn Crowns by completing missions</p>
            </button>
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];
  const progressPct = ((currentStep + 1) / steps.length) * 100;

  const handleStepChange = (newStep: number) => {
    setCurrentStep(newStep);
    setTaskCompleted(false);
    setLastMove(null);
    const fen = steps[newStep]?.fen;
    setGame(new Chess(fen || undefined));
  };

  const handleMove = (from: Square, to: Square) => {
    if (!step.interactiveTask?.expectedMove) return false;
    const expected = step.interactiveTask.expectedMove;
    if (from === expected.from && to === expected.to) {
      const newGame = new Chess(game.fen());
      const result = newGame.move({ from, to });
      if (result) {
        setGame(newGame);
        setLastMove({ from, to });
        setTaskCompleted(true);
        return true;
      }
    }
    return false;
  };

  const showBoard = !!step.fen;

  return (
    <main className="page-container">
      <div className="page-content page-content--narrow">
        {/* Progress */}
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <span>{Math.round(progressPct)}% complete</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>

        <div className={`grid gap-8 ${showBoard ? "lg:grid-cols-2" : ""}`}>
          {/* Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3">
                {step.icon}
                <h1 className="text-2xl font-display font-bold">{step.title}</h1>
              </div>

              <div>{step.content}</div>

              {/* Interactive task feedback */}
              {step.interactiveTask && (
                <div className={`rounded-xl border p-4 text-sm ${
                  taskCompleted
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border bg-secondary/20 text-muted-foreground"
                }`}>
                  {taskCompleted ? (
                    <p className="flex items-center gap-2 font-semibold"><CheckCircle className="w-4 h-4" /> Great move! You played 1. e4 — the King's Pawn Opening.</p>
                  ) : (
                    <p>👆 {step.interactiveTask.instruction}</p>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Board */}
          {showBoard && (
            <div className="flex justify-center">
              <ChessBoard
                game={game}
                onMove={step.interactiveTask ? handleMove : () => false}
                disabled={!step.interactiveTask || taskCompleted}
                lastMove={lastMove}
                sizeClassName="max-w-[400px]"
              />
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => handleStepChange(currentStep - 1)}
            disabled={currentStep === 0}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          {currentStep < steps.length - 1 ? (
            <Button
              onClick={() => handleStepChange(currentStep + 1)}
              disabled={step.interactiveTask && !taskCompleted}
              className="gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={() => navigate("/dashboard")} className="gap-2">
              Go to Dashboard <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </main>
  );
};

export default Tutorial;
