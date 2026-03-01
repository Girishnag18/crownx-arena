import { ChangeEvent, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { uploadAvatarImage } from "@/lib/avatar";
import ProfileCard from "@/components/ProfileCard";
import { motion } from "framer-motion";
import { Edit3, X } from "lucide-react";

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

const Profile = () => {
  const { user, refreshProfile } = useAuth();
  const [profileData, setProfileData] = useState<FullProfile | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ username: "", bio: "", country: "", avatar_url: "" });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [searchUid, setSearchUid] = useState("");
  const [searchResult, setSearchResult] = useState<FullProfile | null>(null);
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

  useEffect(() => {
    loadMyProfile();
    loadSocialData();
  }, [user?.id]);

  // Realtime profile updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`profile-live-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${user.id}` }, loadMyProfile)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // Realtime friendship updates
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

  return (
    <main className="container max-w-6xl py-24 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold font-display">Player Profile</h1>
        {profileData && !editing && (
          <button onClick={() => setEditing(true)} className="flex items-center gap-2 text-sm border border-border rounded-lg px-4 py-2 hover:bg-secondary/50 transition-colors">
            <Edit3 className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </div>

      {/* Profile Card or Edit Form */}
      {profileData && !editing ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
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
          />
        </motion.div>
      ) : (
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-6 grid lg:grid-cols-3 gap-6">
          <div className="space-y-3">
            <Avatar className="w-20 h-20 border border-border">
              <AvatarImage src={form.avatar_url || undefined} alt={form.username || "Player"} />
              <AvatarFallback>{(form.username || "P").slice(0, 1).toUpperCase()}</AvatarFallback>
            </Avatar>
            <label className="text-sm font-medium">Upload Avatar</label>
            <input type="file" accept="image/*" onChange={onAvatarUpload} className="w-full text-sm" disabled={avatarUploading} />
          </div>

          <div className="space-y-3 lg:col-span-2">
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <input className="w-full rounded-lg border border-border bg-card p-3" value={form.username} onChange={(e) => setForm((p) => ({ ...p, username: e.target.value }))} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Bio</p>
              <textarea className="w-full rounded-lg border border-border bg-card p-3 min-h-[84px]" value={form.bio} onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <input className="w-full rounded-lg border border-border bg-card p-3" value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Player UID</p>
              <input className="w-full rounded-lg border border-border bg-card p-3 text-muted-foreground" value={profileData?.player_uid || ""} disabled />
            </div>
            <div className="flex gap-2">
              <button onClick={saveProfile} disabled={saving} className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold">
                {saving ? "Saving..." : "Save Profile"}
              </button>
              {profileData && (
                <button onClick={() => setEditing(false)} className="border border-border px-4 py-2 rounded-lg text-sm flex items-center gap-1">
                  <X className="w-4 h-4" /> Cancel
                </button>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {/* Search Players */}
      <section className="glass-card p-6 space-y-4">
        <h2 className="text-2xl font-bold font-display">Find Players by UID</h2>
        <div className="flex gap-2">
          <input
            className="w-full rounded-lg border border-border bg-card p-3"
            value={searchUid}
            onChange={(e) => setSearchUid(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Enter 8-digit UID"
          />
          <button className="border border-border rounded-lg px-4 hover:bg-secondary/50 transition-colors" onClick={performUidSearch}>Search</button>
        </div>
        {searchResult && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <ProfileCard {...searchResult} username={searchResult.username || "Player"} compact />
            </div>
            <button onClick={sendFriendRequest} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg text-sm shrink-0">Add Friend</button>
          </div>
        )}
      </section>

      {/* Social */}
      <section className="grid lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-xl font-bold font-display">Incoming Requests</h2>
          {incoming.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : incoming.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{item.requester?.username || "Player"}</p>
                <p className="text-[10px] text-muted-foreground font-mono">UID: {item.requester?.player_uid || "-"}</p>
              </div>
              <div className="flex gap-2">
                <button className="border border-border rounded px-3 py-1 text-xs hover:bg-secondary/50" onClick={() => updateFriendRequest(item, "declined")}>Decline</button>
                <button className="bg-primary text-primary-foreground rounded px-3 py-1 text-xs" onClick={() => updateFriendRequest(item, "accepted")}>Accept</button>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-6 space-y-3">
          <h2 className="text-xl font-bold font-display">Outgoing Requests</h2>
          {outgoing.length === 0 ? <p className="text-sm text-muted-foreground">No outgoing requests.</p> : outgoing.map((item) => (
            <div key={item.id} className="rounded-lg border border-border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-sm">{item.addressee?.username || "Player"}</p>
                <p className="text-[10px] text-muted-foreground font-mono">UID: {item.addressee?.player_uid || "-"}</p>
              </div>
              <button className="border border-border rounded px-3 py-1 text-xs hover:bg-secondary/50" onClick={() => deleteFriendship(item.id, "Request cancelled.")}>Cancel</button>
            </div>
          ))}
        </div>

        <div className="glass-card p-6 space-y-3">
          <h2 className="text-xl font-bold font-display">Friends List</h2>
          {friends.length === 0 ? <p className="text-sm text-muted-foreground">No friends yet.</p> : friends.map((friend) => (
            <div key={friend.id} className="space-y-2">
              <ProfileCard {...friend} username={friend.username || "Player"} compact />
              <button className="border border-border rounded px-3 py-1 text-xs w-full hover:bg-secondary/50" onClick={() => unfriendPlayer(friend.id)}>Remove</button>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default Profile;
