import { type ReactElement } from "react";

export const NotFoundPage = (): ReactElement => {
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

  // Array of playful messages
  const messages = [
    "Looks like this page went on vacation without telling us.",
    "This page is playing hide and seek... and winning.",
    "We've searched everywhere, but this page seems to have vanished into thin air.",
    "Plot twist: This page never existed in the first place.",
    "Our page detectives are still searching for clues.",
  ];

  const randomMessage = messages[Math.floor(Math.random() * messages.length)];

  return (
    <div className="min-h-screen bg-nordic-cream flex items-center justify-center px-4">
      <div className="max-w-lg mx-auto text-center">
        <div className="bg-white rounded-nordic-2xl shadow-sm border border-border-light p-8">
          {/* 404 Illustration */}
          <div className="w-24 h-24 mx-auto mb-6 bg-blue-50 rounded-full flex items-center justify-center">
            <svg
              className="w-12 h-12 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>

          {/* Large 404 */}
          <div className="mb-4">
            <span className="text-6xl font-bold text-accent-blue">4</span>
            <span className="text-6xl font-bold text-accent-primary">0</span>
            <span className="text-6xl font-bold text-text-secondary">4</span>
          </div>

          {/* Playful Title */}
          <h1 className="text-2xl font-semibold text-text-primary mb-3">
            Oops! Page Not Found
          </h1>

          {/* Random playful message */}
          <p className="text-text-secondary mb-6 leading-relaxed">
            {randomMessage}
          </p>

          {/* Helpful suggestion */}
          <p className="text-sm text-text-secondary mb-8">
            Maybe you mistyped the URL, or perhaps the page decided to take an
            unscheduled break. Either way, let's get you back on track!
          </p>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Primary Action */}
            <button
              onClick={handleGoHome}
              className="w-full bg-accent-primary text-white px-6 py-3 rounded-nordic-xl font-medium hover:bg-accent-primary/90 transition-colors"
              type="button"
            >
              Take Me Home
            </button>

            {/* Secondary Action */}
            <button
              onClick={handleGoBack}
              className="w-full bg-nordic-warm text-text-primary px-6 py-2.5 rounded-nordic font-medium hover:bg-nordic-warm/80 transition-colors"
              type="button"
            >
              Go Back to Safety
            </button>
          </div>

          {/* Helpful Links */}
          <div className="mt-8 pt-6 border-t border-border-light">
            <p className="text-sm text-text-secondary mb-4">
              Or try one of these popular pages:
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <a
                href="/find-talent"
                className="text-sm text-accent-primary hover:underline px-2 py-1 rounded transition-colors"
              >
                Find Talent
              </a>
              <a
                href="/professionals"
                className="text-sm text-accent-primary hover:underline px-2 py-1 rounded transition-colors"
              >
                For Professionals
              </a>
              <a
                href="/about"
                className="text-sm text-accent-primary hover:underline px-2 py-1 rounded transition-colors"
              >
                About Us
              </a>
              <a
                href="/contact"
                className="text-sm text-accent-primary hover:underline px-2 py-1 rounded transition-colors"
              >
                Contact
              </a>
            </div>
          </div>

          {/* Footer joke */}
          <p className="mt-6 text-xs text-text-secondary italic">
            Fun fact: 404 errors are named after room 404 at CERN where the web
            was invented. That room probably exists, unlike this page.
          </p>
        </div>
      </div>
    </div>
  );
};
