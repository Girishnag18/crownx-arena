import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, TrendingDown, MapPin, Shield } from "lucide-react";

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
}

const getSkillLevel = (elo: number): { label: string; color: string } => {
  if (elo >= 1600) return { label: "Grand Master", color: "text-yellow-400" };
  if (elo >= 1200) return { label: "Expert", color: "text-purple-400" };
  if (elo >= 800) return { label: "Intermediate", color: "text-blue-400" };
  if (elo >= 500) return { label: "Apprentice", color: "text-emerald-400" };
  return { label: "Beginner", color: "text-muted-foreground" };
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
}: ProfileCardProps) => {
  const skill = getSkillLevel(crown_score);
  const winRate = games_played > 0 ? Math.round((wins / games_played) * 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/80 p-3">
        <Avatar className="w-10 h-10 border border-primary/30">
          <AvatarImage src={avatar_url || undefined} alt={username} />
          <AvatarFallback className="bg-secondary text-primary font-bold">
            {(username || "P").slice(0, 1).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-sm truncate">{username || "Player"}</p>
          <p className="text-[10px] text-muted-foreground font-mono">UID: {player_uid}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-bold text-primary">{crown_score}</p>
          <p className={`text-[10px] font-semibold ${skill.color}`}>{skill.label}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/90 backdrop-blur-sm overflow-hidden">
      {/* Header gradient */}
      <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent relative">
        <div className="absolute -bottom-8 left-6">
          <Avatar className="w-16 h-16 border-4 border-card shadow-lg">
            <AvatarImage src={avatar_url || undefined} alt={username} />
            <AvatarFallback className="bg-secondary text-primary text-xl font-bold">
              {(username || "P").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="pt-10 px-6 pb-5">
        {/* Name + UID + Skill */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h3 className="font-display text-lg font-bold">{username || "Player"}</h3>
            <p className="text-xs text-muted-foreground font-mono">UID: {player_uid}</p>
          </div>
          <Badge variant="outline" className={`${skill.color} border-current text-[10px]`}>
            <Shield className="w-3 h-3 mr-1" />
            {skill.label}
          </Badge>
        </div>

        {bio && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{bio}</p>}

        {country && (
          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3 h-3" /> {country}
          </p>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-border/50">
          <div className="text-center">
            <Crown className="w-4 h-4 text-primary mx-auto mb-1" />
            <p className="text-lg font-bold text-primary">{crown_score}</p>
            <p className="text-[10px] text-muted-foreground">ELO</p>
          </div>
          <div className="text-center">
            <Trophy className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-bold">{wins}</p>
            <p className="text-[10px] text-muted-foreground">Wins</p>
          </div>
          <div className="text-center">
            <TrendingDown className="w-4 h-4 text-destructive mx-auto mb-1" />
            <p className="text-lg font-bold">{losses}</p>
            <p className="text-[10px] text-muted-foreground">Losses</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold mt-5">{winRate}%</p>
            <p className="text-[10px] text-muted-foreground">Win Rate</p>
          </div>
        </div>

        {win_streak > 0 && (
          <p className="text-xs text-primary font-semibold mt-3 text-center">
            🔥 {win_streak} win streak
          </p>
        )}
      </div>
    </div>
  );
};

export { getSkillLevel };
export default ProfileCard;
