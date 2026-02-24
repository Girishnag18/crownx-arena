import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Save, Mail, KeyRound, Loader2, User, Zap, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const Settings = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [avatarUrl, setAvatarUrl] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!profile || !user) return;
    setAvatarUrl(profile.avatar_url || "");
    setUsername(profile.username || "");
    setBio(profile.bio || "");
    setDateOfBirth((user.user_metadata?.date_of_birth as string) || "");
    setEmail(user.email || "");
  }, [profile, user]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);

    const [{ error: profileError }, { error: metadataError }] = await Promise.all([
      supabase.from("profiles").update({
        avatar_url: avatarUrl || null,
        username: username || null,
        bio: bio || null,
      }).eq("id", user.id),
      supabase.auth.updateUser({
        data: { ...(user.user_metadata || {}), date_of_birth: dateOfBirth || null },
      }),
    ]);

    setSaving(false);

    if (profileError || metadataError) {
      toast.error(profileError?.message || metadataError?.message || "Failed to save");
      return;
    }

    toast.success("Profile updated successfully");
    refreshProfile();
  };

  const requestEmailOtp = async () => {
    if (!pendingEmail.trim()) {
      toast.error("Enter a new email address");
      return;
    }
    const { error } = await supabase.auth.updateUser({ email: pendingEmail.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("OTP sent to your new email. Enter it below to verify.");
  };

  const verifyEmailOtp = async () => {
    if (!pendingEmail || !emailOtp) {
      toast.error("Enter email and OTP code");
      return;
    }
    const { error } = await supabase.auth.verifyOtp({
      type: "email_change",
      email: pendingEmail,
      token: emailOtp,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmail(pendingEmail);
    setEmailOtp("");
    toast.success("Email verified and updated");
  };

  const sendPasswordOtp = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password reset link sent to your email");
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <h1 className="font-display text-3xl font-bold mb-8">Profile Settings</h1>

          {/* Avatar & identity */}
          <div className="glass-card p-6 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="w-16 h-16 border border-primary/30">
                <AvatarImage src={avatarUrl || undefined} alt={displayName} />
                <AvatarFallback className="bg-secondary text-primary">
                  <User className="w-7 h-7" />
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="font-display text-xl font-bold">{displayName}</h2>
                <p className="text-sm text-muted-foreground">{email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Username</Label>
                <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Your username" />
              </div>
              <div className="space-y-1.5">
                <Label>Bio</Label>
                <Input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself" />
              </div>
              <div className="space-y-1.5">
                <Label>Avatar URL</Label>
                <Input value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://example.com/avatar.png" />
              </div>
              <div className="space-y-1.5">
                <Label>Date of Birth</Label>
                <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
              </div>
              <button
                onClick={saveSettings}
                disabled={saving}
                className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-display font-bold tracking-wide disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Profile
              </button>
            </div>
          </div>

          {/* Email change */}
          <div className="glass-card p-6 mb-6">
            <h3 className="font-display text-lg font-bold mb-1">Change Email</h3>
            <p className="text-xs text-muted-foreground mb-4">Current: {email || "Not set"}</p>
            <div className="space-y-3">
              <Input type="email" value={pendingEmail} onChange={(e) => setPendingEmail(e.target.value)} placeholder="New email address" />
              <button
                onClick={requestEmailOtp}
                className="w-full bg-primary/15 text-primary px-4 py-2.5 rounded-lg text-sm font-display font-bold tracking-wide inline-flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" /> Send OTP
              </button>
              <Input value={emailOtp} onChange={(e) => setEmailOtp(e.target.value)} placeholder="Enter OTP code" />
              <button
                onClick={verifyEmailOtp}
                className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-display font-bold tracking-wide"
              >
                Verify Email
              </button>
            </div>
          </div>

          {/* Password */}
          <div className="glass-card p-6">
            <h3 className="font-display text-lg font-bold mb-1">Password Security</h3>
            <p className="text-xs text-muted-foreground mb-4">Send a reset link to your email to change your password.</p>
            <button
              onClick={sendPasswordOtp}
              className="w-full bg-primary/15 text-primary px-4 py-2.5 rounded-lg text-sm font-display font-bold tracking-wide inline-flex items-center justify-center gap-2"
            >
              <KeyRound className="w-4 h-4" /> Send Password Reset Link
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-4">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Profile changes sync in real-time across all sessions
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
