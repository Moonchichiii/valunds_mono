import { setAccessToken } from "@/features/accounts/api/auth";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import axios from "axios";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

type VerificationStatus = "verifying" | "success" | "error" | "expired";

export const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { token } = useParams({ strict: false });
  const [status, setStatus] = useState<VerificationStatus>("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  const verifyEmail = useCallback(async () => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token provided");
      return;
    }

    try {
      const response = await axios.post(
        `${API_URL}/api/accounts/verify-email/`,
        { token },
        { withCredentials: true }
      );

      if (response.data.user && response.data.tokens) {
        setAccessToken(response.data.tokens.access);
        queryClient.setQueryData(["auth", "me"], response.data.user);

        setStatus("success");
        setTimeout(() => {
          void navigate({ to: "/dashboard" });
        }, 3000);
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail || "Verification failed";
        setErrorMessage(message);

        if (message.includes("expired")) {
          setStatus("expired");
        } else {
          setStatus("error");
        }
      } else {
        setStatus("error");
        setErrorMessage("An unexpected error occurred");
      }
    }
  }, [token, navigate, queryClient]);

  useEffect(() => {
    void verifyEmail();
  }, [verifyEmail]);

  const handleGoHome = useCallback(() => {
    void navigate({ to: "/" });
  }, [navigate]);

  const handleGoToLogin = useCallback(() => {
    void navigate({ to: "/login" });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-nordic-cream flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Card className="text-center">
          {status === "verifying" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-accent-blue/10 rounded-full flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-accent-blue animate-spin" />
              </div>
              <h1 className="text-2xl font-semibold text-text-primary mb-3">
                Verifying your email...
              </h1>
              <p className="text-text-secondary">
                Please wait while we confirm your email address.
              </p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-success-50 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-success-600" />
              </div>
              <h1 className="text-2xl font-semibold text-text-primary mb-3">
                Email Verified Successfully!
              </h1>
              <p className="text-text-secondary mb-6">
                Your account is now active. Redirecting to your dashboard...
              </p>
              <Button
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-full"
              >
                Go to Dashboard Now
              </Button>
            </>
          )}

          {status === "expired" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-warning-50 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-warning-600" />
              </div>
              <h1 className="text-2xl font-semibold text-text-primary mb-3">
                Verification Link Expired
              </h1>
              <p className="text-text-secondary mb-6">
                This verification link has expired. Verification links are valid
                for 24 hours. Please register again or contact support.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate({ to: "/register" })}
                  className="w-full"
                >
                  Register Again
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleGoHome}
                  className="w-full"
                >
                  Go to Home
                </Button>
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 mx-auto mb-6 bg-error-50 rounded-full flex items-center justify-center">
                <XCircle className="w-8 h-8 text-error-600" />
              </div>
              <h1 className="text-2xl font-semibold text-text-primary mb-3">
                Verification Failed
              </h1>
              <p className="text-text-secondary mb-6">
                {errorMessage ||
                  "We couldn't verify your email. The link may be invalid or already used."}
              </p>
              <div className="space-y-3">
                <Button onClick={handleGoToLogin} className="w-full">
                  Go to Login
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleGoHome}
                  className="w-full"
                >
                  Go to Home
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};
