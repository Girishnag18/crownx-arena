import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Copy, Check, Crown, Users, Loader2, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import BackButton from "@/components/common/BackButton";

interface Referral {
  id: string;
  referred_id: string;
  reward_claimed: boolean;
  created_at: string;
  referred_profile?: { username: string | null };
}

const REFERRAL_REWARD = 25; // Crowns for both parties

const Referrals = () => {
  const { user } = useAuth();
  const [referralCode, setReferralCode] = useState("");
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [inputCode, setInputCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Get own referral code
    const { data: profile } = await (supabase as any)
      .from("profiles")
      .select("referral_code")
      .eq("id", user.id)
      .single();
    if (profile?.referral_code) setReferralCode(profile.referral_code);

    // Get referrals made
    const { data: refs } = await (supabase as any)
      .from("referrals")
      .select("id, referred_id, reward_claimed, created_at")
      .eq("referrer_id", user.id)
      .order("created_at", { ascending: false });

    if (refs && refs.length > 0) {
      const ids = refs.map((r: any) => r.referred_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username")
        .in("id", ids);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      setReferrals(refs.map((r: any) => ({
        ...r,
        referred_profile: pMap.get(r.referred_id),
      })));
    }

    setLoading(false);
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const redeemCode = async () => {
    if (!user || !inputCode.trim()) return;
    setRedeeming(true);

    // Find referrer
    const { data: referrer } = await (supabase as any)
      .from("profiles")
      .select("id, referral_code")
      .eq("referral_code", inputCode.trim().toUpperCase())
      .single();

    if (!referrer) {
      toast.error("Invalid referral code");
      setRedeeming(false);
      return;
    }

    if (referrer.id === user.id) {
      toast.error("You can't use your own referral code");
      setRedeeming(false);
      return;
    }

    // Check if already referred
    const { data: existing } = await (supabase as any)
      .from("referrals")
      .select("id")
      .eq("referred_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      toast.error("You've already used a referral code");
      setRedeeming(false);
      return;
    }

    // Create referral
    const { error: refError } = await (supabase as any)
      .from("referrals")
      .insert({
        referrer_id: referrer.id,
        referred_id: user.id,
        referral_code: inputCode.trim().toUpperCase(),
      });

    if (refError) {
      toast.error(refError.message);
      setRedeeming(false);
      return;
    }

    // Reward both players
    const [{ data: myProfile }, { data: theirProfile }] = await Promise.all([
      supabase.from("profiles").select("wallet_crowns").eq("id", user.id).single(),
      supabase.from("profiles").select("wallet_crowns").eq("id", referrer.id).single(),
    ]);

    await Promise.all([
      supabase.from("profiles").update({ wallet_crowns: (myProfile?.wallet_crowns || 0) + REFERRAL_REWARD }).eq("id", user.id),
      supabase.from("profiles").update({ wallet_crowns: (theirProfile?.wallet_crowns || 0) + REFERRAL_REWARD }).eq("id", referrer.id),
      (supabase as any).from("wallet_transactions").insert({ player_id: user.id, amount: REFERRAL_REWARD, txn_type: "referral_bonus" }),
      (supabase as any).from("wallet_transactions").insert({ player_id: referrer.id, amount: REFERRAL_REWARD, txn_type: "referral_bonus" }),
      (supabase as any).from("referrals").update({ reward_claimed: true }).eq("referred_id", user.id),
    ]);

    setRedeeming(false);
    setInputCode("");
    toast.success(`🎉 +${REFERRAL_REWARD} Crowns! Your friend also got ${REFERRAL_REWARD} Crowns.`);
    loadData();
  };

  const totalEarned = referrals.filter(r => r.reward_claimed).length * REFERRAL_REWARD;

  return (
    <main className="min-h-screen bg-background pt-24 pb-16 px-3 sm:px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-20 left-1/4 w-[400px] h-[400px] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      <div className="container max-w-lg relative z-10 space-y-5">
        <BackButton label="Back" />

        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
          <div className="w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
            <Share2 className="w-7 h-7 text-primary" />
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black">Refer a Friend</h1>
          <p className="text-xs text-muted-foreground">Share your code — both of you earn {REFERRAL_REWARD} Crowns!</p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Referrals", value: referrals.length, icon: Users },
            { label: "Crowns Earned", value: totalEarned, icon: Crown },
            { label: "Your Code", value: referralCode || "...", icon: Gift },
          ].map(s => (
            <div key={s.label} className="glass-card p-3 text-center">
              <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
              <p className="font-display font-bold text-lg">{s.value}</p>
              <p className="text-[9px] text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Share Code */}
        <div className="glass-card border-glow p-5 space-y-3">
          <h2 className="font-display font-bold text-sm">Your Referral Code</h2>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-secondary/60 border border-border/40 rounded-lg px-4 py-3 font-mono font-bold text-lg text-center tracking-[0.3em]">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : referralCode}
            </div>
            <button onClick={copyCode} className="p-3 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Share this code with friends before they sign up</p>
        </div>

        {/* Redeem Code */}
        <div className="glass-card p-5 space-y-3">
          <h2 className="font-display font-bold text-sm">Have a Referral Code?</h2>
          <div className="flex gap-2">
            <input
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              placeholder="Enter code"
              maxLength={6}
              className="flex-1 bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm font-mono tracking-wider text-center uppercase"
            />
            <button
              onClick={redeemCode}
              disabled={redeeming || !inputCode.trim()}
              className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-xs font-display font-bold disabled:opacity-50"
            >
              {redeeming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redeem"}
            </button>
          </div>
        </div>

        {/* Referral History */}
        {referrals.length > 0 && (
          <div className="glass-card p-5 space-y-3">
            <h2 className="font-display font-bold text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" /> Your Referrals
            </h2>
            <div className="space-y-2">
              {referrals.map((ref, idx) => (
                <motion.div
                  key={ref.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-secondary/30"
                >
                  <div>
                    <p className="text-sm font-semibold">{ref.referred_profile?.username || "Player"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(ref.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <Crown className="w-3 h-3 text-primary" />
                    <span className="font-bold text-primary">+{REFERRAL_REWARD}</span>
                    {ref.reward_claimed && <Check className="w-3 h-3 text-emerald-500" />}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default Referrals;
