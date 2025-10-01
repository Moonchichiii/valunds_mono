import { useAuthStatus, useLogout } from "@/features/accounts/api/auth";
import type { User as AuthUser } from "@/features/accounts/types/auth";
import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle,
  DollarSign,
  Eye,
  LogOut,
  MessageSquare,
  Settings,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import React, { useCallback, useEffect } from "react";

type UserType = "freelancer" | "client" | "admin";
type Trend = "up" | "down" | "neutral";

interface StatItem {
  id: string;
  label: string;
  value: string;
  change?: string;
  trend: Trend;
  icon: React.ComponentType<{ className?: string }>;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading, isAuthenticated } = useAuthStatus();
  const logoutMutation = useLogout();

  // All hooks must be called before any early returns
  const handleLogout = useCallback(() => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        void navigate({ to: "/" });
      },
    });
  }, [logoutMutation, navigate]);

  const handleLoginClick = useCallback(() => {
    void navigate({ to: "/login" });
  }, [navigate]);

  const handleBrowseProjects = useCallback(() => {
    // Navigate to projects page when implemented
    // eslint-disable-next-line no-console
    console.log("Browse projects clicked");
  }, []);

  const handleUpdateProfile = useCallback(() => {
    // Navigate to profile page when implemented
    // eslint-disable-next-line no-console
    console.log("Update profile clicked");
  }, []);

  const handlePostJob = useCallback(() => {
    // Navigate to job posting page when implemented
    // eslint-disable-next-line no-console
    console.log("Post job clicked");
  }, []);

  const handleBrowseTalent = useCallback(() => {
    // Navigate to talent browsing page when implemented
    // eslint-disable-next-line no-console
    console.log("Browse talent clicked");
  }, []);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      void navigate({ to: "/login" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Helper functions
  const getDisplayName = useCallback((user: AuthUser): string => {
    if (user.full_name?.trim()) {
      return user.full_name;
    }

    const firstName = user.first_name?.trim() ?? "";
    const lastName = user.last_name?.trim() ?? "";
    const nameFromParts = `${firstName} ${lastName}`.trim();

    if (nameFromParts) {
      return nameFromParts;
    }

    return user.email.split("@")[0];
  }, []);

  const getTrendIcon = useCallback(
    (trend: Trend): React.ReactElement | null => {
      switch (trend) {
        case "up":
          return <TrendingUp className="w-3 h-3 text-[#7ba05b]" />;
        case "down":
          return <TrendingUp className="w-3 h-3 text-[#c8956d] rotate-180" />;
        case "neutral":
        default:
          return null;
      }
    },
    []
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f6f4] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#4a90a4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#666666]">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Not authenticated state
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-[#f7f6f4] flex items-center justify-center">
        <div className="text-center">
          <p className="text-[#666666] mb-4">
            Please log in to access your dashboard.
          </p>
          <button
            onClick={handleLoginClick}
            className="bg-[#4a90a4] text-white px-4 py-2 rounded-lg hover:bg-[#3a7a8a] transition-colors"
            type="button"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // We know user exists at this point - safe to use
  const authUser = user;
  const userType: UserType = authUser.user_type ?? "freelancer";
  const displayName = getDisplayName(authUser);

  // Stats data based on user type
  const freelancerStats: StatItem[] = [
    {
      id: "1",
      label: "Active Projects",
      value: "3",
      change: "+1",
      trend: "up",
      icon: CheckCircle,
    },
    {
      id: "2",
      label: "This Month Earnings",
      value: "€4,250",
      change: "+12%",
      trend: "up",
      icon: DollarSign,
    },
    {
      id: "3",
      label: "Profile Views",
      value: "127",
      change: "+8",
      trend: "up",
      icon: Eye,
    },
    {
      id: "4",
      label: "Success Rate",
      value: "98%",
      change: "0%",
      trend: "neutral",
      icon: CheckCircle,
    },
  ];

  const clientStats: StatItem[] = [
    {
      id: "1",
      label: "Active Job Posts",
      value: "5",
      change: "+2",
      trend: "up",
      icon: Briefcase,
    },
    {
      id: "2",
      label: "Applications",
      value: "47",
      change: "+15",
      trend: "up",
      icon: Users,
    },
    {
      id: "3",
      label: "Interviews",
      value: "8",
      change: "+3",
      trend: "up",
      icon: Calendar,
    },
    {
      id: "4",
      label: "Hired",
      value: "2",
      change: "+2",
      trend: "up",
      icon: CheckCircle,
    },
  ];

  const stats = userType === "freelancer" ? freelancerStats : clientStats;

  return (
    <div className="min-h-screen bg-[#f7f6f4] py-12">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-semibold text-[#1a1a1a] mb-2">
                {userType === "freelancer" ? "Professional" : "Company"}{" "}
                Dashboard
              </h1>
              <p className="text-[#666666]">Welcome back, {displayName}!</p>
            </div>

            <div className="flex items-center gap-4">
              <button
                className="w-10 h-10 bg-[#ffffff] border border-[#e8e6e3] rounded-2xl flex items-center justify-center text-[#666666] hover:text-[#1a1a1a] transition-colors"
                title="Notifications"
                type="button"
              >
                <Bell className="w-5 h-5" />
              </button>

              <button
                className="w-10 h-10 bg-[#ffffff] border border-[#e8e6e3] rounded-2xl flex items-center justify-center text-[#666666] hover:text-[#1a1a1a] transition-colors"
                title="Messages"
                type="button"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              <button
                className="w-10 h-10 bg-[#ffffff] border border-[#e8e6e3] rounded-2xl flex items-center justify-center text-[#666666] hover:text-[#1a1a1a] transition-colors"
                title="Settings"
                type="button"
              >
                <Settings className="w-5 h-5" />
              </button>

              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-[#ffffff] border border-[#e8e6e3] rounded-2xl text-[#666666] hover:text-[#1a1a1a] transition-colors disabled:opacity-50"
                title="Sign out"
                type="button"
              >
                <LogOut className="w-4 h-4" />
                {logoutMutation.isPending ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>

          {/* User type badge */}
          <div className="inline-flex items-center px-4 py-2 rounded-full bg-[#f4f3f0] text-[#666666] text-sm font-medium">
            {userType === "freelancer" ? (
              <>
                <User className="w-4 h-4 mr-2" />
                Professional Account
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 mr-2" />
                Company Account
              </>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <div
                key={stat.id}
                className="bg-[#ffffff] border border-[#e8e6e3] rounded-3xl p-6 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-semibold text-[#1a1a1a]">
                    {stat.value}
                  </div>
                  <div className="flex items-center gap-2">
                    <IconComponent className="w-4 h-4 text-[#4a90a4]" />
                    {getTrendIcon(stat.trend)}
                  </div>
                </div>

                <div className="text-sm text-[#666666] mb-1">{stat.label}</div>

                {stat.change && (
                  <div
                    className={`text-xs ${
                      stat.trend === "up"
                        ? "text-[#7ba05b]"
                        : stat.trend === "down"
                        ? "text-[#c8956d]"
                        : "text-[#666666]"
                    }`}
                  >
                    {stat.change}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-[#ffffff] border border-[#e8e6e3] rounded-3xl p-8">
          <h3 className="text-xl font-semibold text-[#1a1a1a] mb-6">
            Quick Actions
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userType === "freelancer" ? (
              <>
                <button
                  onClick={handleBrowseProjects}
                  className="flex items-center gap-3 p-4 border border-[#e8e6e3] rounded-2xl hover:bg-[#f7f6f4] transition-colors text-left"
                  type="button"
                >
                  <Briefcase className="w-5 h-5 text-[#4a90a4] flex-shrink-0" />
                  <span className="text-sm font-medium">Browse Projects</span>
                </button>

                <button
                  onClick={handleUpdateProfile}
                  className="flex items-center gap-3 p-4 border border-[#e8e6e3] rounded-2xl hover:bg-[#f7f6f4] transition-colors text-left"
                  type="button"
                >
                  <User className="w-5 h-5 text-[#4a90a4] flex-shrink-0" />
                  <span className="text-sm font-medium">Update Profile</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handlePostJob}
                  className="flex items-center gap-3 p-4 border border-[#e8e6e3] rounded-2xl hover:bg-[#f7f6f4] transition-colors text-left"
                  type="button"
                >
                  <Users className="w-5 h-5 text-[#4a90a4] flex-shrink-0" />
                  <span className="text-sm font-medium">Post New Job</span>
                </button>

                <button
                  onClick={handleBrowseTalent}
                  className="flex items-center gap-3 p-4 border border-[#e8e6e3] rounded-2xl hover:bg-[#f7f6f4] transition-colors text-left"
                  type="button"
                >
                  <Eye className="w-5 h-5 text-[#4a90a4] flex-shrink-0" />
                  <span className="text-sm font-medium">Browse Talent</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
