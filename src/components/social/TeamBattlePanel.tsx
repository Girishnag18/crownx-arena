import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords, Shield, Users, Trophy, Crown, Loader2, Check, Clock, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface TeamBattle {
  id: string;
  challenger_club_id: string;
  opponent_club_id: string;
  board_count: number;
  status: string;
  challenger_score: number;
  opponent_score: number;
  created_at: string;
  challenger_club?: { name: string; member_count: number };
  opponent_club?: { name: string; member_count: number };
}

interface TeamBattlePanelProps {
  clubId: string;
  clubName: string;
  allClubs: Array<{ id: string; name: string; member_count: number }>;
}

const TeamBattlePanel = ({ clubId, clubName, allClubs }: TeamBattlePanelProps) => {
  const { user } = useAuth();
  const [battles, setBattles] = useState<TeamBattle[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [targetClub, setTargetClub] = useState("");
  const [boardCount, setBoardCount] = useState(4);

  useEffect(() => {
    loadBattles();
  }, [clubId]);

  const loadBattles = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("team_battles")
      .select("*, challenger_club:clubs!team_battles_challenger_club_id_fkey(name, member_count), opponent_club:clubs!team_battles_opponent_club_id_fkey(name, member_count)")
      .or(`challenger_club_id.eq.${clubId},opponent_club_id.eq.${clubId}`)
      .order("created_at", { ascending: false })
      .limit(20);
    setBattles((data || []) as TeamBattle[]);
    setLoading(false);
  };

  const createBattle = async () => {
    if (!user || !targetClub) return;
    setCreating(true);

    const { error } = await (supabase as any)
      .from("team_battles")
      .insert({
        challenger_club_id: clubId,
        opponent_club_id: targetClub,
        board_count: boardCount,
        status: "pending",
      });

    if (error) {
      toast.error(error.message);
      setCreating(false);
      return;
    }

    toast.success("Team battle challenge sent!");
    setCreating(false);
    setShowCreate(false);
    setTargetClub("");
    loadBattles();
  };

  const acceptBattle = async (battleId: string) => {
    await (supabase as any)
      .from("team_battles")
      .update({ status: "active" })
      .eq("id", battleId);
    toast.success("Battle accepted! Time to assign players.");
    loadBattles();
  };

  const eligibleClubs = allClubs.filter(c => c.id !== clubId);

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/10 text-amber-500",
      active: "bg-emerald-500/10 text-emerald-500",
      completed: "bg-primary/10 text-primary",
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          Team Battles
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-xs font-display font-bold text-primary hover:text-primary/80 transition-colors"
        >
          + Challenge
        </button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Challenge Club
                </label>
                <select
                  value={targetClub}
                  onChange={e => setTargetClub(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select opponent club...</option>
                  {eligibleClubs.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.member_count} members)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
                  Boards (players per side)
                </label>
                <div className="flex gap-2">
                  {[2, 4, 6, 8].map(n => (
                    <button
                      key={n}
                      onClick={() => setBoardCount(n)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        boardCount === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      {n}v{n}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={createBattle}
                disabled={!targetClub || creating}
                className="w-full bg-primary text-primary-foreground rounded-lg py-2.5 text-xs font-display font-bold disabled:opacity-50"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Send ${boardCount}v${boardCount} Challenge`}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : battles.length === 0 ? (
        <div className="text-center py-6">
          <Swords className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No team battles yet. Challenge another club!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {battles.map((battle, idx) => {
            const isChallenger = battle.challenger_club_id === clubId;
            const ourName = isChallenger ? battle.challenger_club?.name : battle.opponent_club?.name;
            const theirName = isChallenger ? battle.opponent_club?.name : battle.challenger_club?.name;
            const ourScore = isChallenger ? battle.challenger_score : battle.opponent_score;
            const theirScore = isChallenger ? battle.opponent_score : battle.challenger_score;
            const canAccept = !isChallenger && battle.status === "pending";

            return (
              <motion.div
                key={battle.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="rounded-xl border border-border bg-card/60 p-3.5"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="font-display font-bold text-xs">{ourName}</span>
                    <span className="text-muted-foreground text-xs">vs</span>
                    <span className="font-display font-bold text-xs">{theirName}</span>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${statusBadge(battle.status)}`}>
                    {battle.status}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>{battle.board_count}v{battle.board_count}</span>
                    <span className="flex items-center gap-1">
                      <Trophy className="w-3 h-3" />
                      {ourScore} - {theirScore}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(battle.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {canAccept && (
                    <button
                      onClick={() => acceptBattle(battle.id)}
                      className="text-[10px] font-display font-bold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                    >
                      Accept
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeamBattlePanel;
