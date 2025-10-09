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
import { useGoogleReCaptcha } from "react-google-recaptcha-v3";
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
  const [failedAttempts, setFailedAttempts] = useState(0);

  const { executeRecaptcha } = useGoogleReCaptcha();

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
    async (e: FormEvent<HTMLFormElement>): Promise<void> => {
      e.preventDefault();

      if (!validateForm()) return;

      // Get reCAPTCHA token only after certain failed attempts
      let recaptchaToken = "";
      if (failedAttempts >= 2 && executeRecaptcha) {
        try {
          recaptchaToken = await executeRecaptcha("login");
        } catch (error) {
          console.error("reCAPTCHA error:", error);
          recaptchaToken = "";
        }
      }

      loginMutation.mutate(
        { email, password, recaptchaToken },
        {
          onSuccess: () => {
            setFailedAttempts(0);
            void navigate({ to: "/dashboard" });
          },
          onError: (error) => {
            if (axios.isAxiosError(error)) {
              const responseData = error.response?.data as {
                code?: string;
                detail?: string;
              };

              if (responseData?.code === "email_not_verified") {
                setShowResendVerification(true);
                setAccountLockedMessage("");
              } else if (responseData?.code === "account_locked") {
                setAccountLockedMessage(
                  responseData?.detail || "Account temporarily locked"
                );
                setShowResendVerification(false);
              } else {
                setShowResendVerification(false);
                setAccountLockedMessage("");
              }

              // Increment failed attempts for all errors except explicit account lock
              if (responseData?.code !== "account_locked") {
                setFailedAttempts((prev) => prev + 1);
              }
            }
          },
        }
      );
    },
    [
      email,
      password,
      validateForm,
      loginMutation,
      navigate,
      failedAttempts,
      executeRecaptcha,
    ]
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

  const handleGoogleLogin = useCallback((): void => {
    window.location.href = `${
      import.meta.env.VITE_API_BASE_URL
    }/api/accounts/oauth/google/initiate/`;
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

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border-light" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-nordic-white text-text-muted">
                Or continue with
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-border-medium rounded-nordic-lg hover:bg-nordic-warm transition-colors"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-sm font-medium text-text-primary">
              Continue with Google
            </span>
          </button>

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
