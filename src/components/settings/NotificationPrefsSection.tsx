import { Bell } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

export const NotificationPrefsSection = () => {
  const { prefs, toggle, categories } = useNotificationPrefs();

  return (
    <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6 space-y-4">
      <div className="flex items-center gap-2">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="font-display text-base sm:text-lg font-bold">Notification Preferences</h3>
      </div>
      <p className="text-xs text-muted-foreground">Choose which notifications show as pop-up toasts. All notifications still appear in the bell menu.</p>
      <div className="space-y-3">
        {categories.map((cat) => (
          <div key={cat.key} className="flex items-center justify-between">
            <Label className="cursor-pointer flex items-center gap-2">
              <span>{cat.icon}</span> {cat.label}
            </Label>
            <Switch checked={prefs[cat.key] !== false} onCheckedChange={() => toggle(cat.key)} />
          </div>
        ))}
      </div>
    </div>
  );
};
