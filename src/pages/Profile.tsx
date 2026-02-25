import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { uploadAvatarImage } from "@/lib/avatar";

type PublicProfile = {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  country: string | null;
  crown_score: number;
  player_uid: string;
};

type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
};

type PlayerNotification = {
  id: string;
  title: string;
  message: string;
  kind: string;
  is_read: boolean;
  created_at: string;
};

const Profile = () => {
  const { user, role, profile, refreshProfile } = useAuth();
  const [form, setForm] = useState({
    username: profile?.username || "",
    bio: profile?.bio || "",
    country: "",
    avatar_url: profile?.avatar_url || "",
    player_uid: "",
  });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [searchUid, setSearchUid] = useState("");
  const [searchResult, setSearchResult] = useState<PublicProfile | null>(null);
  const [friends, setFriends] = useState<PublicProfile[]>([]);
  const [incoming, setIncoming] = useState<(Friendship & { requester?: PublicProfile })[]>([]);
  const [notifications, setNotifications] = useState<PlayerNotification[]>([]);

  const elo = profile?.crown_score ?? 1200;
  const wins = Math.floor(elo / 15);
  const losses = Math.floor(elo / 25);

  const loadMyProfile = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("profiles")
      .select("username,bio,country,avatar_url,player_uid")
      .eq("id", user.id)
      .single();

    if (data) {
      setForm((prev) => ({
        ...prev,
        username: data.username || "",
        bio: data.bio || "",
        country: data.country || "",
        avatar_url: data.avatar_url || "",
        player_uid: data.player_uid || "",
      }));
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

    const friendIds = accepted.map((row) => (row.requester_id === user.id ? row.addressee_id : row.requester_id));
    const requesterIds = incomingRows.map((row) => row.requester_id);
    const allIds = Array.from(new Set([...friendIds, ...requesterIds]));

    const profileMap = new Map<string, PublicProfile>();
    if (allIds.length > 0) {
      const { data: profileRows } = await (supabase as any)
        .from("profiles")
        .select("id, username, bio, avatar_url, country, crown_score, player_uid")
        .in("id", allIds);
      (profileRows || []).forEach((entry: PublicProfile) => profileMap.set(entry.id, entry));
    }

    setFriends(friendIds.map((id) => profileMap.get(id)).filter(Boolean) as PublicProfile[]);
    setIncoming(incomingRows.map((entry) => ({ ...entry, requester: profileMap.get(entry.requester_id) })));
  };

  const loadNotifications = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("player_notifications")
      .select("id,title,message,kind,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25);

    setNotifications((data || []) as PlayerNotification[]);
  };

  useEffect(() => {
    loadMyProfile();
    loadSocialData();
    loadNotifications();
  }, [user?.id]);

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        username: form.username.trim() || null,
        bio: form.bio.trim() || null,
        country: form.country.trim() || null,
        avatar_url: form.avatar_url || null,
      })
      .eq("id", user.id);
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    await refreshProfile();
    toast.success("Profile saved and visible to all players.");
  };

  const onAvatarUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file.");
      return;
    }

    setAvatarUploading(true);
    try {
      const publicUrl = await uploadAvatarImage(user.id, file);
      setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
      toast.success("Avatar uploaded. Save profile to make it public.");
    } catch (error: any) {
      toast.error(error?.message || "Avatar upload failed.");
    } finally {
      setAvatarUploading(false);
      event.target.value = "";
    }
  };

  const performUidSearch = async () => {
    const clean = searchUid.trim();
    if (!/^\d{8}$/.test(clean)) {
      toast.error("Enter a valid 8-digit UID.");
      return;
    }

    const { data, error } = await (supabase as any)
      .from("profiles")
      .select("id,username,bio,avatar_url,country,crown_score,player_uid")
      .eq("player_uid", clean)
      .single();

    if (error || !data) {
      setSearchResult(null);
      toast.error("No player found for this UID.");
      return;
    }

    setSearchResult(data as PublicProfile);
  };

  const sendFriendRequest = async () => {
    if (!user || !searchResult) return;
    if (searchResult.id === user.id) {
      toast.error("You cannot add yourself.");
      return;
    }

    const { error } = await (supabase as any)
      .from("friendships")
      .upsert({ requester_id: user.id, addressee_id: searchResult.id, status: "pending" }, { onConflict: "requester_id,addressee_id" });

    if (error) {
      toast.error(error.message);
      return;
    }

    await (supabase as any).from("player_notifications").insert({
      user_id: searchResult.id,
      title: "New friend request",
      message: `${form.username || "A player"} kept a friend request to you.`,
      kind: "friend_request",
    });

    toast.success("Friend request sent.");
  };

  const updateFriendRequest = async (request: Friendship, status: "accepted" | "declined") => {
    if (!user) return;

    const { error } = await (supabase as any)
      .from("friendships")
      .update({ status })
      .eq("id", request.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    if (status === "accepted") {
      await (supabase as any).from("player_notifications").insert({
        user_id: request.requester_id,
        title: "Friend request accepted",
        message: `${form.username || "A player"} accepted your friend request.`,
        kind: "friend_accept",
      });
    }

    await loadSocialData();
    toast.success(status === "accepted" ? "Friend request accepted." : "Friend request declined.");
  };

  const unreadCount = useMemo(() => notifications.filter((item) => !item.is_read).length, [notifications]);

  const markNotificationRead = async (notificationId: string) => {
    await (supabase as any).from("player_notifications").update({ is_read: true }).eq("id", notificationId);
    setNotifications((prev) => prev.map((item) => (item.id === notificationId ? { ...item, is_read: true } : item)));
  };

  return (
    <main className="container max-w-6xl py-24 px-4 space-y-6">
      <h1 className="text-4xl font-bold">Player Profile</h1>

      <section className="glass-card p-6 grid lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          <Avatar className="w-20 h-20 border border-border">
            <AvatarImage src={form.avatar_url || undefined} alt={form.username || "Player"} />
            <AvatarFallback>{(form.username || "P").slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <label className="text-sm font-medium">Upload Avatar</label>
          <input type="file" accept="image/*,.jpg,.jpeg,.png,.webp" onChange={onAvatarUpload} className="w-full text-sm" disabled={avatarUploading} />
          <p className="text-xs text-muted-foreground">Your profile image is saved and shown to other players.</p>
        </div>

        <div className="space-y-3 lg:col-span-2">
          <div>
            <p className="text-sm text-muted-foreground">Username</p>
            <input className="w-full rounded-lg border bg-card p-3" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Bio</p>
            <textarea className="w-full rounded-lg border bg-card p-3 min-h-[84px]" value={form.bio} onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))} />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Country</p>
              <input className="w-full rounded-lg border bg-card p-3" value={form.country} onChange={(e) => setForm((prev) => ({ ...prev, country: e.target.value }))} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Player UID</p>
              <input className="w-full rounded-lg border bg-card p-3" value={form.player_uid} disabled />
            </div>
          </div>
          <button onClick={saveProfile} disabled={saving} className="bg-primary text-primary-foreground px-5 py-2 rounded-lg font-semibold">
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </section>

      <section className="glass-card p-6 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div><p className="text-sm text-muted-foreground">Role</p><p className="capitalize">{role}</p></div>
        <div><p className="text-sm text-muted-foreground">ELO</p><p className="text-2xl text-primary font-bold">{elo}</p></div>
        <div><p className="text-sm text-muted-foreground">Wins</p><p>{wins}</p></div>
        <div><p className="text-sm text-muted-foreground">Losses</p><p>{losses}</p></div>
      </section>

      <section className="glass-card p-6 space-y-4">
        <h2 className="text-2xl font-bold">Find players by UID</h2>
        <div className="flex gap-2">
          <input
            className="w-full rounded-lg border bg-card p-3"
            value={searchUid}
            onChange={(e) => setSearchUid(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="Enter 8-digit UID"
          />
          <button className="border rounded-lg px-4" onClick={performUidSearch}>Search</button>
        </div>
        {searchResult && (
          <div className="rounded-lg border p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarImage src={searchResult.avatar_url || undefined} alt={searchResult.username || "Player"} />
                <AvatarFallback>{(searchResult.username || "P").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{searchResult.username || "Player"}</p>
                <p className="text-xs text-muted-foreground">UID: {searchResult.player_uid}</p>
              </div>
            </div>
            <button onClick={sendFriendRequest} className="bg-primary text-primary-foreground px-3 py-2 rounded-lg">Add Friend</button>
          </div>
        )}
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-3">
          <h2 className="text-2xl font-bold">Friend Requests</h2>
          {incoming.length === 0 ? <p className="text-sm text-muted-foreground">No pending requests.</p> : incoming.map((item) => (
            <div key={item.id} className="rounded-lg border p-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{item.requester?.username || "Player"}</p>
                <p className="text-xs text-muted-foreground">UID: {item.requester?.player_uid || "-"}</p>
              </div>
              <div className="flex gap-2">
                <button className="border rounded px-3 py-1" onClick={() => updateFriendRequest(item, "declined")}>Decline</button>
                <button className="bg-primary text-primary-foreground rounded px-3 py-1" onClick={() => updateFriendRequest(item, "accepted")}>Accept</button>
              </div>
            </div>
          ))}
        </div>

        <div className="glass-card p-6 space-y-3">
          <h2 className="text-2xl font-bold">Friends List</h2>
          {friends.length === 0 ? <p className="text-sm text-muted-foreground">No friends yet.</p> : friends.map((friend) => (
            <div key={friend.id} className="rounded-lg border p-3 flex items-center gap-3">
              <Avatar>
                <AvatarImage src={friend.avatar_url || undefined} alt={friend.username || "Player"} />
                <AvatarFallback>{(friend.username || "P").slice(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{friend.username || "Player"}</p>
                <p className="text-xs text-muted-foreground">UID: {friend.player_uid}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="notifications" className="glass-card p-6 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Notification Center</h2>
          <span className="text-sm text-muted-foreground">Unread: {unreadCount}</span>
        </div>
        {notifications.length === 0 ? <p className="text-sm text-muted-foreground">No notifications yet.</p> : notifications.map((item) => (
          <button
            key={item.id}
            onClick={() => markNotificationRead(item.id)}
            className={`w-full text-left rounded-lg border p-3 ${item.is_read ? "opacity-70" : "border-primary/40"}`}
          >
            <p className="font-semibold">{item.title}</p>
            <p className="text-sm">{item.message}</p>
            <p className="text-xs text-muted-foreground mt-1">{new Date(item.created_at).toLocaleString()}</p>
          </button>
        ))}
      </section>
    </main>
  );
};

export default Profile;
