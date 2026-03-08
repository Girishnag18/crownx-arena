import { Link } from "react-router-dom";
import { motion, useScroll, useTransform } from "framer-motion";
import { Crown, ShieldCheck, Bot, Zap, Swords, Globe, ArrowRight, Sparkles, Users, Trophy, Star, Target, BookOpen } from "lucide-react";

const features = [
  {
    title: "Secure Authentication",
    copy: "Hardened email & Google auth with reliable account recovery.",
    icon: ShieldCheck,
    accent: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    title: "Adaptive AI Battles",
    copy: "Practice against a computer opponent that evolves every game.",
    icon: Bot,
    accent: "from-violet-500/20 to-violet-500/5",
  },
  {
    title: "Live Global Arena",
    copy: "World arena, private rooms, and instant matchmaking with realtime sync.",
    icon: Globe,
    accent: "from-primary/20 to-primary/5",
  },
  {
    title: "Puzzle Training",
    copy: "Daily tactical puzzles calibrated to your skill level.",
    icon: Target,
    accent: "from-sky-500/20 to-sky-500/5",
  },
  {
    title: "Opening Mastery",
    copy: "Spaced-repetition trainer for building your opening repertoire.",
    icon: BookOpen,
    accent: "from-amber-500/20 to-amber-500/5",
  },
  {
    title: "Ranked Seasons",
    copy: "Compete in seasonal leaderboards with crown rewards and exclusive titles.",
    icon: Star,
    accent: "from-rose-500/20 to-rose-500/5",
  },
];

const stats = [
  { label: "Game Modes", value: "6+", icon: Swords },
  { label: "Active Players", value: "∞", icon: Users },
  { label: "Tournaments", value: "Live", icon: Trophy },
];

const stagger = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08 },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 24, filter: "blur(4px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

const Index = () => {
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1, 0.97]);

  return (
    <main className="min-h-screen overflow-hidden">
      {/* ───── HERO ───── */}
      <section className="relative pt-28 sm:pt-36 pb-24 overflow-hidden">
        {/* Ambient glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-primary/8 blur-[140px]" />
          <div className="absolute top-[30%] right-0 w-[400px] h-[400px] rounded-full bg-accent/5 blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[350px] h-[350px] rounded-full bg-primary/4 blur-[120px]" />
        </div>

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />

        <div
          className="relative container max-w-5xl px-4 sm:px-6 text-center"
        >
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.span
              variants={fadeUp}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-semibold mb-6 gold-glow"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Dynamic chess competition platform
            </motion.span>

            <motion.h1
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.08] max-w-3xl mx-auto"
            >
              Play smarter.{" "}
              <span className="text-gradient-gold gold-text-glow">React faster.</span>{" "}
              Rule the arena.
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mt-6 leading-relaxed"
            >
              CrownX Arena blends tactical chess, realtime competition, and modern
              visual effects so every match feels alive.
            </motion.p>

            <motion.div
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-9"
            >
              <Link
                to="/auth"
                className="w-full sm:w-auto px-9 py-3.5 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-sm tracking-wider inline-flex items-center justify-center gap-2 gold-glow hover:shadow-lg hover:shadow-primary/25 transition-shadow"
              >
                <Zap className="w-4 h-4" />
                Start Playing
              </Link>
              <Link
                to="/lobby"
                className="w-full sm:w-auto px-9 py-3.5 rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm font-display font-bold text-sm tracking-wider inline-flex items-center justify-center gap-2 hover:border-primary/30 hover:bg-card/60 transition-all"
              >
                <Swords className="w-4 h-4" />
                Open Lobby
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Stats bar — outside parallax so it stays visible */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.55, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] }}
          className="relative container max-w-5xl px-4 sm:px-6 flex flex-wrap items-center justify-center gap-4 sm:gap-6 mt-16"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 glass-card px-5 py-3 hover:border-primary/20 transition-colors"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-display font-bold text-lg leading-tight">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ───── FEATURES ───── */}
      <section className="relative container max-w-5xl px-4 sm:px-6 py-20">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/4 blur-[140px] pointer-events-none" />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="relative text-center mb-12"
        >
          <motion.span
            variants={fadeUp}
            className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-4"
          >
            <Crown className="w-3.5 h-3.5" />
            Features
          </motion.span>
          <motion.h2
            variants={fadeUp}
            className="text-2xl sm:text-3xl md:text-4xl font-bold"
          >
            Built for{" "}
            <span className="text-gradient-gold">competitive</span> play
          </motion.h2>
          <motion.p
            variants={fadeUp}
            className="text-muted-foreground mt-3 max-w-md mx-auto"
          >
            Every feature designed to elevate your chess experience.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feature) => (
            <motion.article
              key={feature.title}
              variants={fadeUp}
              className="glass-card p-6 group hover:border-primary/25 transition-all duration-300 relative overflow-hidden"
            >
              {/* Subtle gradient overlay on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${feature.accent} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/10 flex items-center justify-center mb-4 group-hover:border-primary/25 group-hover:shadow-sm group-hover:shadow-primary/10 transition-all">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-display font-bold text-base mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.copy}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      {/* ───── WHY + HOW ───── */}
      <section className="container max-w-5xl px-4 sm:px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
          variants={stagger}
          className="grid md:grid-cols-2 gap-5"
        >
          <motion.article
            variants={fadeUp}
            className="glass-card p-7 sm:p-8 relative overflow-hidden group hover:border-primary/20 transition-colors"
          >
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/5 rounded-full blur-[60px] group-hover:bg-primary/8 transition-colors" />
            <div className="relative">
              <h3 className="text-xl sm:text-2xl font-bold mb-5 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
                  <Crown className="w-4.5 h-4.5 text-primary" />
                </div>
                Why players stay
              </h3>
              <ul className="space-y-3.5 text-muted-foreground text-sm leading-relaxed">
                {[
                  "Responsive boards across mobile, tablet, and desktop.",
                  "Dynamic visuals with smooth match transitions.",
                  "Realtime social play with world arena presence.",
                  "Gamified progression with achievements and XP.",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </motion.article>

          <motion.article
            variants={fadeUp}
            className="glass-card p-7 sm:p-8 relative overflow-hidden group hover:border-primary/20 transition-colors"
          >
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/5 rounded-full blur-[60px] group-hover:bg-accent/8 transition-colors" />
            <div className="relative">
              <h3 className="text-xl sm:text-2xl font-bold mb-5">Get started in 60 seconds</h3>
              <ol className="space-y-4 text-muted-foreground text-sm leading-relaxed">
                {[
                  "Create your account with email or Google.",
                  "Open Lobby and pick quick play, world arena, or private room.",
                  "Play instantly and keep improving every match.",
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/15 text-primary text-xs font-display font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </motion.article>
        </motion.div>
      </section>

      {/* ───── CTA ───── */}
      <section className="container max-w-5xl px-4 sm:px-6 py-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="glass-card p-10 sm:p-14 text-center relative overflow-hidden border-glow gold-glow"
        >
          {/* Radial glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/6 rounded-full blur-[100px]" />
          </div>

          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
              <Crown className="w-7 h-7 text-primary-foreground" />
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              Ready to <span className="text-gradient-gold">compete</span>?
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-8">
              Join the arena today and start climbing the leaderboard.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground font-display font-bold text-sm tracking-wider gold-glow hover:shadow-lg hover:shadow-primary/25 transition-shadow"
            >
              Get Started <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* ───── FOOTER ───── */}
      <footer className="border-t border-border/30">
        <div className="container max-w-5xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <span className="font-display text-sm font-bold text-gradient-gold">CrownX Arena</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} CrownX Arena. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
};

export default Index;
