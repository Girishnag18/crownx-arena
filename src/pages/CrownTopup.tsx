import { useEffect, useState } from "react";
import { CheckCircle2, Crown, IndianRupee, Loader2, Smartphone, Wallet, Zap } from "lucide-react";
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
  const [topupLoading, setTopupLoading] = useState(false);
  const [paymentIntentRef, setPaymentIntentRef] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);
  const [userTxnRef, setUserTxnRef] = useState("");
  const [selectedUpiApp, setSelectedUpiApp] = useState<"gpay" | "phonepe" | "paytm" | "upi">("upi");
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [payerUpiPhone, setPayerUpiPhone] = useState("");

  const adminUpiPhoneNumber = "6300427079";
  const upiId = import.meta.env.VITE_UPI_ID || `${adminUpiPhoneNumber}@upi`;

  const upiApps = [
    { key: "gpay" as const, label: "Google Pay" },
    { key: "phonepe" as const, label: "PhonePe" },
    { key: "paytm" as const, label: "Paytm" },
    { key: "upi" as const, label: "Any UPI App" },
  ];

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

    const transactionChannel = supabase
      .channel(`wallet-transactions-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "wallet_transactions", filter: `player_id=eq.${user.id}` }, () => {
        loadProfile();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(transactionChannel);
    };
  }, [user, authLoading, navigate]);

  const openUpiApp = async () => {
    const amount = Number(topupAmount) || 0;
    if (amount <= 0) {
      toast.error("Enter a valid amount before opening UPI app");
      return;
    }

    const normalizedPhone = payerUpiPhone.replace(/\D/g, "");
    if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
      toast.error("Enter your 10-digit UPI phone number to continue");
      return;
    }

    const intentReference = `CRX${Date.now().toString().slice(-8)}`;
    setPaymentIntentRef(intentReference);
    setPaymentInitiated(true);

    const params = new URLSearchParams({
      pa: upiId,
      pn: "CrownX Arena Admin",
      tn: `Wallet topup ${intentReference} from ${normalizedPhone}`,
      am: amount.toFixed(2),
      cu: "INR",
      tr: intentReference,
      mc: "5816",
    });

    const paymentUrl = selectedUpiApp === "upi"
      ? `upi://pay?${params.toString()}`
      : `intent://pay?${params.toString()}#Intent;scheme=upi;package=${
        selectedUpiApp === "gpay"
          ? "com.google.android.apps.nbu.paisa.user"
          : selectedUpiApp === "phonepe"
            ? "com.phonepe.app"
            : "net.one97.paytm"
      };end`;

    setPaymentLink(paymentUrl);

    if (navigator.share) {
      try {
        await navigator.share({
          title: "CrownX Arena UPI Payment",
          text: `Pay ₹${amount.toFixed(2)} via UPI for CrownX Arena`,
          url: paymentUrl,
        });
      } catch {
        // User cancelled share sheet; continue with URL redirect fallback.
      }
    }

    window.location.href = paymentUrl;

    setTimeout(async () => {
      if (document.visibilityState === "visible") {
        toast.error("Could not open UPI app automatically. Use the payment link button below.");
        if (navigator.clipboard?.writeText) {
          try {
            await navigator.clipboard.writeText(paymentUrl);
            toast.success("UPI payment link copied to clipboard");
          } catch {
            // Clipboard can fail in insecure contexts; no action needed.
          }
        }
      }
    }, 1200);
  };

  const topupWallet = async () => {
    if (!user) return;
    const amount = Number(topupAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error("Enter a valid top up amount");
      return;
    }

    if (!paymentIntentRef) {
      toast.error("Start payment first to generate a secure transaction reference");
      return;
    }

    const normalizedTxnRef = userTxnRef.trim().toUpperCase();
    if (!/^[A-Z0-9]{8,35}$/.test(normalizedTxnRef)) {
      toast.error("Enter a valid UPI transaction reference (8-35 letters/numbers)");
      return;
    }

    setTopupLoading(true);
    const { data, error } = await supabase.rpc("topup_wallet_via_upi", {
      topup_rupees: amount,
      upi_ref: normalizedTxnRef,
      upi_provider: `${selectedUpiApp}:${payerUpiPhone.replace(/\D/g, "")}`,
    });
    setTopupLoading(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    const newBalance = data?.[0]?.wallet_balance;
    toast.success(`Top up successful. Wallet balance: ${newBalance} crowns`);
    setPaymentIntentRef(null);
    setUserTxnRef("");
    setPaymentInitiated(false);

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
              <p className="text-sm text-muted-foreground">Manage your Crown wallet with secure real-time UPI top ups.</p>
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

            <label className="text-sm font-semibold">Choose UPI app</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {upiApps.map((app) => (
                <button
                  key={app.key}
                  type="button"
                  onClick={() => setSelectedUpiApp(app.key)}
                  className={`rounded-lg border px-3 py-2 text-xs font-display font-bold tracking-wide transition-all duration-300 ${
                    selectedUpiApp === app.key
                      ? "border-primary bg-primary/20 text-primary"
                      : "border-border bg-secondary hover:border-primary/40"
                  }`}
                >
                  {app.label}
                </button>
              ))}
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">Your UPI phone number</label>
              <input
                value={payerUpiPhone}
                onChange={(e) => setPayerUpiPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="Enter 10-digit phone number"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
              Payment recipient admin number: <span className="font-semibold text-foreground">{adminUpiPhoneNumber}</span>
            </div>

            {paymentIntentRef && (
              <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                Payment intent created: <span className="font-mono">{paymentIntentRef}</span>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground uppercase tracking-wide">UPI Transaction Reference (UTR)</label>
              <input
                value={userTxnRef}
                onChange={(e) => setUserTxnRef(e.target.value.toUpperCase())}
                placeholder="Enter UTR after successful payment"
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button onClick={openUpiApp} className="bg-secondary border border-border px-4 py-2 rounded-lg text-sm font-display font-bold tracking-wide transition-all duration-300 hover:border-primary/40 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Open UPI App
              </button>
              <button onClick={topupWallet} disabled={topupLoading || !paymentInitiated || !userTxnRef.trim()} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-display font-bold tracking-wide disabled:opacity-60 transition-all duration-300 flex items-center gap-2">
                {topupLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {topupLoading ? "Processing" : "I have paid • credit now"}
              </button>
              {paymentLink && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(paymentLink);
                      toast.success("Payment link copied");
                    } catch {
                      toast.error("Could not copy link. Please try opening UPI app again.");
                    }
                  }}
                  className="bg-secondary border border-border px-4 py-2 rounded-lg text-sm font-display font-bold tracking-wide transition-all duration-300 hover:border-primary/40"
                >
                  Copy payment link
                </button>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Real-time credit policy: ₹1 = 1 Crown. UPI request is sent to admin number {adminUpiPhoneNumber}, then submit your UTR to credit wallet instantly.
          </div>
        </div>
      </div>
    </div>
  );
};

export default CrownTopup;
