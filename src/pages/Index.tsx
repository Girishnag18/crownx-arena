import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Crown, ShieldCheck, Sparkles, BarChart3, Bot, Zap } from "lucide-react";

const blocks = [
  { title: "Secure authentication", copy: "Hardened email and Google OAuth flows with safer reset-password journey.", icon: ShieldCheck },
  { title: "Tactical AI battles", copy: "Practice with adaptive tactical computer play to sharpen combinations and endgames.", icon: Bot },
  { title: "Live ratings insight", copy: "Track score, tier, win-rate and profile updates in real-time across devices.", icon: BarChart3 },
];

const Index = () => (
  <main className="min-h-screen overflow-hidden">
    <section className="relative container max-w-6xl px-4 pt-28 pb-20 text-center">
      <motion.div className="absolute -top-16 left-1/2 -translate-x-1/2 w-[620px] h-[620px] rounded-full bg-primary/15 blur-3xl" animate={{ scale: [1, 1.1, 1], opacity: [0.45, 0.7, 0.45] }} transition={{ duration: 8, repeat: Infinity }} />
      <span className="relative inline-flex rounded-full px-4 py-1 bg-primary/10 text-primary text-sm items-center gap-2"><Sparkles className="w-4 h-4" />Chess, competition, and community</span>
      <h1 className="relative text-5xl md:text-7xl font-black mt-6 leading-tight">Play smarter. Rank faster. Build your Crown.</h1>
      <p className="relative text-lg text-muted-foreground max-w-2xl mx-auto mt-5">CrownX Arena is a premium chess platform with tactical AI, real-time online matches, secure auth, and modern competitive progression.</p>
      <div className="relative flex flex-wrap justify-center gap-4 mt-8">
        <Link to="/auth" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2"><Zap className="w-4 h-4" />Start playing</Link>
        <Link to="/ratings" className="px-6 py-3 rounded-xl border border-border font-semibold">Rating overview</Link>
      </div>
    </section>

    <section className="container max-w-6xl px-4 py-14 grid md:grid-cols-3 gap-4">
      {blocks.map((block, idx) => (
        <motion.article key={block.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="glass-card p-6">
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
          <li>Responsive board and controls across mobile, tablet, and desktop.</li>
          <li>In-game effects and clean move history for focused gameplay.</li>
          <li>Fast queueing, protected sessions, and polished social profile UI.</li>
        </ul>
      </article>
      <article className="glass-card p-6">
        <h3 className="text-2xl font-bold mb-4">Get started in 60 seconds</h3>
        <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
          <li>Create your account with email or Google.</li>
          <li>Open Lobby and choose online or computer mode.</li>
          <li>Win games and watch your rating grow in live overview.</li>
        </ol>
      </article>
    </section>
  </main>
);

export default Index;
