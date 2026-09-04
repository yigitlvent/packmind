import { getAuthedClient, getCurrentUser, toPackmindAccount } from "@/lib/supabase";
import { clearSavedItemsCache } from "@/lib/savedItems";
import { clearTripCache, hasCachedTrips, waitForAllPersists } from "@/lib/tripStore";

const INTENT_KEY = "packmind_guest_migration";
const NOTICE_KEY = "packmind_guest_migration_notice";

export type GuestMigrationNotice = "success" | "failed";

export type GuestMigrationResult =
  | { status: "none" }
  | { status: "success"; migratedTrips: number; alreadyDone: boolean }
  | { status: "failed"; message: string };

interface StoredIntent {
  guestUserId: string;
  requestedAt: number;
  token: string;
}

const noticeListeners = new Set<(notice: GuestMigrationNotice | null) => void>();

function readIntent(): StoredIntent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredIntent;
    if (
      !parsed ||
      typeof parsed.guestUserId !== "string" ||
      typeof parsed.token !== "string" ||
      parsed.token.length < 32
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeIntent(intent: StoredIntent) {
  sessionStorage.setItem(INTENT_KEY, JSON.stringify(intent));
}

export function clearGuestMigrationIntent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(INTENT_KEY);
}

export function hasGuestMigrationIntent() {
  return Boolean(readIntent());
}

function notifyNotice(notice: GuestMigrationNotice | null) {
  noticeListeners.forEach((listener) => listener(notice));
}

export function subscribeMigrationNotice(
  listener: (notice: GuestMigrationNotice | null) => void,
) {
  noticeListeners.add(listener);
  return () => {
    noticeListeners.delete(listener);
  };
}

export function peekMigrationNotice(): GuestMigrationNotice | null {
  if (typeof window === "undefined") return null;
  const value = sessionStorage.getItem(NOTICE_KEY);
  if (value === "success" || value === "failed") return value;
  return null;
}

export function setMigrationNotice(notice: GuestMigrationNotice) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(NOTICE_KEY, notice);
  notifyNotice(notice);
}

export function clearMigrationNotice() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(NOTICE_KEY);
  notifyNotice(null);
}

function friendlyMigrationError(error: unknown) {
  const message =
    error && typeof error === "object" && "message" in error
      ? String((error as { message?: string }).message)
      : "";
  const normalized = message.toLowerCase();
  if (normalized.includes("expired")) {
    return "The guest-trip transfer expired. Your trips are still saved.";
  }
  if (normalized.includes("already used")) {
    return "That transfer was already used.";
  }
  if (normalized.includes("invalid migration")) {
    return "You're signed in, but we couldn't move your guest trips yet.";
  }
  return "You're signed in, but we couldn't move your guest trips yet.";
}

function parseMigrationPayload(data: unknown) {
  if (!data || typeof data !== "object") {
    return { migratedTrips: 0, alreadyDone: false };
  }
  const row = data as { migrated_trips?: unknown; already_done?: unknown };
  return {
    migratedTrips:
      typeof row.migrated_trips === "number" ? row.migrated_trips : 0,
    alreadyDone: row.already_done === true,
  };
}

export async function prepareGuestMigrationIntent() {
  const user = getCurrentUser();
  if (!user?.is_anonymous) return;

  const supabase = await getAuthedClient();
  if (!supabase) return;

  await waitForAllPersists();

  const { count, error: countError } = await supabase
    .from("trips")
    .select("id", { count: "exact", head: true });

  if (countError) {
    throw new Error(
      "Could not prepare to keep your guest trips. Stay as Guest and try again.",
    );
  }

  if (!count) {
    if (hasCachedTrips()) {
      throw new Error(
        "Your trip is still saving. Wait a moment, then try Continue with Google again.",
      );
    }
    return;
  }

  const { data, error } = await supabase.rpc("create_guest_migration_intent");
  if (error || typeof data !== "string" || data.length < 32) {
    throw new Error(
      "Could not prepare to keep your guest trips. Stay as Guest and try again.",
    );
  }

  writeIntent({
    guestUserId: user.id,
    requestedAt: Date.now(),
    token: data,
  });
}

export async function completeGuestTripMigration(): Promise<GuestMigrationResult> {
  const intent = readIntent();
  if (!intent) {
    return { status: "none" };
  }

  const user = getCurrentUser();
  if (!user || user.is_anonymous || user.id === intent.guestUserId) {
    return { status: "none" };
  }

  if (!toPackmindAccount(user).isGoogle) {
    return { status: "none" };
  }

  const supabase = await getAuthedClient();
  if (!supabase) {
    const message = "You're signed in, but we couldn't move your guest trips yet.";
    setMigrationNotice("failed");
    return { status: "failed", message };
  }

  const { data, error } = await supabase.rpc("migrate_guest_trips", {
    p_token: intent.token,
  });

  if (error) {
    setMigrationNotice("failed");
    return { status: "failed", message: friendlyMigrationError(error) };
  }

  const payload = parseMigrationPayload(data);
  clearGuestMigrationIntent();
  clearTripCache();
  clearSavedItemsCache();
  if (payload.migratedTrips > 0 || payload.alreadyDone) {
    setMigrationNotice("success");
  }
  return {
    status: "success",
    migratedTrips: payload.migratedTrips,
    alreadyDone: payload.alreadyDone,
  };
}

export async function retryGuestTripMigration(): Promise<GuestMigrationResult> {
  const result = await completeGuestTripMigration();
  if (result.status === "none" && !hasGuestMigrationIntent()) {
    return {
      status: "failed",
      message: "You're signed in, but we couldn't move your guest trips yet.",
    };
  }
  return result;
}
