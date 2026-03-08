import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Gift, X, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STREAK_BONUSES = [5, 10, 15, 20, 30, 40, 50]; // crowns per day streak

const StreakBanner = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [visible, setVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    if (!user) return;
    checkAndRecordLogin();
  }, [user?.id]);

  const checkAndRecordLogin = async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

    // Check if already logged in today
    const { data: todayLogin } = await (supabase as any)
      .from("daily_logins")
      .select("*")
      .eq("user_id", user.id)
      .eq("login_date", today)
      .maybeSingle();

    if (todayLogin) {
      setStreak(todayLogin.streak);
      setCanClaim(!todayLogin.bonus_claimed);
      if (!todayLogin.bonus_claimed) {
        setVisible(true);
        setTimeout(() => setVisible(false), 4000);
      }
      return;
    }

    // Check yesterday's streak
    const { data: yesterdayLogin } = await (supabase as any)
      .from("daily_logins")
      .select("streak")
      .eq("user_id", user.id)
      .eq("login_date", yesterday)
      .maybeSingle();

    const newStreak = yesterdayLogin ? yesterdayLogin.streak + 1 : 1;
    const bonus = STREAK_BONUSES[Math.min(newStreak - 1, STREAK_BONUSES.length - 1)];

    await (supabase as any).from("daily_logins").insert({
      user_id: user.id,
      login_date: today,
      streak: newStreak,
      crown_bonus: bonus,
    });

    setStreak(newStreak);
    setCanClaim(true);
    setVisible(true);
    setTimeout(() => setVisible(false), 4000);
  };

  const claimBonus = async () => {
    if (!user || claiming) return;
    setClaiming(true);

    const today = new Date().toISOString().split("T")[0];
    const bonus = STREAK_BONUSES[Math.min(streak - 1, STREAK_BONUSES.length - 1)];

    // Mark claimed
    await (supabase as any)
      .from("daily_logins")
      .update({ bonus_claimed: true })
      .eq("user_id", user.id)
      .eq("login_date", today);

    // Credit wallet
    const { data: prof } = await supabase
      .from("profiles")
      .select("wallet_crowns")
      .eq("id", user.id)
      .single();

    if (prof) {
      await supabase
        .from("profiles")
        .update({ wallet_crowns: (prof.wallet_crowns || 0) + bonus })
        .eq("id", user.id);
    }

    setClaiming(false);
    setCanClaim(false);
    toast.success(`🔥 Day ${streak} bonus: +${bonus} Crowns!`);
    setTimeout(() => setVisible(false), 1500);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", damping: 20 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setVisible(false)}
          />

          <div className="relative w-full max-w-sm rounded-xl border border-primary/30 bg-card/95 backdrop-blur-lg shadow-xl p-5">
            <button
              onClick={() => setVisible(false)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              {/* Flame icon with animation */}
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ repeat: Infinity, duration: 1.2 }}
                className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0"
              >
                <Flame className="w-6 h-6 text-orange-500" />
              </motion.div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-display font-bold text-sm">
                    🔥 {streak}-Day Streak!
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {canClaim
                    ? `Claim your daily bonus of ${STREAK_BONUSES[Math.min(streak - 1, STREAK_BONUSES.length - 1)]} Crowns`
                    : "Bonus claimed — see you tomorrow!"}
                </p>

                {/* Streak dots */}
                <div className="flex items-center gap-1 mt-2">
                  {Array.from({ length: 7 }, (_, i) => (
                    <div
                      key={i}
                      className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold border ${
                        i < streak
                          ? "bg-orange-500/20 border-orange-500/50 text-orange-500"
                          : "bg-secondary border-border text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>

              {canClaim && (
                <button
                  onClick={claimBonus}
                  disabled={claiming}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground rounded-lg px-3 py-2 text-xs font-semibold hover:opacity-90 disabled:opacity-50 shrink-0"
                >
                  <Gift className="w-3.5 h-3.5" />
                  {claiming ? "..." : "Claim"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StreakBanner;
