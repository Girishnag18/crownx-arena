import { supabase } from "@/integrations/supabase/client";

const OTP_KEY = "crownx_password_otp";

export const authService = {
  signInWithPassword: async (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithGoogle: async () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/dashboard` },
    }),

  signUp: async (email: string, password: string, username: string) =>
    supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { username },
      },
    }),

  sendForgotPasswordOtp: async (email: string) => {
    const otp = `${Math.floor(100000 + Math.random() * 900000)}`;
    localStorage.setItem(OTP_KEY, JSON.stringify({ email, otp, expiresAt: Date.now() + 10 * 60_000 }));
    return otp;
  },

  verifyForgotPasswordOtp: (email: string, otp: string) => {
    const payload = localStorage.getItem(OTP_KEY);
    if (!payload) return false;
    const parsed = JSON.parse(payload) as { email: string; otp: string; expiresAt: number };
    return parsed.email === email && parsed.otp === otp && parsed.expiresAt > Date.now();
  },

  resetPassword: async (newPassword: string) => supabase.auth.updateUser({ password: newPassword }),

  signOutCurrent: async () => supabase.auth.signOut({ scope: "local" }),

  signOutAllDevices: async () => supabase.auth.signOut({ scope: "global" }),
};
