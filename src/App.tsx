import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider } from "./contexts/AuthContext";
import { BoardSettingsProvider } from "./contexts/BoardSettingsContext";
import Navbar from "./components/Navbar";
import MobileBottomNav from "./components/MobileBottomNav";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import Rules from "./pages/Rules";
import Play from "./pages/Play";
import Lobby from "./pages/Lobby";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";
import CrownTopup from "./pages/CrownTopup";
import NotFound from "./pages/NotFound";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import Settings from "./pages/Settings";
import Ratings from "./pages/Ratings";
import Notifications from "./pages/Notifications";
import Profile from "./pages/Profile";
import Spectate from "./pages/Spectate";
import TournamentDetail from "./pages/TournamentDetail";
import Puzzles from "./pages/Puzzles";
import Studies from "./pages/Studies";
import OpeningTrainer from "./pages/OpeningTrainer";
import PgnAnalysis from "./pages/PgnAnalysis";
import Challenges from "./pages/Challenges";
import BattlePass from "./pages/BattlePass";
import Tutorial from "./pages/Tutorial";
import Clubs from "./pages/Clubs";
import Social from "./pages/Social";
import Referrals from "./pages/Referrals";
import Shop from "./pages/Shop";
import DailyRewards from "./pages/DailyRewards";
import DailySpin from "./pages/DailySpin";
import Replay from "./pages/Replay";
import Achievements from "./pages/Achievements";
import MatchHistoryPage from "./pages/MatchHistoryPage";
import { ProtectedRoute } from "./components/common/ProtectedRoute";
import AchievementListener from "./components/gamification/AchievementListener";
import StreakBanner from "./components/gamification/StreakBanner";
import RealtimeNotificationToast from "./components/RealtimeNotificationToast";


const queryClient = new QueryClient();

const pageVariants = {
  initial: { opacity: 0, y: 12, filter: "blur(4px)", scale: 0.99 },
  animate: { opacity: 1, y: 0, filter: "blur(0px)", scale: 1 },
  exit: { opacity: 0, y: -8, filter: "blur(3px)", scale: 0.995 },
};

const pageTransition = {
  duration: 0.28,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

const RouteAnimator = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        variants={pageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={pageTransition}
        style={{ willChange: "opacity, transform, filter" }}
      >
        <Routes location={location}>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
          <Route path="/ratings" element={<ProtectedRoute><Ratings /></ProtectedRoute>} />
          <Route path="/play" element={<ProtectedRoute><Play /></ProtectedRoute>} />
          <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
          <Route path="/spectate" element={<ProtectedRoute><Spectate /></ProtectedRoute>} />
          <Route path="/puzzles" element={<ProtectedRoute><Puzzles /></ProtectedRoute>} />
          <Route path="/studies" element={<ProtectedRoute><Studies /></ProtectedRoute>} />
          <Route path="/openings" element={<ProtectedRoute><OpeningTrainer /></ProtectedRoute>} />
          <Route path="/analysis" element={<ProtectedRoute><PgnAnalysis /></ProtectedRoute>} />
          <Route path="/challenges" element={<ProtectedRoute><Challenges /></ProtectedRoute>} />
          <Route path="/battle-pass" element={<ProtectedRoute><BattlePass /></ProtectedRoute>} />
          <Route path="/tutorial" element={<ProtectedRoute><Tutorial /></ProtectedRoute>} />
          <Route path="/clubs" element={<ProtectedRoute><Clubs /></ProtectedRoute>} />
          <Route path="/social" element={<ProtectedRoute><Social /></ProtectedRoute>} />
          <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
          <Route path="/shop" element={<ProtectedRoute><Shop /></ProtectedRoute>} />
          <Route path="/daily-rewards" element={<ProtectedRoute><DailyRewards /></ProtectedRoute>} />
          <Route path="/daily-spin" element={<ProtectedRoute><DailySpin /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />
          <Route path="/match-history" element={<ProtectedRoute><MatchHistoryPage /></ProtectedRoute>} />
          <Route path="/replay" element={<ProtectedRoute><Replay /></ProtectedRoute>} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/tournament/:id" element={<ProtectedRoute><TournamentDetail /></ProtectedRoute>} />
          <Route path="/crown-topup" element={<ProtectedRoute><CrownTopup /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin", "moderator"]}><Admin /></ProtectedRoute>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <BoardSettingsProvider>
            <div className="app-shell">
              <Navbar />
              <AchievementListener />
              <StreakBanner />
              <RealtimeNotificationToast />

              <main className="app-main">
                <RouteAnimator />
              </main>

              <MobileBottomNav />
            </div>
          </BoardSettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
