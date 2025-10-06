import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { toast } from "react-hot-toast";
import { getAccessToken } from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const settingsClient = axios.create({
  baseURL: `${API_URL}/api/accounts/settings/`,
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

settingsClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: any) => {
      const response = await settingsClient.patch("profile/", data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["auth", "me"], data);
      toast.success("Profile updated successfully");
    },
    onError: () => {
      toast.error("Failed to update profile");
    },
  });
};

export const useChangePassword = () => {
  return useMutation({
    mutationFn: async (data: {
      current_password: string;
      new_password: string;
    }) => {
      const response = await settingsClient.post("password/", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Password changed successfully");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to change password");
    },
  });
};

export const useChangeEmail = () => {
  return useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await settingsClient.post("email/", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Verification email sent to your new address");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to change email");
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { password: string }) => {
      const response = await settingsClient.post("delete/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.clear();
      toast.success("Account deleted");
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to delete account");
    },
  });
};
