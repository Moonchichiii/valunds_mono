export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  user_type?: "freelancer" | "client" | "admin";
  date_joined?: string;
}

export interface Tokens {
  access: string;
  refresh: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  password_confirm: string;
  first_name?: string;
  last_name?: string;
  user_type?: "freelancer" | "client";
  username?: string;
  terms_accepted?: boolean;
  privacy_policy_accepted?: boolean;
  marketing_consent?: boolean;
  analytics_consent?: boolean;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}
