import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useCallback } from "react";

export const CheckEmailPage = () => {
  const navigate = useNavigate();

  // Simple: get email from URL search params directly
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get("email") || undefined;

  const handleGoToLogin = useCallback(() => {
    void navigate({ to: "/login" });
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    void navigate({ to: "/" });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-nordic-cream flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <Card className="text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-accent-blue/10 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-accent-blue" />
          </div>

          <h1 className="text-2xl font-semibold text-text-primary mb-3">
            Check Your Email
          </h1>

          <p className="text-text-secondary mb-6 leading-relaxed">
            We've sent a verification link to{" "}
            {email ? (
              <span className="font-medium text-text-primary">{email}</span>
            ) : (
              "your email address"
            )}
            .
          </p>

          <div className="bg-nordic-warm rounded-nordic-lg p-4 mb-6">
            <p className="text-sm text-text-secondary leading-relaxed">
              Click the verification link in the email to activate your account.
              The link will expire in 24 hours.
            </p>
          </div>

          <div className="space-y-3">
            <Button onClick={handleGoToLogin} className="w-full">
              Go to Login
            </Button>
            <Button variant="ghost" onClick={handleGoHome} className="w-full">
              Back to Home
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-border-light">
            <p className="text-sm text-text-secondary">
              Didn't receive the email? Check your spam folder or{" "}
              <button
                className="text-accent-blue hover:text-accent-primary font-medium"
                type="button"
              >
                resend verification email
              </button>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
