import { Mail } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EmailChangeSectionProps {
  email: string;
  pendingEmail: string;
  emailOtp: string;
  onPendingEmailChange: (v: string) => void;
  onEmailOtpChange: (v: string) => void;
  onRequestOtp: () => void;
  onVerifyOtp: () => void;
}

const EmailChangeSection = ({
  email, pendingEmail, emailOtp,
  onPendingEmailChange, onEmailOtpChange, onRequestOtp, onVerifyOtp,
}: EmailChangeSectionProps) => (
  <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6">
    <h3 className="font-display text-base sm:text-lg font-bold mb-1">Change Email</h3>
    <p className="text-xs text-muted-foreground mb-4">Current: {email || "Not set"}</p>
    <div className="space-y-3">
      <Input type="email" value={pendingEmail} onChange={(e) => onPendingEmailChange(e.target.value)} placeholder="New email address" />
      <button
        onClick={onRequestOtp}
        className="w-full bg-primary/15 text-primary px-4 py-2.5 rounded-lg text-sm font-display font-bold tracking-wide inline-flex items-center justify-center gap-2"
      >
        <Mail className="w-4 h-4" /> Send OTP
      </button>
      <Input value={emailOtp} onChange={(e) => onEmailOtpChange(e.target.value)} placeholder="Enter OTP code" />
      <button
        onClick={onVerifyOtp}
        className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-sm font-display font-bold tracking-wide"
      >
        Verify Email
      </button>
    </div>
  </div>
);

export default EmailChangeSection;
