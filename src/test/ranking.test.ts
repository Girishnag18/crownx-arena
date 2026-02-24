import { describe, expect, it } from "vitest";
import { calculateElo, getRankTier } from "@/utils/ranking";

describe("ranking", () => {
  it("maps elo into tiers", () => {
    expect(getRankTier(1200)).toBe("Bronze");
    expect(getRankTier(1400)).toBe("Silver");
    expect(getRankTier(1650)).toBe("Gold");
    expect(getRankTier(1950)).toBe("Platinum");
    expect(getRankTier(2250)).toBe("Diamond");
  });

  it("updates elo for win", () => {
    expect(calculateElo(1500, 1500, 1)).toBeGreaterThan(1500);
  });
});
