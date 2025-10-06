import {
  usePasswordStrength,
  useResetPassword,
} from "@/features/accounts/api/auth";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Link, useNavigate, useParams } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle, Eye, EyeOff } from "lucide-react";
import { useCallback, useState, type FC, type FormEvent } from "react";

export const ResetPasswordPage: FC = () => {
  const navigate = useNavigate();
  const { token } = useParams({ strict: false });
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    password?: string;
    confirmPassword?: string;
  }>({});

  const resetPasswordMutation = useResetPassword();
  const passwordStrength = usePasswordStrength(password);

  const validateForm = useCallback((): boolean => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = "Password is required";
    } else if (passwordStrength.score < 3) {
      newErrors.password = "Password is too weak";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [password, confirmPassword, passwordStrength]);

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>): void => {
      e.preventDefault();

      if (!validateForm() || !token) return;

      resetPasswordMutation.mutate(
        { token, password },
        {
          onSuccess: () => {
            setTimeout(() => {
              void navigate({ to: "/login" });
            }, 2000);
          },
        }
      );
    },
    [password, token, validateForm, resetPasswordMutation, navigate]
  );

  const strengthColors = [
    "bg-error-500",
    "bg-error-500",
    "bg-warning-500",
    "bg-accent-blue",
    "bg-success-500",
  ];
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];

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
            Create new password
          </h2>
          <p className="mt-2 text-text-secondary">
            Choose a strong password for your account
          </p>
        </div>

        <Card className="bg-nordic-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative">
              <Input
                label="New Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                error={errors.password}
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
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

            {password && (
              <div className="space-y-2">
                <div className="flex space-x-1">
                  {[0, 1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        level < passwordStrength.score
                          ? strengthColors[passwordStrength.score - 1]
                          : "bg-border-light"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-text-muted">
                  Password strength:{" "}
                  {strengthLabels[passwordStrength.score - 1] ??
                    "Enter a password"}
                </p>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-text-muted space-y-1">
                    {passwordStrength.feedback.map((item, idx) => (
                      <li key={idx}>• {item}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Input
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
              }}
              error={errors.confirmPassword}
              required
            />

            <Button
              type="submit"
              size="lg"
              loading={resetPasswordMutation.isPending}
              disabled={resetPasswordMutation.isPending}
              className="w-full"
            >
              {resetPasswordMutation.isPending
                ? "Resetting..."
                : "Reset Password"}
            </Button>
          </form>

          {resetPasswordMutation.isSuccess && (
            <div className="mt-6 bg-success-50 border border-success-200 rounded-nordic-lg p-4 flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-success-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-success-700">
                  Password reset successful!
                </p>
                <p className="text-sm text-success-600 mt-1">
                  Redirecting to login...
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};
