import { useEffect, useState } from "react";
import { Crown, IndianRupee, Wallet, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface WalletProfile {
  wallet_crowns: number;
  username: string | null;
}

const CrownTopup = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [profile, setProfile] = useState<WalletProfile | null>(null);
  const [topupAmount, setTopupAmount] = useState("50");
  const [upiReference, setUpiReference] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);

  const upiId = import.meta.env.VITE_UPI_ID || "crownxarena@upi";

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }

    if (!user) return;

    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("wallet_crowns, username").eq("id", user.id).single();
      if (data) setProfile(data as WalletProfile);
    };

    loadProfile();

    const profileChannel = supabase
      .channel(`wallet-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, loadProfile)
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user, authLoading, navigate]);

  const openUpiApp = () => {
    const amount = Number(topupAmount) || 0;
    if (amount <= 0) {
      toast.error("Enter a valid amount before opening UPI app");
      return;
    }

    const params = new URLSearchParams({
      pa: upiId,
      pn: "CrownX Arena",
      tn: "Wallet topup",
      am: amount.toFixed(2),
      cu: "INR",
    });

    window.open(`upi://pay?${params.toString()}`, "_self");
  };

  const topupWallet = async () => {
    if (!user) return;
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid top up amount");
      return;
    }

    if (!upiReference.trim()) {
      toast.error("Enter your UPI transaction reference");
      return;
    }

    setTopupLoading(true);
    const { data, error } = await supabase.rpc("topup_wallet_via_upi", {
      topup_rupees: amount,
      upi_ref: upiReference.trim(),
      upi_provider: "upi",
    });
    setTopupLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const newBalance = data?.[0]?.wallet_balance;
    toast.success(`Top up successful. Wallet balance: ${newBalance} crowns`);
    setUpiReference("");

    const { data: latest } = await supabase.from("profiles").select("wallet_crowns, username").eq("id", user.id).single();
    if (latest) setProfile(latest as WalletProfile);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Crown className="w-12 h-12 text-primary animate-pulse-gold" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="glass-card border-glow p-6 sm:p-8 space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
              <Wallet className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold">Crown Balance</h1>
              <p className="text-sm text-muted-foreground">Manage your Crown wallet with secure UPI top ups.</p>
            </div>
          </div>

          <div className="bg-secondary/40 border border-border rounded-xl p-4">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Current Balance</div>
            <div className="font-display font-bold text-3xl text-primary mt-1">{Number(profile?.wallet_crowns || 0).toFixed(2)} Crowns</div>
            <div className="text-xs text-muted-foreground mt-1">1 Crown = ₹1</div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold">Top up amount</label>
            <div className="relative">
              <IndianRupee className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                type="number"
                min={1}
                placeholder="Amount"
                className="w-full bg-secondary border border-border rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <label className="text-sm font-semibold">UPI transaction reference</label>
            <input
              value={upiReference}
              onChange={(e) => setUpiReference(e.target.value.toUpperCase())}
              placeholder="Enter UPI transaction reference"
              className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={openUpiApp} className="bg-secondary border border-border px-4 py-2 rounded-lg text-sm font-display font-bold tracking-wide">
                Open UPI
              </button>
              <button onClick={topupWallet} disabled={topupLoading} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-display font-bold tracking-wide disabled:opacity-60">
                {topupLoading ? "Processing" : "Top up crowns"}
              </button>
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Use the same UPI reference only once. Duplicate references will be rejected.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrownTopup;
