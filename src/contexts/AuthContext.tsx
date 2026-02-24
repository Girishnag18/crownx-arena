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
    const { data } = await supabase
      .from("profiles")
      .select("username,bio,avatar_url,crown_score,role")
      .eq("id", session.user.id)
      .single();

    if (data) {
      const profileData = data as any;
      setProfile(profileData);
      setRole((profileData.role as UserRole) || "player");
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
    supabase.from("profiles").update({ online_status: true, rank_tier: getRankTier(profile?.crown_score || 1200) }).eq("id", session.user.id);
    return () => {
      supabase.from("profiles").update({ online_status: false }).eq("id", session.user.id);
    };
  }, [session?.user?.id, profile?.crown_score]);

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
