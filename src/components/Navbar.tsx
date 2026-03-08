import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Crown, User, ChevronDown, LayoutDashboard, History, BarChart3, Settings,
  LogOut, Menu, X, Wallet, Swords, Puzzle, Users, BookOpen, Trophy,
  Gift, ShoppingBag, Sparkles, Gamepad2, GraduationCap, Eye, Loader2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/layout/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const flatNavLinks = navSections.flatMap((s) => s.items);

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

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setProfileOpen(false);
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
    if (!user) { setProfile(null); return; }
    const loadNavbarProfile = async () => {
      const { data } = await supabase.from("profiles").select("username, wallet_crowns, avatar_url").eq("id", user.id).maybeSingle();
      if (data) setProfile(data as unknown as NavbarProfile);
    };
    loadNavbarProfile();
    const profileChannel = supabase
      .channel(`navbar-profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, loadNavbarProfile)
      .subscribe();
    return () => { supabase.removeChannel(profileChannel); };
  }, [user]);

  const handleSignOut = async () => {
    setLoggingOut(true);
    setProfileOpen(false);
    setMobileOpen(false);
    await signOut();
    navigate("/dashboard");
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";

  // Desktop: show a few key links only
  const desktopLinks = [
    { to: "/", label: "Home" },
    { to: "/lobby", label: "Play" },
    { to: "/puzzles", label: "Puzzles" },
    { to: "/dashboard", label: "Arena" },
    { to: "/shop", label: "Store" },
    { to: "/social", label: "Social" },
  ];
  const visibleDesktopLinks = user ? desktopLinks : [{ to: "/", label: "Home" }];

  return (
    <>
      {/* Logging out overlay */}
      <AnimatePresence>
        {loggingOut && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background/80 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="w-10 h-10 text-primary animate-spin" />
              <p className="font-display font-bold text-lg text-foreground">Logging out…</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur-xl"
      >
        <div className="container mx-auto flex items-center justify-between px-4 py-2.5 md:px-6">
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <Crown className="w-6 h-6 md:w-7 md:h-7 text-primary transition-transform group-hover:scale-110" />
            <span className="font-display text-base md:text-lg font-bold tracking-wide">CrownX</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-1 py-1">
            {visibleDesktopLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-3 py-1.5 text-sm font-semibold rounded-md transition-colors ${
                  location.pathname === link.to ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.div layoutId="nav-indicator" className="absolute inset-x-2 -bottom-0.5 h-0.5 bg-primary rounded-full" />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-1.5 md:gap-2">
            <ThemeToggle />
            <NotificationBell />

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/70 px-2 py-1.5 hover:border-primary/40 transition-colors"
                >
                  <Avatar className="w-7 h-7 border border-border/60">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-secondary text-muted-foreground">
                      <User className="w-3.5 h-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-semibold max-w-[100px] truncate">{displayName}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-60 rounded-xl border border-border/70 bg-card/95 backdrop-blur-xl p-2 shadow-2xl z-50"
                    >
                      <div className="px-3 py-2 border-b border-border/70 mb-1">
                        <p className="text-sm font-semibold leading-tight truncate">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{Number(profile?.wallet_crowns || 0).toFixed(2)} Crowns</p>
                      </div>
                      {profileMenuItems.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-destructive hover:bg-destructive/10 w-full transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/auth" className="hidden md:inline-flex bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-4 py-2 rounded-lg">
                LOGIN
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile drawer overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-[280px] max-w-[85vw] bg-card border-l border-border/60 shadow-2xl lg:hidden flex flex-col"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
                <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-primary" />
                  <span className="font-display text-sm font-bold">CrownX Arena</span>
                </Link>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* User info */}
              {user && profile && (
                <div className="px-4 py-3 border-b border-border/60">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-primary/30">
                      <AvatarImage src={profile.avatar_url || undefined} />
                      <AvatarFallback className="bg-secondary text-muted-foreground">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground">{Number(profile.wallet_crowns || 0).toFixed(2)} Crowns</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Nav sections */}
              <ScrollArea className="flex-1 px-3 py-2">
                {user ? (
                  navSections.map((section) => (
                    <div key={section.title} className="mb-3">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-2 mb-1">
                        {section.title}
                      </p>
                      {section.items.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setMobileOpen(false)}
                          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                            location.pathname === item.to
                              ? "bg-primary/10 text-primary font-semibold"
                              : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                          }`}
                        >
                          <item.icon className="w-4 h-4 shrink-0" />
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  ))
                ) : (
                  <Link
                    to="/"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-foreground font-semibold"
                  >
                    <Crown className="w-4 h-4 text-primary" />
                    Home
                  </Link>
                )}
              </ScrollArea>

              {/* Drawer footer */}
              <div className="px-4 py-3 border-t border-border/60 space-y-2">
                {user ? (
                  <>
                    <Link
                      to="/settings"
                      onClick={() => setMobileOpen(false)}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setMobileOpen(false)}
                    className="w-full block text-center bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider py-3 rounded-lg"
                  >
                    LOGIN
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
