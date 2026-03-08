import { KeyRound, Send } from "lucide-react";

interface PasswordSectionProps {
  onSendReset: () => void;
}

const PasswordSection = ({ onSendReset }: PasswordSectionProps) => (
  <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
    <div className="px-5 py-3.5 border-b border-border/30 flex items-center gap-2">
      <KeyRound className="w-4 h-4 text-primary" />
      <h3 className="font-display font-bold text-xs">Password Security</h3>
    </div>
    <div className="p-5">
      <p className="text-xs text-muted-foreground mb-3">We'll send a secure reset link to your registered email address.</p>
      <button
        onClick={onSendReset}
        className="w-full bg-primary/10 text-primary border border-primary/20 px-4 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider inline-flex items-center justify-center gap-2 hover:bg-primary/15 transition-colors"
      >
        <Send className="w-3.5 h-3.5" /> Send Password Reset Link
      </button>
    </div>
  </div>
);

export default PasswordSection;
