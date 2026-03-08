import { useMemo } from "react";
import { BookOpen } from "lucide-react";

interface OpeningInfo {
  name: string;
  eco: string;
  winWhite: number;
  draw: number;
  winBlack: number;
}

// Compact opening book keyed by move sequences (space-separated SANs)
const OPENING_BOOK: Record<string, OpeningInfo> = {
  "e4": { name: "King's Pawn Opening", eco: "B00", winWhite: 54, draw: 25, winBlack: 21 },
  "d4": { name: "Queen's Pawn Opening", eco: "A40", winWhite: 55, draw: 26, winBlack: 19 },
  "c4": { name: "English Opening", eco: "A10", winWhite: 53, draw: 28, winBlack: 19 },
  "Nf3": { name: "Réti Opening", eco: "A04", winWhite: 52, draw: 29, winBlack: 19 },
  "g3": { name: "Hungarian Opening", eco: "A00", winWhite: 50, draw: 28, winBlack: 22 },
  "f4": { name: "Bird's Opening", eco: "A02", winWhite: 48, draw: 25, winBlack: 27 },
  "b3": { name: "Nimzo-Larsen Attack", eco: "A01", winWhite: 51, draw: 27, winBlack: 22 },
  "e4 e5": { name: "Open Game", eco: "C20", winWhite: 53, draw: 26, winBlack: 21 },
  "e4 c5": { name: "Sicilian Defence", eco: "B20", winWhite: 52, draw: 24, winBlack: 24 },
  "e4 e6": { name: "French Defence", eco: "C00", winWhite: 53, draw: 27, winBlack: 20 },
  "e4 c6": { name: "Caro-Kann Defence", eco: "B10", winWhite: 52, draw: 28, winBlack: 20 },
  "e4 d5": { name: "Scandinavian Defence", eco: "B01", winWhite: 55, draw: 24, winBlack: 21 },
  "e4 d6": { name: "Pirc Defence", eco: "B07", winWhite: 55, draw: 24, winBlack: 21 },
  "e4 g6": { name: "Modern Defence", eco: "B06", winWhite: 56, draw: 23, winBlack: 21 },
  "e4 Nf6": { name: "Alekhine's Defence", eco: "B02", winWhite: 55, draw: 25, winBlack: 20 },
  "d4 d5": { name: "Closed Game", eco: "D00", winWhite: 54, draw: 28, winBlack: 18 },
  "d4 Nf6": { name: "Indian Defence", eco: "A45", winWhite: 54, draw: 27, winBlack: 19 },
  "d4 f5": { name: "Dutch Defence", eco: "A80", winWhite: 55, draw: 24, winBlack: 21 },
  "e4 e5 Nf3": { name: "King's Knight Opening", eco: "C40", winWhite: 53, draw: 26, winBlack: 21 },
  "e4 e5 Nf3 Nc6": { name: "Open Game: Two Knights", eco: "C40", winWhite: 53, draw: 27, winBlack: 20 },
  "e4 e5 Nf3 Nc6 Bb5": { name: "Ruy López", eco: "C60", winWhite: 54, draw: 28, winBlack: 18 },
  "e4 e5 Nf3 Nc6 Bc4": { name: "Italian Game", eco: "C50", winWhite: 52, draw: 27, winBlack: 21 },
  "e4 e5 Nf3 Nc6 d4": { name: "Scotch Game", eco: "C44", winWhite: 52, draw: 26, winBlack: 22 },
  "e4 e5 Nf3 Nf6": { name: "Petrov's Defence", eco: "C42", winWhite: 51, draw: 32, winBlack: 17 },
  "e4 e5 Nf3 d6": { name: "Philidor Defence", eco: "C41", winWhite: 55, draw: 25, winBlack: 20 },
  "e4 e5 f4": { name: "King's Gambit", eco: "C30", winWhite: 50, draw: 23, winBlack: 27 },
  "e4 c5 Nf3": { name: "Sicilian: Open", eco: "B27", winWhite: 53, draw: 24, winBlack: 23 },
  "e4 c5 Nf3 d6": { name: "Sicilian Najdorf", eco: "B90", winWhite: 52, draw: 25, winBlack: 23 },
  "e4 c5 Nf3 Nc6": { name: "Sicilian: Classical", eco: "B30", winWhite: 52, draw: 26, winBlack: 22 },
  "e4 c5 Nf3 e6": { name: "Sicilian: Paulsen", eco: "B40", winWhite: 52, draw: 26, winBlack: 22 },
  "d4 d5 c4": { name: "Queen's Gambit", eco: "D06", winWhite: 55, draw: 28, winBlack: 17 },
  "d4 d5 c4 e6": { name: "Queen's Gambit Declined", eco: "D30", winWhite: 54, draw: 29, winBlack: 17 },
  "d4 d5 c4 dxc4": { name: "Queen's Gambit Accepted", eco: "D20", winWhite: 53, draw: 27, winBlack: 20 },
  "d4 d5 c4 c6": { name: "Slav Defence", eco: "D10", winWhite: 53, draw: 29, winBlack: 18 },
  "d4 Nf6 c4": { name: "Indian Game", eco: "A46", winWhite: 54, draw: 27, winBlack: 19 },
  "d4 Nf6 c4 g6": { name: "King's Indian Defence", eco: "E60", winWhite: 54, draw: 25, winBlack: 21 },
  "d4 Nf6 c4 e6": { name: "Nimzo-Indian / Queen's Indian", eco: "E00", winWhite: 53, draw: 29, winBlack: 18 },
  "d4 Nf6 c4 e6 Nc3 Bb4": { name: "Nimzo-Indian Defence", eco: "E20", winWhite: 52, draw: 30, winBlack: 18 },
  "d4 Nf6 c4 c5": { name: "Benoni Defence", eco: "A56", winWhite: 55, draw: 24, winBlack: 21 },
  "e4 e5 Nf3 Nc6 Bb5 a6": { name: "Ruy López: Morphy Defence", eco: "C70", winWhite: 54, draw: 28, winBlack: 18 },
  "e4 e5 Nf3 Nc6 Bc4 Nf6": { name: "Italian: Two Knights Defence", eco: "C55", winWhite: 51, draw: 27, winBlack: 22 },
  "e4 e5 Nf3 Nc6 Bc4 Bc5": { name: "Italian: Giuoco Piano", eco: "C53", winWhite: 52, draw: 28, winBlack: 20 },
  "c4 e5": { name: "English: Reversed Sicilian", eco: "A20", winWhite: 52, draw: 28, winBlack: 20 },
  "c4 Nf6": { name: "English: Anglo-Indian", eco: "A15", winWhite: 53, draw: 28, winBlack: 19 },
  "Nf3 d5": { name: "Réti: King's Indian Attack", eco: "A05", winWhite: 52, draw: 30, winBlack: 18 },
  "e4 e5 d4": { name: "Centre Game", eco: "C21", winWhite: 51, draw: 25, winBlack: 24 },
  "d4 d5 Bf4": { name: "London System", eco: "D00", winWhite: 54, draw: 27, winBlack: 19 },
};

