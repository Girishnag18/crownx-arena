import { useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type PlayerNotification = {
  id: string;
  title: string;
  message: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);

  useEffect(() => {
    if (!user) return;

    const loadNotifications = async () => {
      const { data } = await (supabase as any)
        .from("player_notifications")
        .select("id,title,message,kind,is_read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(60);

      setNotifications((data || []) as PlayerNotification[]);
    };

    loadNotifications();

    const channel = supabase
      .channel(`notifications-page-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_notifications", filter: `user_id=eq.${user.id}` }, loadNotifications)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  const markNotificationRead = async (notificationId: string) => {
    await (supabase as any).from("player_notifications").update({ is_read: true }).eq("id", notificationId);
    setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)));
  };

  return (
    <main className="container max-w-4xl py-24 px-4 space-y-6">
      <header className="glass-card p-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Bell className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">Stay updated with messages from CrownX Arena.</p>
          </div>
        </div>
        <span className="text-sm text-muted-foreground">Unread: {unreadCount}</span>
      </header>

      <section className="glass-card p-6 space-y-3">
        {notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : notifications.map((item) => (
          <button
            key={item.id}
            onClick={() => markNotificationRead(item.id)}
            className={`w-full text-left rounded-lg border p-4 transition-colors hover:bg-secondary/40 ${item.is_read ? "opacity-70" : "border-primary/40"}`}
          >
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm mt-0.5">{item.message}</p>
            <p className="text-xs text-muted-foreground mt-2">{new Date(item.created_at).toLocaleString()}</p>
          </button>
        ))}
      </section>
    </main>
  );
};

export default Notifications;
