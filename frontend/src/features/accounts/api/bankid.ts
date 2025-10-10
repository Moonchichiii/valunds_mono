import type {
  BankIDCollectResponse,
  BankIDInitiateRequest,
  BankIDInitiateResponse,
} from "@/features/accounts/types/bankid";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-hot-toast";
import { setAccessToken } from "./auth";

/* Config */
const API_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "http://localhost:8000" : "");

const bankidClient = axios.create({
  baseURL: API_URL
    ? `${API_URL}/api/accounts/bankid/`
    : "/api/accounts/bankid/",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

/* API Functions */
const bankidApi = {
  async initiate(
    payload: BankIDInitiateRequest
  ): Promise<BankIDInitiateResponse> {
    const { data } = await bankidClient.post<BankIDInitiateResponse>(
      "initiate/",
      payload
    );
    return data;
  },

  async collect(): Promise<BankIDCollectResponse> {
    const { data } = await bankidClient.post<BankIDCollectResponse>("collect/");
    return data;
  },

  async cancel(): Promise<void> {
    await bankidClient.post("cancel/");
  },
};

/* React Query Hooks */
export const useBankIDInitiate = () => {
  return useMutation({
    mutationFn: bankidApi.initiate,
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || "Failed to start BankID"
        : "Failed to start BankID";
      toast.error(message);
    },
  });
};

export const useBankIDCollect = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: bankidApi.collect,
    onSuccess: (data) => {
      if (data.status === "complete" && data.tokens) {
        setAccessToken(data.tokens.access);
        queryClient.setQueryData(["auth", "me"], data.user);
        void queryClient.invalidateQueries({ queryKey: ["auth"] });
      }
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? error.response?.data?.detail || "BankID authentication failed"
        : "BankID authentication failed";
      toast.error(message);
    },
  });
};

export const useBankIDCancel = () => {
  return useMutation({
    mutationFn: bankidApi.cancel,
    onError: () => {
      // Silently fail
    },
  });
};
