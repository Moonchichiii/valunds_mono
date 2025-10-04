import { usePasswordStrength, useRegister } from "@/features/accounts/api/auth";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phoneNumber: string;
  address: string;
  city: string;
  postcode: string;
  country: string;
  acceptTerms: boolean;
  userType: "freelancer" | "client";
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phoneNumber?: string;
  address?: string;
  city?: string;
  postcode?: string;
  acceptTerms?: string;
}

export const RegisterPage = (): React.JSX.Element => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phoneNumber: "",
    address: "",
    city: "",
    postcode: "",
    country: "Sweden",
    acceptTerms: false,
    userType: "freelancer",
  });
  const [errors, setErrors] = useState<FormErrors>({});

  // Ref-based submission guard to avoid double submissions
  const isSubmittingRef = useRef(false);

  const registerMutation = useRegister();
  const passwordStrength = usePasswordStrength(formData.password);

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (passwordStrength.score < 3) {
      newErrors.password = "Password is too weak";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = "Phone number is required";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Address is required";
    }

    if (!formData.city.trim()) {
      newErrors.city = "City is required";
    }

    if (!formData.postcode.trim()) {
      newErrors.postcode = "Postal code is required";
    }

    if (!formData.acceptTerms) {
      newErrors.acceptTerms = "You must accept the terms";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, passwordStrength]);

  const handleSubmit = useCallback(
    (e: React.FormEvent): void => {
      e.preventDefault();
      e.stopPropagation();

      if (isSubmittingRef.current || registerMutation.isPending) {
        return;
      }

      if (!validateForm()) return;

      isSubmittingRef.current = true;

      registerMutation.mutate(
        {
          email: formData.email,
          password: formData.password,
          password_confirm: formData.confirmPassword,
          first_name: formData.firstName,
          last_name: formData.lastName,
          user_type: formData.userType,
          username: formData.email,
          phone_number: formData.phoneNumber,
          address: formData.address,
          city: formData.city,
          postcode: formData.postcode,
          country: formData.country,
          terms_accepted: true,
          privacy_policy_accepted: true,
          marketing_consent: false,
          analytics_consent: false,
        },
        {
          onSuccess: () => {
            // Navigate to check-email page with email in URL params
            void navigate({
              to: "/check-email",
              search: { email: formData.email },
            });
          },
          onSettled: () => {
            setTimeout(() => {
              isSubmittingRef.current = false;
            }, 2000);
          },
        }
      );
    },
    [formData, registerMutation, navigate, validateForm]
  );

  const handleInputChange = useCallback(
    (field: keyof FormData, value: string | boolean): void => {
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field as keyof FormErrors]) {
        setErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
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
      <div className="max-w-2xl w-full space-y-8">
        <div className="flex items-center">
          <Link
            to="/"
            className="inline-flex items-center text-text-secondary hover:text-accent-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to home
          </Link>
        </div>

        <div className="text-center">
          <Link to="/" className="text-3xl font-bold text-accent-primary">
            Valunds
          </Link>
          <h2 className="mt-6 text-3xl font-semibold text-text-primary">
            Join the community
          </h2>
        </div>

        {/* User Type Selection */}
        <Card className="bg-nordic-white">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleInputChange("userType", "freelancer")}
              className={`p-4 border-2 rounded-nordic-lg text-center transition-all ${
                formData.userType === "freelancer"
                  ? "border-accent-blue bg-accent-blue/5 text-accent-blue"
                  : "border-border-medium text-text-secondary"
              }`}
            >
              <div className="font-medium">Professional</div>
              <div className="text-xs mt-1">Looking for projects</div>
            </button>
            <button
              type="button"
              onClick={() => handleInputChange("userType", "client")}
              className={`p-4 border-2 rounded-nordic-lg text-center transition-all ${
                formData.userType === "client"
                  ? "border-accent-blue bg-accent-blue/5 text-accent-blue"
                  : "border-border-medium text-text-secondary"
              }`}
            >
              <div className="font-medium">Client</div>
              <div className="text-xs mt-1">Looking for talent</div>
            </button>
          </div>
        </Card>

        {/* Registration Form */}
        <Card className="bg-nordic-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="First name"
                  value={formData.firstName}
                  onChange={(e) =>
                    handleInputChange("firstName", e.target.value)
                  }
                  error={errors.firstName}
                  required
                />
                <Input
                  label="Last name"
                  value={formData.lastName}
                  onChange={(e) =>
                    handleInputChange("lastName", e.target.value)
                  }
                  error={errors.lastName}
                  required
                />
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">
                Contact Information
              </h3>
              <div className="space-y-4">
                <Input
                  label="Email address"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  error={errors.email}
                  required
                />
                <Input
                  label="Phone number"
                  type="tel"
                  value={formData.phoneNumber}
                  onChange={(e) =>
                    handleInputChange("phoneNumber", e.target.value)
                  }
                  placeholder="+46 70 123 45 67"
                  error={errors.phoneNumber}
                  required
                />
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">
                Address
              </h3>
              <div className="space-y-4">
                <Input
                  label="Street address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  error={errors.address}
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City"
                    value={formData.city}
                    onChange={(e) => handleInputChange("city", e.target.value)}
                    error={errors.city}
                    required
                  />
                  <Input
                    label="Postal code"
                    value={formData.postcode}
                    onChange={(e) =>
                      handleInputChange("postcode", e.target.value)
                    }
                    error={errors.postcode}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <h3 className="text-lg font-medium text-text-primary mb-4">
                Security
              </h3>
              <div className="space-y-4">
                <div className="relative">
                  <Input
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={(e) =>
                      handleInputChange("password", e.target.value)
                    }
                    error={errors.password}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[2.75rem] text-text-muted"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {formData.password && (
                  <div className="space-y-2">
                    <div className="flex space-x-1">
                      {[0, 1, 2, 3, 4].map((level) => (
                        <div
                          key={level}
                          className={`h-1 flex-1 rounded-full ${
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
                  </div>
                )}

                <Input
                  label="Confirm password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    handleInputChange("confirmPassword", e.target.value)
                  }
                  error={errors.confirmPassword}
                  required
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start">
              <input
                id="accept-terms"
                type="checkbox"
                checked={formData.acceptTerms}
                onChange={(e) =>
                  handleInputChange("acceptTerms", e.target.checked)
                }
                className="h-4 w-4 text-accent-blue focus:ring-accent-blue border-border-medium rounded mt-1"
              />
              <label
                htmlFor="accept-terms"
                className="ml-3 text-sm text-text-secondary"
              >
                I accept the{" "}
                <a
                  href="/terms"
                  className="text-accent-blue hover:text-accent-primary"
                  target="_blank"
                >
                  Terms of Service
                </a>{" "}
                and{" "}
                <a
                  href="/privacy"
                  className="text-accent-blue hover:text-accent-primary"
                  target="_blank"
                >
                  Privacy Policy
                </a>
              </label>
            </div>
            {errors.acceptTerms && (
              <p className="text-sm text-error-500 mt-1">
                {errors.acceptTerms}
              </p>
            )}

            <Button
              type="submit"
              size="lg"
              loading={registerMutation.isPending}
              disabled={registerMutation.isPending}
              className="w-full"
            >
              {registerMutation.isPending
                ? "Creating account..."
                : "Create account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-text-secondary">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-accent-blue hover:text-accent-primary font-medium"
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
