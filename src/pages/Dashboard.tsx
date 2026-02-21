import { motion } from "framer-motion";
import { Crown, Swords, Bot, Globe, Users, Trophy, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";

const ratingData = [
  { date: "Jan", rating: 1200 },
  { date: "Feb", rating: 1250 },
  { date: "Mar", rating: 1230 },
  { date: "Apr", rating: 1310 },
  { date: "May", rating: 1350 },
  { date: "Jun", rating: 1420 },
  { date: "Jul", rating: 1400 },
  { date: "Aug", rating: 1480 },
];

const recentGames = [
  { opponent: "Magnus_X", result: "Win", rating: "+15", time: "2 min ago" },
  { opponent: "ChessLord99", result: "Loss", rating: "-12", time: "15 min ago" },
  { opponent: "KnightRider", result: "Win", rating: "+18", time: "1 hr ago" },
  { opponent: "QueenSlayer", result: "Draw", rating: "+2", time: "3 hr ago" },
  { opponent: "PawnStorm", result: "Win", rating: "+14", time: "5 hr ago" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Dashboard = () => {
  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          className="grid grid-cols-1 lg:grid-cols-12 gap-6"
        >
          {/* Profile Card */}
          <motion.div variants={fadeUp} className="lg:col-span-4 glass-card p-6 border-glow">
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center gold-glow">
                  <Crown className="w-8 h-8 text-primary" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-card" style={{ background: "hsl(142 71% 45%)" }} />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">Player_One</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gradient-gold font-display font-bold">👑 Gold</span>
                  <span className="text-muted-foreground">• Level 24</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: "Played", value: "347" },
                { label: "Wins", value: "218" },
                { label: "Win Rate", value: "62.8%" },
              ].map((stat) => (
                <div key={stat.label} className="bg-secondary/50 rounded-lg p-3 text-center">
                  <div className="font-display text-lg font-bold text-foreground">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-secondary/30 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">CrownScore™</span>
                <span className="font-display text-lg font-bold text-primary">1,480</span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: "74%" }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="h-full bg-gradient-to-r from-gold-dim to-primary rounded-full"
                />
              </div>
              <div className="text-xs text-muted-foreground mt-1">520 points to Platinum</div>
            </div>
          </motion.div>

          {/* Quick Play */}
          <motion.div variants={fadeUp} className="lg:col-span-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {[
                { icon: Swords, title: "Quick Play", desc: "Find an opponent now", accent: true },
                { icon: Bot, title: "vs Computer", desc: "Practice with AI" },
                { icon: Globe, title: "World Arena", desc: "Global matchmaking" },
                { icon: Users, title: "Private Room", desc: "Invite a friend" },
              ].map((mode) => (
                <motion.button
                  key={mode.title}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`glass-card p-5 text-left group transition-all duration-300 ${
                    mode.accent ? "border-primary/30 gold-glow" : "hover:border-primary/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      mode.accent ? "bg-primary/20" : "bg-secondary"
                    }`}>
                      <mode.icon className={`w-5 h-5 ${mode.accent ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-sm">{mode.title}</h3>
                      <p className="text-xs text-muted-foreground">{mode.desc}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Rating Graph */}
            <motion.div variants={fadeUp} className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display font-bold flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Rating Progress
                </h3>
                <span className="text-xs text-muted-foreground">Last 8 months</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={ratingData}>
                  <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(225 10% 50%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "hsl(225 10% 50%)" }} axisLine={false} tickLine={false} domain={["auto", "auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(225 20% 8%)",
                      border: "1px solid hsl(225 15% 20%)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="hsl(45 100% 50%)"
                    strokeWidth={2}
                    dot={{ fill: "hsl(45 100% 50%)", r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </motion.div>
          </motion.div>

          {/* Tournaments */}
          <motion.div variants={fadeUp} className="lg:col-span-5 glass-card p-6">
            <h3 className="font-display font-bold flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              Active Tournaments
            </h3>
            {[
              { name: "Crown Championship", players: "128/256", prize: "🏆 $500", status: "Open" },
              { name: "Blitz Arena", players: "64/64", prize: "🏅 $100", status: "Full" },
              { name: "Weekly Rapid", players: "32/128", prize: "🎖️ $250", status: "Open" },
            ].map((t) => (
              <div key={t.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <div className="font-semibold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.players} players • {t.prize}</div>
                </div>
                <span className={`text-xs font-display font-bold px-2 py-1 rounded ${
                  t.status === "Open" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                }`}>
                  {t.status}
                </span>
              </div>
            ))}
          </motion.div>

          {/* Recent Games */}
          <motion.div variants={fadeUp} className="lg:col-span-7 glass-card p-6">
            <h3 className="font-display font-bold flex items-center gap-2 mb-4">
              <Clock className="w-5 h-5 text-primary" />
              Recent Games
            </h3>
            <div className="space-y-1">
              {recentGames.map((g, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${
                      g.result === "Win" ? "bg-success" : g.result === "Loss" ? "bg-destructive" : "bg-muted-foreground"
                    }`} />
                    <span className="text-sm font-semibold">{g.opponent}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-display font-bold ${
                      g.result === "Win" ? "text-success-foreground" : g.result === "Loss" ? "text-destructive" : "text-muted-foreground"
                    }`}>
                      {g.rating}
                    </span>
                    <span className="text-xs text-muted-foreground">{g.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard;
