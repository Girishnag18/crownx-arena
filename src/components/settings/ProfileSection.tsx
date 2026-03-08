import { ChangeEvent } from "react";
import { Save, Loader2, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6">
    <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
      <Avatar className="w-12 h-12 sm:w-16 sm:h-16 border border-primary/30">
        <AvatarImage src={avatarUrl || undefined} alt={displayName} />
        <AvatarFallback className="bg-secondary text-primary">
          <User className="w-7 h-7" />
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <h2 className="font-display text-lg sm:text-xl font-bold truncate">{displayName}</h2>
        <p className="text-xs sm:text-sm text-muted-foreground truncate">{email}</p>
      </div>
    </div>

    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Username</Label>
        <Input value={username} onChange={(e) => onUsernameChange(e.target.value)} placeholder="Your username" />
      </div>
      <div className="space-y-1.5">
        <Label>Bio</Label>
        <Input value={bio} onChange={(e) => onBioChange(e.target.value)} placeholder="Tell us about yourself" />
      </div>
      <div className="space-y-1.5">
        <Label>Avatar Upload</Label>
        <Input type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={onAvatarUpload} disabled={avatarUploading} />
        <p className="text-xs text-muted-foreground">JPG, JPEG, PNG, WEBP and other image formats supported.</p>
      </div>
      <div className="space-y-1.5">
        <Label>UID</Label>
        <Input value={uid} disabled />
        <p className="text-xs text-muted-foreground">This 8-digit in-game ID is generated automatically.</p>
      </div>
      <div className="space-y-1.5">
        <Label>Date of Birth</Label>
        <Input type="date" value={dateOfBirth} onChange={(e) => onDateOfBirthChange(e.target.value)} />
      </div>
      <button
        onClick={onSave}
        disabled={saving}
        className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-display font-bold tracking-wide disabled:opacity-60 inline-flex items-center justify-center gap-2"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Profile
      </button>
    </div>
  </div>
);

export default ProfileSection;
