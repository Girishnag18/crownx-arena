export type UserRole = "player" | "admin" | "moderator";

export type RankTier = "Bronze" | "Silver" | "Gold" | "Platinum" | "Diamond";

export interface UserProfile {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  elo: number;
  wins: number;
  losses: number;
  rankTier: RankTier;
  online: boolean;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  elo: number;
  wins: number;
  losses: number;
  rankTier: RankTier;
  streak: number;
}

export interface MatchHistoryItem {
  id: string;
  opponent: string;
  result: "win" | "loss" | "draw";
  eloDelta: number;
  playedAt: string;
}
