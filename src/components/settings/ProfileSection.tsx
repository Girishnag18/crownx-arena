import { ChangeEvent } from "react";
import { Save, Loader2, User, Upload, Calendar, Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfileSectionProps {
  displayName: string;
  email: string;
  avatarUrl: string;
  avatarUploading: boolean;
  username: string;
  bio: string;
  dateOfBirth: string;
  uid: string;
  saving: boolean;
  onAvatarUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  onUsernameChange: (v: string) => void;
  onBioChange: (v: string) => void;
  onDateOfBirthChange: (v: string) => void;
  onSave: () => void;
}

const ProfileSection = ({
  displayName, email, avatarUrl, avatarUploading,
  username, bio, dateOfBirth, uid, saving,
  onAvatarUpload, onUsernameChange, onBioChange, onDateOfBirthChange, onSave,
}: ProfileSectionProps) => (
  <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
    {/* Header with avatar */}
    <div className="px-5 py-4 border-b border-border/30 flex items-center gap-4">
      <div className="relative group">
        <Avatar className="w-14 h-14 border-2 border-primary/20 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)]">
          <AvatarImage src={avatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="bg-secondary text-primary font-display font-bold">
            <User className="w-6 h-6" />
          </AvatarFallback>
        </Avatar>
        <label className="absolute inset-0 rounded-full cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
          <Upload className="w-4 h-4 text-white" />
          <input type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={onAvatarUpload} className="hidden" disabled={avatarUploading} />
        </label>
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-base font-bold truncate">{displayName}</h2>
        <p className="text-[10px] text-muted-foreground truncate">{email}</p>
      </div>
      {avatarUploading && <Loader2 className="w-4 h-4 text-primary animate-spin shrink-0" />}
    </div>

    {/* Form fields */}
    <div className="p-5 space-y-3.5">
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Username</label>
        <input
          className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          value={username} onChange={(e) => onUsernameChange(e.target.value)} placeholder="Your username"
        />
      </div>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bio</label>
        <textarea
          className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm min-h-[72px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none"
          value={bio} onChange={(e) => onBioChange(e.target.value)} placeholder="Tell us about yourself"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
            <Hash className="w-3 h-3" /> Player UID
          </label>
          <input
            className="w-full bg-secondary/30 border border-border/30 rounded-lg px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed"
            value={uid} disabled
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider flex items-center gap-1">
            <Calendar className="w-3 h-3" /> Date of Birth
          </label>
          <input
            type="date"
            className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            value={dateOfBirth} onChange={(e) => onDateOfBirthChange(e.target.value)}
          />
        </div>
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider disabled:opacity-50 inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
        Save Profile
      </button>
    </div>
  </div>
);

export default ProfileSection;
