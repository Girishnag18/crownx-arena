import { useState } from "react";
import { Search, UserPlus, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface SearchResult {
  id: string;
  username: string | null;
  avatar_url: string | null;
  player_uid: string | null;
  rank_tier: string;
  crown_score: number;
}

interface FriendSearchPanelProps {
  existingFriendIds: string[];
  onRequestSent: () => void;
}

const FriendSearchPanel = ({ existingFriendIds, onRequestSent }: FriendSearchPanelProps) => {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  const search = async () => {
    if (!user || query.trim().length < 2) return;
    setSearching(true);

    const q = query.trim();
    const isUid = /^\d{8}$/.test(q);

    let data: any[] | null = null;

    if (isUid) {
      const res = await supabase
        .from("profiles")
        .select("id, username, avatar_url, player_uid, rank_tier, crown_score")
        .eq("player_uid", q)
        .neq("id", user.id)
        .limit(10);
      data = res.data;
    } else {
      const res = await supabase
        .from("profiles")
        .select("id, username, avatar_url, player_uid, rank_tier, crown_score")
        .ilike("username", `%${q}%`)
        .neq("id", user.id)
        .limit(10);
      data = res.data;
    }

    setResults((data || []) as SearchResult[]);
    setSearching(false);
  };

  const sendRequest = async (targetId: string) => {
    if (!user) return;
    setSendingTo(targetId);

    // Check if friendship already exists
    const { data: existing } = await supabase
      .from("friendships")
      .select("id, status")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetId}),and(requester_id.eq.${targetId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      toast.info(existing.status === "accepted" ? "Already friends!" : "Request already pending.");
      setSendingTo(null);
      return;
    }

    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: targetId,
      status: "pending",
    });

    if (error) {
      toast.error("Failed to send request");
    } else {
      toast.success("Friend request sent!");
      // Notify the target
      await supabase.from("player_notifications").insert({
        user_id: targetId,
        title: "👋 New Friend Request",
        message: "Someone wants to be your friend! Check your Social Hub.",
        kind: "social",
      });
      onRequestSent();
    }
    setSendingTo(null);
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search username or 8-digit UID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            className="pl-9 text-xs h-9"
          />
          {query && (
            <button onClick={() => { setQuery(""); setResults([]); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-secondary/60">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          )}
        </div>
        <button
          onClick={search}
          disabled={searching || query.trim().length < 2}
          className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40 flex items-center gap-1.5"
        >
          {searching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Search className="w-3 h-3" />}
          Find
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {results.map((r) => {
            const isFriend = existingFriendIds.includes(r.id);
            return (
              <div key={r.id} className="rounded-xl border border-border bg-card/60 p-2.5 flex items-center gap-3">
                <Avatar className="w-8 h-8 border border-border/60 shrink-0">
                  <AvatarImage src={r.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{(r.username || "P")[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs truncate">{r.username || "Player"}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.rank_tier} · {r.crown_score} · UID: {r.player_uid || "—"}
                  </p>
                </div>
                {isFriend ? (
                  <span className="text-[10px] text-muted-foreground font-bold px-2">Friends ✓</span>
                ) : (
                  <button
                    onClick={() => sendRequest(r.id)}
                    disabled={sendingTo === r.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/15 text-primary text-[10px] font-bold hover:bg-primary/25 disabled:opacity-40 transition-colors"
                  >
                    {sendingTo === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                    Add
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {results.length === 0 && query.length >= 2 && !searching && (
        <p className="text-xs text-muted-foreground text-center py-2">No players found. Try a different search.</p>
      )}
    </div>
  );
};

export default FriendSearchPanel;
