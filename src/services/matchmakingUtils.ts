export type QueueScope = "local" | "global";

export const ALLOWED_DURATIONS = [600, 900, 1200, 1800] as const;

export const isAllowedDuration = (value: number | null): boolean => {
  if (value === null) return true;
  return ALLOWED_DURATIONS.includes(value as (typeof ALLOWED_DURATIONS)[number]);
};

export const computeQueueScope = (elapsedSeconds: number): QueueScope => {
  return elapsedSeconds >= 40 ? "global" : "local";
};

export const normalizeChallengeStatus = (value: string | null | undefined): "idle" | "pending" | "accepted" | "expired" => {
  if (value === "pending" || value === "accepted" || value === "expired") return value;
  return "idle";
};

