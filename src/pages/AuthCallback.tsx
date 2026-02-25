import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const completeOAuthSession = async () => {
      const queryParams = new URLSearchParams(window.location.search);
      const authCode = queryParams.get("code");
      const authError = queryParams.get("error_description") || queryParams.get("error");

      if (authError) {
        toast.error(decodeURIComponent(authError));
        navigate("/auth", { replace: true });
        return;
      }

      if (authCode) {
        const { error } = await supabase.auth.exchangeCodeForSession(authCode);
        if (error) {
          toast.error(error.message || "OAuth login callback failed.");
          navigate("/auth", { replace: true });
          return;
        }

        toast.success("Signed in successfully.");
        navigate("/dashboard", { replace: true });
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      navigate(session ? "/dashboard" : "/auth", { replace: true });
    };

    completeOAuthSession();
  }, [navigate]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-card p-8 flex items-center gap-3">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <p className="text-sm">Completing sign-in...</p>
      </div>
    </main>
  );
};

export default AuthCallback;
