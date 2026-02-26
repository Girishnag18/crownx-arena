import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, User, ChevronDown, LayoutDashboard, History, BarChart3, Settings, LogOut, Menu, X, Wallet, Bell } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/layout/ThemeToggle";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { InGameNotification } from "@/components/InGameNotificationBar";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/lobby", label: "Play Online" },
  { to: "/ratings", label: "Ratings" },
  { to: "/dashboard", label: "Arena Hub" },
  { to: "/rules", label: "How to Play" },
];

const profileMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: Bell, label: "Notifications", to: "/notifications" },
  { icon: History, label: "Match History", to: "/dashboard?section=history" },
  { icon: BarChart3, label: "Rating Overview", to: "/ratings" },
  { icon: Settings, label: "Profile Settings", to: "/settings" },
  { icon: Wallet, label: "Wallet", to: "/crown-topup" },
];

interface NavbarProfile {
  username: string | null;
  wallet_crowns: number | null;
  avatar_url: string | null;
}

interface PlayerNotification {
  id: string;
  title: string;
  message: string;
  kind: string;
  is_read: boolean;
  created_at: string;
}

const STORAGE_KEY = "crownx-in-game-notifications";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<NavbarProfile | null>(null);
  const [dbNotifs, setDbNotifs] = useState<PlayerNotification[]>([]);
  const [localNotifs, setLocalNotifs] = useState<InGameNotification[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const notifRef = useRef<HTMLDivElement | null>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    setProfileOpen(false);
    setNotifOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

  // Outside click & escape
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setProfileOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) setNotifOpen(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setProfileOpen(false); setNotifOpen(false); setMobileOpen(false); }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => { document.removeEventListener("mousedown", handleOutsideClick); document.removeEventListener("keydown", handleEscape); };
  }, []);

  // Load navbar profile
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

  // Load DB notifications
  useEffect(() => {
    if (!user) { setDbNotifs([]); return; }
    const loadNotifs = async () => {
      const { data } = await (supabase as any)
        .from("player_notifications")
        .select("id,title,message,kind,is_read,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15);
      setDbNotifs((data || []) as PlayerNotification[]);
    };
    loadNotifs();

    const notifChannel = supabase
      .channel(`navbar-notifs-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_notifications", filter: `user_id=eq.${user.id}` }, loadNotifs)
      .subscribe();
    return () => { supabase.removeChannel(notifChannel); };
  }, [user]);

  // Load local in-game notifications
  useEffect(() => {
    const load = () => {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as InGameNotification[];
      setLocalNotifs(data);
    };
    load();
    window.addEventListener("crownx-notification-update", load);
    return () => window.removeEventListener("crownx-notification-update", load);
  }, []);

  const markRead = async (id: string) => {
    await (supabase as any).from("player_notifications").update({ is_read: true }).eq("id", id);
    setDbNotifs((prev) => prev.map((n) => n.id === id ? { ...n, is_read: true } : n));
  };

  const dismissLocal = (id: string) => {
    const next = localNotifs.filter((n) => n.id !== id);
    setLocalNotifs(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const unreadCount = dbNotifs.filter((n) => !n.is_read).length + localNotifs.length;

  const handleSignOut = async () => {
    await signOut();
    setProfileOpen(false);
    setMobileOpen(false);
    navigate("/");
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";
  const visibleNavLinks = user ? navLinks : navLinks.filter((link) => link.to === "/");

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/95 backdrop-blur-xl"
      >
        <div className="container mx-auto flex items-center justify-between px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2 group">
            <Crown className="w-7 h-7 text-primary transition-transform group-hover:scale-110" />
            <span className="font-display text-lg md:text-xl font-bold tracking-wide">CrownX Arena</span>
          </Link>

          <div className="hidden md:flex items-center gap-1 rounded-lg border border-border/60 bg-card/60 px-1 py-1">
            {visibleNavLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 text-sm font-semibold rounded-md transition-colors ${
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

          <div className="flex items-center gap-2">
            <ThemeToggle />

            {/* Notification Bell */}
            {user && (
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => { setNotifOpen((o) => !o); setProfileOpen(false); }}
                  className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 min-w-[18px] text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full flex items-center justify-center leading-none px-1">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                <AnimatePresence>
                  {notifOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border border-border/70 bg-card/95 p-2 shadow-2xl backdrop-blur-xl"
                    >
                      <div className="px-3 py-2 border-b border-border/70 mb-1">
                        <p className="text-sm font-semibold">Notifications</p>
                        <p className="text-xs text-muted-foreground">{unreadCount} unread</p>
                      </div>

                      {/* Local in-game notifications */}
                      {localNotifs.map((n) => (
                        <div
                          key={`local-${n.id}`}
                          className={`flex items-start gap-2 px-3 py-2.5 rounded-lg mb-0.5 ${
                            n.tone === "warning" ? "bg-destructive/10 border border-destructive/20" : "bg-primary/10 border border-primary/20"
                          }`}
                        >
                          <Bell className="w-3.5 h-3.5 mt-0.5 shrink-0 text-primary" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs leading-snug">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">Just now</p>
                          </div>
                          <button onClick={() => dismissLocal(n.id)} className="text-muted-foreground hover:text-foreground p-0.5">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}

                      {/* DB notifications */}
                      {dbNotifs.map((n) => (
                        <button
                          key={n.id}
                          onClick={() => markRead(n.id)}
                          className={`w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg mb-0.5 transition-colors hover:bg-secondary/50 ${
                            !n.is_read ? "bg-secondary/30" : "opacity-60"
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? "bg-primary" : "bg-muted-foreground/30"}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-snug">{n.title}</p>
                            <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString()}</p>
                          </div>
                        </button>
                      ))}

                      {dbNotifs.length === 0 && localNotifs.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-6">No notifications</p>
                      )}

                      <Link
                        to="/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="block text-center text-xs text-primary font-semibold py-2 mt-1 border-t border-border/70 hover:bg-secondary/30 rounded-b-lg"
                      >
                        View All Notifications
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => { setProfileOpen((open) => !open); setNotifOpen(false); }}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-1.5 hover:border-primary/40"
                >
                  <Avatar className="w-8 h-8 border border-border/60">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={displayName} />
                    <AvatarFallback className="bg-secondary text-muted-foreground">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-sm font-semibold">{displayName}</span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-64 rounded-xl border border-border/70 bg-card/95 p-2 shadow-2xl"
                    >
                      <div className="px-3 py-2 border-b border-border/70 mb-1">
                        <p className="text-sm font-semibold leading-tight">{displayName}</p>
                        <p className="text-xs text-muted-foreground mt-1">{Number(profile?.wallet_crowns || 0).toFixed(2)} Crowns</p>
                      </div>
                      {profileMenuItems.map((item) => (
                        <Link
                          key={item.label}
                          to={item.to}
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-destructive hover:bg-destructive/10 w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link
                to="/auth"
                className="hidden md:inline-flex bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-5 py-2 rounded-lg"
              >
                LOGIN
              </Link>
            )}

            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-secondary/50"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-background/95 backdrop-blur-xl pt-20"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-center gap-2 p-6"
            >
              {visibleNavLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full text-center py-4 font-display text-lg font-bold rounded-xl ${
                    location.pathname === link.to ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <button
                    onClick={() => { navigate("/settings"); setMobileOpen(false); }}
                    className="w-full text-center py-3 rounded-xl text-sm font-semibold bg-secondary/40 hover:bg-secondary/70"
                  >
                    Profile & Settings
                  </button>
                  <button
                    onClick={() => { navigate("/notifications"); setMobileOpen(false); }}
                    className="w-full text-center py-3 rounded-xl text-sm font-semibold bg-secondary/40 hover:bg-secondary/70 flex items-center justify-center gap-2"
                  >
                    <Bell className="w-4 h-4" />
                    Notifications {unreadCount > 0 && <span className="bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>}
                  </button>
                  <button
                    onClick={handleSignOut}
                    className="w-full text-center py-3 rounded-xl text-sm font-bold text-destructive bg-destructive/10 hover:bg-destructive/20"
                  >
                    LOGOUT
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider py-4 rounded-xl mt-4"
                >
                  LOGIN
                </Link>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Navbar;
