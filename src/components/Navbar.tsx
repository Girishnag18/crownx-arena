import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, User, ChevronDown, LayoutDashboard, History, BarChart3, Settings, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/lobby", label: "Play" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/rules", label: "Rules" },
];

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    setProfileOpen(false);
    navigate("/");
  };

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
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 glass-card px-3 py-1.5 hover:border-primary/30 transition-colors"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                      <User className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card bg-success" />
                  </div>
                  <span className="hidden sm:block text-sm font-semibold">
                    {user.user_metadata?.username || "Player"}
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
                      className="absolute right-0 mt-2 w-52 glass-card border-glow p-2 space-y-1"
                    >
                      {[
                        { icon: LayoutDashboard, label: "My Dashboard", to: "/dashboard" },
                        { icon: History, label: "Game History", to: "/dashboard" },
                        { icon: BarChart3, label: "Ratings", to: "/dashboard" },
                        { icon: Settings, label: "Settings", to: "/dashboard" },
                      ].map((item) => (
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
              {!user && (
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
