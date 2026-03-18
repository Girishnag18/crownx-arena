import { forwardRef, useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";

interface Notification {
  id: string;
  title: string;
  message: string;
  kind: string;
  is_read: boolean;
  created_at: string;
}

const NotificationBell = forwardRef<HTMLDivElement>((_, forwardedRef) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("player_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data as Notification[]);
  };

  useEffect(() => {
    if (!user) { setNotifications([]); return; }
    load();

    const channel = supabase
      .channel(`notif-bell-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("player_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    load();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/70 text-muted-foreground shadow-[0_12px_30px_-22px_hsl(var(--foreground)/0.9)] backdrop-blur transition-all hover:border-primary/40 hover:bg-secondary/45 hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-3 max-h-96 w-80 overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-2 shadow-[0_28px_80px_-45px_hsl(var(--foreground)/0.85)] backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/60 mb-1">
              <p className="text-sm font-bold">Notifications</p>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-[10px] text-primary hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <p className="text-xs text-muted-foreground px-3 py-4 text-center">No notifications yet</p>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2 rounded-lg text-sm ${!n.is_read ? "bg-primary/5" : ""} hover:bg-secondary/40`}
                >
                  <p className="font-semibold text-xs">{n.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>
                  <p className="text-[9px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

NotificationBell.displayName = "NotificationBell";

export default NotificationBell;
