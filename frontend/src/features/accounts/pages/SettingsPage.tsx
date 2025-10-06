import { useAuthStatus } from "@/features/accounts/api/auth";
import {
  useChangeEmail,
  useChangePassword,
  useDeleteAccount,
  useUpdateProfile,
} from "@/features/accounts/api/settings";
import { Button } from "@/shared/components/ui/Button";
import { Card } from "@/shared/components/ui/Card";
import { Input } from "@/shared/components/ui/Input";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Eye, EyeOff, Trash2 } from "lucide-react";
import { useCallback, useState } from "react";

type TabType = "profile" | "security" | "account";

export const SettingsPage = () => {
  const { user } = useAuthStatus();
  const [activeTab, setActiveTab] = useState<TabType>("profile");

  return (
    <div className="min-h-screen bg-nordic-cream py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center text-text-secondary hover:text-accent-blue transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to dashboard
          </Link>
        </div>

        <h1 className="text-3xl font-semibold text-text-primary mb-8">
          Account Settings
        </h1>

        {/* Tab Navigation */}
        <div className="flex gap-4 mb-8 border-b border-border-light">
          <button
            onClick={() => setActiveTab("profile")}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === "profile"
                ? "text-accent-blue border-b-2 border-accent-blue"
                : "text-text-secondary hover:text-text-primary"
            }`}
            type="button"
          >
            Profile
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === "security"
                ? "text-accent-blue border-b-2 border-accent-blue"
                : "text-text-secondary hover:text-text-primary"
            }`}
            type="button"
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={`pb-4 px-2 font-medium transition-colors ${
              activeTab === "account"
                ? "text-accent-blue border-b-2 border-accent-blue"
                : "text-text-secondary hover:text-text-primary"
            }`}
            type="button"
          >
            Account
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === "profile" && <ProfileSection user={user} />}
        {activeTab === "security" && <SecuritySection />}
        {activeTab === "account" && <AccountSection />}
      </div>
    </div>
  );
};

