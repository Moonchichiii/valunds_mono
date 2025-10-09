import { setAccessToken } from "@/features/accounts/api/auth";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "react-hot-toast";

export const OAuthCallbackPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");

    if (error) {
      let errorMessage = "Authentication failed. Please try again.";

      if (error === "oauth_failed") {
        errorMessage = "Google sign-in failed. Please try again.";
      } else if (error === "account_inactive") {
        errorMessage = "Your account is inactive. Please contact support.";
      }

      toast.error(errorMessage);
      void navigate({ to: "/login" });
      return;
    }

    // Read cookie
    const getCookie = (name: string): string | null => {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(";").shift() || null;
      }
      return null;
    };

    const accessToken = getCookie("access_token");

    if (accessToken) {
      // Save token in memory
      setAccessToken(accessToken);

      // Delete cookie
      document.cookie = "access_token=; Max-Age=0; path=/; SameSite=Lax";

      // Refresh auth data
      void queryClient.invalidateQueries({ queryKey: ["auth"] });

      toast.success("Successfully signed in with Google!");
      void navigate({ to: "/dashboard" });
    } else {
      toast.error("Authentication failed. No access token received.");
      void navigate({ to: "/login" });
    }
  }, [navigate, queryClient]);

  return (
    <div className="min-h-screen bg-nordic-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Completing sign in with Google...</p>
      </div>
    </div>
  );
};
