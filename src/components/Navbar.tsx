import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  ChevronDown,
  Crown,
  Eye,
  Gamepad2,
  Gift,
  GraduationCap,
  History,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Puzzle,
  Settings,
  ShoppingBag,
  Sparkles,
  Swords,
  Trophy,
  User,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/layout/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const navSections = [
  {
    title: "Play",
    items: [
      { to: "/lobby", label: "Play Online", icon: Swords },
      { to: "/puzzles", label: "Puzzles", icon: Puzzle },
      { to: "/openings", label: "Openings", icon: BookOpen },
      { to: "/tutorial", label: "Tutorial", icon: GraduationCap },
      { to: "/rules", label: "How to Play", icon: Eye },
    ],
  },
  {
    title: "Compete",
    items: [
      { to: "/dashboard", label: "Arena Hub", icon: Trophy },
      { to: "/challenges", label: "Challenges", icon: Sparkles },
      { to: "/battle-pass", label: "Battle Pass", icon: Gamepad2 },
      { to: "/achievements", label: "Achievements", icon: Trophy },
      { to: "/ratings", label: "Ratings", icon: BarChart3 },
    ],
  },
  {
    title: "Community",
    items: [
      { to: "/clubs", label: "Clubs", icon: Users },
      { to: "/social", label: "Social", icon: Users },
      { to: "/studies", label: "Studies", icon: BookOpen },
    ],
  },
  {
    title: "Rewards",
    items: [
      { to: "/daily-rewards", label: "Daily Rewards", icon: Gift },
      { to: "/shop", label: "Shop", icon: ShoppingBag },
    ],
  },
  {
    title: "Tools",
    items: [
      { to: "/analysis", label: "Analysis", icon: BarChart3 },
      { to: "/profile", label: "Profile", icon: User },
    ],
  },
];

const profileMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: User, label: "Profile", to: "/profile" },
  { icon: Trophy, label: "Achievements", to: "/achievements" },
  { icon: History, label: "Match History", to: "/match-history" },
  { icon: BarChart3, label: "Ratings", to: "/ratings" },
  { icon: Wallet, label: "Wallet", to: "/crown-topup" },
  { icon: Gift, label: "Daily Spin", to: "/daily-spin" },
  { icon: Puzzle, label: "Daily Puzzle", to: "/puzzles" },
  { icon: Settings, label: "Settings", to: "/settings" },
];

interface NavbarProfile {
  username: string | null;
  wallet_crowns: number | null;
  avatar_url: string | null;
}

