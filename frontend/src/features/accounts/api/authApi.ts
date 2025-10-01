import type {
  AuthResponse,
  LoginRequest,
  PasswordChangeRequest,
  RegisterRequest,
  User,
  UserSession,
} from "@/features/accounts/types/auth";
import {
  useMutation,
  type UseMutationResult,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from "@tanstack/react-query";
import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { toast } from "react-hot-toast";

/* ======================================================================================
 * Configuration and Constants
 * ==================================================================================== */

const rawApiUrl = (import.meta.env as Record<string, unknown>).VITE_API_URL;
const API_ORIGIN: string = (
  typeof rawApiUrl === "string" ? rawApiUrl : "http://localhost:8000"
).replace(/\/+$/, "");
const DEV = import.meta.env.DEV;

// Query keys for consistency
const QUERY_KEYS = {
  auth: ["auth"] as const,
  me: ["auth", "me"] as const,
  sessions: ["auth", "sessions"] as const,
} as const;

// Cache times
const CACHE_TIMES = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 15 * 60 * 1000, // 15 minutes
  sessionsStaleTime: 2 * 60 * 1000, // 2 minutes
} as const;

// Rate limiting config
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
} as const;

/* ======================================================================================
 * Axios Client Configuration
 * ==================================================================================== */

export const authClient = axios.create({
  baseURL: `${API_ORIGIN}/api/auth/`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
  xsrfCookieName: "csrftoken",
  xsrfHeaderName: "X-CSRFToken",
});

/* ======================================================================================
 * Token Management
 * ==================================================================================== */

let ACCESS_TOKEN: string | null = null;

export const setAccessToken = (token: string | null): void => {
  ACCESS_TOKEN = token;
};

export const getAccessToken = (): string | null => ACCESS_TOKEN;

/* ======================================================================================
 * Request/Response Interceptors
 * ==================================================================================== */

// Request interceptor - attach access token
authClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (ACCESS_TOKEN && config.headers) {
      config.headers.Authorization = `Bearer ${ACCESS_TOKEN}`;
    }
    return config;
  },
  (error: unknown) =>
    Promise.reject(error instanceof Error ? error : new Error(String(error)))
);

// Response interceptor - handle auth failures and token refresh
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

authClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    // Handle 401 - token expired, attempt refresh
    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("refresh/")
    ) {
      original._retry = true;

      // Prevent concurrent refresh attempts
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = (async (): Promise<string> => {
          try {
            const { data } = await authClient.post<{ access: string }>(
              "refresh/"
            );
            setAccessToken(data.access);
            return data.access;
          } catch (_refreshError) {
            setAccessToken(null);
            throw new Error("Token refresh failed");
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
      } catch (_refreshError) {
        setAccessToken(null);
        throw error; // Re-throw original 401 error
      }
    }

    throw error;
  }
);

/* ======================================================================================
 * Error Handling
 * ==================================================================================== */

interface ApiErrorData {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
  non_field_errors?: string[];
}

const handleError = (error: unknown): never => {
  if (axios.isAxiosError<ApiErrorData>(error)) {
    const response = error.response;

    if (response?.status === 401) {
      setAccessToken(null);
      throw new Error("Authentication failed. Please sign in again.");
    }

    if (response?.status === 403) {
      throw new Error("Access forbidden. Please try again.");
    }

    // Validation errors
    const errorsObj = response?.data?.errors;
    if (errorsObj && Object.keys(errorsObj).length > 0) {
      const firstKey = Object.keys(errorsObj)[0];
      const firstError = errorsObj[firstKey];
      const errorMsg = Array.isArray(firstError)
        ? firstError[0]
        : String(firstError);
      throw new Error(errorMsg);
    }

    // Non-field errors
    const nonFieldErrors = response?.data?.non_field_errors;
    if (
      nonFieldErrors &&
      Array.isArray(nonFieldErrors) &&
      nonFieldErrors.length > 0
    ) {
      throw new Error(nonFieldErrors[0]);
    }

    const msg =
      response?.data?.detail ?? response?.data?.message ?? error.message;
    throw new Error(msg);
  }

  throw new Error(
    error instanceof Error ? error.message : "An unexpected error occurred"
  );
};

// For toasts in hooks
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message;

  if (axios.isAxiosError<ApiErrorData>(error)) {
    const errors = error.response?.data?.errors;
    if (errors && Object.keys(errors).length > 0) {
      const firstKey = Object.keys(errors)[0];
      const firstError = errors[firstKey];
      return Array.isArray(firstError) && firstError.length > 0
        ? firstError[0]
        : "Validation error";
    }

    const nonFieldErrors = error.response?.data?.non_field_errors;
    if (
      nonFieldErrors &&
      Array.isArray(nonFieldErrors) &&
      nonFieldErrors.length > 0
    ) {
      return nonFieldErrors[0];
    }

    return (
      error.response?.data?.detail ??
      error.response?.data?.message ??
      error.message ??
      "An unexpected error occurred"
    );
  }

  return "An unexpected error occurred";
};

