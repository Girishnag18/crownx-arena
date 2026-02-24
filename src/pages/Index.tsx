import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const blocks = [
  { title: "Authentication & security", copy: "Email, OAuth, verification, OTP recovery, and secure sessions." },
  { title: "ELO matchmaking", copy: "Realtime queue, acceptance timer, and dynamic rating updates." },
  { title: "Admin controls", copy: "Moderation, player actions, analytics, and live reports." },
];

const faqs = [
  ["How ranking works?", "CrownX uses an ELO model with anti-smurf controls and streak balancing."],
  ["Can teams use it?", "Yes, squad ladders and private arenas are included in Pro plans."],
];

const Index = () => (
  <main className="min-h-screen">
    <section className="container max-w-6xl px-4 pt-28 pb-20 text-center">
      <span className="inline-flex rounded-full px-4 py-1 bg-primary/10 text-primary text-sm">Built for competitive communities</span>
      <h1 className="text-5xl md:text-7xl font-black mt-6 leading-tight">The premium arena platform for ranked play.</h1>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto mt-5">Launch a startup-grade esports product with auth, matchmaking, leaderboards, badges, chat, and admin command tools.</p>
      <div className="flex justify-center gap-4 mt-8">
        <Link to="/auth" className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">Start free</Link>
        <Link to="/leaderboard" className="px-6 py-3 rounded-xl border border-border font-semibold">See leaderboard</Link>
      </div>
    </section>

    <section className="container max-w-6xl px-4 py-14 grid md:grid-cols-3 gap-4">
      {blocks.map((block, idx) => (
        <motion.article key={block.title} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.08 }} className="glass-card p-6">
          <h2 className="font-semibold text-xl mb-2">{block.title}</h2>
          <p className="text-muted-foreground">{block.copy}</p>
        </motion.article>
      ))}
    </section>

    <section className="container max-w-6xl px-4 py-14 grid md:grid-cols-2 gap-6">
      <article className="glass-card p-6">
        <h3 className="text-2xl font-bold mb-4">How it works</h3>
        <ol className="space-y-2 text-muted-foreground list-decimal list-inside">
          <li>Create account and verify email.</li>
          <li>Queue for ELO-based matchmaking.</li>
          <li>Accept match within 15 seconds.</li>
          <li>Track ratings, badges, and streaks live.</li>
        </ol>
      </article>
      <article className="glass-card p-6">
        <h3 className="text-2xl font-bold mb-4">FAQ</h3>
        {faqs.map(([q, a]) => <p key={q} className="mb-3"><strong>{q}</strong><br /><span className="text-muted-foreground">{a}</span></p>)}
      </article>
    </section>
  </main>
);

export default Index;
