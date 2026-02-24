import { useEffect, useState } from "react";
import { Bell, X } from "lucide-react";

export interface InGameNotification {
  id: string;
  message: string;
  tone?: "info" | "warning";
  createdAt: string;
}

const STORAGE_KEY = "crownx-in-game-notifications";

export const publishInGameNotification = (message: string, tone: "info" | "warning" = "info") => {
  const existing = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as InGameNotification[];
  const next: InGameNotification = {
    id: crypto.randomUUID(),
    message,
    tone,
    createdAt: new Date().toISOString(),
  };

  const updated = [next, ...existing].slice(0, 25);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  window.dispatchEvent(new Event("crownx-notification-update"));
};

const InGameNotificationBar = () => {
  const [items, setItems] = useState<InGameNotification[]>([]);

  useEffect(() => {
    const load = () => {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as InGameNotification[];
      setItems(data);
    };

    load();
    window.addEventListener("crownx-notification-update", load);

    return () => window.removeEventListener("crownx-notification-update", load);
  }, []);

  const dismiss = (id: string) => {
    const next = items.filter((item) => item.id !== id);
    setItems(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  if (!items.length) return null;

  const latest = items[0];

  return (
    <div className="fixed top-[73px] left-0 right-0 z-40 px-4">
      <div className={`container mx-auto rounded-lg border px-4 py-2 flex items-center justify-between text-sm ${latest.tone === "warning" ? "bg-destructive/10 border-destructive/30" : "bg-primary/10 border-primary/30"}`}>
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <span>{latest.message}</span>
        </div>
        <button onClick={() => dismiss(latest.id)} className="p-1 rounded hover:bg-background/60">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default InGameNotificationBar;
