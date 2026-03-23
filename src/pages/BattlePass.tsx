import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Crown, Lock, CheckCircle, Gift, Zap, Clock } from "lucide-react";
import BackButton from "@/components/common/BackButton";

interface Season {
  id: string;
  name: string;
  season_number: number;
  starts_at: string;
  ends_at: string;
  status: string;
}

interface Tier {
  id: string;
  tier_number: number;
  xp_required: number;
  reward_type: string;
  reward_amount: number;
  reward_label: string;
  reward_icon: string;
  is_premium: boolean;
}

interface BPProgress {
  id: string;
  current_xp: number;
  is_premium: boolean;
}

const BattlePass = () => {
  const { user } = useAuth();
  const [season, setSeason] = useState<Season | null>(null);
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [progress, setProgress] = useState<BPProgress | null>(null);
  const [claimedTierIds, setClaimedTierIds] = useState<Set<string>>(new Set());
  const [claiming, setClaiming] = useState<string | null>(null);

  useEffect(() => {
    loadSeason();
  }, []);

  useEffect(() => {
    if (season && user) {
      loadTiers();
      loadProgress();
    }
  }, [season, user?.id]);

  useEffect(() => {
    if (tiers.length > 0 && user) loadClaims();
  }, [tiers, user?.id]);

  const loadSeason = async () => {
    const { data } = await (supabase as any)
      .from("battle_pass_seasons")
      .select("*")
      .eq("status", "active")
      .order("season_number", { ascending: false })
      .limit(1);
    if (data?.[0]) setSeason(data[0]);
  };

  const loadTiers = async () => {
    if (!season) return;
    const { data } = await (supabase as any)
      .from("battle_pass_tiers")
      .select("*")
      .eq("season_id", season.id)
      .order("tier_number");
    if (data) setTiers(data);
  };

  const loadProgress = async () => {
    if (!season || !user) return;
    const { data } = await (supabase as any)
      .from("battle_pass_progress")
      .select("*")
      .eq("user_id", user.id)
      .eq("season_id", season.id)
      .maybeSingle();

    if (data) {
      setProgress(data);
    } else {
      // Auto-enroll
      const { data: inserted } = await (supabase as any)
        .from("battle_pass_progress")
        .insert({ user_id: user.id, season_id: season.id, current_xp: 0 })
        .select()
        .single();
      if (inserted) setProgress(inserted);
    }
  };

  const loadClaims = async () => {
    if (!user) return;
    const tierIds = tiers.map((t) => t.id);
    const { data } = await (supabase as any)
      .from("battle_pass_claims")
      .select("tier_id")
      .eq("user_id", user.id)
      .in("tier_id", tierIds);
    setClaimedTierIds(new Set((data || []).map((c: any) => c.tier_id)));
  };

  const claimTier = async (tier: Tier) => {
    if (!user || !progress) return;
    if (progress.current_xp < tier.xp_required) return;
    if (tier.is_premium && !progress.is_premium) return;
    if (claimedTierIds.has(tier.id)) return;

    setClaiming(tier.id);

    const { error } = await (supabase as any)
      .from("battle_pass_claims")
      .insert({ user_id: user.id, tier_id: tier.id });

    if (error) {
      if (error.code === "23505") toast.info("Already claimed!");
      else toast.error(error.message);
      setClaiming(null);
      return;
    }

    // Credit rewards
    if (tier.reward_type === "crowns") {
      const { data: prof } = await supabase
        .from("profiles")
        .select("wallet_crowns")
        .eq("id", user.id)
        .single();
      if (prof) {
        await supabase
          .from("profiles")
          .update({ wallet_crowns: (prof.wallet_crowns || 0) + tier.reward_amount })
          .eq("id", user.id);
      }
    }

    setClaiming(null);
    setClaimedTierIds((prev) => new Set([...prev, tier.id]));
    toast.success(`Claimed: ${tier.reward_label}!`);
  };

  const getTimeRemaining = () => {
    if (!season) return "";
    const diff = new Date(season.ends_at).getTime() - Date.now();
    if (diff <= 0) return "Season ended";
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return `${days}d ${hours}h remaining`;
  };

  const currentXp = progress?.current_xp || 0;
  const currentTier = tiers.filter((t) => currentXp >= t.xp_required).length;
  const nextTier = tiers[currentTier] || null;
  const overallPct = tiers.length > 0
    ? Math.min(100, (currentXp / (tiers[tiers.length - 1]?.xp_required || 1)) * 100)
    : 0;

  return (
    <main className="page-container">
      <div className="page-content page-content--narrow">
      <BackButton label="Back" to="/dashboard" />
      {/* Header */}
      <div className="glass-card p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Zap className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold font-display">Battle Pass</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {season?.name || "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-4 h-4" />
              {getTimeRemaining()}
            </span>
            <span className="font-semibold text-primary">
              Tier {currentTier}/{tiers.length}
            </span>
          </div>
        </div>

        {/* Overall progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{currentXp} XP earned</span>
            <span>{tiers[tiers.length - 1]?.xp_required || 0} XP total</span>
          </div>
          <Progress value={overallPct} className="h-3" />
        </div>

        {nextTier && (
          <p className="text-xs text-muted-foreground text-center">
            Next reward at {nextTier.xp_required} XP — {nextTier.xp_required - currentXp} XP to go
          </p>
        )}
      </div>

      {/* Tier list */}
      <div className="space-y-3">
        {tiers.map((tier, idx) => {
          const unlocked = currentXp >= tier.xp_required;
          const claimed = claimedTierIds.has(tier.id);
          const premiumLocked = tier.is_premium && !progress?.is_premium;
          const canClaim = unlocked && !claimed && !premiumLocked;

          const prevXp = idx > 0 ? tiers[idx - 1].xp_required : 0;
          const tierPct = unlocked
            ? 100
            : Math.max(0, Math.min(100, ((currentXp - prevXp) / (tier.xp_required - prevXp)) * 100));

          return (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
              className={`rounded-xl border p-4 transition-colors ${
                claimed
                  ? "border-primary/30 bg-primary/5"
                  : unlocked
                  ? "border-green-500/40 bg-green-500/5"
                  : "border-border bg-card/60"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-secondary text-lg shrink-0">
                    {tier.reward_icon}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">Tier {tier.tier_number}</span>
                      {tier.is_premium && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 uppercase">
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{tier.reward_label}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {claimed ? (
                    <span className="flex items-center gap-1 text-xs text-primary font-semibold">
                      <CheckCircle className="w-4 h-4" /> Claimed
                    </span>
                  ) : premiumLocked ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Lock className="w-3.5 h-3.5" /> Premium
                    </span>
                  ) : canClaim ? (
                    <button
                      onClick={() => claimTier(tier)}
                      disabled={claiming === tier.id}
                      className="flex items-center gap-1.5 bg-green-600 text-white rounded-lg px-3 py-1.5 text-xs font-semibold hover:bg-green-700 disabled:opacity-50"
                    >
                      <Gift className="w-3.5 h-3.5" />
                      {claiming === tier.id ? "..." : "Claim"}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground font-mono">{tier.xp_required} XP</span>
                  )}
                </div>
              </div>

              {!unlocked && (
                <div className="mt-2">
                  <Progress value={tierPct} className="h-1.5" />
                </div>
              )}
            </motion.div>
          );
        })}

        {tiers.length === 0 && (
          <p className="text-center text-muted-foreground py-12">No active battle pass season.</p>
        )}
      </div>
      </div>
    </main>
  );
};

export default BattlePass;
