// frontend/src/features/accounts/pages/LoginPage.tsx

import { useLogin, useResendVerification } from "@/features/accounts/api/auth";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Link, useNavigate } from "@tanstack/react-router";
import axios from "axios";
import { ArrowLeft, Eye, EyeOff, Shield } from "lucide-react";
import {
  type ChangeEvent,
  type FC,
  type FormEvent,
  useCallback,
  useState,
} from "react";

interface FormErrors {
  email?: string;
  password?: string;
}

export const LoginPage: FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [showResendVerification, setShowResendVerification] = useState(false);
  const [accountLockedMessage, setAccountLockedMessage] = useState<string>("");

  const loginMutation = useLogin();
  const resendVerificationMutation = useResendVerification();

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>): void => {
      e.preventDefault();

      if (!validateForm()) return;

      loginMutation.mutate(
        { email, password },
        {
          onSuccess: () => {
            void navigate({ to: "/dashboard" });
          },
          onError: (error) => {
            // Check for specific error codes
            if (axios.isAxiosError(error)) {
              const responseData = error.response?.data as {
                code?: string;
                detail?: string;
              };

              if (responseData?.code === "email_not_verified") {
                setShowResendVerification(true);
                setAccountLockedMessage(""); // Clear any locked message
              } else if (responseData?.code === "account_locked") {
                // Show account locked message in the form
                setAccountLockedMessage(
                  responseData?.detail || "Account temporarily locked"
                );
                setShowResendVerification(false); // Clear verification message
              } else {
                // Clear both messages for other errors
                setShowResendVerification(false);
                setAccountLockedMessage("");
              }
            }
          },
        }
      );
    },
    [email, password, loginMutation, navigate, validateForm]
  );

  const handleResendVerification = useCallback((): void => {
    resendVerificationMutation.mutate(email, {
      onSuccess: () => {
        setShowResendVerification(false);
      },
    });
  }, [email, resendVerificationMutation]);

  const handleEmailChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      setEmail(e.target.value);
      setErrors((prev) => ({ ...prev, email: undefined }));
      setShowResendVerification(false);
      setAccountLockedMessage("");
    },
    []
  );

  const handlePasswordChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>): void => {
      setPassword(e.target.value);
      setErrors((prev) => ({ ...prev, password: undefined }));
    },
    []
  );

  const togglePasswordVisibility = useCallback((): void => {
    setShowPassword((prev) => !prev);
  }, []);

  return (
    <div className="min-h-screen bg-nordic-cream flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Back to Home */}
        <div className="flex items-center">
          <Link
            to="/"
            className="inline-flex items-center text-text-secondary hover:text-accent-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
        </div>

        {/* Header */}
        <div className="text-center">
          <Link to="/" className="text-3xl font-bold text-accent-primary">
            Valunds
          </Link>
          <h2 className="mt-6 text-3xl font-semibold text-text-primary">
            Welcome back
          </h2>
          <p className="mt-2 text-text-secondary">
            Sign in to your Nordic professional account
          </p>
        </div>

        {/* Login Form */}
        <Card className="bg-nordic-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={handleEmailChange}
              placeholder="your@email.com"
              error={errors.email}
              required
              autoComplete="email"
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                error={errors.password}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className="absolute right-3 top-[2.75rem] text-text-muted hover:text-text-secondary transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Account locked message */}
            {accountLockedMessage && (
              <div className="bg-error-50 border border-error-200 rounded-nordic-lg p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-error-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-error-700 font-medium mb-2">
                    Account Temporarily Locked
                  </p>
                  <p className="text-sm text-error-600 mb-3">
                    {accountLockedMessage}
                  </p>
                  <p className="text-xs text-error-600">
                    If you forgot your password, you can{" "}
                    <Link
                      to="/forgot-password"
                      className="underline font-medium hover:text-error-700"
                    >
                      reset it here
                    </Link>
                    .
                  </p>
                </div>
              </div>
            )}

            {/* Email not verified message */}
            {showResendVerification && (
              <div className="bg-warning-50 border border-warning-200 rounded-nordic-lg p-4">
                <p className="text-sm text-warning-700 font-medium mb-2">
                  Email not verified
                </p>
                <p className="text-sm text-warning-600 mb-3">
                  Please verify your email address to log in.
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleResendVerification}
                  loading={resendVerificationMutation.isPending}
                  className="w-full"
                >
                  {resendVerificationMutation.isPending
                    ? "Sending..."
                    : "Resend verification email"}
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-accent-blue focus:ring-accent-blue border-border-medium rounded"
                  aria-describedby="remember-me-description"
                />
                <label
                  htmlFor="remember-me"
                  className="ml-2 block text-sm text-text-secondary"
                  id="remember-me-description"
                >
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <Link
                  to="/forgot-password"
                  className="text-accent-blue hover:text-accent-primary transition-colors"
                  aria-label="Reset your password"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              loading={loginMutation.isPending}
              disabled={loginMutation.isPending || !!accountLockedMessage}
              className="w-full"
            >
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="text-accent-blue hover:text-accent-primary font-medium transition-colors"
              >
                Create one here
              </Link>
            </p>
          </div>

          {/* Social Proof */}
          <div className="mt-8 pt-6 border-t border-border-light">
            <div className="text-center">
              <p className="text-sm text-text-muted mb-4">
                Trusted by Nordic professionals
              </p>
              <div className="flex justify-center items-center space-x-6 text-text-muted">
                <span className="text-xs">🇸🇪 Sweden</span>
                <span className="text-xs">🇳🇴 Norway</span>
                <span className="text-xs">🇩🇰 Denmark</span>
                <span className="text-xs">🇫🇮 Finland</span>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};
