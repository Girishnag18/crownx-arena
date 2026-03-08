import { KeyRound } from "lucide-react";

interface PasswordSectionProps {
  onSendReset: () => void;
}

const PasswordSection = ({ onSendReset }: PasswordSectionProps) => (
  <div className="glass-card p-4 sm:p-6 mb-4 sm:mb-6">
    <h3 className="font-display text-base sm:text-lg font-bold mb-1">Password Security</h3>
    <p className="text-xs text-muted-foreground mb-4">Send a reset link to your email to change your password.</p>
    <button
      onClick={onSendReset}
      className="w-full bg-primary/15 text-primary px-4 py-2.5 rounded-lg text-sm font-display font-bold tracking-wide inline-flex items-center justify-center gap-2"
    >
      <KeyRound className="w-4 h-4" /> Send Password Reset Link
    </button>
  </div>
);

export default PasswordSection;
