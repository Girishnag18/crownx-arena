import { supabase } from "@/integrations/supabase/client";

export const trackArenaEvent = async (
  userId: string | undefined,
  eventName: string,
  payload: Record<string, unknown> = {},
) => {
  if (!userId) return;
  await supabase.from("arena_events").insert({
    user_id: userId,
    event_name: eventName,
    payload,
  });
};

