import { motion } from "framer-motion";
import { Crown, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="inline-flex mb-6"
        >
          <Crown className="w-16 h-16 text-primary opacity-30" />
        </motion.div>

        <h1 className="font-display text-7xl md:text-9xl font-black text-gradient-gold gold-text-glow mb-2">
          404
        </h1>
        <p className="font-display text-xl text-muted-foreground mb-2">
          Territory Not Conquered
        </p>
        <p className="text-sm text-muted-foreground/60 mb-8 max-w-sm mx-auto">
          This square doesn't exist on the board. Let's get you back to the arena.
        </p>

        <Link
          to="/"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider px-6 py-3 rounded-xl gold-glow hover:scale-105 transition-transform"
        >
          <ArrowLeft className="w-4 h-4" />
          BACK TO ARENA
        </Link>
      </motion.div>
    </div>
  );
};

export default NotFound;
