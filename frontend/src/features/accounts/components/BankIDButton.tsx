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

  const initiateMutation = useBankIDInitiate();
  const collectMutation = useBankIDCollect();
  const cancelMutation = useBankIDCancel();

  const handleInitiate = useCallback(async () => {
    try {
      setStatus("initializing");
      setMessage("Connecting to BankID...");

      const data = await initiateMutation.mutateAsync({});
      setSessionData(data);
      setStatus("pending");
      setMessage("Open your BankID app...");

      if (data.autoStartToken) {
        const bankIdUrl = `bankid:///?autostarttoken=${data.autoStartToken}&redirect=null`;
        window.location.href = bankIdUrl;
      }
    } catch (error) {
      setStatus("failed");
      setMessage("Failed to start BankID");
    }
  }, [initiateMutation]);

  useEffect(() => {
    if (status !== "pending" || !sessionData) return;

    const pollInterval = setInterval(async () => {
      try {
        const result = await collectMutation.mutateAsync();

        if (result.status === "complete") {
          setStatus("complete");
          setMessage("Authentication successful! ✓");
          clearInterval(pollInterval);

          setTimeout(() => {
            if (onSuccess) {
              onSuccess();
            } else {
              void navigate({ to: "/dashboard" });
            }
          }, 1500);
        } else if (result.status === "failed") {
          setStatus("failed");
          setMessage("Authentication failed");
          clearInterval(pollInterval);
        } else if (result.status === "pending") {
          setMessage(result.message || "Processing...");
        }
      } catch (error) {
        setStatus("failed");
        setMessage("Authentication error");
        clearInterval(pollInterval);
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [status, sessionData, collectMutation, navigate, onSuccess]);

  const handleCancel = useCallback(async () => {
    try {
      await cancelMutation.mutateAsync();
    } catch (error) {
      // Ignore
    }

    setStatus("idle");
    setMessage("");
    setSessionData(null);
  }, [cancelMutation]);

  return (
    <div className={`space-y-4 ${className}`}>
      <Button
        onClick={handleInitiate}
        disabled={status !== "idle"}
        loading={status === "initializing" || status === "pending"}
        className="w-full"
        type="button"
      >
        {status === "initializing" || status === "pending" ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            {message}
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <span className="text-lg">🇸🇪</span>
            Login with BankID
          </span>
        )}
      </Button>

      {status === "pending" && (
        <Button
          variant="ghost"
          onClick={handleCancel}
          className="w-full"
          type="button"
        >
          Cancel
        </Button>
      )}

      {status === "complete" && (
        <div className="text-center p-3 bg-success-50 text-success-700 rounded-nordic-lg">
          <span className="font-medium">✓ {message}</span>
        </div>
      )}

      {status === "failed" && (
        <div className="text-center p-3 bg-error-50 text-error-700 rounded-nordic-lg">
          <span className="font-medium">✗ {message}</span>
        </div>
      )}
    </div>
  );
};
