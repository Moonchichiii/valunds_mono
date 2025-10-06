// frontend/src/features/accounts/pages/CheckEmailPage.tsx
// Replace entire file

import { useResendVerification } from "@/features/accounts/api/auth";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { useNavigate } from "@tanstack/react-router";
import { Mail } from "lucide-react";
import { useCallback, useState } from "react";

export const CheckEmailPage = () => {
  const navigate = useNavigate();
  const [emailResent, setEmailResent] = useState(false);

  // Get email from URL search params
  const searchParams = new URLSearchParams(window.location.search);
  const email = searchParams.get("email") || undefined;

  const resendVerificationMutation = useResendVerification();

  const handleGoToLogin = useCallback(() => {
    void navigate({ to: "/login" });
  }, [navigate]);

  const handleGoHome = useCallback(() => {
    void navigate({ to: "/" });
  }, [navigate]);

  const handleResendEmail = useCallback(() => {
    if (!email) return;

    resendVerificationMutation.mutate(email, {
      onSuccess: () => {
        setEmailResent(true);
      },
    });
  }, [email, resendVerificationMutation]);

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
              The link will expire in 1 hour.
            </p>
          </div>

          {emailResent && (
            <div className="bg-success-50 border border-success-200 rounded-nordic-lg p-4 mb-6">
              <p className="text-sm text-success-700 font-medium">
                New verification email sent! Check your inbox.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Button onClick={handleGoToLogin} className="w-full">
              Go to Login
            </Button>
            <Button variant="ghost" onClick={handleGoHome} className="w-full">
              Back to Home
            </Button>
          </div>

          <div className="mt-6 pt-6 border-t border-border-light">
            <p className="text-sm text-text-secondary mb-3">
              Didn't receive the email? Check your spam folder or
            </p>
            {email ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResendEmail}
                loading={resendVerificationMutation.isPending}
                disabled={resendVerificationMutation.isPending}
                className="text-accent-blue hover:text-accent-primary"
              >
                {resendVerificationMutation.isPending
                  ? "Sending..."
                  : "Resend verification email"}
              </Button>
            ) : (
              <p className="text-sm text-text-muted">
                Return to registration to try again
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
