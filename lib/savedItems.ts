import { normalizeItemName } from "@/lib/packingReconcile";
import {
  getAuthedClient,
  getCurrentUser,
  subscribeToAuth,
  toPackmindAccount,
} from "@/lib/supabase";

export interface SavedItem {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  last_used_at: string;
  use_count: number;
}

let cacheUserId: string | null = null;
let cache: SavedItem[] | null = null;
let loadPromise: Promise<SavedItem[]> | null = null;
const listeners = new Set<() => void>();
let authBridgeStarted = false;

function googleUserId() {
  const user = getCurrentUser();
  if (!user || user.is_anonymous) return null;
  return toPackmindAccount(user).isGoogle ? user.id : null;
}

function notifySavedItems() {
  listeners.forEach((listener) => listener());
}

function sortSavedItems(items: SavedItem[]) {
  return [...items].sort((a, b) => {
    const used = b.last_used_at.localeCompare(a.last_used_at);
    if (used !== 0) return used;
    return b.use_count - a.use_count;
  });
}

function setCache(userId: string | null, items: SavedItem[] | null) {
  cacheUserId = userId;
  cache = items ? sortSavedItems(items) : null;
  notifySavedItems();
}

export function clearSavedItemsCache() {
  cacheUserId = null;
  cache = null;
  loadPromise = null;
  notifySavedItems();
}

function ensureAuthBridge() {
  if (authBridgeStarted) return;
  authBridgeStarted = true;
  subscribeToAuth((user) => {
    const nextId =
      user && !user.is_anonymous && toPackmindAccount(user).isGoogle
        ? user.id
        : null;
    if (cacheUserId !== nextId) {
      loadPromise = null;
      cacheUserId = nextId;
      cache = null;
      notifySavedItems();
    }
  });
}

export function subscribeSavedItems(listener: () => void) {
  ensureAuthBridge();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function peekSavedItems() {
  ensureAuthBridge();
  const userId = googleUserId();
  if (!userId || cacheUserId !== userId) return null;
  return cache;
}

function findCachedMatch(name: string) {
  const normalized = normalizeItemName(name);
  return cache?.find((item) => normalizeItemName(item.name) === normalized) ?? null;
}

export async function listSavedItems(): Promise<SavedItem[]> {
  ensureAuthBridge();
  const userId = googleUserId();
  if (!userId) {
    setCache(null, null);
    return [];
  }

  if (cache && cacheUserId === userId) {
    return cache;
  }

  if (loadPromise && cacheUserId === userId) {
    return loadPromise;
  }

  const supabase = await getAuthedClient();
  if (!supabase) {
    setCache(userId, []);
    return [];
  }

  cacheUserId = userId;
  loadPromise = (async () => {
    const { data, error } = await supabase
      .from("user_saved_items")
      .select("id, user_id, name, created_at, last_used_at, use_count")
      .order("last_used_at", { ascending: false });

    if (error) {
      throw new Error("Could not load saved items.");
    }

    const items = sortSavedItems((data ?? []) as SavedItem[]);
    if (cacheUserId === userId) {
      cache = items;
      notifySavedItems();
    }
    return items;
  })();

  try {
    return await loadPromise;
  } finally {
    loadPromise = null;
  }
}

export async function rememberSavedItem(name: string): Promise<void> {
  ensureAuthBridge();
  const trimmed = name.trim();
  if (!trimmed) return;

  const userId = googleUserId();
  if (!userId) return;

  const supabase = await getAuthedClient();
  if (!supabase) return;

  if (!cache || cacheUserId !== userId) {
    try {
      await listSavedItems();
    } catch {
      // Continue with an empty local cache; insert/update still hits Supabase.
      if (!cache || cacheUserId !== userId) {
        setCache(userId, []);
      }
    }
  }

  const now = new Date().toISOString();
  const existing = findCachedMatch(trimmed);

  if (existing) {
    const updated: SavedItem = {
      ...existing,
      last_used_at: now,
      use_count: existing.use_count + 1,
    };
    setCache(
      userId,
      (cache ?? []).map((item) => (item.id === existing.id ? updated : item)),
    );

    const { error } = await supabase
      .from("user_saved_items")
      .update({
        last_used_at: now,
        use_count: updated.use_count,
      })
      .eq("id", existing.id);

    if (error) {
      setCache(
        userId,
        (cache ?? []).map((item) => (item.id === existing.id ? existing : item)),
      );
      throw new Error(
        "Item added to this trip, but PackMind couldn't save it for future trips.",
      );
    }
    return;
  }

  const optimistic: SavedItem = {
    id: crypto.randomUUID(),
    user_id: userId,
    name: trimmed,
    created_at: now,
    last_used_at: now,
    use_count: 1,
  };
  setCache(userId, [...(cache ?? []), optimistic]);

  const { data, error } = await supabase
    .from("user_saved_items")
    .insert({
      name: trimmed,
      user_id: userId,
      last_used_at: now,
      use_count: 1,
    })
    .select("id, user_id, name, created_at, last_used_at, use_count")
    .single();

  if (!error && data) {
    setCache(
      userId,
      (cache ?? []).map((item) => (item.id === optimistic.id ? (data as SavedItem) : item)),
    );
    return;
  }

  if (error?.code === "23505") {
    setCache(
      userId,
      (cache ?? []).filter((item) => item.id !== optimistic.id),
    );
    const { data: rows, error: reloadError } = await supabase
      .from("user_saved_items")
      .select("id, user_id, name, created_at, last_used_at, use_count");
    if (reloadError) {
      throw new Error(
        "Item added to this trip, but PackMind couldn't save it for future trips.",
      );
    }
    const match = ((rows ?? []) as SavedItem[]).find(
      (item) => normalizeItemName(item.name) === normalizeItemName(trimmed),
    );
    setCache(userId, (rows ?? []) as SavedItem[]);
    if (!match) return;
    const { error: updateError } = await supabase
      .from("user_saved_items")
      .update({
        last_used_at: now,
        use_count: match.use_count + 1,
      })
      .eq("id", match.id);
    if (updateError) {
      throw new Error(
        "Item added to this trip, but PackMind couldn't save it for future trips.",
      );
    }
    setCache(
      userId,
      ((rows ?? []) as SavedItem[]).map((item) =>
        item.id === match.id
          ? { ...item, last_used_at: now, use_count: item.use_count + 1 }
          : item,
      ),
    );
    return;
  }

  setCache(
    userId,
    (cache ?? []).filter((item) => item.id !== optimistic.id),
  );
  throw new Error(
    "Item added to this trip, but PackMind couldn't save it for future trips.",
  );
}

export async function forgetSavedItem(id: string): Promise<void> {
  ensureAuthBridge();
  const userId = googleUserId();
  if (!userId) return;

  const previous = cache ?? [];
  const removed = previous.find((item) => item.id === id);
  setCache(
    userId,
    previous.filter((item) => item.id !== id),
  );

  const supabase = await getAuthedClient();
  if (!supabase) {
    setCache(userId, previous);
    throw new Error("Could not forget that saved item.");
  }

  const { error } = await supabase.from("user_saved_items").delete().eq("id", id);
  if (error) {
    if (removed) {
      setCache(userId, [...previous]);
    } else {
      setCache(userId, previous);
    }
    throw new Error("Could not forget that saved item.");
  }
}
