import { motion } from "framer-motion";
import { Crown, BookOpen, Lightbulb, Target, ShieldCheck } from "lucide-react";

const pieces = [
  { name: "King", symbol: "♔", desc: "Moves one square in any direction. Must be protected at all costs — checkmate ends the game.", value: "∞" },
  { name: "Queen", symbol: "♕", desc: "Moves any number of squares in any direction. The most powerful piece on the board.", value: "9" },
  { name: "Rook", symbol: "♖", desc: "Moves any number of squares horizontally or vertically. Crucial for castling.", value: "5" },
  { name: "Bishop", symbol: "♗", desc: "Moves any number of squares diagonally. Each bishop stays on its starting color.", value: "3" },
  { name: "Knight", symbol: "♘", desc: "Moves in an L-shape: two squares in one direction and one square perpendicular. Can jump over pieces.", value: "3" },
  { name: "Pawn", symbol: "♙", desc: "Moves forward one square (two from starting position). Captures diagonally. Can promote at the eighth rank.", value: "1" },
];

const tips = [
  "Control the center of the board early with pawns and knights.",
  "Develop your pieces before launching an attack.",
  "Castle early to protect your king.",
  "Don't move the same piece twice in the opening without good reason.",
  "Always look for your opponent's threats before making a move.",
  "Rooks are most powerful on open files.",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Rules = () => {
  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
            <span className="text-gradient-gold">Chess</span> Rules
          </h1>
          <p className="text-muted-foreground text-lg">Master the fundamentals, dominate the board</p>
        </motion.div>

        {/* Pieces */}
        <motion.section
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="mb-16"
        >
          <div className="flex items-center gap-2 mb-6">
            <BookOpen className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-bold">The Pieces</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pieces.map((p) => (
              <motion.div key={p.name} variants={fadeUp} className="glass-card p-5 group hover:border-primary/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="text-4xl leading-none">{p.symbol}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold">{p.name}</h3>
                      <span className="text-xs text-muted-foreground font-display">Value: {p.value}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Special Moves */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <Target className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Special Moves</h2>
          </div>
          <div className="space-y-4">
            {[
              { name: "Castling", desc: "Move your King two squares toward a Rook, then the Rook jumps to the other side. Only if neither has moved, no pieces between them, and King isn't in check." },
              { name: "En Passant", desc: "If a pawn advances two squares from its starting position and lands beside an opponent's pawn, the opponent can capture it as if it had moved only one square." },
              { name: "Pawn Promotion", desc: "When a pawn reaches the opposite end of the board, it must be promoted to a Queen, Rook, Bishop, or Knight." },
            ].map((m) => (
              <div key={m.name} className="glass-card p-5">
                <h3 className="font-display font-bold text-primary mb-1">{m.name}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>

        {/* Strategy Tips */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-16">
          <div className="flex items-center gap-2 mb-6">
            <Lightbulb className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-bold">Strategy Tips</h2>
          </div>
          <div className="glass-card p-6 border-glow">
            <ul className="space-y-3">
              {tips.map((tip, i) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="font-display text-primary font-bold mt-0.5">{i + 1}.</span>
                  <span className="text-muted-foreground leading-relaxed">{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </motion.section>

        {/* Game End */}
        <motion.section initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
          <div className="flex items-center gap-2 mb-6">
            <ShieldCheck className="w-5 h-5 text-primary" />
            <h2 className="font-display text-xl font-bold">How the Game Ends</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: "Checkmate", desc: "The King is in check and has no legal escape. Game over!" },
              { title: "Stalemate", desc: "The player whose turn it is has no legal moves and is not in check. It's a draw." },
              { title: "Resignation", desc: "A player may resign at any time, conceding the game." },
              { title: "Draw by Agreement", desc: "Both players agree to end the game in a draw." },
            ].map((end) => (
              <div key={end.title} className="glass-card p-4">
                <h3 className="font-display font-bold text-sm mb-1">{end.title}</h3>
                <p className="text-xs text-muted-foreground">{end.desc}</p>
              </div>
            ))}
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Rules;
