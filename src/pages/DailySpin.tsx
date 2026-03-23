import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Crown, Sparkles, Gift, Check, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import BackButton from "@/components/common/BackButton";
import SpinWheel from "@/components/gamification/SpinWheel";

const DailySpin = () => {
  const { user } = useAuth();
  const [spunToday, setSpunToday] = useState(false);
  const [loading, setLoading] = useState(true);
  const [crediting, setCrediting] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkSpin();
  }, [user?.id]);

  const checkSpin = async () => {
    if (!user) return;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data } = await (supabase as any)
      .from("wallet_transactions")
      .select("id")
      .eq("player_id", user.id)
      .eq("txn_type", "daily_spin")
      .gte("created_at", today + "T00:00:00Z")
      .limit(1);
    setSpunToday((data || []).length > 0);
    setLoading(false);
  };

  const handleReward = async (amount: number) => {
    if (!user) return;
    setCrediting(true);

    const { data: prof } = await supabase
      .from("profiles")
      .select("wallet_crowns")
      .eq("id", user.id)
      .single();

    if (prof) {
      await supabase
        .from("profiles")
        .update({ wallet_crowns: (prof.wallet_crowns || 0) + amount })
        .eq("id", user.id);
    }

    await (supabase as any).from("wallet_transactions").insert({
      player_id: user.id,
      amount,
      txn_type: "daily_spin",
    });

    setCrediting(false);
    setSpunToday(true);
    toast.success(`🎉 +${amount} Crowns added to your wallet!`);
  };

  return (
    <main className="page-container relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 left-1/3 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-20 right-1/4 w-[300px] h-[300px] bg-accent/6 rounded-full blur-[100px]" />
      </div>

      <div className="page-content page-content--compact relative z-10">
        <BackButton label="Back" />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-2"
        >
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto"
          >
            <Gift className="w-7 h-7 text-primary" />
          </motion.div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">Daily Spin</h1>
          <p className="text-xs text-muted-foreground">Spin once daily for free Crown rewards!</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass-card border-glow p-6 sm:p-8 flex flex-col items-center"
        >
          {loading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin my-16" />
          ) : spunToday ? (
            <div className="text-center py-12 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="font-display font-bold text-lg">Already Spun Today!</h2>
              <p className="text-xs text-muted-foreground">Come back tomorrow for another spin.</p>
            </div>
          ) : (
            <SpinWheel onReward={handleReward} disabled={crediting} spinning={crediting} />
          )}
        </motion.div>

        <div className="glass-card p-4 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="w-3 h-3 text-primary" />
            Free daily spin resets at midnight UTC
          </div>
        </div>
      </div>
    </main>
  );
};

export default DailySpin;
