import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
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

  useEffect(() => {
    if (!loading && user) navigate("/dashboard");
  }, [loading, user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (mode === "login") {
      const { error } = await authService.signInWithPassword(email.trim(), password);
      if (error) return toast.error(error.message);
      toast.success("Welcome back");
      navigate("/dashboard");
      return;
    }

    if (mode === "signup") {
      const { error } = await authService.signUp(email.trim(), password, username.trim());
      if (error) return toast.error(error.message);
      toast.success("Account created. Check your email for verification.");
      return;
    }

    const { error } = await authService.requestPasswordReset(email.trim());
    if (error) return toast.error(error.message);
    toast.success("Password reset link sent. Check your inbox.");
    setMode("login");
  };

  const continueWithGoogle = async () => {
    const { error } = await authService.signInWithGoogle();
    if (error) {
      toast.error(error.message || "Google sign-in is not available. Check your OAuth provider settings.");
    }
  };

  const continueWithFacebook = async () => {
    const { error } = await authService.signInWithFacebook();
    if (error) {
      toast.error(error.message || "Facebook sign-in is not available. Check your OAuth provider settings.");
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-md glass-card p-6 space-y-4">
        <h1 className="text-3xl font-bold">{mode === "login" ? "Login" : mode === "signup" ? "Create account" : "Reset password"}</h1>
        {mode === "signup" && <input className="w-full rounded-lg border bg-card p-3" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" required />}
        <input className="w-full rounded-lg border bg-card p-3" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        {mode !== "forgot" && <input className="w-full rounded-lg border bg-card p-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />}
        {mode === "signup" && (
          <p className="text-xs text-muted-foreground">Password must have 8+ characters, uppercase, lowercase, and a number.</p>
        )}
        <button className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-semibold">Continue</button>
        <button type="button" onClick={continueWithGoogle} className="w-full border rounded-lg py-3">Continue with Google</button>
        <button type="button" onClick={continueWithFacebook} className="w-full border rounded-lg py-3">Continue with Facebook</button>
        <div className="text-sm text-muted-foreground flex justify-between">
          <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")}>{mode === "login" ? "Need account?" : "Have account?"}</button>
          <button type="button" onClick={() => setMode("forgot")}>Forgot password</button>
        </div>
        <Link to="/" className="text-primary text-sm">Back to landing</Link>
      </form>
    </main>
  );
};

export default Auth;
