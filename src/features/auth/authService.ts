import { supabase } from "@/integrations/supabase/client";

const buildRedirect = (path: string) => `${window.location.origin}${path}`;
const oauthCallbackPath = "/auth/callback";

const passwordPolicyValid = (password: string) => /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{8,}$/.test(password);

export const authService = {
  signInWithPassword: async (email: string, password: string) =>
    supabase.auth.signInWithPassword({ email, password }),

  signInWithGoogle: async () =>
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: buildRedirect(oauthCallbackPath),
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
        },
      },
    }),

  signInWithFacebook: async () =>
    supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: buildRedirect(oauthCallbackPath),
      },
    }),

  signUp: async (email: string, password: string, username: string) => {
    if (!passwordPolicyValid(password)) {
      return {
        data: { user: null, session: null },
        error: {
          message: "Password must be at least 8 characters and include upper, lower, and a number.",
        },
      };
    }

    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: buildRedirect("/dashboard"),
        data: { username },
      },
    });
  },

  requestPasswordReset: async (email: string) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: buildRedirect("/reset-password"),
    }),

  resetPassword: async (newPassword: string) => {
    if (!passwordPolicyValid(newPassword)) {
      return {
        data: { user: null },
        error: {
          message: "Password must be at least 8 characters and include upper, lower, and a number.",
        },
      };
    }

    return supabase.auth.updateUser({ password: newPassword });
  },

  signOutCurrent: async () => supabase.auth.signOut({ scope: "local" }),

  signOutAllDevices: async () => supabase.auth.signOut({ scope: "global" }),
};
