import { useAuthStatus, useLogout } from "@/features/accounts/api/auth";
import { Button } from "@/shared/components/ui/Button";
import { Link, useLocation } from "@tanstack/react-router";
import { type JSX, useCallback, useState } from "react";

export const Header = (): JSX.Element => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, user } = useAuthStatus();
  const logoutMutation = useLogout();

  const navigation = [
    { name: "Find Talent", href: "/find-talent" as const },
    { name: "For Professionals", href: "/professionals" as const },
    { name: "About", href: "/about" as const },
    { name: "Contact", href: "/contact" as const },
  ];

  const isActive = (path: string): boolean => location.pathname === path;

  // FIXED: Safe optional chaining with proper fallbacks
  const firstInitial =
    user?.first_name?.[0] ?? user?.email?.[0]?.toUpperCase() ?? "U";

  // FIXED: Use useCallback for all event handlers with proper dependencies
  const handleMenuToggle = useCallback((): void => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const handleMenuClose = useCallback((): void => {
    setIsMenuOpen(false);
  }, []);

  // FIXED: Proper mutation call with undefined parameter
  const handleLogout = useCallback((): void => {
    logoutMutation.mutate(undefined);
  }, [logoutMutation]);

  const handleMobileLogout = useCallback((): void => {
    logoutMutation.mutate(undefined);
    setIsMenuOpen(false);
  }, [logoutMutation]);

  return (
    <nav className="bg-nordic-cream border-b border-border-light sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto px-6 lg:px-12">
        <div className="flex justify-between items-center py-8">
          {/* Logo */}
          <Link
            to="/"
            className="text-2xl font-semibold text-text-primary tracking-tight"
          >
            Valunds
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-12">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`text-sm font-medium transition-all duration-200 ${
                  isActive(item.href)
                    ? "text-text-primary border-b-2 border-accent-primary pb-1"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                {/* Dashboard Link */}
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm">
                    Dashboard
                  </Button>
                </Link>

                {/* Logout Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  data-testid="logout-btn"
                >
                  Sign out
                </Button>

                {/* User Avatar */}
                <div
                  className="w-8 h-8 bg-accent-blue rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  title={`Logged in as ${user?.email ?? "User"}`}
                  aria-label={`User avatar for ${user?.email ?? "User"}`}
                >
                  {firstInitial}
                </div>
              </>
            ) : (
              <>
                {/* Auth buttons - FIXED: Use Link instead of anchor tags */}
                <Link to="/login" data-testid="signin-btn">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link to="/register" data-testid="signup-btn">
                  <Button size="sm">Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={handleMenuToggle}
              className="text-text-primary p-2 rounded-nordic hover:bg-nordic-warm transition-colors"
              aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={isMenuOpen}
              type="button"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={
                    isMenuOpen
                      ? "M6 18L18 6M6 6l12 12"
                      : "M4 6h16M4 12h16M4 18h16"
                  }
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden pb-6 border-t border-border-light pt-6 animate-fade-in">
            <div className="space-y-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`block text-sm font-medium transition-colors py-2 px-4 rounded-nordic ${
                    isActive(item.href)
                      ? "text-text-primary bg-nordic-warm"
                      : "text-text-secondary hover:text-text-primary hover:bg-nordic-warm"
                  }`}
                  onClick={handleMenuClose}
                >
                  {item.name}
                </Link>
              ))}

              {/* Mobile Auth */}
              <div className="border-t border-border-light pt-4 mt-4 space-y-3">
                {isAuthenticated ? (
                  <>
                    <Link
                      to="/dashboard"
                      className="block bg-accent-primary text-white px-4 py-3 rounded-nordic-xl text-sm font-medium text-center"
                      onClick={handleMenuClose}
                    >
                      Dashboard
                    </Link>

                    <button
                      onClick={handleMobileLogout}
                      className="block w-full text-center px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary"
                      data-testid="logout-btn"
                      type="button"
                    >
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block text-center px-4 py-3 text-sm font-medium text-text-secondary hover:text-text-primary"
                      onClick={handleMenuClose}
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="block bg-accent-primary text-white px-4 py-3 rounded-nordic-xl text-sm font-medium text-center"
                      onClick={handleMenuClose}
                    >
                      Get Started
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
