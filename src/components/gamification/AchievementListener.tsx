import { useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Listens for new rows in player_achievements and shows a celebratory toast.
 * Mount once at app level (e.g. inside App or AuthProvider).
 */
const AchievementListener = () => {
  const { user } = useAuth();
  const knownIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    if (!user) return;

    // Load existing achievements so we don't toast on first load
    const bootstrap = async () => {
      const { data } = await (supabase as any)
        .from("player_achievements")
        .select("id")
        .eq("user_id", user.id);
      (data || []).forEach((r: any) => knownIds.current.add(r.id));
      initialized.current = true;
    };
    bootstrap();

    const channel = supabase
      .channel(`achievement-popup-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_achievements",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          if (!initialized.current) return;
          const row = payload.new as any;
          if (knownIds.current.has(row.id)) return;
          knownIds.current.add(row.id);

          // Fetch achievement details
          const { data: ach } = await (supabase as any)
            .from("achievements")
            .select("title, icon, xp_reward")
            .eq("id", row.achievement_id)
            .maybeSingle();

          const title = ach?.title || "Achievement Unlocked";
          const icon = ach?.icon || "🏆";
          const xp = ach?.xp_reward || 0;

          toast.success(`${icon} ${title}`, {
            description: xp > 0 ? `+${xp} XP earned!` : "Great job!",
            duration: 5000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  return null;
};

export default AchievementListener;
