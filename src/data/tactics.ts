export type TacticPuzzle = {
  id: string;
  title: string;
  theme: string;
  rating: number;
  fen: string;
  solution: string[];
  hint: string;
  description: string;
};

export const TACTIC_PUZZLES: TacticPuzzle[] = [
  {
    id: "fools-mate-punish",
    title: "Punish the loose king",
    theme: "Opening mate",
    rating: 760,
    fen: "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2",
    solution: ["d8h4"],
    hint: "Black should use the weak dark squares around the white king immediately.",
    description: "A fast tactical punish when White has opened the diagonal to h4.",
  },
  {
    id: "scholar-finish",
    title: "Finish the scholar attack",
    theme: "Opening mate",
    rating: 820,
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 3 4",
    solution: ["h5f7"],
    hint: "The queen and bishop already point at the same sensitive square.",
    description: "Convert the classic bishop-and-queen battery into checkmate.",
  },
  {
    id: "royal-fork",
    title: "Royal fork",
    theme: "Knight fork",
    rating: 1080,
    fen: "6k1/3q1ppp/8/8/4N3/8/5PPP/6K1 w - - 0 1",
    solution: ["e4f6"],
    hint: "Look for a checking knight jump that attacks the queen at the same time.",
    description: "A clean one-move fork that wins the queen.",
  },
  {
    id: "queen-box-mate",
    title: "Box the king in",
    theme: "Queen endgame",
    rating: 900,
    fen: "7k/6Q1/6K1/8/8/8/8/8 w - - 0 1",
    solution: ["g7f8"],
    hint: "Use the queen to cover the last flight square while your king keeps support.",
    description: "Basic queen-and-king coordination to close the mating net.",
  },
  {
    id: "queen-edge-mate",
    title: "Edge mate",
    theme: "Queen endgame",
    rating: 940,
    fen: "7k/5Q2/7K/8/8/8/8/8 w - - 0 1",
    solution: ["f7h7"],
    hint: "Shift the queen to the side so the king has no legal squares left.",
    description: "One precise move ends the game on the rim.",
  },
  {
    id: "rook-net",
    title: "Rook net",
    theme: "Rook mate",
    rating: 980,
    fen: "7k/8/5RK1/8/8/8/8/8 w - - 0 1",
    solution: ["f6f8"],
    hint: "The rook can deliver mate because the king is already boxed in by your king.",
    description: "A simple rook finish with tight king support.",
  },
  {
    id: "legals-mate",
    title: "Legal's mate",
    theme: "Sacrifice sequence",
    rating: 1480,
    fen: "r2qkbnr/ppp2ppp/2np4/4p2b/2B1P3/2N2N1P/PPPP1PP1/R1BQK2R w KQkq - 1 6",
    solution: ["f3e5", "h5d1", "c4f7", "e8e7", "c3d5"],
    hint: "Ignore the attack on your queen and keep sending pieces toward e7.",
    description: "A classic mating pattern built on development and piece activity.",
  },
  {
    id: "blackburne-shilling",
    title: "Blackburne trap",
    theme: "Mating attack",
    rating: 1550,
    fen: "r1b1kbnr/pppp1Npp/8/6q1/2BnP3/8/PPPP1PPP/RNBQK2R b KQkq - 0 5",
    solution: ["g5g2", "h1f1", "g2e4", "c4e2", "d4f3"],
    hint: "Keep the queen active and bring the knight to the dark squares near the king.",
    description: "A sharp opening trap where Black's queen and knight finish the attack.",
  },
];
