import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Crown, Flame, Gift, Check, Lock, ArrowLeft, Sparkles, Calendar as CalendarIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format, subDays, startOfDay } from "date-fns";

const STREAK_BONUSES = [5, 10, 15, 20, 30, 40, 50];

interface LoginDay {
  login_date: string;
  streak: number;
  crown_bonus: number;
  bonus_claimed: boolean;
}

const DailyRewards = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loginHistory, setLoginHistory] = useState<LoginDay[]>([]);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [todayLogin, setTodayLogin] = useState<LoginDay | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [totalEarned, setTotalEarned] = useState(0);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;

    // Fetch last 30 days of logins
    const thirtyDaysAgo = subDays(new Date(), 30).toISOString().split("T")[0];
    const { data } = await (supabase as any)
      .from("daily_logins")
      .select("login_date, streak, crown_bonus, bonus_claimed")
      .eq("user_id", user.id)
      .gte("login_date", thirtyDaysAgo)
      .order("login_date", { ascending: false });

    const rows = (data || []) as LoginDay[];
    setLoginHistory(rows);

    const today = new Date().toISOString().split("T")[0];
    const todayRow = rows.find((r) => r.login_date === today);
    setTodayLogin(todayRow || null);
    setCurrentStreak(todayRow?.streak || 0);
    setTotalEarned(rows.filter((r) => r.bonus_claimed).reduce((s, r) => s + r.crown_bonus, 0));
  };

  const claimBonus = async () => {
    if (!user || !todayLogin || todayLogin.bonus_claimed || claiming) return;
    setClaiming(true);

    const today = new Date().toISOString().split("T")[0];
    const bonus = todayLogin.crown_bonus;

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
    toast.success(`🔥 +${bonus} Crowns claimed!`);
    loadData();
  };

  // Build 7-day reward preview
  const loginDatesSet = new Set(loginHistory.map((l) => l.login_date));

  return (
    <div className="page-container">
      <div className="page-content page-content--compact">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-4"
            >
              <Flame className="w-8 h-8 text-orange-500" />
            </motion.div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">Daily Rewards</h1>
            <p className="text-sm text-muted-foreground mt-1">Log in every day to earn escalating Crown bonuses</p>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4 sm:mb-6">
            <div className="glass-card p-4 text-center">
              <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold font-display text-orange-500">{currentStreak}</p>
              <p className="text-[10px] text-muted-foreground">Day Streak</p>
            </div>
            <div className="glass-card p-4 text-center">
              <Crown className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold font-display text-primary">{totalEarned}</p>
              <p className="text-[10px] text-muted-foreground">Total Earned</p>
            </div>
            <div className="glass-card p-4 text-center">
              <CalendarIcon className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold font-display">{loginHistory.length}</p>
              <p className="text-[10px] text-muted-foreground">Days Active</p>
            </div>
          </div>

          {/* 7-Day Streak Rewards */}
          <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="font-display font-bold text-base sm:text-lg mb-3 sm:mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> 7-Day Streak Rewards
            </h2>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 sm:gap-2">
              {STREAK_BONUSES.map((bonus, i) => {
                const dayNum = i + 1;
                const isReached = currentStreak >= dayNum;
                const isCurrent = currentStreak === dayNum;
                const isNext = currentStreak === dayNum - 1;

                return (
                  <motion.div
                    key={i}
                    whileHover={{ scale: 1.05 }}
                    className={`relative rounded-xl border-2 p-3 text-center transition-all ${
                      isReached
                        ? "border-orange-500/50 bg-orange-500/10"
                        : isNext
                          ? "border-primary/40 bg-primary/5 animate-pulse"
                          : "border-border bg-secondary/20"
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <span className="text-[8px] bg-orange-500 text-white px-1.5 py-0.5 rounded-full font-bold">
                          TODAY
                        </span>
                      </div>
                    )}
                    <p className="text-[10px] text-muted-foreground font-semibold mb-1">Day {dayNum}</p>
                    <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-1 ${
                      isReached ? "bg-orange-500/20" : "bg-secondary"
                    }`}>
                      {isReached ? (
                        <Check className="w-4 h-4 text-orange-500" />
                      ) : isNext ? (
                        <Gift className="w-4 h-4 text-primary" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex items-center justify-center gap-0.5">
                      <Crown className={`w-3 h-3 ${isReached ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-xs font-bold ${isReached ? "text-primary" : "text-muted-foreground"}`}>
                        {bonus}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* After day 7 info */}
            <p className="text-xs text-muted-foreground text-center mt-3">
              After Day 7, you continue earning <span className="text-primary font-semibold">50 Crowns</span> per day!
            </p>
          </div>

          {/* Claim Section */}
          <div className="glass-card p-6 mb-6 border-glow">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-lg">Today's Reward</h3>
                {todayLogin ? (
                  <p className="text-sm text-muted-foreground mt-1">
                    Day {todayLogin.streak} — <span className="text-primary font-semibold">{todayLogin.crown_bonus} Crowns</span>
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground mt-1">Log in to start your streak!</p>
                )}
              </div>

              {todayLogin && !todayLogin.bonus_claimed ? (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={claimBonus}
                  disabled={claiming}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-xl font-display font-bold text-sm disabled:opacity-50"
                >
                  <Gift className="w-4 h-4" />
                  {claiming ? "Claiming..." : `Claim ${todayLogin.crown_bonus} Crowns`}
                </motion.button>
              ) : todayLogin?.bonus_claimed ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-4 py-2.5 rounded-xl">
                  <Check className="w-4 h-4 text-emerald-500" />
                  Claimed!
                </div>
              ) : null}
            </div>
          </div>

          {/* Login History */}
          <div className="glass-card p-6">
            <h3 className="font-display font-bold text-lg mb-4 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-muted-foreground" /> Recent Activity
            </h3>
            {loginHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No login history yet. Come back tomorrow!</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {loginHistory.slice(0, 14).map((day) => (
                  <div key={day.login_date} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        day.bonus_claimed ? "bg-emerald-500/15" : "bg-orange-500/15"
                      }`}>
                        {day.bonus_claimed ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Gift className="w-4 h-4 text-orange-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">
                          {format(new Date(day.login_date + "T00:00:00"), "EEE, MMM d")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Day {day.streak} streak</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5 text-primary" />
                      <span className="text-sm font-bold text-primary">+{day.crown_bonus}</span>
                      {day.bonus_claimed && <Check className="w-3 h-3 text-emerald-500 ml-1" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default DailyRewards;
