import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Gift, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface CrownGiftDialogProps {
  friend: { id: string; username: string | null; avatar_url: string | null };
  onClose: () => void;
}

const GIFT_OPTIONS = [5, 10, 25, 50];

const CrownGiftDialog = ({ friend, onClose }: CrownGiftDialogProps) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState(10);
  const [sending, setSending] = useState(false);

  const sendGift = async () => {
    if (!user) return;
    setSending(true);

    // Check balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_crowns")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.wallet_crowns < amount) {
      toast.error("Insufficient Crown balance!");
      setSending(false);
      return;
    }

    // Deduct from sender
    const { error: e1 } = await supabase
      .from("profiles")
      .update({ wallet_crowns: profile.wallet_crowns - amount })
      .eq("id", user.id);

    if (e1) { toast.error("Failed to send gift"); setSending(false); return; }

    // Credit receiver
    const { data: receiverProfile } = await supabase
      .from("profiles")
      .select("wallet_crowns")
      .eq("id", friend.id)
      .maybeSingle();

    await supabase
      .from("profiles")
      .update({ wallet_crowns: (receiverProfile?.wallet_crowns || 0) + amount })
      .eq("id", friend.id);

    // Record transactions
    await supabase.from("wallet_transactions").insert([
      { player_id: user.id, amount: -amount, txn_type: "gift_sent" },
      { player_id: friend.id, amount: amount, txn_type: "gift_received" },
    ]);

    // Notify receiver
    await supabase.from("player_notifications").insert({
      user_id: friend.id,
      title: "🎁 Crown Gift Received!",
      message: `You received ${amount} Crowns as a gift!`,
      kind: "reward",
    });

    toast.success(`Sent ${amount} Crowns to ${friend.username}!`);
    setSending(false);
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-lg flex items-center gap-2">
            <Gift className="w-5 h-5 text-primary" /> Gift Crowns
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-secondary/60">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-secondary/30 border border-border/60">
          <Avatar className="w-10 h-10 border border-border/60">
            <AvatarImage src={friend.avatar_url || undefined} />
            <AvatarFallback>{(friend.username || "P")[0].toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{friend.username || "Player"}</p>
            <p className="text-xs text-muted-foreground">Will receive your gift</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-2">Select amount</p>
        <div className="grid grid-cols-4 gap-2 mb-5">
          {GIFT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setAmount(opt)}
              className={`rounded-xl py-3 text-center font-display font-bold text-sm border transition-all ${
                amount === opt
                  ? "border-primary bg-primary/15 text-primary shadow-sm"
                  : "border-border bg-secondary/20 text-muted-foreground hover:border-primary/40"
              }`}
            >
              <Crown className="w-4 h-4 mx-auto mb-1 text-primary" />
              {opt}
            </button>
          ))}
        </div>

        <button
          onClick={sendGift}
          disabled={sending}
          className="w-full rounded-xl bg-primary text-primary-foreground font-display font-bold py-3 flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
          Send {amount} Crowns
        </button>
      </motion.div>
    </motion.div>
  );
};

export default CrownGiftDialog;
