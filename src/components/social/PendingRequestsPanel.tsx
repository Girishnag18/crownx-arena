import { useState, useEffect } from "react";
import { Check, X, Loader2, UserCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface PendingRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  created_at: string;
  direction: "incoming" | "outgoing";
  profile: {
    username: string | null;
    avatar_url: string | null;
    rank_tier: string;
  };
}

interface PendingRequestsPanelProps {
  onUpdate: () => void;
}

const PendingRequestsPanel = ({ onUpdate }: PendingRequestsPanelProps) => {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [user?.id]);

  const loadRequests = async () => {
    if (!user) return;
    setLoading(true);

    const { data } = await supabase
      .from("friendships")
      .select("id, requester_id, addressee_id, created_at")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "pending");

    if (!data || data.length === 0) {
      setRequests([]);
      setLoading(false);
      return;
    }

    const otherIds = data.map((r: any) =>
      r.requester_id === user.id ? r.addressee_id : r.requester_id
    );

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, avatar_url, rank_tier")
      .in("id", otherIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const mapped: PendingRequest[] = data.map((r: any) => {
      const isIncoming = r.addressee_id === user.id;
      const otherId = isIncoming ? r.requester_id : r.addressee_id;
      return {
        ...r,
        direction: isIncoming ? "incoming" : "outgoing",
        profile: profileMap.get(otherId) || { username: null, avatar_url: null, rank_tier: "Bronze" },
      };
    });

    setRequests(mapped);
    setLoading(false);
  };

  const acceptRequest = async (req: PendingRequest) => {
    setActingOn(req.id);
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", req.id);
    toast.success(`You're now friends with ${req.profile.username || "Player"}!`);
    await supabase.from("player_notifications").insert({
      user_id: req.requester_id,
      title: "✅ Friend Request Accepted",
      message: `${req.profile.username || "A player"} accepted your friend request!`,
      kind: "social",
    });
    setActingOn(null);
    loadRequests();
    onUpdate();
  };

  const declineRequest = async (req: PendingRequest) => {
    setActingOn(req.id);
    await supabase.from("friendships").delete().eq("id", req.id);
    toast("Request declined");
    setActingOn(null);
    loadRequests();
  };

  const cancelRequest = async (req: PendingRequest) => {
    setActingOn(req.id);
    await supabase.from("friendships").delete().eq("id", req.id);
    toast("Request cancelled");
    setActingOn(null);
    loadRequests();
  };

  if (loading) {
    return <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>;
  }

  if (requests.length === 0) return null;

  const incoming = requests.filter(r => r.direction === "incoming");
  const outgoing = requests.filter(r => r.direction === "outgoing");

  return (
    <div className="space-y-3">
      {incoming.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
            <UserCheck className="w-3 h-3" /> Incoming — {incoming.length}
          </p>
          {incoming.map((req) => (
            <div key={req.id} className="rounded-xl border border-primary/20 bg-primary/5 p-2.5 flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-border/60 shrink-0">
                <AvatarImage src={req.profile.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{(req.profile.username || "P")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">{req.profile.username || "Player"}</p>
                <p className="text-[10px] text-muted-foreground">{req.profile.rank_tier}</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => acceptRequest(req)}
                  disabled={actingOn === req.id}
                  className="p-1.5 rounded-md bg-primary/15 text-primary hover:bg-primary/25 transition-colors disabled:opacity-40"
                  title="Accept"
                >
                  {actingOn === req.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => declineRequest(req)}
                  disabled={actingOn === req.id}
                  className="p-1.5 rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors disabled:opacity-40"
                  title="Decline"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold flex items-center gap-1">
            <Clock className="w-3 h-3" /> Sent — {outgoing.length}
          </p>
          {outgoing.map((req) => (
            <div key={req.id} className="rounded-xl border border-border bg-card/60 p-2.5 flex items-center gap-3">
              <Avatar className="w-8 h-8 border border-border/60 shrink-0">
                <AvatarImage src={req.profile.avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{(req.profile.username || "P")[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-xs truncate">{req.profile.username || "Player"}</p>
                <p className="text-[10px] text-muted-foreground">Pending…</p>
              </div>
              <button
                onClick={() => cancelRequest(req)}
                disabled={actingOn === req.id}
                className="text-[10px] text-muted-foreground hover:text-destructive px-2 py-1 rounded transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingRequestsPanel;
