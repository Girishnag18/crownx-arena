import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Crown, Swords, Trophy, Zap, Shield, Globe, Star, ChevronRight } from "lucide-react";
import heroImage from "@/assets/hero-chess.jpg";

const rankTiers = [
  { name: "Bronze", color: "from-amber-700 to-amber-900", icon: "🥉" },
  { name: "Silver", color: "from-slate-300 to-slate-500", icon: "🥈" },
  { name: "Gold", color: "from-yellow-400 to-amber-500", icon: "🥇" },
  { name: "Platinum", color: "from-cyan-300 to-cyan-600", icon: "💎" },
  { name: "Diamond", color: "from-blue-300 to-blue-600", icon: "💠" },
  { name: "Crown Master", color: "from-primary to-gold-glow", icon: "👑" },
];

const features = [
  { icon: Swords, title: "Real-Time PvP", desc: "Battle players worldwide with zero-lag matchmaking" },
  { icon: Trophy, title: "Tournaments", desc: "Compete in ranked tournaments and climb the leaderboard" },
  { icon: Zap, title: "CrownScore™", desc: "Our unique rating system rewards strategy, not just wins" },
  { icon: Shield, title: "Anti-Cheat", desc: "Fair play guaranteed with advanced detection systems" },
  { icon: Globe, title: "World Arena", desc: "Region-based matchmaking across the globe" },
  { icon: Star, title: "Achievement System", desc: "Unlock badges and level up your player profile" },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroImage} alt="Chess arena" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/80 to-background" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="relative z-10 text-center px-4 max-w-4xl mx-auto"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, type: "spring" }}
            className="inline-flex mb-8"
          >
            <Crown className="w-16 h-16 md:w-20 md:h-20 text-primary animate-float" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="font-display text-5xl md:text-7xl lg:text-8xl font-black tracking-tight mb-4"
          >
            <span className="text-gradient-gold gold-text-glow">CrownX</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="text-xl md:text-2xl text-muted-foreground font-light tracking-widest uppercase mb-10"
          >
            Where Strategy Meets Glory
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider px-8 py-4 rounded-xl gold-glow hover:scale-105 transition-transform"
            >
              <Swords className="w-5 h-5" />
              PLAY NOW
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 glass-card border-glow font-display font-bold text-sm tracking-wider text-foreground px-8 py-4 hover:scale-105 transition-transform"
            >
              <Trophy className="w-5 h-5 text-primary" />
              JOIN TOURNAMENT
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-display font-bold text-sm tracking-wider px-8 py-4 rounded-xl hover:bg-secondary/80 transition-colors"
            >
              LOGIN
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <motion.div
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex justify-center pt-2"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-primary" />
          </motion.div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Built for <span className="text-gradient-gold">Champions</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A competitive chess platform designed from the ground up for serious players
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                className="glass-card p-6 group hover:border-primary/30 transition-all duration-300 hover:gold-glow"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Rank Tiers */}
      <section className="py-24 px-4 bg-dark-surface">
        <div className="container mx-auto max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Ranking <span className="text-gradient-gold">Tiers</span>
            </h2>
            <p className="text-muted-foreground text-lg">
              Climb the ranks with the CrownScore™ system
            </p>
          </motion.div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
          >
            {rankTiers.map((tier, i) => (
              <motion.div
                key={tier.name}
                variants={fadeUp}
                className="glass-card p-4 text-center group hover:scale-105 transition-transform cursor-default"
              >
                <div className="text-3xl mb-2">{tier.icon}</div>
                <div className={`font-display text-sm font-bold bg-gradient-to-r ${tier.color} bg-clip-text text-transparent`}>
                  {tier.name}
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="container mx-auto max-w-3xl text-center glass-card p-12 border-glow gold-glow"
        >
          <Crown className="w-12 h-12 text-primary mx-auto mb-6" />
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Claim Your <span className="text-gradient-gold">Crown</span>?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join thousands of players competing in the ultimate chess arena
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider px-8 py-4 rounded-xl gold-glow hover:scale-105 transition-transform"
          >
            GET STARTED
            <ChevronRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            <span className="font-display text-sm font-bold text-gradient-gold">CrownX</span>
          </div>
          <p className="text-muted-foreground text-sm">
            © 2026 CrownX. Where Strategy Meets Glory.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
