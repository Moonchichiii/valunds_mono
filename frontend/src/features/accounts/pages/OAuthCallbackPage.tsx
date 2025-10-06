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
    const access = params.get("access");
    const refresh = params.get("refresh");
    const error = params.get("error");

    if (error) {
      toast.error("Authentication failed. Please try again.");
      void navigate({ to: "/login" });
      return;
    }

    if (access && refresh) {
      // Store access token
      setAccessToken(access);

      // Refresh token is already in HttpOnly cookie from backend
      // Just need to invalidate queries to refetch user data
      void queryClient.invalidateQueries({ queryKey: ["auth"] });

      toast.success("Successfully signed in with Google!");
      void navigate({ to: "/dashboard" });
    } else {
      toast.error("Authentication failed. Please try again.");
      void navigate({ to: "/login" });
    }
  }, [navigate, queryClient]);

  return (
    <div className="min-h-screen bg-nordic-cream flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-secondary">Completing sign in...</p>
      </div>
    </div>
  );
};
