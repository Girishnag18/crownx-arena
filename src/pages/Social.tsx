import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Circle, Swords, MessageCircle, Activity, Trophy, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import DirectMessagePanel from "@/components/social/DirectMessagePanel";
import { format } from "date-fns";

interface FriendProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  crown_score: number;
  rank_tier: string;
  games_played: number;
}

interface ActivityItem {
  id: string;
  type: "game_end" | "achievement" | "friend_joined";
  player_id: string;
  player_name: string;
  player_avatar: string | null;
  detail: string;
  timestamp: string;
}

const Social = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dmFriend, setDmFriend] = useState<{ id: string; username: string | null; avatar_url: string | null } | null>(null);
  const presenceRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
    setupPresence();
    return () => {
      if (presenceRef.current) supabase.removeChannel(presenceRef.current);
    };
  }, [user?.id]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Load friendships
    const { data: friendships } = await supabase
      .from("friendships")
      .select("requester_id, addressee_id, status")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .eq("status", "accepted");

    const friendIds = (friendships || []).map((f: any) =>
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, crown_score, rank_tier, games_played")
        .in("id", friendIds);
      setFriends((profiles || []) as unknown as FriendProfile[]);

      // Build activity feed from recent friend games
      const { data: recentGames } = await supabase
        .from("games")
        .select("id, created_at, result_type, winner_id, player_white, player_black")
        .or(friendIds.map(id => `player1_id.eq.${id},player2_id.eq.${id}`).join(","))
        .neq("result_type", "pending")
        .neq("result_type", "in_progress")
        .order("created_at", { ascending: false })
        .limit(20);

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
      const activityItems: ActivityItem[] = (recentGames || []).map((g: any) => {
        const friendId = friendIds.find(id => id === g.player_white || id === g.player_black);
        const friendProfile = friendId ? profileMap.get(friendId) : null;
        const won = g.winner_id === friendId;
        const drew = g.result_type === "draw" || g.result_type === "stalemate";
        return {
          id: g.id,
          type: "game_end" as const,
          player_id: friendId || "",
          player_name: (friendProfile as any)?.username || "Player",
          player_avatar: (friendProfile as any)?.avatar_url || null,
          detail: drew ? "drew a game" : won ? `won by ${g.result_type}` : `lost by ${g.result_type}`,
          timestamp: g.created_at,
        };
      });
      setActivity(activityItems);
    }
    setLoading(false);
  };

  const setupPresence = () => {
    if (!user) return;
    const channel = supabase.channel("social-presence", {
      config: { presence: { key: user.id } },
    })
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      setOnlineIds(new Set(Object.keys(state)));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: user.id });
      }
    });
    presenceRef.current = channel;
  };

  const challengeFriend = (friendId: string) => {
    navigate(`/lobby?challenge=${friendId}`);
    toast.success("Redirecting to lobby to challenge...");
  };

  const onlineFriends = friends.filter(f => onlineIds.has(f.id));
  const offlineFriends = friends.filter(f => !onlineIds.has(f.id));

  if (loading) {
    return (
      <main className="container max-w-4xl py-24 px-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container max-w-4xl py-24 px-4 space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display flex items-center gap-2">
          <Users className="w-7 h-7 text-primary" /> Social Hub
        </h1>
        <p className="text-sm text-muted-foreground">See who's online, chat, and challenge friends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Friends Panel */}
        <div className="lg:col-span-2 space-y-4">
          {/* Online Friends */}
          <div className="space-y-2">
            <h2 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Circle className="w-2.5 h-2.5 fill-emerald-500 text-emerald-500" />
              Online — {onlineFriends.length}
            </h2>
            {onlineFriends.length === 0 && (
              <p className="text-xs text-muted-foreground italic pl-4">No friends online right now</p>
            )}
            {onlineFriends.map(f => (
              <FriendRow key={f.id} friend={f} online
                onChallenge={() => challengeFriend(f.id)}
                onMessage={() => setDmFriend({ id: f.id, username: f.username, avatar_url: f.avatar_url })} />
            ))}
          </div>

          {/* Offline Friends */}
          <div className="space-y-2">
            <h2 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Circle className="w-2.5 h-2.5 fill-muted-foreground/40 text-muted-foreground/40" />
              Offline — {offlineFriends.length}
            </h2>
            {offlineFriends.map(f => (
              <FriendRow key={f.id} friend={f} online={false}
                onMessage={() => setDmFriend({ id: f.id, username: f.username, avatar_url: f.avatar_url })} />
            ))}
          </div>

          {friends.length === 0 && (
            <div className="glass-card p-6 text-center">
              <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-display font-bold text-sm">No friends yet</p>
              <p className="text-xs text-muted-foreground">Add friends from your Player Profile using their 8-digit UID.</p>
              <button onClick={() => navigate("/profile")}
                className="mt-3 text-xs px-4 py-2 rounded-lg bg-primary text-primary-foreground font-bold">
                Go to Profile
              </button>
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="lg:col-span-3 space-y-3">
          <h2 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" /> Friend Activity
          </h2>

          {activity.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="font-display font-bold text-sm">No recent activity</p>
              <p className="text-xs text-muted-foreground">Your friends' games and achievements will show up here.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {activity.map((item, idx) => (
                <motion.div key={item.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-xl border border-border bg-card/60 p-3 flex items-center gap-3">
                  <Avatar className="w-9 h-9 border border-border/60 shrink-0">
                    <AvatarImage src={item.player_avatar || undefined} />
                    <AvatarFallback className="text-xs">{(item.player_name)[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-semibold">{item.player_name}</span>{" "}
                      <span className="text-muted-foreground">{item.detail}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {format(new Date(item.timestamp), "MMM d, HH:mm")}
                    </p>
                  </div>
                  {item.type === "game_end" && (
                    <Trophy className={`w-4 h-4 shrink-0 ${item.detail.includes("won") ? "text-primary" : "text-muted-foreground"}`} />
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* DM Panel */}
      <AnimatePresence>
        {dmFriend && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-4 right-4 z-50 w-80">
            <DirectMessagePanel friend={dmFriend} onClose={() => setDmFriend(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

const FriendRow = ({ friend, online, onChallenge, onMessage }: {
  friend: FriendProfile; online: boolean;
  onChallenge?: () => void; onMessage: () => void;
}) => (
  <div className="rounded-xl border border-border bg-card/60 p-3 flex items-center gap-3">
    <div className="relative shrink-0">
      <Avatar className="w-9 h-9 border border-border/60">
        <AvatarImage src={friend.avatar_url || undefined} />
        <AvatarFallback className="text-xs">{(friend.username || "P")[0].toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${online ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-sm truncate">{friend.username || "Player"}</p>
      <p className="text-[10px] text-muted-foreground">{friend.rank_tier} · {friend.crown_score}</p>
    </div>
    <div className="flex gap-1 shrink-0">
      <button onClick={onMessage} title="Message"
        className="p-1.5 rounded-md hover:bg-secondary/60 text-muted-foreground hover:text-foreground transition-colors">
        <MessageCircle className="w-3.5 h-3.5" />
      </button>
      {online && onChallenge && (
        <button onClick={onChallenge} title="Challenge"
          className="p-1.5 rounded-md hover:bg-primary/15 text-primary transition-colors">
          <Swords className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  </div>
);

export default Social;
