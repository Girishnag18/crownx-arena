import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { History, Crown } from "lucide-react";
import MatchHistory from "@/components/profile/MatchHistory";
import BackButton from "@/components/common/BackButton";

const MatchHistoryPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) navigate("/auth");
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center pt-20">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
          <Crown className="w-10 h-10 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background pt-16 pb-20 lg:pb-6">
      <div className="container mx-auto max-w-3xl px-3 sm:px-4 lg:px-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-4"
        >
          {/* Header */}
          <div className="flex items-center gap-3 pt-4">
            <BackButton />
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="font-display text-lg font-black tracking-tight">Match History</h1>
                <p className="text-xs text-muted-foreground">Review your recent games and replays</p>
              </div>
            </div>
          </div>

          {/* Match list */}
          <MatchHistory playerId={user.id} />
        </motion.div>
      </div>
    </div>
  );
};

export default MatchHistoryPage;
