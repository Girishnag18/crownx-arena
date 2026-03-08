import { useState, useCallback } from "react";

export type NotifCategory = "friend_request" | "friend_accept" | "game_invite" | "tournament" | "achievement" | "challenge" | "info";

const ALL_CATEGORIES: { key: NotifCategory; label: string; icon: string }[] = [
  { key: "friend_request", label: "Friend Requests", icon: "👋" },
  { key: "friend_accept", label: "Friend Accepts", icon: "🤝" },
  { key: "game_invite", label: "Game Invites", icon: "⚔️" },
  { key: "tournament", label: "Tournaments", icon: "🏆" },
  { key: "achievement", label: "Achievements", icon: "🎖️" },
  { key: "challenge", label: "Challenges", icon: "🎯" },
  { key: "info", label: "General Info", icon: "ℹ️" },
];

const STORAGE_KEY = "crownx_notif_prefs";

function loadPrefs(): Record<NotifCategory, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Default: all enabled
  return Object.fromEntries(ALL_CATEGORIES.map((c) => [c.key, true])) as Record<NotifCategory, boolean>;
}

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<Record<NotifCategory, boolean>>(loadPrefs);

  const toggle = useCallback((key: NotifCategory) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const isEnabled = useCallback((kind: string): boolean => {
    const k = kind as NotifCategory;
    return prefs[k] !== false;
  }, [prefs]);

  return { prefs, toggle, isEnabled, categories: ALL_CATEGORIES };
}
