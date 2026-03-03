import { useMemo, useState } from "react";
import { Chess, Square } from "chess.js";
import ChessBoard from "@/components/chess/ChessBoard";
import { useNavigate } from "react-router-dom";

type Puzzle = {
  id: string;
  title: string;
  fen: string;
  solution: string[];
};

const PUZZLES: Puzzle[] = [
  {
    id: "mate-in-1-1",
    title: "Mate in 1",
    fen: "6k1/5ppp/5q2/8/8/5Q2/5PPP/6K1 w - - 0 1",
    solution: ["f3a8"],
  },
  {
    id: "win-queen-1",
    title: "Tactic: win the queen",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/3P4/2N2N2/PPP2PPP/R1BQKB1R b KQkq - 2 4",
    solution: ["e5d4", "f3d4", "d8h4"],
  },
  {
    id: "mate-net-1",
    title: "Mate net",
    fen: "r4rk1/ppp2ppp/2n5/3q4/3P4/2N1Q3/PPP2PPP/R4RK1 w - - 0 1",
    solution: ["e3e8"],
  },
];

const Tactics = () => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [game, setGame] = useState(() => new Chess(PUZZLES[0].fen));
  const [step, setStep] = useState(0);
  const [message, setMessage] = useState("Find the best move.");
  const [solved, setSolved] = useState(false);

  const puzzle = PUZZLES[index];
  const userToMove = useMemo(() => new Chess(puzzle.fen).turn(), [puzzle.fen]);

  const resetPuzzle = (nextIndex: number) => {
    setIndex(nextIndex);
    setGame(new Chess(PUZZLES[nextIndex].fen));
    setStep(0);
    setSolved(false);
    setMessage("Find the best move.");
  };

  const onMove = (from: Square, to: Square, promotion?: string) => {
    if (solved) return false;
    const attempted = `${from}${to}${promotion || ""}`.toLowerCase();
    const expected = puzzle.solution[step];
    if (attempted !== expected) {
      setMessage("Not best. Try again.");
      return false;
    }

    const next = new Chess(game.fen());
    next.move({ from, to, promotion: promotion || undefined });

    let nextStep = step + 1;
    if (nextStep >= puzzle.solution.length) {
      setGame(next);
      setStep(nextStep);
      setSolved(true);
      setMessage("Solved.");
      return true;
    }

    const reply = puzzle.solution[nextStep];
    const fromReply = reply.slice(0, 2) as Square;
    const toReply = reply.slice(2, 4) as Square;
    const promo = reply.length > 4 ? reply.slice(4, 5) : undefined;
    next.move({ from: fromReply, to: toReply, promotion: promo });
    nextStep += 1;

    setGame(next);
    setStep(nextStep);
    if (nextStep >= puzzle.solution.length) {
      setSolved(true);
      setMessage("Solved.");
    } else {
      setMessage("Great. Find the next move.");
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-5xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-4 rounded border border-border/70 bg-secondary/30 px-3 py-1.5 text-xs"
        >
          Back
        </button>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChessBoard game={game} onMove={onMove} flipped={userToMove === "b"} boardTheme="emerald" pieceTheme="neo" />
          </div>
          <div className="space-y-4">
            <div className="glass-card p-5">
              <p className="text-xs text-muted-foreground">Puzzle</p>
              <h1 className="font-display text-xl font-bold">{puzzle.title}</h1>
              <p className="text-sm mt-2">{message}</p>
              {solved && (
                <button
                  onClick={() => resetPuzzle((index + 1) % PUZZLES.length)}
                  className="mt-4 rounded bg-primary text-primary-foreground px-3 py-2 text-xs font-display font-bold"
                >
                  Next Puzzle
                </button>
              )}
              {!solved && (
                <button
                  onClick={() => resetPuzzle(index)}
                  className="mt-4 rounded border border-border/70 px-3 py-2 text-xs font-display font-bold"
                >
                  Reset
                </button>
              )}
            </div>

            <div className="glass-card p-5">
              <p className="font-display font-bold text-sm mb-2">Puzzle Set</p>
              <div className="space-y-2">
                {PUZZLES.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => resetPuzzle(i)}
                    className={`w-full rounded border px-2.5 py-2 text-left text-xs ${
                      i === index ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-secondary/20"
                    }`}
                  >
                    {p.title}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Dataset format is Lichess-compatible (`fen`, `solution[]` in UCI). You can swap this with a larger imported set.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Tactics;