/* ======================================================================================
 * Rate Limiter
 * ==================================================================================== */

class RateLimiter {
  private readonly attempts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  isAllowed(key: string, maxAttempts: number, windowMs: number): boolean {
    const now = Date.now();
    const record = this.attempts.get(key);

    if (!record || now > record.resetTime) {
      this.attempts.set(key, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxAttempts) {
      return false;
    }

    record.count++;
    return true;
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }
}

const rateLimiter = new RateLimiter();

/* ======================================================================================
 * API Functions
 * ==================================================================================== */

export const authApi = {
  async login(payload: LoginRequest): Promise<AuthResponse> {
    const key = `login_${payload.email}`;
    if (
      !rateLimiter.isAllowed(
        key,
        RATE_LIMIT_CONFIG.maxAttempts,
        RATE_LIMIT_CONFIG.windowMs
      )
    ) {
      throw new Error("Too many login attempts. Try again in 15 minutes.");
    }

    const response = await authClient.post<AuthResponse>("login/", payload);
    setAccessToken(response.data.tokens.access);
    rateLimiter.clear(key);
    return response.data;
  },

  async register(payload: RegisterRequest): Promise<AuthResponse> {
    const response = await authClient.post<AuthResponse>("register/", payload);
    setAccessToken(response.data.tokens.access);
    return response.data;
  },

  async logout(): Promise<void> {
    try {
      await authClient.post("logout/");
    } catch (error) {
      if (DEV) {
        // eslint-disable-next-line no-console
        console.warn("Logout API call failed:", error);
      }
    } finally {
      setAccessToken(null);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await authClient.get<User>("me/");
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        setAccessToken(null);
        return null;
      }
      return handleError(error);
    }
  },

  async updateProfile(updates: Partial<User>): Promise<User> {
    const response = await authClient.patch<User>("me/", updates);
    return response.data;
  },

  async changePassword(payload: PasswordChangeRequest): Promise<void> {
    await authClient.post("change-password/", payload);
  },

  async getUserSessions(): Promise<UserSession[]> {
    const response = await authClient.get<UserSession[]>("sessions/");
    return response.data;
  },

  async terminateSession(sessionId: string): Promise<void> {
    await authClient.delete(`sessions/${encodeURIComponent(sessionId)}/`);
  },

  clearTokens(): void {
    setAccessToken(null);
  },
};

/* ======================================================================================
 * Local Storage Persistence
 * ==================================================================================== */

const STORAGE_KEY = "valunds-user-profile";

const persistUser = (user: User | null): void => {
  try {
    if (user) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch (error) {
    if (DEV) {
      // eslint-disable-next-line no-console
      console.warn("Failed to persist user to localStorage:", error);
    }
  }
};

const getPersistedUser = (): User | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    if (DEV) {
      // eslint-disable-next-line no-console
      console.warn("Failed to parse persisted user from localStorage:", error);
    }
    return null;
  }
};

/* ======================================================================================
 * Auth Status Helpers
 * ==================================================================================== */

const hasRefreshCookie = (): boolean =>
  document.cookie.includes("refresh_token=");
const shouldQueryMe = (): boolean =>
  Boolean(getAccessToken()) || hasRefreshCookie();

/* ======================================================================================
 * React Query Hooks
 * ==================================================================================== */

// Core user query
export const useUser = (): UseQueryResult<User | null> =>
  useQuery<User | null>({
    queryKey: QUERY_KEYS.me,
    enabled: shouldQueryMe(),
    initialData: getPersistedUser,
    retry: false,
    staleTime: CACHE_TIMES.staleTime,
    gcTime: CACHE_TIMES.gcTime,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    queryFn: async (): Promise<User | null> => {
      const user = await authApi.getCurrentUser();
      persistUser(user);
      return user;
    },
  });

export const useAuthStatus = (): {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  error: unknown;
} => {
  const { data, isLoading, isPending, error } = useUser();
  return {
    isAuthenticated: Boolean(data),
    isLoading: isLoading || isPending,
    user: data ?? null,
    error,
  };
};

// Login mutation
export const useLogin = (): UseMutationResult<
  AuthResponse,
  unknown,
  LoginRequest
