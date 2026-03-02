import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import ProfileCard from "@/components/ProfileCard";
import { supabase } from "@/integrations/supabase/client";

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
}

const WorldChatMessageItem = ({ msg }: Props) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const fetchProfile = async () => {
    if (!msg.senderId || profile) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", msg.senderId)
      .single();
    if (data) setProfile(data);
    setLoading(false);
  };

  if (msg.kind === "system") {
    return <p className="text-primary/90 italic">{msg.text}</p>;
  }

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
            />
          )}
        </PopoverContent>
      </Popover>
      {" "}{msg.text}
    </p>
  );
};

export default WorldChatMessageItem;