const ProfileSection = ({ user }: { user: any }) => {
  const updateProfileMutation = useUpdateProfile();
  const [formData, setFormData] = useState({
    firstName: user?.first_name ?? "",
    lastName: user?.last_name ?? "",
    phoneNumber: user?.phone_number ?? "",
    address: user?.address ?? "",
    city: user?.city ?? "",
    postcode: user?.postcode ?? "",
    country: user?.country ?? "Sweden",
  });

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      updateProfileMutation.mutate({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phoneNumber,
        address: formData.address,
        city: formData.city,
        postcode: formData.postcode,
        country: formData.country,
      });
    },
    [formData, updateProfileMutation]
  );

  return (
    <Card>
      <h2 className="text-xl font-semibold text-text-primary mb-6">
        Profile Information
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="First Name"
            value={formData.firstName}
            onChange={(e) =>
              setFormData({ ...formData, firstName: e.target.value })
            }
          />
          <Input
            label="Last Name"
            value={formData.lastName}
            onChange={(e) =>
              setFormData({ ...formData, lastName: e.target.value })
            }
          />
        </div>

        <Input
          label="Phone Number"
          value={formData.phoneNumber}
          onChange={(e) =>
            setFormData({ ...formData, phoneNumber: e.target.value })
          }
          placeholder="+46 70 123 45 67"
        />

        <Input
          label="Street Address"
          value={formData.address}
          onChange={(e) =>
            setFormData({ ...formData, address: e.target.value })
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <Input
            label="Postal Code"
            value={formData.postcode}
            onChange={(e) =>
              setFormData({ ...formData, postcode: e.target.value })
            }
          />
        </div>

        <Button
          type="submit"
          loading={updateProfileMutation.isPending}
          disabled={updateProfileMutation.isPending}
        >
          {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </form>
    </Card>
  );
};

const SecuritySection = () => {
  const changePasswordMutation = useChangePassword();
  const changeEmailMutation = useChangeEmail();
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  const [passwordData, setPasswordData] = useState({
    current: "",
    new: "",
    confirm: "",
  });

  const [newEmail, setNewEmail] = useState("");

  const handlePasswordSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordData.new !== passwordData.confirm) {
        return; // Show error
      }
      changePasswordMutation.mutate({
        current_password: passwordData.current,
        new_password: passwordData.new,
      });
    },
    [passwordData, changePasswordMutation]
  );

  const handleEmailSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      changeEmailMutation.mutate({ email: newEmail });
    },
    [newEmail, changeEmailMutation]
  );

  return (
    <div className="space-y-6">
      {/* Change Password */}
      <Card>
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          Change Password
        </h2>
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div className="relative">
            <Input
              label="Current Password"
              type={showPasswords.current ? "text" : "password"}
              value={passwordData.current}
              onChange={(e) =>
                setPasswordData({ ...passwordData, current: e.target.value })
              }
              required
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords({
                  ...showPasswords,
                  current: !showPasswords.current,
                })
              }
              className="absolute right-3 top-[2.75rem] text-text-muted"
            >
              {showPasswords.current ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="relative">
            <Input
              label="New Password"
              type={showPasswords.new ? "text" : "password"}
              value={passwordData.new}
              onChange={(e) =>
                setPasswordData({ ...passwordData, new: e.target.value })
              }
              required
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords({ ...showPasswords, new: !showPasswords.new })
              }
              className="absolute right-3 top-[2.75rem] text-text-muted"
            >
              {showPasswords.new ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="relative">
            <Input
              label="Confirm New Password"
              type={showPasswords.confirm ? "text" : "password"}
              value={passwordData.confirm}
              onChange={(e) =>
                setPasswordData({ ...passwordData, confirm: e.target.value })
              }
              required
            />
            <button
              type="button"
              onClick={() =>
                setShowPasswords({
                  ...showPasswords,
                  confirm: !showPasswords.confirm,
                })
              }
              className="absolute right-3 top-[2.75rem] text-text-muted"
            >
              {showPasswords.confirm ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>

          <Button
            type="submit"
            loading={changePasswordMutation.isPending}
            disabled={changePasswordMutation.isPending}
          >
            {changePasswordMutation.isPending
              ? "Updating..."
              : "Update Password"}
          </Button>
        </form>
      </Card>

      {/* Change Email */}
      <Card>
        <h2 className="text-xl font-semibold text-text-primary mb-6">
          Change Email Address
        </h2>
        <p className="text-sm text-text-secondary mb-4">
          You'll need to verify your new email address
        </p>
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <Input
            label="New Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@email.com"
            required
          />
          <Button
            type="submit"
            loading={changeEmailMutation.isPending}
            disabled={changeEmailMutation.isPending}
          >
            {changeEmailMutation.isPending
              ? "Sending..."
              : "Send Verification Email"}
          </Button>
        </form>
      </Card>
    </div>
  );
};

const AccountSection = () => {
  const deleteAccountMutation = useDeleteAccount();
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");

  const handleDelete = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      deleteAccountMutation.mutate({ password });
    },
    [password, deleteAccountMutation]
  );

  return (
    <Card>
      <h2 className="text-xl font-semibold text-error-600 mb-6">Danger Zone</h2>
      <p className="text-text-secondary mb-6">
        Once you delete your account, there is no going back. All your data will
        be permanently removed.
      </p>

      {!showConfirm ? (
        <Button
          variant="danger" // Changed from "ghost"
          onClick={() => setShowConfirm(true)}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Account
        </Button>
      ) : (
        <div className="bg-error-50 border border-error-200 rounded-nordic-lg p-4">
          <p className="text-sm text-error-700 mb-4 font-medium">
            ⚠️ Are you absolutely sure? This action cannot be undone.
          </p>
          <form onSubmit={handleDelete} className="space-y-4">
            <Input
              label="Confirm your password to delete"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="danger"
                loading={deleteAccountMutation.isPending}
              >
                Yes, Delete My Account
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowConfirm(false);
                  setPassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}
    </Card>
  );
};
