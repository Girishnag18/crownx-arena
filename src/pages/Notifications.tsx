import { useEffect, useMemo, useState, useCallback } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PullToRefresh from "@/components/common/PullToRefresh";

type PlayerNotification = {
  id: string;
  title: string;
  message: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

type GroupedNotifications = { label: string; items: PlayerNotification[] }[];

const groupByDate = (items: PlayerNotification[]): GroupedNotifications => {
  const now = new Date();
  const todayStr = now.toDateString();
  const yesterdayStr = new Date(now.getTime() - 86400000).toDateString();

  const groups: Record<string, PlayerNotification[]> = {};
  const order: string[] = [];

  for (const item of items) {
    const dateStr = new Date(item.created_at).toDateString();
    let label: string;
    if (dateStr === todayStr) label = "Today";
    else if (dateStr === yesterdayStr) label = "Yesterday";
    else label = "Earlier";

    if (!groups[label]) {
      groups[label] = [];
      order.push(label);
    }
    groups[label].push(item);
  }

  return order.map((label) => ({ label, items: groups[label] }));
};

const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("player_notifications")
      .select("id,title,message,kind,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    setNotifications((data || []) as PlayerNotification[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
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
  const grouped = useMemo(() => groupByDate(notifications), [notifications]);

  const markAllRead = async () => {
    if (!user || unreadCount === 0) return;
    await (supabase as any).from("player_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
  };

  const markNotificationRead = async (notificationId: string) => {
    await (supabase as any).from("player_notifications").update({ is_read: true }).eq("id", notificationId);
    setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)));
  };

  return (
    <main className="page-container">
      <PullToRefresh onRefresh={loadNotifications}>
      <div className="container max-w-2xl mx-auto space-y-4">
        <header className="glass-card p-4 sm:p-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-primary shrink-0" />
            <div className="min-w-0">
              <h1 className="text-xl sm:text-3xl font-bold truncate">Notifications</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Stay updated with messages from CrownX Arena.</p>
            </div>
          </div>
          <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">Unread: {unreadCount}</span>
        </header>

        {notifications.length === 0 ? (
          <section className="glass-card p-3 sm:p-6">
            <p className="text-sm text-muted-foreground text-center py-4">No notifications yet.</p>
          </section>
        ) : (
          grouped.map((group) => (
            <section key={group.label} className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                {group.label}
              </h2>
              <div className="glass-card p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => markNotificationRead(item.id)}
                    className={`w-full text-left rounded-lg border p-3 sm:p-4 transition-colors hover:bg-secondary/40 ${item.is_read ? "opacity-70" : "border-primary/40"}`}
                  >
                    <p className="font-semibold text-sm sm:text-base">{item.title}</p>
                    <p className="text-xs sm:text-sm mt-0.5">{item.message}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
      </PullToRefresh>
    </main>
  );
};

export default Notifications;
