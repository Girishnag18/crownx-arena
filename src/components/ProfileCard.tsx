import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Crown, Trophy, TrendingDown, MapPin, Shield, Flame, Target, User } from "lucide-react";

export interface EquippedItem {
  name: string;
  icon: string;
  category: string;
  rarity: string;
}

interface ProfileCardProps {
  username: string;
  player_uid: string;
  avatar_url: string | null;
  bio: string | null;
  country: string | null;
  crown_score: number;
  wins: number;
  losses: number;
  games_played: number;
  win_streak: number;
  compact?: boolean;
  isOnline?: boolean;
  equippedItems?: EquippedItem[];
}

const getSkillLevel = (elo: number): { label: string; color: string; bg: string } => {
  if (elo >= 1600) return { label: "Grand Master", color: "text-primary", bg: "bg-primary/10 border-primary/25" };
  if (elo >= 1200) return { label: "Expert", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/25" };
  if (elo >= 800) return { label: "Intermediate", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/25" };
  if (elo >= 500) return { label: "Apprentice", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/25" };
  return { label: "Beginner", color: "text-muted-foreground", bg: "bg-secondary/60 border-border/40" };
};

const rarityGlow: Record<string, string> = {
  legendary: "border-primary/50 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]",
  epic: "border-violet-500/50 shadow-[0_0_15px_-5px_rgba(139,92,246,0.3)]",
  rare: "border-blue-500/40",
  common: "border-border/50",
};

const ProfileCard = ({
  username,
  player_uid,
  avatar_url,
  bio,
  country,
  crown_score,
  wins,
  losses,
  games_played,
  win_streak,
  compact = false,
  isOnline,
  equippedItems = [],
}: ProfileCardProps) => {
  const skill = getSkillLevel(crown_score);
  const winRate = games_played > 0 ? Math.round((wins / games_played) * 100) : 0;

  const equippedTitle = equippedItems.find((i) => i.category === "title");
  const equippedFrame = equippedItems.find((i) => i.category === "frame");
  const equippedBadges = equippedItems.filter((i) => i.category === "badge");

  const frameClass = equippedFrame ? (rarityGlow[equippedFrame.rarity] || "") : "";

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-3 hover:bg-card/80 transition-colors">
        <div className="relative">
          <Avatar className={`w-10 h-10 border-2 ${frameClass || "border-primary/20"}`}>
            <AvatarImage src={avatar_url || undefined} alt={username} />
            <AvatarFallback className="bg-secondary text-primary font-display font-bold text-xs">
              {(username || "P").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {isOnline !== undefined && (
            <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-display font-bold text-sm truncate">{username || "Player"}</p>
            {equippedTitle && <span className="text-[9px] text-primary font-bold">{equippedTitle.icon}</span>}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">UID: {player_uid}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-display font-bold text-primary">{crown_score}</p>
          <p className={`text-[9px] font-display font-bold ${skill.color}`}>{skill.label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
      {/* Header gradient band */}
      <div className="h-24 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.08),transparent_60%)]" />
        {/* Skill badge */}
        <div className="absolute top-4 right-4">
          <span className={`inline-flex items-center gap-1 text-[10px] font-display font-bold px-2.5 py-1 rounded-full border ${skill.bg} ${skill.color}`}>
            <Shield className="w-3 h-3" />
            {skill.label}
          </span>
        </div>
        {/* Avatar */}
        <div className="absolute -bottom-10 left-6">
          <div className="relative">
            <Avatar className={`w-20 h-20 border-[3px] border-card shadow-[0_0_25px_-8px_hsl(var(--primary)/0.3)] ${frameClass}`}>
              <AvatarImage src={avatar_url || undefined} alt={username} />
              <AvatarFallback className="bg-secondary text-primary text-xl font-display font-bold">
                <User className="w-8 h-8" />
              </AvatarFallback>
            </Avatar>
            {isOnline !== undefined && (
              <span className={`absolute bottom-1 right-1 w-4 h-4 rounded-full border-[3px] border-card ${isOnline ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
            )}
          </div>
        </div>
      </div>

      <div className="pt-12 px-6 pb-6">
        {/* Name + UID */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-xl font-black tracking-tight">{username || "Player"}</h3>
              {equippedTitle && (
                <span className="text-[10px] text-primary font-display font-bold bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                  {equippedTitle.icon} {equippedTitle.name}
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground font-mono mt-0.5">UID: {player_uid}</p>
          </div>
        </div>

        {/* Equipped Badges */}
        {equippedBadges.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {equippedBadges.map((badge, i) => (
              <span key={i} className="text-[10px] bg-secondary/50 border border-border/40 px-2 py-0.5 rounded-full font-medium" title={badge.name}>
                {badge.icon} {badge.name}
              </span>
            ))}
          </div>
        )}

        {bio && <p className="text-xs text-muted-foreground mt-3 line-clamp-2 leading-relaxed">{bio}</p>}

        {country && (
          <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {country}
          </p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-2.5 mt-5">
          {[
            { icon: Crown, label: "ELO", value: crown_score, color: "text-primary" },
            { icon: Trophy, label: "Wins", value: wins, color: "text-emerald-400" },
            { icon: TrendingDown, label: "Losses", value: losses, color: "text-destructive" },
            { icon: Target, label: "Win Rate", value: `${winRate}%`, color: "text-foreground" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/30 bg-secondary/20 backdrop-blur-sm p-3 text-center">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color} mx-auto mb-1.5`} />
              <p className={`text-base font-display font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {win_streak > 0 && (
          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-primary font-display font-bold">
            <Flame className="w-3.5 h-3.5" />
            {win_streak} win streak
          </div>
        )}
      </div>
    </div>
  );
};

export { getSkillLevel };
export default ProfileCard;
