import { Mail, ShieldCheck } from "lucide-react";

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
  <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
    <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
      <Mail className="w-4 h-4 text-primary" />
      <h3 className="font-display font-bold text-xs">Change Email</h3>
      <span className="text-[9px] text-muted-foreground ml-auto">{email || "Not set"}</span>
    </div>
    <div className="p-5 space-y-3">
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">New Email Address</label>
        <input
          type="email"
          className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          value={pendingEmail} onChange={(e) => onPendingEmailChange(e.target.value)} placeholder="your-new@email.com"
        />
      </div>
      <button
        onClick={onRequestOtp}
        className="w-full bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider inline-flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors"
      >
        <Mail className="w-3.5 h-3.5" /> Send Verification Code
      </button>
      <div className="space-y-1">
        <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Verification Code</label>
        <input
          className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          value={emailOtp} onChange={(e) => onEmailOtpChange(e.target.value)} placeholder="Enter OTP code"
        />
      </div>
      <button
        onClick={onVerifyOtp}
        className="w-full bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
      >
        <ShieldCheck className="w-3.5 h-3.5" /> Verify & Update Email
      </button>
    </div>
  </div>
);

export default EmailChangeSection;
