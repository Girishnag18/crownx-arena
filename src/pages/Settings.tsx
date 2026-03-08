import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Loader2, Zap, ArrowLeft, Settings as SettingsIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadAvatarImage } from "@/lib/avatar";
<<<<<<< HEAD
import { BOARD_THEME_OPTIONS, BoardTheme, PIECE_THEME_OPTIONS, PieceTheme } from "@/utils/chessThemes";
=======
import ProfileSection from "@/components/settings/ProfileSection";
import EmailChangeSection from "@/components/settings/EmailChangeSection";
import PasswordSection from "@/components/settings/PasswordSection";
import { BoardCustomizationSection } from "@/components/settings/BoardCustomizationSection";
import { NotificationPrefsSection } from "@/components/settings/NotificationPrefsSection";
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d

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
  const [boardTheme, setBoardTheme] = useState<BoardTheme>("wood");
  const [pieceTheme, setPieceTheme] = useState<PieceTheme>("neo");

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
    setBoardTheme((localStorage.getItem("chess-board-theme") as BoardTheme) || "wood");
    setPieceTheme((localStorage.getItem("chess-piece-theme") as PieceTheme) || "neo");
  }, [profile, user]);

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);
    const [{ data: profileData, error: profileError }, { error: metadataError }] = await Promise.all([
      supabase.from("profiles").update({
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
    localStorage.setItem("chess-board-theme", boardTheme);
    localStorage.setItem("chess-piece-theme", pieceTheme);
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Avatar upload failed.";
      toast.error(msg);
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
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-2xl">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="space-y-4">

          {/* Back + Header */}
          <motion.div variants={fadeUp}>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors font-display font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-xl sm:text-2xl font-black tracking-tight">Settings</h1>
                <p className="text-[10px] text-muted-foreground">Manage your profile, security, and preferences</p>
              </div>
            </div>
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

<<<<<<< HEAD
<<<<<<< HEAD
          <div className="glass-card p-6 mb-6">
            <h3 className="font-display text-lg font-bold mb-1">Chessboard Themes</h3>
            <p className="text-xs text-muted-foreground mb-4">Customize board colors and piece style.</p>
            <div className="space-y-4">
              <div>
                <Label className="mb-2 block">Board Style</Label>
                <div className="flex flex-wrap gap-2">
                  {BOARD_THEME_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setBoardTheme(option.id)}
                      className={`rounded-md border px-3 py-2 text-xs font-display font-bold ${
                        boardTheme === option.id ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Piece Set</Label>
                <div className="flex flex-wrap gap-2">
                  {PIECE_THEME_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPieceTheme(option.id)}
                      className={`rounded-md border px-3 py-2 text-xs font-display font-bold ${
                        pieceTheme === option.id ? "border-primary bg-primary/15 text-primary" : "border-border bg-secondary/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
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
=======
          <BoardCustomizationSection />

          <NotificationPrefsSection />
>>>>>>> d3c51e24423dfa38cc6a6faefc281915d357437d
=======
          <motion.div variants={fadeUp}>
            <BoardCustomizationSection />
          </motion.div>

          <motion.div variants={fadeUp}>
            <NotificationPrefsSection />
          </motion.div>
>>>>>>> 6124c122ca56d8d3ef82a2f3bf8390aac2ea3aad

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
