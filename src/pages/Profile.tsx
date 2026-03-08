import { ChangeEvent, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { uploadAvatarImage } from "@/lib/avatar";
import ProfileCard, { EquippedItem } from "@/components/ProfileCard";
import PerformanceTab from "@/components/profile/PerformanceTab";
import MatchHistory from "@/components/profile/MatchHistory";
import AchievementShowcase from "@/components/profile/AchievementShowcase";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, X, Swords, MessageCircle, Search, Users, UserPlus, Clock, Upload, Save, User } from "lucide-react";
import DirectMessagePanel from "@/components/social/DirectMessagePanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";

type FullProfile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  country: string | null;
  crown_score: number;
  player_uid: string;
  wins: number;
  losses: number;
  games_played: number;
  win_streak: number;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
};

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState<FullProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "", country: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [searchUid, setSearchUid] = useState("");
  const [searchResult, setSearchResult] = useState<FullProfile | null>(null);
  const [dmFriend, setDmFriend] = useState<{ id: string; username: string | null; avatar_url: string | null } | null>(null);
  const [equippedItems, setEquippedItems] = useState<EquippedItem[]>([]);
  const [friends, setFriends] = useState<FullProfile[]>([]);
  const [incoming, setIncoming] = useState<(Friendship & { requester?: FullProfile })[]>([]);
  const [outgoing, setOutgoing] = useState<(Friendship & { addressee?: FullProfile })[]>([]);

  const loadMyProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,username,bio,country,avatar_url,player_uid,crown_score,wins,losses,games_played,win_streak")
      .eq("id", user.id)
      .single();

    if (data) {
      const p = data as unknown as FullProfile;
      setProfileData(p);
      setForm({ username: p.username || "", bio: p.bio || "", country: p.country || "", avatar_url: p.avatar_url || "" });
    }
  };

  const loadSocialData = async () => {
    if (!user) return;
    const { data: friendships } = await (supabase as any)
      .from("friendships")
      .select("id, requester_id, addressee_id, status")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const rows = (friendships || []) as Friendship[];
    const accepted = rows.filter((row) => row.status === "accepted");
    const incomingRows = rows.filter((row) => row.status === "pending" && row.addressee_id === user.id);
    const outgoingRows = rows.filter((row) => row.status === "pending" && row.requester_id === user.id);

    const friendIds = accepted.map((row) => (row.requester_id === user.id ? row.addressee_id : row.requester_id));
    const requesterIds = incomingRows.map((row) => row.requester_id);
    const addresseeIds = outgoingRows.map((row) => row.addressee_id);
    const allIds = Array.from(new Set([...friendIds, ...requesterIds, ...addresseeIds]));

    const profileMap = new Map<string, FullProfile>();
    if (allIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id,username,bio,avatar_url,country,crown_score,player_uid,wins,losses,games_played,win_streak")
        .in("id", allIds);
      (profileRows || []).forEach((entry: any) => profileMap.set(entry.id, entry as FullProfile));
    }

    setFriends(friendIds.map((id) => profileMap.get(id)).filter(Boolean) as FullProfile[]);
    setIncoming(incomingRows.map((entry) => ({ ...entry, requester: profileMap.get(entry.requester_id) })));
    setOutgoing(outgoingRows.map((entry) => ({ ...entry, addressee: profileMap.get(entry.addressee_id) })));
  };

  const loadEquippedItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("shop_purchases")
      .select("item_id, is_equipped")
      .eq("user_id", user.id)
      .eq("is_equipped", true);

    if (data && data.length > 0) {
      const itemIds = data.map((p) => p.item_id);
      const { data: items } = await supabase
        .from("shop_items")
        .select("name, icon, category, rarity")
        .in("id", itemIds);
      setEquippedItems((items || []) as EquippedItem[]);
    } else {
      setEquippedItems([]);
    }
  };

  useEffect(() => {
    loadMyProfile();
    loadSocialData();
    loadEquippedItems();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-live-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, loadMyProfile)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`friendships-live-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, loadSocialData)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        username: form.username.trim() || null,
        bio: form.bio.trim() || null,
        country: form.country.trim() || null,
        avatar_url: form.avatar_url || null,
      })
      .eq("id", user.id);
    setSaving(false);

    if (error) { toast.error(error.message); return; }
    await refreshProfile();
    setEditing(false);
    toast.success("Profile saved.");
  };

  const onAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file."); return; }

    setAvatarUploading(true);
    try {
      const publicUrl = await uploadAvatarImage(user.id, file);
      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Avatar uploaded. Save to apply.");
    } catch (err: any) {
      toast.error(err?.message || "Upload failed.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const performUidSearch = async () => {
    const clean = searchUid.trim();
    if (!/^\d{8}$/.test(clean)) { toast.error("Enter a valid 8-digit UID."); return; }

    const { data } = await supabase
      .from("profiles")
      .select("id,username,bio,avatar_url,country,crown_score,player_uid,wins,losses,games_played,win_streak")
      .eq("player_uid", clean)
      .single();

    if (!data) { setSearchResult(null); toast.error("No player found."); return; }
    setSearchResult(data as unknown as FullProfile);
  };

  const sendFriendRequest = async () => {
    if (!user || !searchResult) return;
    if (searchResult.id === user.id) { toast.error("You cannot add yourself."); return; }

    const { data: existing } = await (supabase as any)
      .from("friendships")
      .select("id")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${searchResult.id}),and(requester_id.eq.${searchResult.id},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) { toast.error("Friendship request already exists."); return; }

    const { error } = await (supabase as any).from("friendships").insert({ requester_id: user.id, addressee_id: searchResult.id, status: "pending" });
    if (error) { toast.error(error.message); return; }

    await (supabase as any).from("player_notifications").insert({
      user_id: searchResult.id,
      title: "New friend request",
      message: `${profileData?.username || "A player"} sent you a friend request.`,
      kind: "friend_request",
    });

    await loadSocialData();
    toast.success("Friend request sent.");
  };

  const updateFriendRequest = async (request: Friendship, status: "accepted" | "declined") => {
    const { error } = await (supabase as any).from("friendships").update({ status }).eq("id", request.id);
    if (error) { toast.error(error.message); return; }

    if (status === "accepted") {
      await (supabase as any).from("player_notifications").insert({
        user_id: request.requester_id,
        title: "Friend request accepted",
        message: `${profileData?.username || "A player"} accepted your friend request.`,
        kind: "friend_accept",
      });
    }

    await loadSocialData();
    toast.success(status === "accepted" ? "Friend accepted." : "Request declined.");
  };

  const deleteFriendship = async (friendshipId: string, msg: string) => {
    const { error } = await (supabase as any).from("friendships").delete().eq("id", friendshipId);
    if (error) { toast.error(error.message); return; }
    await loadSocialData();
    toast.success(msg);
  };

  const unfriendPlayer = async (friendId: string) => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("friendships")
      .select("id")
      .eq("status", "accepted")
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${friendId}),and(requester_id.eq.${friendId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (!data?.id) { toast.error("Friendship not found."); return; }
    await deleteFriendship(data.id, "Friend removed.");
  };

  const challengeFriend = (friendId: string) => {
    navigate("/lobby");
    toast.success("Redirecting to lobby — create a private room and share the code!");
  };

  return (
    <div className="page-container">
      <div className="container mx-auto max-w-6xl">
        <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.07 } } }} className="space-y-5">

          {/* ═══════════ PAGE HEADER ═══════════ */}
          <motion.div variants={fadeUp} className="flex items-center justify-between gap-3">
            <h1 className="font-display text-2xl sm:text-3xl font-black tracking-tight">Player Profile</h1>
            {profileData && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-2 text-xs font-display font-bold border border-border/40 rounded-xl px-4 py-2.5 hover:bg-secondary/30 hover:border-border/60 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5" /> Edit Profile
              </button>
            )}
          </motion.div>

          {/* ═══════════ PROFILE CARD / EDIT FORM ═══════════ */}
          {profileData && !editing ? (
            <motion.div variants={fadeUp}>
              <ProfileCard
                username={profileData.username || "Player"}
                player_uid={profileData.player_uid}
                avatar_url={profileData.avatar_url}
                bio={profileData.bio}
                country={profileData.country}
                crown_score={profileData.crown_score}
                wins={profileData.wins}
                losses={profileData.losses}
                games_played={profileData.games_played}
                win_streak={profileData.win_streak}
                equippedItems={equippedItems}
              />
            </motion.div>
          ) : (
            <motion.div variants={fadeUp} className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
              {/* Edit header */}
              <div className="px-5 py-4 border-b border-border/30 flex items-center justify-between">
                <h2 className="font-display font-bold text-sm flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-primary" />
                  Edit Profile
                </h2>
                {profileData && (
                  <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
                    <X className="w-3.5 h-3.5" /> Cancel
                  </button>
                )}
              </div>
              <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-4 gap-5">
                {/* Avatar column */}
                <div className="flex flex-col items-center gap-3">
                  <Avatar className="w-24 h-24 border-2 border-primary/20 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.2)]">
                    <AvatarImage src={form.avatar_url || undefined} alt={form.username || "Player"} />
                    <AvatarFallback className="bg-secondary text-primary font-display font-bold text-2xl">
                      <User className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
                  <label className="cursor-pointer flex items-center gap-1.5 text-[10px] font-display font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg hover:bg-primary/15 transition-colors">
                    <Upload className="w-3 h-3" />
                    {avatarUploading ? "Uploading..." : "Upload Avatar"}
                    <input type="file" accept="image/*" onChange={onAvatarUpload} className="hidden" disabled={avatarUploading} />
                  </label>
                </div>

                {/* Form fields */}
                <div className="lg:col-span-3 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Username</label>
                      <input className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Country</label>
                      <input className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Bio</label>
                    <textarea className="w-full bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all resize-none" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Player UID</label>
                    <input className="w-full bg-secondary/30 border border-border/30 rounded-lg px-3 py-2.5 text-sm text-muted-foreground cursor-not-allowed" value={profileData?.player_uid || ""} disabled />
                  </div>
                  <button
                    onClick={saveProfile}
                    disabled={saving}
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-lg text-xs font-display font-bold tracking-wider flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : "Save Profile"}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ═══════════ TABS ═══════════ */}
          <motion.div variants={fadeUp}>
            <Tabs defaultValue="performance" className="w-full">
              <TabsList className="w-full grid grid-cols-3 sm:grid-cols-5 rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm p-1 h-auto">
                {[
                  { value: "performance", label: "Performance", icon: "📊" },
                  { value: "history", label: "History", icon: "⚔️" },
                  { value: "achievements", label: "Achievements", icon: "🏆" },
                  { value: "social", label: "Social", icon: "👥" },
                  { value: "search", label: "Find", icon: "🔍" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="text-[10px] sm:text-xs font-display font-bold rounded-lg py-2 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none transition-all"
                  >
                    <span className="hidden sm:inline mr-1">{tab.icon}</span> {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <div className="mt-4">
                <TabsContent value="performance" className="mt-0">
                  {user && <PerformanceTab playerId={user.id} currentElo={profileData?.crown_score || 400} />}
                </TabsContent>

                <TabsContent value="history" className="mt-0">
                  {user && <MatchHistory playerId={user.id} />}
                </TabsContent>

                <TabsContent value="achievements" className="mt-0">
                  {user && <AchievementShowcase playerId={user.id} />}
                </TabsContent>

                <TabsContent value="social" className="mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Incoming Requests */}
                    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-primary" />
                        <h2 className="font-display font-bold text-xs">Incoming Requests</h2>
                        {incoming.length > 0 && (
                          <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full ml-auto">{incoming.length}</span>
                        )}
                      </div>
                      <div className="p-4 space-y-2">
                        {incoming.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No pending requests</p>
                        ) : incoming.map((item) => (
                          <div key={item.id} className="rounded-lg border border-border/30 bg-secondary/10 p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-display font-bold text-xs">{item.requester?.username || "Player"}</p>
                              <p className="text-[9px] text-muted-foreground font-mono">UID: {item.requester?.player_uid || "-"}</p>
                            </div>
                            <div className="flex gap-1.5">
                              <button className="text-[10px] font-display font-bold border border-border/40 rounded-lg px-2.5 py-1 hover:bg-secondary/30 transition-colors" onClick={() => updateFriendRequest(item, "declined")}>Decline</button>
                              <button className="text-[10px] font-display font-bold bg-primary text-primary-foreground rounded-lg px-2.5 py-1 hover:opacity-90 transition-opacity" onClick={() => updateFriendRequest(item, "accepted")}>Accept</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Outgoing Requests */}
                    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <h2 className="font-display font-bold text-xs">Outgoing Requests</h2>
                      </div>
                      <div className="p-4 space-y-2">
                        {outgoing.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No outgoing requests</p>
                        ) : outgoing.map((item) => (
                          <div key={item.id} className="rounded-lg border border-border/30 bg-secondary/10 p-3 flex items-center justify-between gap-3">
                            <div>
                              <p className="font-display font-bold text-xs">{item.addressee?.username || "Player"}</p>
                              <p className="text-[9px] text-muted-foreground font-mono">UID: {item.addressee?.player_uid || "-"}</p>
                            </div>
                            <button className="text-[10px] font-display font-bold border border-border/40 rounded-lg px-2.5 py-1 hover:bg-secondary/30 transition-colors" onClick={() => deleteFriendship(item.id, "Request cancelled.")}>Cancel</button>
                          </div>
                        )))}
                      </div>
                    </div>

                    {/* Friends List */}
                    <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
                      <div className="px-4 py-3 border-b border-border/30 flex items-center gap-2">
                        <Users className="w-4 h-4 text-primary" />
                        <h2 className="font-display font-bold text-xs">Friends</h2>
                        {friends.length > 0 && (
                          <span className="text-[9px] bg-primary/10 text-primary font-bold px-1.5 py-0.5 rounded-full ml-auto">{friends.length}</span>
                        )}
                      </div>
                      <div className="p-4 space-y-3 max-h-[24rem] overflow-y-auto">
                        {friends.length === 0 ? (
                          <p className="text-xs text-muted-foreground text-center py-4">No friends yet</p>
                        ) : friends.map((friend) => (
                          <div key={friend.id} className="space-y-2">
                            <ProfileCard {...friend} username={friend.username || "Player"} compact />
                            <div className="flex gap-1.5 pl-1">
                              <button
                                className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-display font-bold bg-primary/10 text-primary border border-primary/20 rounded-lg px-2 py-1.5 hover:bg-primary/15 transition-colors"
                                onClick={() => challengeFriend(friend.id)}
                              >
                                <Swords className="w-3 h-3" /> Challenge
                              </button>
                              <button
                                className="flex-1 inline-flex items-center justify-center gap-1 text-[10px] font-display font-bold border border-border/40 rounded-lg px-2 py-1.5 hover:bg-secondary/30 transition-colors"
                                onClick={() => setDmFriend({ id: friend.id, username: friend.username, avatar_url: friend.avatar_url })}
                              >
                                <MessageCircle className="w-3 h-3" /> Message
                              </button>
                              <button
                                className="text-[10px] font-display font-bold border border-border/40 rounded-lg px-2.5 py-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/20 transition-colors"
                                onClick={() => unfriendPlayer(friend.id)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="search" className="mt-0">
                  <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      <h2 className="font-display font-bold text-sm">Find Players by UID</h2>
                    </div>
                    <div className="p-5 space-y-4">
                      <div className="flex gap-2">
                        <input
                          className="flex-1 bg-secondary/50 border border-border/40 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
                          value={searchUid}
                          onChange={(e) => setSearchUid(e.target.value.replace(/\D/g, "").slice(0, 8))}
                          placeholder="Enter 8-digit UID"
                        />
                        <button
                          onClick={performUidSearch}
                          className="bg-primary text-primary-foreground px-4 rounded-lg text-xs font-display font-bold hover:opacity-90 transition-opacity flex items-center gap-1.5"
                        >
                          <Search className="w-3.5 h-3.5" /> Search
                        </button>
                      </div>
                      {searchResult && (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1">
                            <ProfileCard {...searchResult} username={searchResult.username || "Player"} compact />
                          </div>
                          <button
                            onClick={sendFriendRequest}
                            className="bg-primary text-primary-foreground px-4 py-2.5 rounded-lg text-xs font-display font-bold shrink-0 hover:opacity-90 transition-opacity flex items-center gap-1.5"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Friend
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>

      {/* DM Panel */}
      <AnimatePresence>
        {dmFriend && (
          <DirectMessagePanel friend={dmFriend} onClose={() => setDmFriend(null)} />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
