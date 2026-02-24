import { z } from "zod";

const requestWindow = new Map<string, number[]>();

const enforceRateLimit = (key: string, limit = 60, windowMs = 60_000) => {
  const now = Date.now();
  const events = (requestWindow.get(key) || []).filter((t) => now - t < windowMs);
  if (events.length >= limit) throw new Error("Rate limit exceeded");
  events.push(now);
  requestWindow.set(key, events);
};

export const apiClient = {
  async post<TInput extends z.ZodTypeAny, TOutput>(
    endpoint: string,
    schema: TInput,
    payload: z.infer<TInput>,
    token?: string,
  ): Promise<TOutput> {
    enforceRateLimit(endpoint);
    schema.parse(payload);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json() as Promise<TOutput>;
  },
};
