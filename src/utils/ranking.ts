import { RankTier } from "@/types/domain";

export const getRankTier = (elo: number): RankTier => {
  if (elo >= 2200) return "Diamond";
  if (elo >= 1900) return "Platinum";
  if (elo >= 1600) return "Gold";
  if (elo >= 1300) return "Silver";
  return "Bronze";
};

export const calculateElo = (
  playerRating: number,
  opponentRating: number,
  score: 0 | 0.5 | 1,
  kFactor = 24,
) => {
  const expected = 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
  return Math.round(playerRating + kFactor * (score - expected));
};
