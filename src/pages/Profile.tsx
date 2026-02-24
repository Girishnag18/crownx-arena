import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { profile, role } = useAuth();
  const elo = profile?.crown_score ?? 1200;
  const wins = Math.floor(elo / 15);
  const losses = Math.floor(elo / 25);

  return (
    <main className="container max-w-5xl py-24 px-4">
      <h1 className="text-4xl font-bold mb-8">Player Profile</h1>
      <section className="glass-card p-6 grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Username</p>
          <p className="text-2xl font-bold">{profile?.username || "Player"}</p>
          <p className="text-sm text-muted-foreground mt-3">Bio</p>
          <p>{profile?.bio || "No bio yet."}</p>
          <p className="text-sm text-muted-foreground mt-3">Role</p>
          <p className="capitalize">{role}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">ELO Rating</p>
          <p className="text-3xl font-bold text-primary">{elo}</p>
          <p>Wins: {wins}</p>
          <p>Losses: {losses}</p>
          <p>Online status: <span className="text-emerald-400">Online</span></p>
        </div>
      </section>
    </main>
  );
};

export default Profile;
