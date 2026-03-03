import { supabase } from "@/integrations/supabase/client";

export const trackArenaEvent = async (
  userId: string | undefined,
  eventName: string,
  payload: Record<string, unknown> = {},
) => {
  if (!userId) return;
  const analyticsClient = supabase as unknown as {
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => Promise<{ error: unknown }>;
    };
  };
  await analyticsClient.from("arena_events").insert({
    user_id: userId,
    event_name: eventName,
    payload,
  });
};