function findOpening(moves: string[]): OpeningInfo | null {
  // Try longest match first
  for (let len = moves.length; len >= 1; len--) {
    const key = moves.slice(0, len).join(" ");
    if (OPENING_BOOK[key]) return OPENING_BOOK[key];
  }
  return null;
}

interface OpeningExplorerProps {
  moves: string[];
}

const OpeningExplorer = ({ moves }: OpeningExplorerProps) => {
  const opening = useMemo(() => findOpening(moves), [moves]);

  if (!opening && moves.length === 0) {
    return (
      <div className="glass-card p-4 border border-border/40">
        <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-primary" />
          Opening Explorer
        </h3>
        <p className="text-xs text-muted-foreground">Make a move to see opening information</p>
      </div>
    );
  }

  if (!opening) {
    return (
      <div className="glass-card p-4 border border-border/40">
        <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-1">
          <BookOpen className="w-4 h-4 text-primary" />
          Opening Explorer
        </h3>
        <p className="text-xs text-muted-foreground">Out of book — unknown opening</p>
      </div>
    );
  }

  const total = opening.winWhite + opening.draw + opening.winBlack;

  return (
    <div className="glass-card p-4 border border-primary/20">
      <h3 className="font-display font-bold text-sm flex items-center gap-2 mb-2">
        <BookOpen className="w-4 h-4 text-primary" />
        Opening Explorer
      </h3>
      <div className="space-y-2">
        <div>
          <p className="font-display font-bold text-sm">{opening.name}</p>
          <p className="text-[10px] text-muted-foreground font-mono">ECO: {opening.eco}</p>
        </div>
        {/* Win rate bar */}
        <div className="space-y-1">
          <div className="flex h-3 rounded-full overflow-hidden border border-border/40">
            <div
              className="bg-foreground transition-all"
              style={{ width: `${(opening.winWhite / total) * 100}%` }}
              title={`White wins: ${opening.winWhite}%`}
            />
            <div
              className="bg-muted-foreground/40 transition-all"
              style={{ width: `${(opening.draw / total) * 100}%` }}
              title={`Draws: ${opening.draw}%`}
            />
            <div
              className="bg-secondary transition-all"
              style={{ width: `${(opening.winBlack / total) * 100}%` }}
              title={`Black wins: ${opening.winBlack}%`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>⬜ {opening.winWhite}%</span>
            <span>½ {opening.draw}%</span>
            <span>⬛ {opening.winBlack}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpeningExplorer;
