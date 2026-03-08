import { useEffect, useState } from "react";
import { Crown, Gift, Loader2, Puzzle, ShoppingBag, Swords, Target, Trophy, Wallet, Zap } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import BackButton from "@/components/common/BackButton";

interface WalletProfile {
  wallet_crowns: number;
  username: string | null;
}

const earnMethods = [
  { icon: Swords, title: "Win Matches", desc: "Earn crowns by winning ranked and casual games.", link: "/lobby" },
  { icon: Trophy, title: "Tournaments", desc: "Place in tournaments to win crown prize pools.", link: "/lobby" },
  { icon: Target, title: "Daily & Weekly Challenges", desc: "Complete challenges for crown rewards.", link: "/challenges" },
  { icon: Gift, title: "Daily Login Streak", desc: "Log in every day to earn bonus crowns.", link: "/daily-rewards" },
  { icon: Puzzle, title: "Solve Puzzles", desc: "Sharpen your skills and earn crowns per puzzle.", link: "/puzzles" },
  { icon: Zap, title: "Battle Pass", desc: "Progress through tiers to unlock crown rewards.", link: "/battle-pass" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 16, filter: "blur(4px)" },
  visible: (i: number) => ({
    opacity: 1, y: 0, filter: "blur(0px)",
    transition: { duration: 0.35, delay: i * 0.07, ease: [0.25, 0.1, 0.25, 1] as const },
  }),
};

const CrownTopup = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<WalletProfile | null>(null);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("wallet_crowns, username").eq("id", user.id).single();
      if (data) setProfile(data as unknown as WalletProfile);
    };
    loadProfile();

    const ch = supabase
      .channel(`wallet-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, loadProfile)
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container relative overflow-hidden">
      {/* Ambient glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 left-1/4 w-[420px] h-[420px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-1/4 w-[320px] h-[320px] bg-accent/6 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto max-w-2xl relative z-10 space-y-6">
        <BackButton label="Back" to="/dashboard" />
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="glass-card border-glow p-6 sm:p-8"
        >
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-accent/10 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Crown Wallet</h1>
              <p className="text-sm text-muted-foreground">Your in-game currency balance</p>
            </div>
          </div>

          <div className="bg-secondary/40 border border-border rounded-xl p-5 text-center">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Current Balance</div>
            <div className="font-display font-bold text-4xl bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {Number(profile?.wallet_crowns || 0).toFixed(0)}
            </div>
            <div className="text-sm text-muted-foreground mt-1 flex items-center justify-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-primary" /> Crowns
            </div>
          </div>
        </motion.div>

        {/* Ways to earn */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card border-glow p-6 sm:p-8"
        >
          <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            Ways to Earn Crowns
          </h2>

          <div className="grid gap-3">
            {earnMethods.map((m, i) => (
              <motion.button
                key={m.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                onClick={() => navigate(m.link)}
                className="flex items-center gap-4 bg-secondary/40 hover:bg-secondary/70 border border-border hover:border-primary/30 rounded-xl p-4 text-left transition-all duration-300 group"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                  <m.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-sm">{m.title}</div>
                  <div className="text-xs text-muted-foreground">{m.desc}</div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Link to Crown Store */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Link
            to="/shop"
            className="glass-card border-glow p-5 flex items-center justify-between group hover:border-primary/30 transition-all duration-300"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                <ShoppingBag className="w-5 h-5 text-primary" />
              </div>
              <div>
                <div className="font-display font-bold text-sm">Crown Store</div>
                <div className="text-xs text-muted-foreground">Spend crowns on titles, frames, badges & board themes</div>
              </div>
            </div>
            <Zap className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
};

export default CrownTopup;
