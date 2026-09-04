import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { clearTripCache } from "@/lib/tripStore";

let browserClient: SupabaseClient | null = null;
let sessionInit: Promise<void> | null = null;
let currentUser: User | null = null;
const authListeners = new Set<(user: User | null) => void>();

export type PackmindAccount = {
  id: string;
  email: string | null;
  displayName: string;
  firstName: string | null;
  fullName: string | null;
  isAnonymous: boolean;
  isGoogle: boolean;
};

export function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    });
  }

  return browserClient;
}

function notifyAuth(user: User | null) {
  currentUser = user;
  authListeners.forEach((listener) => listener(user));
}

export function getCurrentUser() {
  return currentUser;
}

export function subscribeToAuth(listener: (user: User | null) => void) {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

function usableFirstName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const token = value.trim().split(/\s+/)[0] ?? "";
  if (!token || token.includes("@") || !/\p{L}/u.test(token)) return null;
  return token;
}

function usableFullName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.includes("@") || !/\p{L}/u.test(trimmed)) {
    return null;
  }
  return trimmed;
}

export function toPackmindAccount(user: User): PackmindAccount {
  const isAnonymous = user.is_anonymous === true;
  const isGoogle =
    user.identities?.some((identity) => identity.provider === "google") ===
      true || user.app_metadata?.provider === "google";
  const firstName =
    !isAnonymous && isGoogle
      ? usableFirstName(user.user_metadata?.given_name) ??
        usableFirstName(user.user_metadata?.name)
      : null;
  const fullName =
    !isAnonymous && isGoogle
      ? usableFullName(user.user_metadata?.name) ??
        usableFullName(user.user_metadata?.full_name) ??
        firstName
      : null;
  const displayName = isAnonymous
    ? "Guest"
    : firstName || user.email || "Account";

  return {
    id: user.id,
    email: user.email ?? null,
    displayName,
    firstName,
    fullName,
    isAnonymous,
    isGoogle,
  };
}

export async function initializeAuth() {
  if (!sessionInit) {
    sessionInit = (async () => {
      const supabase = getSupabaseClient();
      if (!supabase) {
        notifyAuth(null);
        return;
      }

      supabase.auth.onAuthStateChange((_event, session) => {
        notifyAuth(session?.user ?? null);
      });

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        notifyAuth(null);
      } else {
        notifyAuth(data.session?.user ?? null);
      }
    })();
  }

  await sessionInit;
}

export async function getAuthedClient() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }
  await initializeAuth();
  return supabase;
}

function oauthRedirectTo() {
  const next = takeAuthReturnPath(false);
  const params = new URLSearchParams({ next });
  if (typeof window !== "undefined") {
    const intent = sessionStorage.getItem(AUTH_INTENT_KEY);
    if (intent === "signin" || intent === "link") {
      params.set("intent", intent);
    }
  }
  return `${window.location.origin}/auth/callback?${params.toString()}`;
}

const AUTH_RETURN_KEY = "packmind_auth_return";
const AUTH_INTENT_KEY = "packmind_auth_intent";

export type GoogleAuthIntent = "signin" | "link";

export class GoogleIdentityInUseError extends Error {
  constructor() {
    super("This Google account already has a PackMind account");
    this.name = "GoogleIdentityInUseError";
  }
}

function isIdentityAlreadyExists(code?: string, message?: string) {
  const normalizedCode = (code ?? "").toLowerCase();
  const normalizedMessage = (message ?? "").toLowerCase();
  return (
    normalizedCode === "identity_already_exists" ||
    normalizedMessage.includes("identity_already_exists") ||
    normalizedMessage.includes("already been linked") ||
    normalizedMessage.includes("already linked") ||
    normalizedMessage.includes("identity is already") ||
    (normalizedMessage.includes("already") &&
      normalizedMessage.includes("registered"))
  );
}

export function isGoogleIdentityInUseError(error: unknown) {
  if (error instanceof GoogleIdentityInUseError) {
    return true;
  }
  if (!error || typeof error !== "object") {
    return false;
  }
  const candidate = error as { code?: string; message?: string; name?: string };
  if (candidate.name === "GoogleIdentityInUseError") {
    return true;
  }
  return isIdentityAlreadyExists(candidate.code, candidate.message);
}

