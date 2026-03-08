import { Bell, Smartphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { toast } from "sonner";

export const NotificationPrefsSection = () => {
  const { prefs, toggle, categories } = useNotificationPrefs();
  const { permission, isSubscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success("Push notifications disabled");
    } else {
      const ok = await subscribe();
      if (ok) {
        toast.success("Push notifications enabled!");
      } else if (permission === "denied") {
        toast.error("Notifications blocked. Please enable them in your browser settings.");
      } else {
        toast.error("Failed to enable push notifications");
      }
    }
  };

  const pushSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="font-display font-bold text-xs">Notification Preferences</h3>
      </div>
      <div className="p-5 space-y-1">
        {/* Push notification toggle */}
        {pushSupported && (
          <div className="mb-4 pb-4 border-b border-border/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-xs font-bold font-display">Push Notifications</span>
                  <p className="text-[10px] text-muted-foreground">Get notified even when the tab is closed</p>
                </div>
              </div>
              <Switch
                checked={isSubscribed}
                onCheckedChange={handlePushToggle}
                disabled={loading || permission === "denied"}
              />
            </div>
            {permission === "denied" && (
              <p className="text-[10px] text-destructive mt-2">
                Notifications are blocked. Enable them in your browser settings.
              </p>
            )}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground mb-3">Choose which notifications show as pop-up toasts. All notifications still appear in the bell menu.</p>
        <div className="space-y-3">
          {categories.map((cat) => (
            <div key={cat.key} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className="text-sm">{cat.icon}</span>
                <span className="text-xs font-medium">{cat.label}</span>
              </div>
              <Switch checked={prefs[cat.key] !== false} onCheckedChange={() => toggle(cat.key)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
