import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, User, ChevronDown, LayoutDashboard, History, BarChart3, Settings, LogOut, Menu, X, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/lobby", label: "Play" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/rules", label: "Rules" },
];

const profileMenuItems = [
  { icon: LayoutDashboard, label: "My Dashboard", to: "/dashboard" },
  { icon: History, label: "Game History", to: "/dashboard?section=history" },
  { icon: BarChart3, label: "Ratings", to: "/dashboard?section=ratings" },
  { icon: Settings, label: "Settings", to: "/dashboard?section=settings" },
  { icon: Wallet, label: "Crown Balance", to: "/crown-topup" },
];

interface NavbarProfile {
  username: string | null;
  wallet_crowns: number | null;
}

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<NavbarProfile | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { user, signOut } = useAuth();

  useEffect(() => {
    setProfileOpen(false);
    setMobileOpen(false);
  }, [location.pathname, location.search]);

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
        .select("username, wallet_crowns")
        .eq("id", user.id)
        .maybeSingle();

      if (data) {
        setProfile(data);
      }
    };

    loadNavbarProfile();

    const profileChannel = supabase
      .channel(`navbar-profile-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, loadNavbarProfile)
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    setProfileOpen(false);
    setMobileOpen(false);
    navigate("/");
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";

  return (
    <>
      <motion.nav
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-glass-border/20 px-6 py-3"
      >
        <div className="container mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Crown className="w-7 h-7 text-primary transition-transform group-hover:scale-110" />
            <span className="font-display text-xl font-bold text-gradient-gold">CrownX</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`relative px-4 py-2 text-sm font-semibold tracking-wide transition-colors rounded-lg ${
                  location.pathname === link.to
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full"
                  />
                )}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {user ? (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setProfileOpen((open) => !open)}
                  aria-expanded={profileOpen}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 glass-card px-3 py-1.5 hover:border-primary/30 transition-colors"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card bg-success" />
                  </div>
                  <span className="hidden sm:block text-sm font-semibold">
                    {displayName}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${profileOpen ? "rotate-180" : ""}`} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-60 glass-card border-glow p-2 space-y-1"
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
                          className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
                        >
                          <item.icon className="w-4 h-4" />
                          {item.label}
                        </Link>
                      ))}
                      <div className="border-t border-border my-1" />
                      <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg text-destructive hover:bg-destructive/10 transition-colors w-full"
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
                className="hidden md:inline-flex bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-5 py-2 rounded-lg gold-glow hover:scale-105 transition-transform"
              >
                LOGIN
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-secondary/50 transition-colors"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Mobile menu overlay */}
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
              {navLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`w-full text-center py-4 font-display text-lg font-bold rounded-xl transition-colors ${
                    location.pathname === link.to
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              {user ? (
                <>
                  <div className="w-full rounded-xl border border-border/70 p-4 mt-3 bg-card/60">
                    <p className="text-sm font-semibold">{displayName}</p>
                    <p className="text-xs text-muted-foreground mt-1">{Number(profile?.wallet_crowns || 0).toFixed(2)} Crowns</p>
                  </div>
                  {profileMenuItems.map((item) => (
                    <Link
                      key={item.label}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className="w-full text-center py-3 rounded-xl text-sm font-semibold bg-secondary/40 hover:bg-secondary/70 transition-colors"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <button
                    onClick={handleSignOut}
                    className="w-full text-center py-3 rounded-xl text-sm font-bold text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors"
                  >
                    LOGOUT
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center bg-primary text-primary-foreground font-display font-bold text-sm tracking-wider py-4 rounded-xl gold-glow mt-4"
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
