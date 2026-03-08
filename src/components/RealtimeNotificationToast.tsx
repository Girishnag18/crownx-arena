import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

const kindConfig: Record<string, { icon: string; route?: string }> = {
  friend_request: { icon: "👋", route: "/profile" },
  friend_accept: { icon: "🤝", route: "/profile" },
  game_invite: { icon: "⚔️", route: "/lobby" },
  tournament: { icon: "🏆", route: "/leaderboard" },
  achievement: { icon: "🎖️", route: "/profile" },
  challenge: { icon: "🎯", route: "/challenges" },
  info: { icon: "ℹ️" },
};

const RealtimeNotificationToast = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mountedAt = useRef(Date.now());
  const { isEnabled } = useNotificationPrefs();

  useEffect(() => {
    if (!user) return;
    mountedAt.current = Date.now();

    const channel = supabase
      .channel(`toast-notif-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "player_notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const created = new Date((payload.new as any).created_at).getTime();
          if (created < mountedAt.current - 2000) return;

          const n = payload.new as { title: string; message: string; kind: string };

          // Respect user preferences
          if (!isEnabled(n.kind)) return;

          const cfg = kindConfig[n.kind] || kindConfig.info;

          toast(`${cfg.icon} ${n.title}`, {
            description: n.message,
            duration: 5000,
            action: cfg.route
              ? { label: "View", onClick: () => navigate(cfg.route!) }
              : undefined,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, navigate, isEnabled]);

  return null;
};

export default RealtimeNotificationToast;
