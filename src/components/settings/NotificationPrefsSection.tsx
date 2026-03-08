import { Bell } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

export const NotificationPrefsSection = () => {
  const { prefs, toggle, categories } = useNotificationPrefs();

  return (
    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
        <Bell className="w-4 h-4 text-primary" />
        <h3 className="font-display font-bold text-xs">Notification Preferences</h3>
      </div>
      <div className="p-5 space-y-1">
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
