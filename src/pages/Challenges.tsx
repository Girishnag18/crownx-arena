import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Crown, CheckCircle, Clock, Gift } from "lucide-react";
import BackButton from "@/components/common/BackButton";

interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: "daily" | "weekly";
  category: string;
  icon: string;
  target_value: number;
  crown_reward: number;
  xp_reward: number;
  active_from: string;
  active_until: string;
}

interface ChallengeProgress {
  id: string;
  challenge_id: string;
  current_value: number;
  completed: boolean;
  reward_claimed: boolean;
  completed_at: string | null;
}

const Challenges = () => {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [progress, setProgress] = useState<Map<string, ChallengeProgress>>(new Map());
  const [claiming, setClaiming] = useState<string | null>(null);

  const loadChallenges = async () => {
    const now = new Date().toISOString();
    const { data } = await supabase
      .from("challenges" as any)
      .select("*")
      .lte("active_from", now)
      .gte("active_until", now)
      .order("challenge_type")
      .order("crown_reward", { ascending: false });

    if (data) setChallenges(data as unknown as Challenge[]);
  };

  const loadProgress = async () => {
    if (!user) return;
    const challengeIds = challenges.map((c) => c.id);
    if (challengeIds.length === 0) return;

    const { data } = await supabase
      .from("challenge_progress" as any)
      .select("*")
      .eq("user_id", user.id)
      .in("challenge_id", challengeIds);

    const map = new Map<string, ChallengeProgress>();
    (data as unknown as ChallengeProgress[] || []).forEach((p) => map.set(p.challenge_id, p));
    setProgress(map);
  };

  useEffect(() => {
    loadChallenges();
  }, []);

  useEffect(() => {
    if (challenges.length > 0) loadProgress();
  }, [challenges, user?.id]);

  const startChallenge = async (challengeId: string) => {
    if (!user) return;
    const { error } = await supabase.from("challenge_progress" as any).insert({
      user_id: user.id,
      challenge_id: challengeId,
      current_value: 0,
    });
    if (error) {
      if (error.code === "23505") {
        toast.info("Already started!");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Challenge started!");
    await loadProgress();
  };

  const claimReward = async (challenge: Challenge) => {
    if (!user) return;
    const p = progress.get(challenge.id);
    if (!p || !p.completed || p.reward_claimed) return;

    setClaiming(challenge.id);

    // Mark as claimed
    await supabase
      .from("challenge_progress" as any)
      .update({ reward_claimed: true })
      .eq("id", p.id);

    // Credit wallet
    await supabase
      .from("profiles")
      .update({ 
        wallet_crowns: (await supabase.from("profiles").select("wallet_crowns").eq("id", user.id).single()).data?.wallet_crowns as number + challenge.crown_reward,
        xp: (await supabase.from("profiles").select("xp").eq("id", user.id).single()).data?.xp as number + challenge.xp_reward,
      })
      .eq("id", user.id);

    setClaiming(null);
    toast.success(`Claimed ${challenge.crown_reward} Crowns + ${challenge.xp_reward} XP!`);
    await loadProgress();
  };

  const getTimeRemaining = (until: string) => {
    const diff = new Date(until).getTime() - Date.now();
    if (diff <= 0) return "Expired";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
    return `${hours}h ${mins}m`;
  };

  const dailyChallenges = challenges.filter((c) => c.challenge_type === "daily");
  const weeklyChallenges = challenges.filter((c) => c.challenge_type === "weekly");

  const renderChallenge = (challenge: Challenge) => {
    const p = progress.get(challenge.id);
    const pct = p ? Math.min(100, (p.current_value / challenge.target_value) * 100) : 0;
    const isCompleted = p?.completed || false;
    const isClaimed = p?.reward_claimed || false;
    const isStarted = !!p;

    return (
      <motion.div
        key={challenge.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-xl border p-4 space-y-3 transition-colors ${
          isClaimed
            ? "border-primary/30 bg-primary/5"
            : isCompleted
            ? "border-green-500/40 bg-green-500/5"
            : "border-border bg-card/60"
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{challenge.icon}</span>
            <div>
              <h3 className="font-semibold text-sm">{challenge.title}</h3>
              <p className="text-xs text-muted-foreground">{challenge.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground shrink-0">
            <Clock className="w-3 h-3" />
            {getTimeRemaining(challenge.active_until)}
          </div>
        </div>

        {/* Rewards */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-amber-500 font-semibold">
            <Crown className="w-3 h-3" /> {challenge.crown_reward} Crowns
          </span>
          <span className="text-muted-foreground">+{challenge.xp_reward} XP</span>
        </div>

        {/* Progress */}
        {isStarted && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{p!.current_value}/{challenge.target_value}</span>
            </div>
            <Progress value={pct} className="h-2" />
          </div>
        )}

        {/* Action button */}
        {isClaimed ? (
          <div className="flex items-center gap-2 text-xs text-primary font-semibold">
            <CheckCircle className="w-4 h-4" /> Reward Claimed
          </div>
        ) : isCompleted ? (
          <button
            onClick={() => claimReward(challenge)}
            disabled={claiming === challenge.id}
            className="w-full flex items-center justify-center gap-2 bg-green-600 text-white rounded-lg py-2 text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            <Gift className="w-4 h-4" />
            {claiming === challenge.id ? "Claiming..." : "Claim Reward"}
          </button>
        ) : !isStarted ? (
          <button
            onClick={() => startChallenge(challenge.id)}
            className="w-full bg-primary text-primary-foreground rounded-lg py-2 text-sm font-semibold hover:opacity-90"
          >
            Start Challenge
          </button>
        ) : (
          <p className="text-xs text-muted-foreground text-center">In progress — keep playing!</p>
        )}
      </motion.div>
    );
  };

  return (
    <main className="page-container">
      <div className="container max-w-4xl mx-auto space-y-6">
      <BackButton label="Back" to="/dashboard" />
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold font-display">Challenges</h1>
        <p className="text-muted-foreground text-sm">Complete daily & weekly challenges to earn Crowns and XP.</p>
      </div>

      <Tabs defaultValue="daily" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-secondary/40">
          <TabsTrigger value="daily">Daily ({dailyChallenges.length})</TabsTrigger>
          <TabsTrigger value="weekly">Weekly ({weeklyChallenges.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-3 mt-4">
          {dailyChallenges.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No active daily challenges right now.</p>
          ) : (
            dailyChallenges.map(renderChallenge)
          )}
        </TabsContent>

        <TabsContent value="weekly" className="space-y-3 mt-4">
          {weeklyChallenges.length === 0 ? (
            <p className="text-center text-muted-foreground py-12">No active weekly challenges right now.</p>
          ) : (
            weeklyChallenges.map(renderChallenge)
          )}
        </TabsContent>
      </Tabs>
    </main>
  );
};

export default Challenges;
