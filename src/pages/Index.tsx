import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, ShieldCheck, Bot, Zap, Swords, Globe, ArrowRight, Sparkles, Users, Trophy } from "lucide-react";

const features = [
  {
    title: "Secure Authentication",
    copy: "Hardened email & Google auth with reliable account recovery.",
    icon: ShieldCheck,
  },
  {
    title: "Adaptive AI Battles",
    copy: "Practice against a computer opponent that evolves every game.",
    icon: Bot,
  },
  {
    title: "Live Global Arena",
    copy: "World arena, private rooms, and instant matchmaking with realtime sync.",
    icon: Globe,
  },
];

const stats = [
  { label: "Game Modes", value: "6+", icon: Swords },
  { label: "Active Players", value: "∞", icon: Users },
  { label: "Tournaments", value: "Live", icon: Trophy },
];

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const Index = () => (
  <main className="min-h-screen overflow-hidden">
    {/* Hero */}
    <section className="relative container max-w-5xl px-4 sm:px-6 pt-28 sm:pt-36 pb-20 text-center">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/10 blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative"
      >
        <span className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 bg-primary/10 border border-primary/20 text-primary text-xs sm:text-sm font-semibold mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          Dynamic chess competition platform
        </span>

        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.1] max-w-3xl mx-auto">
          Play smarter.{" "}
          <span className="text-gradient-gold">React faster.</span>{" "}
          Rule the arena.
        </h1>

        <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mt-5 leading-relaxed">
          CrownX Arena blends tactical chess, realtime competition, and modern
          visual effects so every match feels alive.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
          <Link
            to="/auth"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider inline-flex items-center justify-center gap-2 gold-glow hover:brightness-110"
          >
            <Zap className="w-4 h-4" />
            Start Playing
          </Link>
          <Link
            to="/lobby"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl border border-border bg-card/50 font-display font-bold text-sm tracking-wider inline-flex items-center justify-center gap-2 hover:border-primary/30 hover:bg-card/80"
          >
            <Swords className="w-4 h-4" />
            Open Lobby
          </Link>
        </div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className="relative flex flex-wrap items-center justify-center gap-6 sm:gap-10 mt-14"
      >
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
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

    {/* Features */}
    <section className="container max-w-5xl px-4 sm:px-6 py-16">
      <div className="text-center mb-10">
        <h2 className="text-2xl sm:text-3xl font-bold">Built for competitive play</h2>
        <p className="text-muted-foreground mt-2 max-w-md mx-auto">
          Every feature designed to elevate your chess experience.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature, idx) => (
          <motion.article
            key={feature.title}
            custom={idx}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={fadeIn}
            className="glass-card p-6 group hover:border-primary/20 transition-colors"
          >
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
              <feature.icon className="w-5 h-5 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{feature.copy}</p>
          </motion.article>
        ))}
      </div>
    </section>

    {/* How it works */}
    <section className="container max-w-5xl px-4 sm:px-6 py-16">
      <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
        <motion.article
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          custom={0}
          className="glass-card p-6 sm:p-8"
        >
          <h3 className="text-xl sm:text-2xl font-bold mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Why players stay
          </h3>
          <ul className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              Responsive boards across mobile, tablet, and desktop.
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              Dynamic visuals with smooth match transitions.
            </li>
            <li className="flex items-start gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
              Realtime social play with world arena presence.
            </li>
          </ul>
        </motion.article>

        <motion.article
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
          custom={1}
          className="glass-card p-6 sm:p-8"
        >
          <h3 className="text-xl sm:text-2xl font-bold mb-4">Get started in 60 seconds</h3>
          <ol className="space-y-3 text-muted-foreground text-sm leading-relaxed">
            {[
              "Create your account with email or Google.",
              "Open Lobby and pick quick play, world arena, or private room.",
              "Play instantly and keep improving every match.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </motion.article>
      </div>
    </section>

    {/* CTA */}
    <section className="container max-w-5xl px-4 sm:px-6 py-16">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeIn}
        custom={0}
        className="glass-card p-8 sm:p-12 text-center border-glow"
      >
        <h2 className="text-2xl sm:text-3xl font-bold mb-3">Ready to compete?</h2>
        <p className="text-muted-foreground max-w-md mx-auto mb-6">
          Join the arena today and start climbing the leaderboard.
        </p>
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider gold-glow hover:brightness-110"
        >
          Get Started <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>
    </section>

    {/* Footer */}
    <footer className="border-t border-border/40">
      <div className="container max-w-5xl px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Crown className="w-4 h-4 text-primary" />
          <span className="font-display text-sm font-bold">CrownX Arena</span>
        </div>
        <p className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} CrownX Arena. All rights reserved.
        </p>
      </div>
    </footer>
  </main>
);

export default Index;