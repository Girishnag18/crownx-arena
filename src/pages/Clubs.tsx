import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Users, Plus, Search, Trophy, ArrowLeft, Crown, Loader2, LogOut, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";

interface Club {
  id: string;
  name: string;
  description: string;
  logo_url: string | null;
  owner_id: string;
  member_count: number;
  total_wins: number;
  total_games: number;
  avg_rating: number;
  is_public: boolean;
  created_at: string;
}

interface ClubMember {
  id: string;
  club_id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile?: { username: string | null; avatar_url: string | null; crown_score: number };
}

type View = "list" | "create" | "detail";

const Clubs = () => {
  const { user } = useAuth();
  const [view, setView] = useState<View>("list");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [myClubIds, setMyClubIds] = useState<Set<string>>(new Set());
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  // Create form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => { loadClubs(); }, [user]);

  const loadClubs = async () => {
    setLoading(true);
    const { data } = await supabase.from("clubs").select("*").order("member_count", { ascending: false });
    setClubs((data as any[] || []) as Club[]);

    if (user) {
      const { data: memberships } = await supabase.from("club_members").select("club_id").eq("user_id", user.id);
      setMyClubIds(new Set((memberships || []).map((m: any) => m.club_id)));
    }
    setLoading(false);
  };

  const createClub = async () => {
    if (!user || !newName.trim()) return;
    setCreating(true);
    const { data, error } = await supabase.from("clubs").insert({
      name: newName.trim(),
      description: newDesc.trim(),
      owner_id: user.id,
    } as any).select().single();

    if (error) { toast.error(error.message); setCreating(false); return; }

    // Add self as owner member
    await supabase.from("club_members").insert({ club_id: (data as any).id, user_id: user.id, role: "owner" } as any);

    toast.success("Club created!");
    setNewName(""); setNewDesc("");
    setCreating(false);
    setView("list");
    loadClubs();
  };

  const joinClub = async (clubId: string) => {
    if (!user) return;
    setJoining(clubId);
    const { error } = await supabase.from("club_members").insert({ club_id: clubId, user_id: user.id } as any);
    if (error) { toast.error(error.message); setJoining(null); return; }

    // Increment member count
    await supabase.from("clubs").update({ member_count: (clubs.find(c => c.id === clubId)?.member_count || 0) + 1 } as any).eq("id", clubId);

    toast.success("Joined club!");
    setMyClubIds(prev => new Set([...prev, clubId]));
    setJoining(null);
    loadClubs();
  };

  const leaveClub = async (clubId: string) => {
    if (!user) return;
    const club = clubs.find(c => c.id === clubId);
    if (club?.owner_id === user.id) { toast.error("Owners can't leave. Delete the club instead."); return; }

    await supabase.from("club_members").delete().eq("club_id", clubId).eq("user_id", user.id);
    await supabase.from("clubs").update({ member_count: Math.max(0, (club?.member_count || 1) - 1) } as any).eq("id", clubId);

    toast.success("Left club");
    setMyClubIds(prev => { const s = new Set(prev); s.delete(clubId); return s; });
    if (selectedClub?.id === clubId) setView("list");
    loadClubs();
  };

  const openClubDetail = async (club: Club) => {
    setSelectedClub(club);
    setView("detail");

    const { data } = await supabase.from("club_members").select("*").eq("club_id", club.id).order("joined_at", { ascending: true });
    const typedMembers = (data as any[] || []) as ClubMember[];

    // Enrich with profiles
    const userIds = typedMembers.map(m => m.user_id);
    if (userIds.length > 0) {
      const { data: profiles } = await supabase.from("profiles").select("id, username, avatar_url, crown_score").in("id", userIds);
      const pMap = new Map((profiles || []).map(p => [p.id, p]));
      typedMembers.forEach(m => { m.profile = pMap.get(m.user_id) as any; });
    }
    setMembers(typedMembers);
  };

  const filteredClubs = clubs.filter(c => !search || c.name.toLowerCase().includes(search.toLowerCase()));
  const myClubs = filteredClubs.filter(c => myClubIds.has(c.id));
  const otherClubs = filteredClubs.filter(c => !myClubIds.has(c.id));

  if (loading) {
    return (
      <main className="container max-w-4xl py-24 px-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </main>
    );
  }

  return (
    <main className="container max-w-4xl py-24 px-4 space-y-6">
      <AnimatePresence mode="wait">
        {view === "list" && (
          <motion.div key="list" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold font-display flex items-center gap-2"><Shield className="w-7 h-7 text-primary" /> Chess Clubs</h1>
                <p className="text-sm text-muted-foreground">Join a team, compete together, climb the leaderboard.</p>
              </div>
              <button onClick={() => setView("create")} className="flex items-center gap-2 bg-primary text-primary-foreground font-display font-bold text-xs tracking-wider px-5 py-2.5 rounded-lg hover:scale-105 transition-transform">
                <Plus className="w-4 h-4" /> Create Club
              </button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search clubs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>

            {/* My Clubs */}
            {myClubs.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider">My Clubs</h2>
                {myClubs.map(club => (
                  <ClubCard key={club.id} club={club} isMember onOpen={() => openClubDetail(club)} onLeave={() => leaveClub(club.id)} />
                ))}
              </div>
            )}

            {/* Other Clubs */}
            <div className="space-y-2">
              <h2 className="text-sm font-display font-bold text-muted-foreground uppercase tracking-wider">
                {myClubs.length > 0 ? "Discover Clubs" : "All Clubs"}
              </h2>
              {otherClubs.length === 0 ? (
                <div className="glass-card p-8 text-center">
                  <Shield className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="font-display font-bold">No clubs found</p>
                  <p className="text-sm text-muted-foreground">Be the first to create one!</p>
                </div>
              ) : (
                otherClubs.map(club => (
                  <ClubCard key={club.id} club={club} isMember={false} onOpen={() => openClubDetail(club)}
                    onJoin={() => joinClub(club.id)} joining={joining === club.id} />
                ))
              )}
            </div>
          </motion.div>
        )}

        {view === "create" && (
          <motion.div key="create" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
            <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h2 className="text-2xl font-display font-bold">Create a Club</h2>
            <div className="glass-card p-6 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Club Name</label>
                <Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Knight Raiders" maxLength={40} />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">Description</label>
                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="What's your club about?"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-ring" maxLength={200} />
              </div>
              <button onClick={createClub} disabled={!newName.trim() || creating}
                className="w-full bg-primary text-primary-foreground font-display font-bold text-sm py-3 rounded-lg disabled:opacity-50 hover:scale-[1.01] transition-transform">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Create Club"}
              </button>
            </div>
          </motion.div>
        )}

        {view === "detail" && selectedClub && (
          <motion.div key="detail" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-6">
            <button onClick={() => setView("list")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Clubs
            </button>

            {/* Club Header */}
            <div className="glass-card p-6 border border-primary/20">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                    <Shield className="w-6 h-6 text-primary" /> {selectedClub.name}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">{selectedClub.description || "No description"}</p>
                </div>
                <div className="flex gap-2">
                  {myClubIds.has(selectedClub.id) ? (
                    selectedClub.owner_id !== user?.id && (
                      <button onClick={() => leaveClub(selectedClub.id)}
                        className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-destructive/15 text-destructive hover:bg-destructive/25">
                        <LogOut className="w-3.5 h-3.5" /> Leave
                      </button>
                    )
                  ) : (
                    <button onClick={() => joinClub(selectedClub.id)}
                      className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground">
                      <UserPlus className="w-3.5 h-3.5" /> Join
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 mt-4">
                {[
                  { label: "Members", value: selectedClub.member_count, icon: Users },
                  { label: "Games", value: selectedClub.total_games, icon: Trophy },
                  { label: "Wins", value: selectedClub.total_wins, icon: Crown },
                  { label: "Avg Rating", value: selectedClub.avg_rating, icon: Trophy },
                ].map(s => (
                  <div key={s.label} className="bg-secondary/40 rounded-lg p-3 text-center">
                    <s.icon className="w-4 h-4 text-primary mx-auto mb-1" />
                    <p className="font-display font-bold text-lg">{s.value}</p>
                    <p className="text-[10px] text-muted-foreground">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Members List */}
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm text-muted-foreground uppercase tracking-wider">
                Members ({members.length})
              </h3>
              {members.map((m, idx) => (
                <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="rounded-xl border border-border bg-card/60 p-3 flex items-center gap-3">
                  <Avatar className="w-9 h-9 border border-border/60">
                    <AvatarImage src={m.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{(m.profile?.username || "P")[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{m.profile?.username || "Player"}</p>
                      {m.role === "owner" && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary">OWNER</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{m.profile?.crown_score || 400} CrownScore</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

// Sub-component for club cards
const ClubCard = ({ club, isMember, onOpen, onJoin, onLeave, joining }: {
  club: Club; isMember: boolean; onOpen: () => void;
  onJoin?: () => void; onLeave?: () => void; joining?: boolean;
}) => (
  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-border bg-card/60 p-4 flex items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer"
    onClick={onOpen}>
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Shield className="w-6 h-6 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-display font-bold truncate">{club.name}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Users className="w-3 h-3" />{club.member_count}</span>
        <span>{club.avg_rating} avg</span>
        <span>{club.total_games} games</span>
      </div>
    </div>
    {isMember ? (
      <span className="text-[10px] font-bold px-2 py-1 rounded bg-primary/15 text-primary shrink-0">JOINED</span>
    ) : onJoin && (
      <button onClick={(e) => { e.stopPropagation(); onJoin(); }} disabled={joining}
        className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground font-bold shrink-0 hover:scale-105 transition-transform disabled:opacity-50">
        {joining ? <Loader2 className="w-3 h-3 animate-spin" /> : "Join"}
      </button>
    )}
  </motion.div>
);

export default Clubs;