export function rememberGoogleAuthIntent(intent: GoogleAuthIntent) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(AUTH_INTENT_KEY, intent);
}

export function takeGoogleAuthIntent(): GoogleAuthIntent | null {
  if (typeof window === "undefined") return null;
  const intent = sessionStorage.getItem(AUTH_INTENT_KEY);
  sessionStorage.removeItem(AUTH_INTENT_KEY);
  if (intent === "signin" || intent === "link") {
    return intent;
  }
  return null;
}

export function safeReturnPath(path: string | null | undefined): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/";
  }
  if (path.startsWith("/auth/")) {
    return "/";
  }
  return path;
}

export function rememberAuthReturnPath(path?: string) {
  if (typeof window === "undefined") return;
  const next = safeReturnPath(
    path ?? `${window.location.pathname}${window.location.search}`,
  );
  sessionStorage.setItem(AUTH_RETURN_KEY, next);
}

export function takeAuthReturnPath(consume = true): string {
  if (typeof window === "undefined") return "/";
  const stored = sessionStorage.getItem(AUTH_RETURN_KEY);
  if (consume) {
    sessionStorage.removeItem(AUTH_RETURN_KEY);
  }
  return safeReturnPath(stored);
}

async function startGoogleOAuth() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Google sign-in needs Supabase to be configured.");
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: oauthRedirectTo(),
      queryParams: { access_type: "online", prompt: "select_account" },
    },
  });

  if (error) {
    throw new Error("Could not start Google sign-in.");
  }
}

export async function continueAsGuest() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }

  await initializeAuth();
  if (currentUser) {
    return supabase;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    throw new Error(
      "Could not start a guest session. Enable Anonymous sign-ins in the Supabase Auth providers settings.",
    );
  }

  if (data.user) {
    notifyAuth(data.user);
  }

  return supabase;
}

export async function signInExistingGoogleAccount() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Google sign-in needs Supabase to be configured.");
  }

  await initializeAuth();
  rememberAuthReturnPath("/");
  rememberGoogleAuthIntent("signin");

  if (currentUser?.is_anonymous) {
    const { prepareGuestMigrationIntent } = await import("@/lib/guestMigration");
    await prepareGuestMigrationIntent();
    clearTripCache();
    await supabase.auth.signOut();
    notifyAuth(null);
  }

  await startGoogleOAuth();
}

export async function linkGuestToGoogle() {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Google sign-in needs Supabase to be configured.");
  }

  await initializeAuth();
  if (!currentUser) {
    await continueAsGuest();
  }

  if (!currentUser?.is_anonymous) {
    await signInExistingGoogleAccount();
    return;
  }

  rememberAuthReturnPath();
  rememberGoogleAuthIntent("link");

  const { error } = await supabase.auth.linkIdentity({
    provider: "google",
    options: {
      redirectTo: oauthRedirectTo(),
      queryParams: { access_type: "online", prompt: "select_account" },
    },
  });

  if (error) {
    if (isIdentityAlreadyExists(error.code, error.message)) {
      throw new GoogleIdentityInUseError();
    }
    throw new Error(
      "Google could not be connected to this guest account, so your trips were left unchanged. Enable Manual Linking under Supabase Auth providers to upgrade a guest safely.",
    );
  }
}

export async function exchangeAuthCode(code: string) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured.");
  }
  await initializeAuth();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    if (isIdentityAlreadyExists(error.code, error.message)) {
      throw new GoogleIdentityInUseError();
    }
    throw new Error("Could not complete Google sign-in.");
  }
  if (data.user) {
    notifyAuth(data.user);
  }
}

export async function signOut() {
  const supabase = getSupabaseClient();
  clearTripCache();
  const { clearGuestMigrationIntent, clearMigrationNotice } = await import(
    "@/lib/guestMigration"
  );
  clearGuestMigrationIntent();
  clearMigrationNotice();
  if (!supabase) {
    notifyAuth(null);
    return;
  }
  await initializeAuth();
  await supabase.auth.signOut();
  notifyAuth(null);
}
