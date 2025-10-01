import { type ReactElement } from "react";

interface ErrorBoundaryProps {
  error: Error;
  reset?: () => void;
}

// Helper function to get user-friendly error messages
const getUserFriendlyMessage = (
  error: Error
): { title: string; description: string } => {
  const message = error.message.toLowerCase();

  // Network/API errors
  if (message.includes("network") || message.includes("fetch")) {
    return {
      title: "Connection Problem",
      description:
        "We're having trouble connecting to our servers. Please check your internet connection and try again.",
    };
  }

  // Authentication errors
  if (
    message.includes("auth") ||
    message.includes("token") ||
    message.includes("401")
  ) {
    return {
      title: "Session Expired",
      description:
        "Your session has expired. Please sign in again to continue.",
    };
  }

  // Permission errors
  if (
    message.includes("403") ||
    message.includes("forbidden") ||
    message.includes("permission")
  ) {
    return {
      title: "Access Denied",
      description:
        "You don't have permission to access this page. Please contact support if you think this is an error.",
    };
  }

  // Not found errors
  if (message.includes("404") || message.includes("not found")) {
    return {
      title: "Page Not Found",
      description:
        "The page you're looking for doesn't exist or has been moved.",
    };
  }

  // Server errors
  if (
    message.includes("500") ||
    message.includes("server") ||
    message.includes("internal")
  ) {
    return {
      title: "Server Error",
      description:
        "Our servers are experiencing issues. We've been notified and are working to fix this.",
    };
  }

  // Generic fallback
  return {
    title: "Something Went Wrong",
    description:
      "An unexpected error occurred. Don't worry, it's not your fault. Please try refreshing the page.",
  };
};

export const ErrorBoundary = ({
  error,
  reset,
}: ErrorBoundaryProps): ReactElement => {
  const { title, description } = getUserFriendlyMessage(error);

  const handleGoHome = (): void => {
    window.location.href = "/";
  };

  const handleGoBack = (): void => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      handleGoHome();
    }
  };

  const handleTryAgain = (): void => {
    if (reset) {
      reset();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen bg-nordic-cream flex items-center justify-center px-4">
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-white rounded-nordic-2xl shadow-sm border border-border-light p-8">
          {/* Error Icon */}
          <div className="w-20 h-20 mx-auto mb-6 bg-red-50 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>

          {/* Error Message */}
          <h1 className="text-2xl font-semibold text-text-primary mb-3">
            {title}
          </h1>
          <p className="text-text-secondary mb-8 leading-relaxed">
            {description}
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Action */}
            <button
              onClick={handleTryAgain}
              className="w-full bg-accent-primary text-white px-6 py-3 rounded-nordic-xl font-medium hover:bg-accent-primary/90 transition-colors"
              type="button"
            >
              {reset ? "Try Again" : "Refresh Page"}
            </button>

            {/* Secondary Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleGoBack}
                className="flex-1 bg-nordic-warm text-text-primary px-4 py-2.5 rounded-nordic font-medium hover:bg-nordic-warm/80 transition-colors"
                type="button"
              >
                Go Back
              </button>
              <button
                onClick={handleGoHome}
                className="flex-1 bg-nordic-warm text-text-primary px-4 py-2.5 rounded-nordic font-medium hover:bg-nordic-warm/80 transition-colors"
                type="button"
              >
                Go Home
              </button>
            </div>
          </div>

          {/* Technical Details (collapsed by default) */}
          <details className="mt-6 text-left">
            <summary className="text-sm text-text-secondary cursor-pointer hover:text-text-primary transition-colors">
              Technical Details
            </summary>
            <div className="mt-3 p-3 bg-gray-50 rounded-nordic text-xs font-mono text-gray-600 break-all">
              {error.message}
              {error.stack && (
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {error.stack.split("\n").slice(0, 5).join("\n")}
                </pre>
              )}
            </div>
          </details>

          {/* Help Text */}
          <p className="mt-6 text-xs text-text-secondary">
            If this problem persists, please{" "}
            <a href="/contact" className="text-accent-primary hover:underline">
              contact our support team
            </a>{" "}
            with the technical details above.
          </p>
        </div>
      </div>
    </div>
  );
};
