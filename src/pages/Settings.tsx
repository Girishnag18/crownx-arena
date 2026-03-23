import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Settings as SettingsIcon, User, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadAvatarImage } from "@/lib/avatar";
import ProfileSection from "@/components/settings/ProfileSection";
import EmailChangeSection from "@/components/settings/EmailChangeSection";
import PasswordSection from "@/components/settings/PasswordSection";
import { BoardCustomizationSection } from "@/components/settings/BoardCustomizationSection";
import { NotificationPrefsSection } from "@/components/settings/NotificationPrefsSection";
import PageHeader from "@/components/layout/PageHeader";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Settings = () => {
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [email, setEmail] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [emailOtp, setEmailOtp] = useState("");
  const [saving, setSaving] = useState(false);
  const [uid, setUid] = useState("");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!profile || !user) return;
    setAvatarUrl(profile.avatar_url || "");
    setUsername(profile.username || "");
    setBio(profile.bio || "");
    setDateOfBirth((user.user_metadata?.date_of_birth as string) || "");
    setEmail(user.email || "");
    setUid(profile.player_uid || "");
  }, [profile, user]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    const [{ data: profileData, error: profileError }, { error: metadataError }] = await Promise.all([
      (supabase as any).from("profiles").update({
        avatar_url: avatarUrl || null,
        username: username || null,
        bio: bio || null,
      }).eq("id", user.id).select("player_uid").single(),
      supabase.auth.updateUser({ data: { date_of_birth: dateOfBirth || null } }),
    ]);
    setSaving(false);
    if (profileError || metadataError) {
      toast.error(profileError?.message || metadataError?.message || "Failed to save");
      return;
    }
    if (profileData?.player_uid) setUid(profileData.player_uid);
    toast.success("Profile updated successfully");
    refreshProfile();
  };

  const onAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose a JPG, JPEG, PNG, or another image file.");
      return;
    }
    setAvatarUploading(true);
    try {
      const publicUrl = await uploadAvatarImage(user.id, file);
      setAvatarUrl(publicUrl);
      toast.success("Avatar uploaded. Save profile to apply it.");
    } catch (error: any) {
      toast.error(error?.message || "Avatar upload failed.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const requestEmailOtp = async () => {
    if (!pendingEmail.trim()) { toast.error("Enter a new email address"); return; }
    const { error } = await supabase.auth.updateUser({ email: pendingEmail.trim() });
    if (error) { toast.error(error.message); return; }
    toast.success("OTP sent to your new email. Enter it below to verify.");
  };

  const verifyEmailOtp = async () => {
    if (!pendingEmail || !emailOtp) { toast.error("Enter email and OTP code"); return; }
    const { error } = await supabase.auth.verifyOtp({ type: "email_change", email: pendingEmail, token: emailOtp });
    if (error) { toast.error(error.message); return; }
    setEmail(pendingEmail);
    setEmailOtp("");
    toast.success("Email verified and updated");
  };

  const sendPasswordOtp = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Password reset link sent to your email");
  };

  const displayName = profile?.username || user?.user_metadata?.username || "Player";

  if (authLoading) {
    return (
      <div className="page-loader">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-content page-content--compact">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="space-y-4">

          <motion.div variants={fadeUp}>
            <PageHeader
              badge="Settings"
              badgeIcon={SettingsIcon}
              title="Account and preferences"
              description="Manage profile details, security, board setup, and notification preferences from one place."
              meta={[
                { icon: User, label: displayName },
                { icon: Zap, label: "Realtime sync" },
              ]}
              actions={
                <button
                  onClick={() => navigate(-1)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-border/45 bg-background/45 px-4 py-2.5 text-xs font-display font-bold uppercase tracking-[0.18em] text-foreground transition-all hover:border-primary/25 hover:bg-secondary/35"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </button>
              }
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <ProfileSection
              displayName={displayName} email={email} avatarUrl={avatarUrl}
              avatarUploading={avatarUploading} username={username} bio={bio}
              dateOfBirth={dateOfBirth} uid={uid} saving={saving}
              onAvatarUpload={onAvatarUpload} onUsernameChange={setUsername}
              onBioChange={setBio} onDateOfBirthChange={setDateOfBirth} onSave={saveSettings}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <EmailChangeSection
              email={email} pendingEmail={pendingEmail} emailOtp={emailOtp}
              onPendingEmailChange={setPendingEmail} onEmailOtpChange={setEmailOtp}
              onRequestOtp={requestEmailOtp} onVerifyOtp={verifyEmailOtp}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <PasswordSection onSendReset={sendPasswordOtp} />
          </motion.div>

          <motion.div variants={fadeUp}>
            <BoardCustomizationSection />
          </motion.div>

          <motion.div variants={fadeUp}>
            <NotificationPrefsSection />
          </motion.div>

          <motion.div variants={fadeUp} className="flex items-center gap-2 text-[10px] text-muted-foreground pb-4">
            <Zap className="w-3 h-3 text-primary" />
            Profile changes sync in real-time across all sessions
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Settings;
