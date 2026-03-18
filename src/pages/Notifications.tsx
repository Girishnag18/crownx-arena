import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import PullToRefresh from "@/components/common/PullToRefresh";
import PageHeader from "@/components/layout/PageHeader";

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

  const dismissNotification = async (notificationId: string) => {
    setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
    await (supabase as any).from("player_notifications").delete().eq("id", notificationId);
  };

  return (
    <main className="page-container">
      <PullToRefresh onRefresh={loadNotifications}>
      <div className="page-content page-content--compact space-y-4">
        <PageHeader
          badge="Inbox"
          badgeIcon={Bell}
          title="Notifications"
          description="Stay on top of friend requests, tournaments, rewards, and account updates without losing context."
          meta={[{ icon: Bell, label: `${unreadCount} unread` }]}
          actions={unreadCount > 0 ? (
            <button
              onClick={markAllRead}
              className="inline-flex items-center rounded-2xl border border-primary/20 bg-primary/10 px-4 py-2.5 text-xs font-display font-bold uppercase tracking-[0.18em] text-primary transition-colors hover:bg-primary/14"
            >
              Mark all read
            </button>
          ) : null}
        />

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
              <div className="glass-card p-2 sm:p-3 space-y-1.5 sm:space-y-2 overflow-hidden">
                <AnimatePresence initial={false}>
                {group.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -300, height: 0, marginBottom: 0, padding: 0 }}
                    transition={{ duration: 0.25 }}
                    drag="x"
                    dragDirectionLock
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.4, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -100) dismissNotification(item.id);
                    }}
                    onClick={() => markNotificationRead(item.id)}
                    className={`relative w-full text-left rounded-lg border p-3 sm:p-4 transition-colors hover:bg-secondary/40 cursor-grab active:cursor-grabbing touch-pan-y ${item.is_read ? "opacity-70" : "border-primary/40"}`}
                  >
                    <p className="font-semibold text-sm sm:text-base">{item.title}</p>
                    <p className="text-xs sm:text-sm mt-0.5">{item.message}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2">
                      {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </motion.div>
                ))}
                </AnimatePresence>
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
