import { useState } from "react";
import { ShieldAlert, LoaderCircle, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ReportButtonProps {
  gameId: string;
  reportedPlayerId: string;
}

const ReportButton = ({ gameId, reportedPlayerId }: ReportButtonProps) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reported, setReported] = useState(false);

  const handleReport = async () => {
    if (!user || reported) return;
    if (!window.confirm("Report this player for suspected engine use? This will be reviewed by moderators.")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("game_reports" as any).insert({
        game_id: gameId,
        reporter_id: user.id,
        reported_player_id: reportedPlayerId,
        reason: "engine_use",
      } as any);

      if (error) throw error;

      // Also trigger the anti-cheat analysis
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      fetch(`https://${projectId}.supabase.co/functions/v1/anti-cheat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ game_id: gameId }),
      }).catch(() => {}); // fire-and-forget

      setReported(true);
      toast.success("Report submitted. Our team will review this game.");
    } catch (err) {
      toast.error("Failed to submit report. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReport}
      disabled={loading || reported || !user}
      className={`flex items-center gap-1.5 text-xs font-display font-bold px-3 py-2 rounded-md transition-colors ${
        reported
          ? "bg-muted text-muted-foreground cursor-default"
          : "bg-destructive/15 text-destructive hover:bg-destructive/25"
      }`}
      title={reported ? "Report submitted" : "Report suspected cheating"}
    >
      {loading ? (
        <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
      ) : reported ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <ShieldAlert className="w-3.5 h-3.5" />
      )}
      {reported ? "REPORTED" : "REPORT"}
    </button>
  );
};

export default ReportButton;
