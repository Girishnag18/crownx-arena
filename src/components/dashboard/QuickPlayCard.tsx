import { motion } from "framer-motion";
import { Swords, Bot, Users, Eye, Globe, Target, Shuffle, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickPlayCard = () => {
  const navigate = useNavigate();

  const actions = [
    { icon: Swords, label: "Play Online", desc: "Find a match", onClick: () => navigate("/lobby"), primary: true },
    { icon: Bot, label: "vs Computer", desc: "Practice AI", onClick: () => navigate("/lobby") },
    { icon: Target, label: "Puzzles", desc: "Train tactics", onClick: () => navigate("/puzzles") },
    { icon: Trophy, label: "Tournaments", desc: "Compete", onClick: () => navigate("/leaderboard") },
    { icon: Users, label: "Private Room", desc: "Play a friend", onClick: () => navigate("/lobby") },
    { icon: Eye, label: "Spectate", desc: "Watch live", onClick: () => navigate("/spectate") },
  ];

  return (
    <div className="space-y-3">
      {/* Big Play Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => navigate("/lobby")}
        className="w-full rounded-xl bg-gradient-to-r from-primary via-accent to-primary text-primary-foreground font-display font-black text-lg tracking-wider py-5 gold-glow hover:shadow-lg hover:shadow-primary/25 transition-all flex items-center justify-center gap-3"
      >
        <Swords className="w-6 h-6" />
        PLAY
      </motion.button>

      {/* Action Grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {actions.map((a) => (
          <motion.button
            key={a.label}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.96 }}
            onClick={a.onClick}
            className="rounded-xl bg-card/80 border border-border/30 hover:border-primary/30 p-3 text-center transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-secondary/60 group-hover:bg-primary/10 flex items-center justify-center mx-auto mb-1.5 transition-colors">
              <a.icon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="font-display font-bold text-[10px] sm:text-xs">{a.label}</p>
            <p className="text-[8px] text-muted-foreground mt-0.5 hidden sm:block">{a.desc}</p>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

export default QuickPlayCard;
