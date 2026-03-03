import { describe, expect, it } from "vitest";
import { computeQueueScope, isAllowedDuration, normalizeChallengeStatus } from "@/services/matchmakingUtils";

describe("matchmakingUtils", () => {
  it("computes queue scope correctly", () => {
    expect(computeQueueScope(0)).toBe("local");
    expect(computeQueueScope(20)).toBe("local");
    expect(computeQueueScope(39)).toBe("local");
    expect(computeQueueScope(40)).toBe("global");
    expect(computeQueueScope(120)).toBe("global");
  });

  it("validates allowed durations", () => {
    expect(isAllowedDuration(null)).toBe(true);
    expect(isAllowedDuration(600)).toBe(true);
    expect(isAllowedDuration(1800)).toBe(true);
    expect(isAllowedDuration(300)).toBe(false);
    expect(isAllowedDuration(999)).toBe(false);
  });

  it("normalizes challenge status values", () => {
    expect(normalizeChallengeStatus("pending")).toBe("pending");
    expect(normalizeChallengeStatus("accepted")).toBe("accepted");
    expect(normalizeChallengeStatus("expired")).toBe("expired");
    expect(normalizeChallengeStatus("foo")).toBe("idle");
    expect(normalizeChallengeStatus(undefined)).toBe("idle");
  });
});

