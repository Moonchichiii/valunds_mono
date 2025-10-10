import type { Tokens, User } from "./auth";

// BankID-specific request/response types

export interface BankIDInitiateRequest {
  personalNumber?: string; // Optional Swedish personnummer for faster flow
}

export interface BankIDInitiateResponse {
  orderRef: string;
  autoStartToken: string;
  qrStartToken?: string;
  qrStartSecret?: string;
}

export interface BankIDCollectResponse {
  status: "pending" | "complete" | "failed";
  message?: string;
  hintCode?: string;
  user?: User; // ✅ Reuse shared User type
  tokens?: Tokens; // ✅ Reuse shared Tokens type
}

export type BankIDStatus =
  | "idle"
  | "initializing"
  | "pending"
  | "complete"
  | "failed";
