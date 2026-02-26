import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types/domain";
import { getRankTier } from "@/utils/ranking";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: UserRole;
  loading: boolean;
  profile: {
    username: string;
    bio: string | null;
    avatar_url: string | null;
    crown_score: number;
    player_uid?: string;
  } | null;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  signOutAllDevices: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: "player",
  loading: true,
  profile: null,
  refreshProfile: async () => {},
  signOut: async () => {},
  signOutAllDevices: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AuthContextType["profile"]>(null);
  const [role, setRole] = useState<UserRole>("player");

  const refreshProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      setRole("player");
      return;
    }

    let { data } = await supabase
      .from("profiles")
      .select("username,bio,avatar_url,crown_score,role,player_uid")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!data) {
      const username = (session.user.user_metadata?.username as string | undefined)?.trim() || null;
      await supabase
        .from("profiles")
        .upsert({ id: session.user.id, username }, { onConflict: "id" });

      const { data: inserted } = await supabase
        .from("profiles")
        .select("username,bio,avatar_url,crown_score,role,player_uid")
        .eq("id", session.user.id)
        .maybeSingle();
      data = inserted;
    }

    if (data) {
      const profileData = data as { username: string | null; bio: string | null; avatar_url: string | null; crown_score: number; role: UserRole | null; player_uid?: string | null };
      setProfile({
        username: profileData.username || "",
        bio: profileData.bio,
        avatar_url: profileData.avatar_url,
        crown_score: profileData.crown_score || 1200,
        player_uid: profileData.player_uid || undefined,
      });
      setRole(profileData.role || "player");
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      setSession(current);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    supabase.from("profiles").update({ rank_tier: getRankTier(profile?.crown_score || 1200) }).eq("id", session.user.id);
    return () => {
      // cleanup on unmount
    };
  }, [session?.user?.id, profile?.crown_score]);


  useEffect(() => {
    if (!session?.user?.id) return;

    const profileChannel = supabase
      .channel(`auth-profile-live-${session.user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${session.user.id}` }, () => {
        refreshProfile();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [session?.user?.id]);
  const signOut = async () => {
    await supabase.auth.signOut({ scope: "local" });
  };

  const signOutAllDevices = async () => {
    await supabase.auth.signOut({ scope: "global" });
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, profile, loading, refreshProfile, signOut, signOutAllDevices }}>
      {children}
    </AuthContext.Provider>
  );
};
