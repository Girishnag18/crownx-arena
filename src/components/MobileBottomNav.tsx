import { Link, useLocation } from "react-router-dom";
import { LayoutGrid, Puzzle, Swords, Trophy, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/lobby", label: "Play", icon: Swords },
  { to: "/puzzles", label: "Puzzles", icon: Puzzle },
  { to: "/dashboard", label: "Arena", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/settings", label: "More", icon: LayoutGrid },
];

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) return null;

  return (
    <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 lg:hidden">
      <div className="pointer-events-auto mx-auto max-w-md rounded-[24px] border border-border/60 bg-background/88 p-2 shadow-[0_28px_80px_-36px_hsl(var(--foreground)/0.9)] backdrop-blur-2xl">
        <div className="grid grid-cols-5 gap-1">
          {tabs.map((tab) => {
            const active = location.pathname === tab.to;

            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={cn(
                  "relative flex min-h-[4.25rem] flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] font-semibold transition-all",
                  active
                    ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.2)]"
                    : "text-muted-foreground hover:bg-secondary/35 hover:text-foreground",
                )}
              >
                <tab.icon className={cn("h-[18px] w-[18px]", active && "scale-105")} strokeWidth={active ? 2.4 : 2} />
                <span>{tab.label}</span>
                {active && <span className="absolute inset-x-5 top-1 h-1 rounded-full bg-primary/70" />}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
