"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  continueAsGuest as continueAsGuestRequest,
  getCurrentUser,
  initializeAuth,
  isSupabaseConfigured,
  linkGuestToGoogle as linkGuestToGoogleRequest,
  signInExistingGoogleAccount as signInExistingGoogleAccountRequest,
  signOut as signOutRequest,
  subscribeToAuth,
  toPackmindAccount,
  type PackmindAccount,
} from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type AuthStatus = "loading" | "ready";

interface AuthContextValue {
  status: AuthStatus;
  account: PackmindAccount | null;
  configured: boolean;
  continueAsGuest: () => Promise<void>;
  signInExistingGoogleAccount: () => Promise<void>;
  linkGuestToGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function accountFromUser(user: User | null) {
  return user ? toPackmindAccount(user) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [account, setAccount] = useState<PackmindAccount | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuth((user) => {
      setAccount(accountFromUser(user));
    });

    initializeAuth()
      .then(() => {
        setAccount(accountFromUser(getCurrentUser()));
        setStatus("ready");
      })
      .catch(() => {
        setAccount(null);
        setStatus("ready");
      });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status: configured ? status : "ready",
      account: configured ? account : null,
      configured,
      continueAsGuest: async () => {
        await continueAsGuestRequest();
        setAccount(accountFromUser(getCurrentUser()));
      },
      signInExistingGoogleAccount: async () => {
        await signInExistingGoogleAccountRequest();
        setAccount(accountFromUser(getCurrentUser()));
      },
      linkGuestToGoogle: async () => {
        await linkGuestToGoogleRequest();
        setAccount(accountFromUser(getCurrentUser()));
      },
      signOut: async () => {
        await signOutRequest();
        setAccount(null);
      },
    }),
    [account, configured, status],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
}
