import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { UserPlus, Check, Loader2 } from "lucide-react";
import ProfileCard from "@/components/ProfileCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  sender: string;
  senderId?: string;
  text: string;
  createdAt: number;
  kind?: "chat" | "system";
}

interface Props {
  msg: ChatMessage;
  onlineUserIds?: Set<string>;
}

const WorldChatMessageItem = ({ msg, onlineUserIds }: Props) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [friendStatus, setFriendStatus] = useState<"none" | "pending" | "accepted" | "sending">("none");

  const fetchProfile = async () => {
    if (!msg.senderId) return;
    if (!profile) {
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", msg.senderId)
        .single();
      if (data) setProfile(data);
      setLoading(false);
    }

    if (user && msg.senderId !== user.id) {
      const { data: existing } = await supabase
        .from("friendships")
        .select("status")
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${msg.senderId}),and(requester_id.eq.${msg.senderId},addressee_id.eq.${user.id})`)
        .maybeSingle();
      if (existing) {
        setFriendStatus(existing.status === "accepted" ? "accepted" : "pending");
      } else {
        setFriendStatus("none");
      }
    }
  };

  const sendFriendRequest = async () => {
    if (!user || !msg.senderId) return;
    setFriendStatus("sending");
    const { error } = await supabase.from("friendships").insert({
      requester_id: user.id,
      addressee_id: msg.senderId,
    });
    if (error) {
      toast.error("Failed to send request");
      setFriendStatus("none");
    } else {
      toast.success("Friend request sent!");
      setFriendStatus("pending");
    }
  };

  if (msg.kind === "system") {
    return <p className="text-primary/90 italic">{msg.text}</p>;
  }

  const isSelf = user?.id === msg.senderId;

  return (
    <p>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) fetchProfile(); }}>
        <PopoverTrigger asChild>
          <button className="text-primary font-semibold hover:underline cursor-pointer bg-transparent border-none p-0 inline">
            {msg.sender}:
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" side="top" align="start">
          {loading || !profile ? (
            <div className="p-4 text-xs text-muted-foreground text-center">Loading profile…</div>
          ) : (
            <div>
              <ProfileCard
                username={profile.username || "Player"}
                player_uid={profile.player_uid || ""}
                avatar_url={profile.avatar_url}
                bio={profile.bio}
                country={profile.country}
                crown_score={profile.crown_score}
                wins={profile.wins}
                losses={profile.losses}
                games_played={profile.games_played}
                win_streak={profile.win_streak}
                isOnline={onlineUserIds ? onlineUserIds.has(msg.senderId || "") : undefined}
              />
              {!isSelf && (
                <div className="px-4 pb-3">
                  {friendStatus === "accepted" ? (
                    <p className="text-xs text-emerald-400 flex items-center gap-1 justify-center"><Check className="w-3 h-3" /> Already friends</p>
                  ) : friendStatus === "pending" ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center"><Check className="w-3 h-3" /> Request pending</p>
                  ) : (
                    <button
                      onClick={sendFriendRequest}
                      disabled={friendStatus === "sending"}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-display font-bold bg-primary/15 hover:bg-primary/25 text-primary py-2 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {friendStatus === "sending" ? <Loader2 className="w-3 h-3 animate-spin" /> : <UserPlus className="w-3 h-3" />}
                      Add Friend
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>
      {" "}{msg.text}
    </p>
  );
};

export default WorldChatMessageItem;