> => {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, unknown, LoginRequest>({
    mutationFn: (data) => authApi.login(data),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.me, data.user);
      persistUser(data.user);

      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth });

      void queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.sessions,
        queryFn: () => authApi.getUserSessions(),
        staleTime: CACHE_TIMES.sessionsStaleTime,
      });

      toast.success("Welcome back!");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
};

// Register mutation
export const useRegister = (): UseMutationResult<
  AuthResponse,
  unknown,
  RegisterRequest
> => {
  const queryClient = useQueryClient();

  return useMutation<AuthResponse, unknown, RegisterRequest>({
    mutationFn: (data) => authApi.register(data),
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEYS.me, data.user);
      persistUser(data.user);
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.auth });

      void queryClient.prefetchQuery({
        queryKey: QUERY_KEYS.sessions,
        queryFn: () => authApi.getUserSessions(),
      });

      toast.success("Welcome to Valunds!");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
};

// Logout mutation (always clears local state)
export const useLogout = (): UseMutationResult<unknown, unknown, undefined> => {
  const queryClient = useQueryClient();

  return useMutation<unknown, unknown, undefined>({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      queryClient.setQueryData(QUERY_KEYS.me, null);
      queryClient.removeQueries({ queryKey: QUERY_KEYS.auth });
      persistUser(null);
      setAccessToken(null);
    },
    onSuccess: () => {
      toast.success("Signed out successfully");
    },
    onError: () => {
      toast.success("Signed out successfully");
    },
  });
};

// Profile update with optimistic updates
interface UpdateProfileMutationContext {
  previousUser?: User;
}

export const useUpdateProfile = (): UseMutationResult<
  User,
  unknown,
  Partial<User>,
  UpdateProfileMutationContext
> => {
  const queryClient = useQueryClient();

  return useMutation<
    User,
    unknown,
    Partial<User>,
    UpdateProfileMutationContext
  >({
    mutationFn: (data) => authApi.updateProfile(data),
    onMutate: async (updates): Promise<UpdateProfileMutationContext> => {
      await queryClient.cancelQueries({ queryKey: QUERY_KEYS.me });

      const previousUser = queryClient.getQueryData<User>(QUERY_KEYS.me);

      if (previousUser) {
        const optimisticUser = { ...previousUser, ...updates };
        queryClient.setQueryData(QUERY_KEYS.me, optimisticUser);
        persistUser(optimisticUser);
      }

      return { previousUser: previousUser ?? undefined };
    },
    onError: (error, _updates, context) => {
      if (context?.previousUser) {
        queryClient.setQueryData(QUERY_KEYS.me, context.previousUser);
        persistUser(context.previousUser);
      }
      toast.error(extractErrorMessage(error));
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(QUERY_KEYS.me, updatedUser);
      persistUser(updatedUser);
      toast.success("Profile updated successfully");
    },
  });
};

// Change password mutation
export const useChangePassword = (): UseMutationResult<
  unknown,
  unknown,
  PasswordChangeRequest
> =>
  useMutation<unknown, unknown, PasswordChangeRequest>({
    mutationFn: (payload) => authApi.changePassword(payload),
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });

// Sessions query
export const useUserSessions = (): UseQueryResult<UserSession[]> =>
  useQuery<UserSession[]>({
    queryKey: QUERY_KEYS.sessions,
    queryFn: () => authApi.getUserSessions(),
    staleTime: CACHE_TIMES.sessionsStaleTime,
    enabled: Boolean(getAccessToken()),
    refetchOnWindowFocus: false,
  });

// Terminate session mutation
export const useTerminateSession = (): UseMutationResult<
  unknown,
  unknown,
  string
> => {
  const queryClient = useQueryClient();

  return useMutation<unknown, unknown, string>({
    mutationFn: (sessionId) => authApi.terminateSession(sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sessions });
      toast.success("Session terminated");
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error));
    },
  });
};

/* ======================================================================================
 * Password Strength Utilities
 * ==================================================================================== */

export const checkPasswordStrength = (
  password: string
): { score: number; feedback: string[] } => {
  if (!password) return { score: 0, feedback: ["Enter a password"] };

  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 12) score++;
  else feedback.push("Use at least 12 characters");

  if (/[a-z]/.test(password)) score++;
  else feedback.push("Add lowercase letters");

  if (/[A-Z]/.test(password)) score++;
  else feedback.push("Add uppercase letters");

  if (/\d/.test(password)) score++;
  else feedback.push("Add numbers");

  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else feedback.push("Add special characters");

  if (password.length >= 16) score = Math.min(score + 0.5, 5);

  return {
    score: Math.max(0, Math.floor(score)),
    feedback: score >= 4 ? [] : feedback,
  };
};

export const usePasswordStrength = (
  password: string
): { score: number; feedback: string[] } => checkPasswordStrength(password);
