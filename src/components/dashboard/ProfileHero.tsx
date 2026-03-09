import { Crown, Sparkles, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import XPProgressBar from "@/components/gamification/XPProgressBar";

interface ProfileHeroProps {
  username: string;
  avatarUrl: string | null;
  rank: string;
  crownScore: number;
  level: number;
  xp: number;
  walletCrowns: number;
}

const rankEmoji: Record<string, string> = {
  Bronze: "🥉", Silver: "🥈", Gold: "🥇", Platinum: "💎", Diamond: "💠", "Crown Master": "👑",
};

const ProfileHero = ({ username, avatarUrl, rank, crownScore, level, xp, walletCrowns }: ProfileHeroProps) => (
  <div className="flex items-center gap-4 p-4 rounded-xl bg-card/80 border border-border/30">
    <div className="relative shrink-0">
      <Avatar className="w-16 h-16 border-2 border-primary/30">
        <AvatarImage src={avatarUrl || undefined} alt={username} />
        <AvatarFallback className="bg-secondary text-primary font-display font-bold text-lg">
          <User className="w-6 h-6" />
        </AvatarFallback>
      </Avatar>
      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border-2 border-background bg-emerald-500" />
    </div>

    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="font-display text-lg font-black tracking-tight truncate">{username}</h1>
        <span className="inline-flex items-center gap-1 text-[9px] bg-primary/12 border border-primary/20 text-primary font-display font-bold px-1.5 py-0.5 rounded-full">
          <Sparkles className="w-2.5 h-2.5" /> Lvl {level}
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1 text-sm">
        <span className="font-display font-bold">{rankEmoji[rank]} {rank}</span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground flex items-center gap-1">
          <Crown className="w-3 h-3 text-primary" />{crownScore}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground flex items-center gap-1">
          <Crown className="w-3 h-3 text-accent" />{walletCrowns} crowns
        </span>
      </div>
      <div className="mt-2">
        <XPProgressBar xp={xp} level={level} />
      </div>
    </div>
  </div>
);

export default ProfileHero;
