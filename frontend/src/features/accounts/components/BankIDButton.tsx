import bankIdLogo from "@/assets/images/bank-id.webp";
import {
  useBankIDCancel,
  useBankIDCollect,
  useBankIDInitiate,
} from "@/features/accounts/api/bankid";
import type {
  BankIDInitiateResponse,
  BankIDStatus,
} from "@/features/accounts/types/bankid";
import { Button } from "@/shared/components/ui/Button";
import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Smartphone, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

interface BankIDButtonProps {
  className?: string;
  onSuccess?: () => void;
}

export const BankIDButton: React.FC<BankIDButtonProps> = ({
  className = "",
  onSuccess,
}) => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<BankIDStatus>("idle");
  const [message, setMessage] = useState("");
  const [sessionData, setSessionData] = useState<BankIDInitiateResponse | null>(
    null
  );
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  const initiateMutation = useBankIDInitiate();
  const collectMutation = useBankIDCollect();
  const cancelMutation = useBankIDCancel();

  /**
   * Step 1: Start BankID authentication
   */
  const handleInitiate = useCallback(async () => {
    try {
      setStatus("initializing");
      setMessage("Ansluter till BankID...");
      setTimeRemaining(300); // Reset timer

      const data = await initiateMutation.mutateAsync({});
      setSessionData(data);
      setStatus("pending");
      setMessage("Öppna BankID-appen på din enhet");

      // Auto-launch BankID app (Guideline #4: Autostart)
      if (data.autoStartToken) {
        const bankIdUrl = `bankid:///?autostarttoken=${data.autoStartToken}&redirect=null`;
        window.location.href = bankIdUrl;
      }
    } catch (error) {
      setStatus("failed");
      setMessage("Kunde inte starta BankID");
    }
  }, [initiateMutation]);

  /**
   * Step 2: Poll for completion every 2 seconds
   */
  useEffect(() => {
    if (status !== "pending" || !sessionData) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await collectMutation.mutateAsync();

        if (result.status === "complete") {
          setStatus("complete");
          setMessage("Autentisering lyckades! ✓");
          clearInterval(pollInterval);

          // Redirect after brief delay
          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            } else {
              void navigate({ to: "/dashboard" });
            }
          }, 1500);
        } else if (result.status === "failed") {
          setStatus("failed");
          setMessage("BankID-autentisering misslyckades");
          clearInterval(pollInterval);
        } else if (result.status === "pending") {
          // Use backend's user-friendly messages (Guideline #12)
          setMessage(result.message || "Väntar på BankID...");
        }
      } catch (error) {
        setStatus("failed");
        setMessage("Ett fel uppstod vid autentisering");
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [status, sessionData, collectMutation, navigate, onSuccess]);

  /**
   * Countdown timer (Guideline #8: Show remaining time)
   */
  useEffect(() => {
    if (status !== "pending") return;

    const timerInterval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          setStatus("failed");
          setMessage("Tiden har gått ut. Försök igen.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [status]);

  /**
   * Cancel authentication (Guideline #1 & #3: Exit/Go back)
   */
  const handleCancel = useCallback(async () => {
    try {
      await cancelMutation.mutateAsync();
    } catch (error) {
      // Silently handle cancel errors
    }

    setStatus("idle");
    setMessage("");
    setSessionData(null);
    setTimeRemaining(300);
  }, [cancelMutation]);

  /**
   * Format time as MM:SS
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Main BankID Button (Guideline #2: Logo usage) */}
      {status === "idle" && (
        <button
          onClick={handleInitiate}
          disabled={initiateMutation.isPending}
          type="button"
          className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <img src={bankIdLogo} alt="BankID" className="h-6 w-auto" />
          <span className="text-base font-medium text-gray-900">
            Logga in med BankID
          </span>
        </button>
      )}

      {/* Pending State (Guideline #4: Prompt to open) */}
      {status === "pending" && (
        <div className="bg-white border-2 border-blue-500 rounded-lg p-6 space-y-4">
          {/* Header with timer (Guideline #8) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">
                BankID på denna enhet
              </span>
            </div>
            <div className="text-sm font-mono text-gray-600">
              {formatTime(timeRemaining)}
            </div>
          </div>

          {/* Animated spinner */}
          <div className="flex justify-center">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
          </div>

          {/* Status message */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-700">{message}</p>
            <p className="text-xs text-gray-500">
              Öppna BankID-appen på denna enhet
            </p>
          </div>

          {/* Guideline #5: Option for other device */}
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-center text-gray-500 mb-2">
              Har du BankID på en annan enhet?
            </p>
            <button
              type="button"
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Använd QR-kod istället →
            </button>
          </div>

          {/* Guideline #3: Go back / Cancel button */}
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="w-full"
            type="button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Avbryt
          </Button>
        </div>
      )}

      {/* Initializing State */}
      {status === "initializing" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm font-medium text-blue-900">{message}</span>
          </div>
        </div>
      )}

      {/* Success State */}
      {status === "complete" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl">✓</span>
            <span className="text-sm font-medium text-green-900">
              {message}
            </span>
          </div>
        </div>
      )}

      {/* Error State (Guideline #12: Clear error messages) */}
      {status === "failed" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
          {/* Error message */}
          <div className="flex items-start gap-2">
            <X className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-900 mb-1">{message}</p>
              <p className="text-xs text-red-700">
                Kontrollera att du har BankID installerat och försök igen.
              </p>
            </div>
          </div>

          {/* Guideline #13: Options for next step */}
          <div className="flex gap-2">
            <Button
              onClick={handleInitiate}
              className="flex-1"
              size="sm"
              type="button"
            >
              Försök igen
            </Button>
            <Button
              onClick={handleCancel}
              variant="ghost"
              className="flex-1"
              size="sm"
              type="button"
            >
              Avbryt
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
