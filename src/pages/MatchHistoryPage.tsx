import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { History, Crown } from "lucide-react";
import MatchHistory from "@/components/profile/MatchHistory";
import BackButton from "@/components/common/BackButton";
import PageHeader from "@/components/layout/PageHeader";

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
      <div className="page-content page-content--narrow">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="space-y-4"
        >
          <PageHeader
            badge="History"
            badgeIcon={History}
            title="Match history"
            description="Review completed games, revisit replays, and keep your recent results easy to scan."
            actions={<BackButton />}
          />

          <MatchHistory playerId={user.id} />
        </motion.div>
      </div>
    </div>
  );
};

export default MatchHistoryPage;
