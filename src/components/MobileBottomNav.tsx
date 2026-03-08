import { Link, useLocation } from "react-router-dom";
import { Swords, Puzzle, Trophy, User, LayoutGrid } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

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
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border/60 bg-card/95 backdrop-blur-xl lg:hidden safe-bottom">
      <div className="flex items-stretch justify-around">
        {tabs.map((tab) => {
          const active = location.pathname === tab.to;
          return (
            <Link
              key={tab.to}
              to={tab.to}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 py-2 transition-colors ${
                active
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-5 h-5" strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[10px] font-semibold ${active ? "font-bold" : ""}`}>
                {tab.label}
              </span>
              {active && (
                <div className="absolute top-0 w-8 h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
