// frontend/src/features/accounts/pages/ForgotPasswordPage.tsx

import { useRequestPasswordReset } from "@/features/accounts/api/auth";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Mail } from "lucide-react";
import { useCallback, useState, type FC, type FormEvent } from "react";

export const ForgotPasswordPage: FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const requestResetMutation = useRequestPasswordReset();

  const validateEmail = useCallback((email: string): boolean => {
    if (!email) {
      setError("Email is required");
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    setError("");
    return true;
  }, []);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>): void => {
      e.preventDefault();

      if (!validateEmail(email)) return;

      requestResetMutation.mutate(email, {
        onSuccess: () => {
          setSubmitted(true);
        },
      });
    },
    [email, validateEmail, requestResetMutation]
  );

  if (submitted) {
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
              If an account exists with{" "}
              <span className="font-medium text-text-primary">{email}</span>,
              you'll receive password reset instructions.
            </p>

            <div className="bg-nordic-warm rounded-nordic-lg p-4 mb-6">
              <p className="text-sm text-text-secondary leading-relaxed">
                The reset link will expire in 1 hour. If you don't receive an
                email, check your spam folder.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => navigate({ to: "/login" })}
                className="w-full"
              >
                Back to Login
              </Button>
              <Button
                variant="ghost"
                onClick={() => setSubmitted(false)}
                className="w-full"
              >
                Try Different Email
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nordic-cream flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="flex items-center">
          <Link
            to="/login"
            className="inline-flex items-center text-text-secondary hover:text-accent-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to login
          </Link>
        </div>

        <div className="text-center">
          <Link to="/" className="text-3xl font-bold text-accent-primary">
            Valunds
          </Link>
          <h2 className="mt-6 text-3xl font-semibold text-text-primary">
            Reset your password
          </h2>
          <p className="mt-2 text-text-secondary">
            Enter your email and we'll send you reset instructions
          </p>
        </div>

        <Card className="bg-nordic-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError("");
              }}
              placeholder="your@email.com"
              error={error}
              required
              autoComplete="email"
              autoFocus
            />

            <Button
              type="submit"
              size="lg"
              loading={requestResetMutation.isPending}
              className="w-full"
            >
              {requestResetMutation.isPending
                ? "Sending..."
                : "Send Reset Link"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Remember your password?{" "}
              <Link
                to="/login"
                className="text-accent-blue hover:text-accent-primary font-medium transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};
