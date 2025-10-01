import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@/features/accounts/types/auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-hot-toast";

/* Config */
const API_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://localhost:8000";

const authClient = axios.create({
  baseURL: `${API_URL}/api/auth/`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

/* Token Management */
let ACCESS_TOKEN: string | null = null;

export const setAccessToken = (token: string | null): void => {
  ACCESS_TOKEN = token;
};

export const getAccessToken = (): string | null => ACCESS_TOKEN;

/* Request Interceptor */
authClient.interceptors.request.use((config) => {
  if (ACCESS_TOKEN && config.headers) {
    config.headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
  }
  return config;
});

/* Response Interceptor - Auto Refresh */
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

authClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (
      error.response?.status === 401 &&
      !original._retry &&
      !original.url?.includes("refresh/")
    ) {
      original._retry = true;

      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = (async () => {
          try {
            const { data } = await authClient.post<{ access: string }>(
              "refresh/"
            );
            setAccessToken(data.access);
            return data.access;
          } catch {
            setAccessToken(null);
            throw new Error("Session expired");
          } finally {
            isRefreshing = false;
            refreshPromise = null;
          }
        })();
      }

      try {
        const newToken = await refreshPromise;
        if (original.headers) {
          original.headers.Authorization = `Bearer ${newToken}`;
        }
        return authClient(original);
      } catch {
        setAccessToken(null);
        throw error;
      }
    }

    throw error;
  }
);

/* API Functions */
const authApi = {
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const { data } = await authClient.post<AuthResponse>("login/", payload);
    setAccessToken(data.tokens.access);
    return data;
  },

  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const { data } = await authClient.post<AuthResponse>("register/", payload);
    setAccessToken(data.tokens.access);
    return data;
  },

  async logout(): Promise<void> {
    try {
      await authClient.post("logout/");
    } finally {
      setAccessToken(null);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data } = await authClient.get<User>("me/");
      return data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setAccessToken(null);
        return null;
      }
      throw error;
    }
  },
};

/* Local Storage */
const STORAGE_KEY = "valunds-user";

const persistUser = (user: User | null): void => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {}
};

const getPersistedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

/* Helpers */
const hasRefreshCookie = (): boolean =>
  document.cookie.includes("refresh_token=");
const shouldQueryMe = (): boolean =>
  Boolean(getAccessToken()) || hasRefreshCookie();

const extractError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.detail ||
      error.response?.data?.message ||
      "An error occurred"
    );
  }
  return error instanceof Error ? error.message : "An error occurred";
};

/* React Query Hooks */
export const useUser = () =>
  useQuery({
    queryKey: ["auth", "me"],
    queryFn: async () => {
      const user = await authApi.getCurrentUser();
      persistUser(user);
      return user;
    },
    enabled: shouldQueryMe(),
    initialData: getPersistedUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

export const useAuthStatus = () => {
  const { data, isLoading, isPending, error } = useUser();
  return {
    isAuthenticated: Boolean(data),
    isLoading: isLoading || isPending,
    user: data ?? null,
    error,
  };
};

export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
      persistUser(data.user);
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast.success("Welcome back!");
    },
    onError: (error) => {
      toast.error(extractError(error));
    },
  });
};

export const useRegister = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data.user);
      persistUser(data.user);
      void queryClient.invalidateQueries({ queryKey: ["auth"] });
      toast.success("Welcome to Valunds!");
    },
    onError: (error) => {
      toast.error(extractError(error));
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      queryClient.setQueryData(["auth", "me"], null);
      queryClient.removeQueries({ queryKey: ["auth"] });
      persistUser(null);
      setAccessToken(null);
      toast.success("Signed out");
    },
  });
};

/* Password Strength */
export const usePasswordStrength = (password: string) => {
  if (!password) return { score: 0, feedback: ["Enter a password"] };

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 12) score++;
  else feedback.push("At least 12 characters");
  if (/[a-z]/.test(password)) score++;
  else feedback.push("Add lowercase");
  if (/[A-Z]/.test(password)) score++;
  else feedback.push("Add uppercase");
  if (/\d/.test(password)) score++;
  else feedback.push("Add numbers");
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push("Add special chars");

  return { score, feedback: score >= 4 ? [] : feedback };
};
