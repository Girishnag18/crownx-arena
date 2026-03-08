import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Crown, Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
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
    const { error } = await authService.signInWithGoogle();
    if (error) toast.error(error.message || "Google sign-in is not available.");
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

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-[420px]"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6 group">
            <Crown className="w-7 h-7 text-primary transition-transform group-hover:scale-110" />
            <span className="font-display text-lg font-bold tracking-wide">CrownX</span>
          </Link>
          <h1 className="text-2xl font-bold">{titles[mode]}</h1>
          <p className="text-sm text-muted-foreground mt-1">{subtitles[mode]}</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 sm:p-8 space-y-5">
          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  className="w-full rounded-lg border border-border bg-secondary/40 pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:bg-secondary/60"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                className="w-full rounded-lg border border-border bg-secondary/40 pl-10 pr-4 py-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:bg-secondary/60"
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
                  className="w-full rounded-lg border border-border bg-secondary/40 pl-10 pr-10 py-3 text-sm placeholder:text-muted-foreground focus:border-primary/50 focus:bg-secondary/60"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === "signup" && (
              <p className="text-xs text-muted-foreground">
                8+ characters with uppercase, lowercase, and a number.
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-display font-bold text-sm tracking-wider inline-flex items-center justify-center gap-2 hover:brightness-110 disabled:opacity-60"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : mode === "signup" ? "Create Account" : "Send Reset Link"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {mode !== "forgot" && (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-card px-3 text-xs text-muted-foreground">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={continueWithGoogle}
                className="w-full border border-border rounded-lg py-3 text-sm font-medium hover:bg-secondary/50 inline-flex items-center justify-center gap-3"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>
            </>
          )}
        </div>

        {/* Footer links */}
        <div className="mt-6 text-center space-y-2">
          <div className="text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">
                  Sign up
                </button>
              </>
            ) : mode === "signup" ? (
              <>
                Already have an account?{" "}
                <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">
                  Sign in
                </button>
              </>
            ) : (
              <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">
                Back to sign in
              </button>
            )}
          </div>
          {mode === "login" && (
            <button onClick={() => setMode("forgot")} className="text-xs text-muted-foreground hover:text-foreground">
              Forgot your password?
            </button>
          )}
        </div>
      </motion.div>
    </main>
  );
};

export default Auth;