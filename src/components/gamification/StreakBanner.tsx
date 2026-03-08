import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Gift, X, Crown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STREAK_BONUSES = [5, 10, 15, 20, 30, 40, 50];

const StreakBanner = () => {
  const { user } = useAuth();
  const [streak, setStreak] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const [visible, setVisible] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const autoDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 4000);
  };

  useEffect(() => {
    if (!user) return;
    checkAndRecordLogin();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [user?.id]);

  const checkAndRecordLogin = async () => {
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

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
        autoDismiss();
      }
      return;
    }

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
    autoDismiss();
  };

  const claimBonus = async () => {
    if (!user || claiming) return;
    setClaiming(true);

    const today = new Date().toISOString().split("T")[0];
    const bonus = STREAK_BONUSES[Math.min(streak - 1, STREAK_BONUSES.length - 1)];

    await (supabase as any)
      .from("daily_logins")
      .update({ bonus_claimed: true })
      .eq("user_id", user.id)
      .eq("login_date", today);

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

  const bonus = STREAK_BONUSES[Math.min(streak - 1, STREAK_BONUSES.length - 1)];

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            onClick={() => setVisible(false)}
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", damping: 22, stiffness: 260 }}
            className="relative w-full max-w-xs rounded-2xl border border-primary/30 bg-card/95 backdrop-blur-lg shadow-2xl p-5 text-center"
          >
            <button
              onClick={() => setVisible(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Flame */}
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="w-14 h-14 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3"
            >
              <Flame className="w-7 h-7 text-orange-500" />
            </motion.div>

            {/* Title */}
            <h2 className="font-display font-bold text-lg">
              🔥 {streak}-Day Streak!
            </h2>

            <p className="text-xs text-muted-foreground mt-1">
              {canClaim
                ? `Claim your daily bonus of ${bonus} Crowns`
                : "Bonus claimed — see you tomorrow!"}
            </p>

            {/* Streak dots */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {Array.from({ length: 7 }, (_, i) => (
                <div
                  key={i}
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold border ${
                    i < streak
                      ? "bg-orange-500/20 border-orange-500/50 text-orange-500"
                      : "bg-secondary border-border text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Claim button */}
            {canClaim && (
              <button
                onClick={claimBonus}
                disabled={claiming}
                className="mt-4 w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg px-4 py-2.5 text-sm font-display font-bold hover:opacity-90 disabled:opacity-50"
              >
                <Gift className="w-4 h-4" />
                {claiming ? "Claiming..." : `Claim ${bonus} Crowns`}
              </button>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StreakBanner;
