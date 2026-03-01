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

  const ensureWelcomeNotification = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("player_notifications")
      .select("id")
      .eq("user_id", userId)
      .eq("kind", "welcome")
      .limit(1);

    if ((data || []).length > 0) return;

    await (supabase as any).from("player_notifications").insert({
      user_id: userId,
      title: "Welcome to CrownX Arena 👑",
      message: "Great to have you here! Start a match, sharpen your strategy, and enjoy every move.",
      kind: "welcome",
    });
  };

  const fetchRole = async (userId: string) => {
    const { data } = await (supabase as any)
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);

    const roles = (data || []).map((r: any) => r.role as string);
    if (roles.includes("admin")) return "admin" as UserRole;
    if (roles.includes("moderator")) return "moderator" as UserRole;
    return "player" as UserRole;
  };

  const refreshProfile = async () => {
    if (!session?.user) {
      setProfile(null);
      setRole("player");
      return;
    }

    let { data } = await supabase
      .from("profiles")
      .select("username,bio,avatar_url,crown_score,player_uid")
      .eq("id", session.user.id)
      .maybeSingle();

    if (!data) {
      const username = (session.user.user_metadata?.username as string | undefined)?.trim() || null;
      await supabase
        .from("profiles")
        .upsert({ id: session.user.id, username }, { onConflict: "id" });

      const { data: inserted } = await supabase
        .from("profiles")
        .select("username,bio,avatar_url,crown_score,player_uid")
        .eq("id", session.user.id)
        .maybeSingle();
      data = inserted;
    }

    if (data) {
      const d = data as any;
      setProfile({
        username: d.username || "",
        bio: d.bio,
        avatar_url: d.avatar_url,
        crown_score: d.crown_score || 1200,
        player_uid: d.player_uid || undefined,
      });
      const userRole = await fetchRole(session.user.id);
      setRole(userRole);
      await ensureWelcomeNotification(session.user.id);
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