const desktopLinks = [
  { to: "/", label: "Home" },
  { to: "/lobby", label: "Play" },
  { to: "/puzzles", label: "Train" },
  { to: "/dashboard", label: "Arena" },
  { to: "/shop", label: "Store" },
  { to: "/social", label: "Social" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<NavbarProfile | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    setProfileOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setMobileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const loadNavbarProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username, wallet_crowns, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data as unknown as NavbarProfile);
      }
    };

    loadNavbarProfile();

    const profileChannel = supabase
      .channel(`navbar-profile-${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` },
        loadNavbarProfile,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    setProfileOpen(false);
    setMobileOpen(false);
    await signOut();
    setTimeout(() => {
      setLoggingOut(false);
      navigate("/");
    }, 1000);
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";
  const walletAmount = Number(profile?.wallet_crowns || 0).toFixed(2);
  const visibleDesktopLinks = user ? desktopLinks : desktopLinks.slice(0, 2);

  return (
    <>
      <AnimatePresence>
        {loggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-background/86 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 260 }}
              className="surface-panel flex min-w-[220px] flex-col items-center gap-4 px-8 py-7"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="font-display text-lg font-bold text-foreground">Logging out...</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.header
        initial={{ y: -40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-4 lg:px-6"
      >
        <div className="mx-auto flex max-w-7xl items-center gap-3 rounded-[26px] border border-border/60 bg-background/78 px-4 py-3 shadow-[0_22px_70px_-38px_hsl(var(--foreground)/0.88)] backdrop-blur-2xl">
          <Link to="/" className="group flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary transition-transform duration-200 group-hover:scale-[1.03]">
              <Crown className="h-5 w-5" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <p className="font-display text-base font-black tracking-[0.18em] text-foreground">CROWNX</p>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Arena platform</p>
            </div>
          </Link>

          <div className="hidden flex-1 xl:flex xl:justify-center">
            <nav className="flex items-center gap-1 rounded-2xl border border-border/50 bg-card/58 p-1 backdrop-blur">
              {visibleDesktopLinks.map((link) => {
                const active = location.pathname === link.to;

                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={cn(
                      "relative rounded-xl px-4 py-2 text-sm font-semibold transition-all",
                      active
                        ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]"
                        : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="ml-auto flex items-center gap-2">
            {user && (
              <div className="hidden items-center gap-2 rounded-2xl border border-border/50 bg-card/58 px-3 py-2 text-xs font-semibold text-muted-foreground xl:flex">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-foreground">{walletAmount}</span>
                <span>Crowns</span>
              </div>
            )}

            <ThemeToggle />
            <NotificationBell />

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-2xl border border-border/60 bg-card/70 px-2.5 py-2 shadow-[0_12px_30px_-22px_hsl(var(--foreground)/0.85)] backdrop-blur transition-all hover:border-primary/35"
                >
                  <Avatar className="h-8 w-8 border border-border/60">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-secondary text-muted-foreground">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden min-w-0 text-left md:block">
                    <p className="max-w-[110px] truncate text-sm font-semibold text-foreground">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground">Arena ready</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      profileOpen && "rotate-180",
                    )}
                  />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.96 }}
                      transition={{ duration: 0.18 }}
                      className="absolute right-0 z-50 mt-3 w-72 rounded-[24px] border border-border/70 bg-card/95 p-2 shadow-[0_28px_80px_-45px_hsl(var(--foreground)/0.85)] backdrop-blur-2xl"
                    >
                      <div className="surface-muted mb-2 flex items-center gap-3 px-3 py-3">
                        <Avatar className="h-11 w-11 border border-primary/20">
                          <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                          <AvatarFallback className="bg-secondary text-muted-foreground">
                            <User className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate font-display text-sm font-bold text-foreground">{displayName}</p>
                          <p className="text-xs text-muted-foreground">{walletAmount} Crowns</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        {profileMenuItems.map((item) => (
                          <Link
                            key={item.label}
                            to={item.to}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/45 hover:text-foreground"
                          >
                            <item.icon className="h-4 w-4" />
                            <span>{item.label}</span>
                          </Link>
                        ))}
                      </div>

                      <div className="my-2 border-t border-border/60" />

                      <button
                        onClick={handleSignOut}
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-destructive transition-colors hover:bg-destructive/10"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/auth"
                className="hidden rounded-2xl bg-primary px-4 py-2.5 text-xs font-display font-bold uppercase tracking-[0.22em] text-primary-foreground shadow-[0_18px_40px_-28px_hsl(var(--primary))] transition-all hover:translate-y-[-1px] hover:shadow-[0_24px_50px_-28px_hsl(var(--primary))] sm:inline-flex"
              >
                Login
              </Link>
            )}

            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/70 text-muted-foreground shadow-[0_12px_30px_-22px_hsl(var(--foreground)/0.9)] backdrop-blur transition-all hover:border-primary/40 hover:bg-secondary/45 hover:text-foreground xl:hidden"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm xl:hidden"
              onClick={() => setMobileOpen(false)}
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 right-0 top-0 z-50 flex w-[340px] max-w-[90vw] flex-col border-l border-border/60 bg-background/95 shadow-[0_28px_80px_-40px_hsl(var(--foreground)/0.9)] backdrop-blur-2xl xl:hidden"
            >
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-4">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/20 bg-primary/12 text-primary">
                    <Crown className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-display text-sm font-black tracking-[0.16em] text-foreground">CROWNX</p>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Arena menu</p>
                  </div>
                </Link>

                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card/70 text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {user && (
                <div className="border-b border-border/60 px-4 py-4">
                  <div className="surface-muted flex items-center gap-3 px-3 py-3">
                    <Avatar className="h-12 w-12 border border-primary/20">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                      <AvatarFallback className="bg-secondary text-muted-foreground">
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-display text-sm font-bold text-foreground">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{walletAmount} Crowns</p>
                    </div>
                  </div>
                </div>
              )}

              <ScrollArea className="flex-1 px-4 py-4">
                {user ? (
                  <div className="space-y-5">
                    {navSections.map((section) => (
                      <div key={section.title} className="space-y-2">
                        <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                          {section.title}
                        </p>
                        <div className="space-y-1">
                          {section.items.map((item) => {
                            const active = location.pathname === item.to;
                            return (
                              <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setMobileOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition-all",
                                  active
                                    ? "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.16)]"
                                    : "text-muted-foreground hover:bg-secondary/40 hover:text-foreground",
                                )}
                              >
                                <item.icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {desktopLinks.slice(0, 2).map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
                      >
                        <Crown className="h-4 w-4 text-primary" />
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="border-t border-border/60 px-4 py-4">
                {user ? (
                  <div className="space-y-2">
                    <Link
                      to="/settings"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-sm text-destructive transition-colors hover:bg-destructive/10"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="flex w-full items-center justify-center rounded-2xl bg-primary px-4 py-3 text-sm font-display font-bold uppercase tracking-[0.22em] text-primary-foreground"
                  >
                    Login
                  </Link>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
