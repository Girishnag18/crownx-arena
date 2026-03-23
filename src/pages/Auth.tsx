import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Mail, Lock, User, ArrowRight, Eye, EyeOff, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/features/auth/authService";

type Mode = "login" | "signup" | "forgot";

const Auth = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (mode === "login") {
        const { error } = await authService.signInWithPassword(email.trim(), password);
        if (error) { toast.error(error.message); return; }
        toast.success("Welcome back!");
        navigate("/dashboard");
        return;
      }

      if (mode === "signup") {
        const { error } = await authService.signUp(email.trim(), password, username.trim());
        if (error) { toast.error(error.message); return; }
        toast.success("Account created. Check your email for verification.");
        return;
      }

      const { error } = await authService.requestPasswordReset(email.trim());
      if (error) { toast.error(error.message); return; }
      toast.success("Password reset link sent. Check your inbox.");
      setMode("login");
    } finally {
      setSubmitting(false);
    }
  };

  const continueWithGoogle = async () => {
    const result = await authService.signInWithGoogle();
    if (result?.error) toast.error(String(result.error) || "Google sign-in is not available.");
  };

  const titles: Record<Mode, string> = {
    login: "Welcome back",
    signup: "Create your account",
    forgot: "Reset password",
  };

  const subtitles: Record<Mode, string> = {
    login: "Sign in to continue your chess journey",
    signup: "Join the arena and start competing",
    forgot: "We'll send you a reset link",
  };

  const inputClass =
    "w-full rounded-xl border border-border/40 bg-secondary/30 backdrop-blur-sm pl-10 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:bg-secondary/50 focus:ring-1 focus:ring-primary/20 transition-all duration-200";

  return (
    <main className="page-center relative overflow-hidden">
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/6 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/4 blur-[100px]" />
        <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] rounded-full bg-accent/4 blur-[80px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="relative w-full max-w-[440px] z-10"
      >
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6 group">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-primary/20 blur-md group-hover:blur-lg transition-all" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center gold-glow">
                <Crown className="w-5 h-5 text-primary-foreground" />
              </div>
            </div>
            <span className="font-display text-xl font-bold tracking-wide text-gradient-gold">CrownX</span>
          </Link>

          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <h1 className="text-2xl font-display font-bold tracking-tight">{titles[mode]}</h1>
              <p className="text-sm text-muted-foreground mt-1.5">{subtitles[mode]}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Glass Card */}
        <div className="glass-card p-6 sm:p-8 space-y-5 gold-glow">
          <form onSubmit={submit} className="space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      className={inputClass}
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Username"
                      required
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className={inputClass}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                required
              />
            </div>

            {mode !== "forgot" && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className={`${inputClass} !pr-10`}
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {mode === "signup" && (
              <div className="flex items-start gap-2 px-1">
                <Shield className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  8+ characters with uppercase, lowercase, and a number.
                </p>
              </div>
            )}

            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-primary to-accent text-primary-foreground py-3 rounded-xl font-display font-bold text-sm tracking-wider inline-flex items-center justify-center gap-2 disabled:opacity-60 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-shadow"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/30" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card/80 backdrop-blur-sm px-4 text-xs text-muted-foreground uppercase tracking-widest">
                    or
                  </span>
                </div>
              </div>

              <motion.button
                type="button"
                onClick={continueWithGoogle}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                className="w-full border border-border/40 bg-secondary/20 backdrop-blur-sm rounded-xl py-3 text-sm font-medium hover:bg-secondary/40 hover:border-border/60 inline-flex items-center justify-center gap-3 transition-all"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </motion.button>
            </>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center space-y-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="text-sm text-muted-foreground"
            >
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline underline-offset-2">
                    Sign up
                  </button>
                </>
              ) : mode === "signup" ? (
                <>
                  Already have an account?{" "}
                  <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline underline-offset-2">
                    Sign in
                  </button>
                </>
              ) : (
                <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline underline-offset-2">
                  Back to sign in
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Trust badge */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-muted-foreground/60">
          <Lock className="w-3 h-3" />
          <span>Secured with end-to-end encryption</span>
        </div>
      </motion.div>
    </main>
  );
};

export default Auth;
