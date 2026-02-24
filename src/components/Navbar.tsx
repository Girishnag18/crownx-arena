import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, User, ChevronDown, LayoutDashboard, History, BarChart3, Settings, LogOut, Menu, X, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/lobby", label: "Play Online" },
  { to: "/dashboard", label: "Arena Hub" },
  { to: "/rules", label: "How to Play" },
];

const profileMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/dashboard" },
  { icon: History, label: "Match History", to: "/dashboard?section=history" },
  { icon: BarChart3, label: "Rating Overview", to: "/dashboard?section=ratings" },
  { icon: Settings, label: "Profile Settings", to: "/dashboard?section=settings" },
  { icon: Wallet, label: "Wallet", to: "/crown-topup" },
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
        .select("username, wallet_crowns, avatar_url")
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
                  location.pathname === link.to
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
                {location.pathname === link.to && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-x-2 -bottom-0.5 h-0.5 bg-primary rounded-full"
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
                  <button
                    onClick={() => {
                      navigate("/dashboard?section=settings");
                      setMobileOpen(false);
                    }}
                    className="w-full text-center py-3 rounded-xl text-sm font-semibold bg-secondary/40 hover:bg-secondary/70"
                  >
                    Open Profile & Wallet
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
