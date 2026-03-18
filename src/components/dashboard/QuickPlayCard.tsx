import { motion } from "framer-motion";
import { Bot, Eye, Puzzle, Swords, Target, Trophy, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickPlayCard = () => {
  const navigate = useNavigate();

  const actions = [
    { icon: Bot, label: "vs Computer", desc: "Practice AI matches", onClick: () => navigate("/lobby") },
    { icon: Target, label: "Puzzles", desc: "Sharpen tactics", onClick: () => navigate("/puzzles") },
    { icon: Trophy, label: "Events", desc: "Track tournaments", onClick: () => navigate("/leaderboard") },
    { icon: Users, label: "Private Room", desc: "Invite a friend", onClick: () => navigate("/lobby") },
    { icon: Eye, label: "Spectate", desc: "Watch live boards", onClick: () => navigate("/spectate") },
    { icon: Puzzle, label: "Openings", desc: "Build repertoire", onClick: () => navigate("/openings") },
  ];

  return (
    <section className="surface-section space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="kicker-label">Quick launch</p>
          <div>
            <h3 className="section-heading">Jump back into the arena</h3>
            <p className="text-sm text-muted-foreground">
              Start a fresh match, train a specific skill, or open the multiplayer lobby in one tap.
            </p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate("/lobby")}
          className="inline-flex w-full items-center justify-center gap-3 rounded-[22px] bg-gradient-to-r from-primary via-accent to-primary px-6 py-4 text-sm font-display font-black uppercase tracking-[0.26em] text-primary-foreground shadow-[0_24px_60px_-34px_hsl(var(--primary))] transition-all hover:translate-y-[-1px] sm:w-auto"
        >
          <Swords className="h-5 w-5" />
          <span>Open lobby</span>
        </motion.button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map((action) => (
          <motion.button
            key={action.label}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={action.onClick}
            className="surface-muted group flex items-start gap-4 px-4 py-4 text-left transition-all hover:border-primary/30 hover:bg-secondary/35"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/40 bg-secondary/45 text-muted-foreground transition-all group-hover:border-primary/20 group-hover:bg-primary/10 group-hover:text-primary">
              <action.icon className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-sm font-bold text-foreground">{action.label}</p>
              <p className="text-xs leading-5 text-muted-foreground">{action.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </section>
  );
};

export default QuickPlayCard;
