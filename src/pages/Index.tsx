import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, ShieldCheck, Sparkles, Bot, Zap, Swords, Globe } from "lucide-react";

const blocks = [
  { title: "Secure authentication", copy: "Hardened email + Google auth and safer account recovery for reliable sessions.", icon: ShieldCheck },
  { title: "Adaptive AI battles", copy: "Practice with an evolving computer opponent that changes tactical strength each game.", icon: Bot },
  { title: "Live global arena", copy: "Jump into world arena, private rooms, and fast matchmaking with real-time sync.", icon: Globe },
];

const floatingOrbs = Array.from({ length: 12 }).map((_, idx) => ({
  id: idx,
  left: `${(idx * 7 + 8) % 90}%`,
  duration: 8 + (idx % 5) * 1.8,
  delay: idx * 0.35,
}));

const Index = () => (
  <main className="min-h-screen overflow-hidden">
    <section className="relative container max-w-6xl px-4 pt-28 pb-20 text-center">
      <motion.div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-primary/15 blur-3xl" animate={{ scale: [1, 1.12, 1], opacity: [0.45, 0.8, 0.45] }} transition={{ duration: 8, repeat: Infinity }} />
      {floatingOrbs.map((orb) => (
        <motion.div
          key={orb.id}
          className="absolute top-24 w-2 h-2 rounded-full bg-primary/30"
          style={{ left: orb.left }}
          animate={{ y: [0, -50, 0], opacity: [0.2, 0.8, 0.2], scale: [0.8, 1.2, 0.8] }}
          transition={{ duration: orb.duration, delay: orb.delay, repeat: Infinity }}
        />
      ))}
      <span className="relative inline-flex rounded-full px-4 py-1 bg-primary/10 text-primary text-sm items-center gap-2"><Sparkles className="w-4 h-4" />Dynamic chess competition platform</span>
      <h1 className="relative text-5xl md:text-7xl font-black mt-6 leading-tight">Play smarter. React faster. Rule the arena.</h1>
      <p className="relative text-lg text-muted-foreground max-w-2xl mx-auto mt-5">CrownX Arena blends tactical chess, realtime competition, private rooms, and modern visual effects so every match feels alive.</p>
      <div className="relative flex flex-wrap justify-center gap-4 mt-8">
        <Link to="/auth" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2"><Zap className="w-4 h-4" />Start playing</Link>
        <Link to="/lobby" className="px-6 py-3 rounded-xl border border-border font-semibold inline-flex items-center gap-2"><Swords className="w-4 h-4" />Open lobby</Link>
      </div>
    </section>

    <section className="container max-w-6xl px-4 py-14 grid md:grid-cols-3 gap-4">
      {blocks.map((block, idx) => (
        <motion.article key={block.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="glass-card p-6 relative overflow-hidden">
          <motion.div className="absolute -right-8 -top-8 w-24 h-24 rounded-full bg-primary/10 blur-xl" animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 6, repeat: Infinity, delay: idx * 0.4 }} />
          <block.icon className="w-5 h-5 text-primary mb-3" />
          <h2 className="font-semibold text-xl mb-2">{block.title}</h2>
          <p className="text-muted-foreground">{block.copy}</p>
        </motion.article>
      ))}
    </section>

    <section className="container max-w-6xl px-4 pb-20 grid md:grid-cols-2 gap-6">
      <article className="glass-card p-6">
        <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><Crown className="w-5 h-5 text-primary" />Why players stay</h3>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
          <li>Responsive boards across mobile, tablet, and desktop.</li>
          <li>Dynamic visuals and smoother match transitions.</li>
          <li>Realtime social play with world arena presence updates.</li>
        </ul>
      </article>
      <article className="glass-card p-6">
        <h3 className="text-2xl font-bold mb-4">Get started in 60 seconds</h3>
        <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
          <li>Create your account with email or Google.</li>
          <li>Open Lobby and pick quick play, world arena, or private room.</li>
          <li>Play instantly and keep improving every match.</li>
        </ol>
      </article>
    </section>
  </main>
);

export default Index;
