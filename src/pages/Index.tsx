import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Bot,
  Crown,
  Globe,
  ShieldCheck,
  Sparkles,
  Star,
  Swords,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";

const features = [
  {
    title: "Secure onboarding",
    copy: "Email and Google sign-in with reliable recovery flows and smoother first-time setup.",
    icon: ShieldCheck,
  },
  {
    title: "Adaptive AI practice",
    copy: "Train against computer opponents that scale in depth and thinking speed.",
    icon: Bot,
  },
  {
    title: "Live arena play",
    copy: "Quick matchmaking, private rooms, and global realtime competition in one interface.",
    icon: Globe,
  },
  {
    title: "Skill building",
    copy: "Daily puzzles, opening study, and match reviews help improvement stay structured.",
    icon: BookOpen,
  },
];

const pillars = [
  { label: "Modes", value: "6+", icon: Swords },
  { label: "Training lanes", value: "Daily", icon: Target },
  { label: "Competitive play", value: "Live", icon: Trophy },
  { label: "Community", value: "Global", icon: Users },
];

const steps = [
  "Create your account and personalize your arena profile.",
  "Choose quick play, private room, puzzles, or computer practice.",
  "Track progress, ratings, and rewards from one clean dashboard.",
];

const containerMotion = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemMotion = {
  hidden: { opacity: 0, y: 20, filter: "blur(6px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  },
};

const Index = () => {
  return (
    <main className="relative overflow-hidden pb-16">
      <section className="relative px-3 pb-16 pt-28 sm:px-4 sm:pt-32 lg:px-6">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-[160px]" />
          <div className="absolute right-0 top-20 h-72 w-72 rounded-full bg-accent/10 blur-[130px]" />
        </div>

        <motion.div
          initial="hidden"
          animate="show"
          variants={containerMotion}
          className="page-content relative grid max-w-7xl gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-stretch"
        >
          <motion.div variants={itemMotion} className="surface-section flex flex-col justify-between gap-8">
            <div className="space-y-5">
              <div className="eyebrow">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Modern chess competition</span>
              </div>

              <div className="space-y-4">
                <h1 className="max-w-3xl font-display text-4xl font-black leading-tight sm:text-5xl lg:text-6xl">
                  A cleaner arena for play, training, and progression.
                </h1>
                <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                  CrownX Arena brings live chess play, skill-building tools, and player progression into one aligned interface that feels faster, calmer, and easier to use.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/auth"
                  className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-primary px-6 py-4 text-sm font-display font-bold uppercase tracking-[0.24em] text-primary-foreground shadow-[0_24px_60px_-34px_hsl(var(--primary))] transition-all hover:translate-y-[-1px]"
                >
                  <Zap className="h-4 w-4" />
                  Start playing
                </Link>
                <Link
                  to="/lobby"
                  className="inline-flex items-center justify-center gap-2 rounded-[22px] border border-border/50 bg-background/45 px-6 py-4 text-sm font-display font-bold uppercase tracking-[0.22em] text-foreground transition-colors hover:border-primary/30 hover:bg-secondary/35"
                >
                  <Swords className="h-4 w-4 text-primary" />
                  Open lobby
                </Link>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {pillars.map((item) => (
                <div key={item.label} className="surface-muted px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                      <p className="mt-1 font-display text-2xl font-black text-foreground">{item.value}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/40 bg-secondary/45 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.aside variants={itemMotion} className="surface-section flex flex-col gap-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="kicker-label">Platform preview</p>
                <h2 className="section-heading">Everything aligned around the match</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <Crown className="h-6 w-6" />
              </div>
            </div>

            <div className="surface-muted space-y-4 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Current focus</p>
                  <p className="font-display text-lg font-bold text-foreground">Arena-ready experience</p>
                </div>
                <span className="rounded-full bg-emerald-500/12 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400">
                  Live
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/40 bg-card/70 px-4 py-4">
                  <p className="text-xs text-muted-foreground">Play flow</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Quick play, world arena, and private rooms</p>
                </div>
                <div className="rounded-2xl border border-border/40 bg-card/70 px-4 py-4">
                  <p className="text-xs text-muted-foreground">Training flow</p>
                  <p className="mt-2 text-sm font-semibold text-foreground">Puzzles, openings, analysis, and review</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {[
                "Professional spacing and readable visual hierarchy",
                "Clear navigation on desktop and mobile",
                "Smooth page transitions with focused action areas",
              ].map((point) => (
                <div key={point} className="surface-muted flex items-start gap-3 px-4 py-4">
                  <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                    <Star className="h-4 w-4" />
                  </div>
                  <p className="text-sm leading-6 text-foreground/90">{point}</p>
                </div>
              ))}
            </div>
          </motion.aside>
        </motion.div>
      </section>

      <section className="px-3 py-10 sm:px-4 lg:px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerMotion}
          className="page-content max-w-7xl space-y-6"
        >
          <motion.div variants={itemMotion} className="max-w-2xl space-y-3">
            <div className="eyebrow">
              <Crown className="h-3.5 w-3.5" />
              <span>Core features</span>
            </div>
            <h2 className="section-heading text-3xl sm:text-4xl">Built to feel focused, responsive, and competitive.</h2>
            <p className="text-base leading-7 text-muted-foreground">
              The platform is organized so each screen has one clear purpose while still feeling connected to the rest of the arena.
            </p>
          </motion.div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => (
              <motion.article key={feature.title} variants={itemMotion} className="surface-section space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-display text-lg font-bold text-foreground">{feature.title}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{feature.copy}</p>
                </div>
              </motion.article>
            ))}
          </div>
        </motion.div>
      </section>

      <section className="px-3 py-10 sm:px-4 lg:px-6">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={containerMotion}
          className="page-content max-w-7xl grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.85fr)]"
        >
          <motion.div variants={itemMotion} className="surface-section space-y-5">
            <div className="space-y-2">
              <p className="kicker-label">How it works</p>
              <h2 className="section-heading">Get from signup to active play in minutes</h2>
            </div>

            <div className="space-y-3">
              {steps.map((step, index) => (
                <div key={step} className="surface-muted flex items-start gap-4 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 font-display text-sm font-black text-primary">
                    {index + 1}
                  </div>
                  <p className="pt-1 text-sm leading-6 text-foreground/90">{step}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemMotion} className="surface-section flex flex-col justify-between gap-6">
            <div className="space-y-3">
              <p className="kicker-label">For competitive players</p>
              <h2 className="section-heading">Stay in the arena longer with less friction.</h2>
              <p className="text-sm leading-6 text-muted-foreground">
                Every major flow is tuned around clarity: fewer layout jumps, clearer calls to action, and more readable data once the match begins.
              </p>
            </div>

            <Link
              to="/auth"
              className="inline-flex items-center justify-center gap-2 rounded-[22px] bg-primary px-6 py-4 text-sm font-display font-bold uppercase tracking-[0.24em] text-primary-foreground shadow-[0_24px_60px_-34px_hsl(var(--primary))] transition-all hover:translate-y-[-1px]"
            >
              Create account
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
};

export default Index;
