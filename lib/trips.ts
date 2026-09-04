import { generatePackingList } from "@/lib/packingRules";
import {
  hasDuplicateName,
  planPackingReconcile,
} from "@/lib/packingReconcile";
import { getSessionId } from "@/lib/session";
import { getAuthedClient, isSupabaseConfigured } from "@/lib/supabase";
import {
  enqueuePersist,
  peekTrip,
  rememberTrip,
  waitForPersist,
} from "@/lib/tripStore";
import type { PackingItem } from "@/types/packing";
import type { CreateTripInput, Trip } from "@/types/trip";

const TRIPS_KEY = "packmind.trips";
const ITEMS_KEY = "packmind.items";

function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T) {
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function usesCloudStorage() {
  return isSupabaseConfigured();
}

function buildTrip(input: CreateTripInput, sessionId: string, id?: string): Trip {
  return {
    id: id ?? crypto.randomUUID(),
    session_id: sessionId,
    destination: input.destination.trim(),
    duration: input.duration,
    start_date: input.start_date,
    end_date: input.end_date,
    trip_type: input.trip_type,
    weather: input.weather,
    weather_summary: input.weather_summary,
    taking_laptop: input.taking_laptop,
    gym: input.gym,
    swimming: input.swimming,
    hiking: input.hiking,
    formal_event: input.formal_event,
    created_at: new Date().toISOString(),
  };
}

function buildItems(tripId: string, generated: ReturnType<typeof generatePackingList>) {
  const now = new Date().toISOString();
  return generated.map((item) => ({
    id: crypto.randomUUID(),
    trip_id: tripId,
    name: item.name,
    category: item.category,
    is_packed: false,
    importance: item.importance,
    reason: item.reason,
    created_at: now,
  }));
}

function tripInsertPayload(trip: Trip) {
  return {
    id: trip.id,
    session_id: trip.session_id,
    destination: trip.destination,
    duration: trip.duration,
    start_date: trip.start_date,
    end_date: trip.end_date,
    trip_type: trip.trip_type,
    weather: trip.weather,
    weather_summary: trip.weather_summary,
    taking_laptop: trip.taking_laptop,
    gym: trip.gym,
    swimming: trip.swimming,
    hiking: trip.hiking,
    formal_event: trip.formal_event,
  };
}

function itemInsertPayload(item: PackingItem) {
  return {
    id: item.id,
    trip_id: item.trip_id,
    name: item.name,
    category: item.category,
    is_packed: item.is_packed,
    importance: item.importance,
    reason: item.reason,
  };
}

async function persistCreatedTrip(trip: Trip, items: PackingItem[]) {
  const supabase = await getAuthedClient();
  if (!supabase) {
    writeLocal(TRIPS_KEY, [...readLocal<Trip[]>(TRIPS_KEY, []), trip]);
    writeLocal(ITEMS_KEY, [...readLocal<PackingItem[]>(ITEMS_KEY, []), ...items]);
    return;
  }

  const { error: tripError } = await supabase
    .from("trips")
    .insert(tripInsertPayload(trip));

  if (tripError) {
    throw new Error("Could not create trip. Check your connection and try again.");
  }

  const { error: itemsError } = await supabase
    .from("packing_items")
    .insert(items.map(itemInsertPayload));

  if (itemsError) {
    await supabase.from("trips").delete().eq("id", trip.id);
    throw new Error("Could not generate packing list. Try again.");
  }
}

export function createTrip(input: CreateTripInput): { trip: Trip; items: PackingItem[] } {
  const sessionId = getSessionId();
  const generated = generatePackingList(input);
  const trip = buildTrip(input, sessionId);
  const items = buildItems(trip.id, generated);
  rememberTrip(trip, items);

  if (!isSupabaseConfigured()) {
    writeLocal(TRIPS_KEY, [...readLocal<Trip[]>(TRIPS_KEY, []), trip]);
    writeLocal(ITEMS_KEY, [...readLocal<PackingItem[]>(ITEMS_KEY, []), ...items]);
    return { trip, items };
  }

  enqueuePersist(trip.id, () => persistCreatedTrip(trip, items));
  return { trip, items };
}

export async function getTripWithItems(tripId: string): Promise<{
  trip: Trip;
  items: PackingItem[];
} | null> {
  const cached = peekTrip(tripId);
  if (cached) {
    return cached;
  }

  const supabase = await getAuthedClient();

  if (supabase) {
    const [{ data: trip, error }, { data: items, error: itemsError }] =
      await Promise.all([
        supabase.from("trips").select("*").eq("id", tripId).single(),
        supabase
          .from("packing_items")
          .select("*")
          .eq("trip_id", tripId)
          .order("created_at", { ascending: true }),
      ]);

    if (error || !trip) {
      return null;
    }

    if (itemsError) {
      throw new Error("Could not load this packing list. Try again.");
    }

    const snapshot = {
      trip: trip as Trip,
      items: (items ?? []) as PackingItem[],
    };
    rememberTrip(snapshot.trip, snapshot.items);
    return snapshot;
  }

  const sessionId = getSessionId();
  const trip = readLocal<Trip[]>(TRIPS_KEY, []).find(
    (entry) => entry.id === tripId && entry.session_id === sessionId,
  );

  if (!trip) {
    return null;
  }

  const items = readLocal<PackingItem[]>(ITEMS_KEY, []).filter(
    (item) => item.trip_id === tripId,
  );
  rememberTrip(trip, items);
  return { trip, items };
}

export async function listSessionTrips(): Promise<Trip[]> {
  const supabase = await getAuthedClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("trips")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error("Could not load your trips.");
    }

    return (data ?? []) as Trip[];
  }

  const sessionId = getSessionId();
  return readLocal<Trip[]>(TRIPS_KEY, [])
    .filter((trip) => trip.session_id === sessionId)
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
}

let localWriteQueue: Promise<void> = Promise.resolve();

export async function setItemPacked(
  tripId: string,
  itemId: string,
  isPacked: boolean,
) {
  await enqueuePersist(tripId, async () => {
    const supabase = await getAuthedClient();

    if (supabase) {
      const { error } = await supabase
        .from("packing_items")
        .update({ is_packed: isPacked })
        .eq("id", itemId);

      if (error) {
        throw new Error("Could not save packing state. Try again.");
      }
      return;
    }

    const items = readLocal<PackingItem[]>(ITEMS_KEY, []).map((item) =>
      item.id === itemId ? { ...item, is_packed: isPacked } : item,
    );
    writeLocal(ITEMS_KEY, items);
  });
}

export type AddCustomItemResult =
  | { ok: true; item: PackingItem }
  | { ok: false; reason: "duplicate" }
  | { ok: false; reason: "error"; message: string };

export function prepareCustomItem(
  tripId: string,
  name: string,
  existingItems: PackingItem[],
): AddCustomItemResult {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, reason: "error", message: "Enter an item name." };
  }
  if (hasDuplicateName(existingItems, trimmed)) {
    return { ok: false, reason: "duplicate" };
  }

  return {
    ok: true,
    item: {
      id: crypto.randomUUID(),
      trip_id: tripId,
      name: trimmed,
      category: "Other",
      is_packed: false,
      importance: "optional",
      reason: null,
      created_at: new Date().toISOString(),
    },
  };
}

export async function persistCustomItem(item: PackingItem) {
  await waitForPersist(item.trip_id);
  const supabase = await getAuthedClient();

  if (supabase) {
    const { error } = await supabase
      .from("packing_items")
      .insert(itemInsertPayload(item));

    if (error) {
      throw new Error("Could not add that item. Try again.");
    }
    return;
  }

  const nextWrite = localWriteQueue.then(() => {
    const stored = readLocal<PackingItem[]>(ITEMS_KEY, []);
    if (
      hasDuplicateName(
        stored.filter((entry) => entry.trip_id === item.trip_id),
        item.name,
      )
    ) {
      throw new Error("That item is already on this list.");
    }
    writeLocal(ITEMS_KEY, [...stored, item]);
  });
  localWriteQueue = nextWrite.catch(() => undefined);
  await nextWrite;
}

function tripPayload(input: CreateTripInput) {
  return {
    destination: input.destination.trim(),
    duration: input.duration,
    start_date: input.start_date,
    end_date: input.end_date,
    trip_type: input.trip_type,
    weather: input.weather,
    weather_summary: input.weather_summary,
    taking_laptop: input.taking_laptop,
    gym: input.gym,
    swimming: input.swimming,
    hiking: input.hiking,
    formal_event: input.formal_event,
  };
}

async function persistUpdatedTrip(
  trip: Trip,
  payload: ReturnType<typeof tripPayload>,
  removeIds: string[],
  updates: PackingItem[],
  inserts: PackingItem[],
  nextItems: PackingItem[],
) {
  const supabase = await getAuthedClient();
  if (!supabase) {
    const nextWrite = localWriteQueue.then(() => {
      const trips = readLocal<Trip[]>(TRIPS_KEY, []).map((entry) =>
        entry.id === trip.id ? trip : entry,
      );
      writeLocal(TRIPS_KEY, trips);
      const otherItems = readLocal<PackingItem[]>(ITEMS_KEY, []).filter(
        (item) => item.trip_id !== trip.id,
      );
      writeLocal(ITEMS_KEY, [...otherItems, ...nextItems]);
    });
    localWriteQueue = nextWrite.catch(() => undefined);
    await nextWrite;
    return;
  }

  const operations: PromiseLike<{ error: { message: string } | null }>[] = [
    supabase.from("trips").update(payload).eq("id", trip.id),
  ];

  if (removeIds.length > 0) {
    operations.push(
      supabase.from("packing_items").delete().in("id", removeIds),
    );
  }

  if (updates.length > 0) {
    operations.push(
      supabase.from("packing_items").upsert(updates.map(itemInsertPayload)),
    );
  }

  if (inserts.length > 0) {
    operations.push(
      supabase.from("packing_items").insert(inserts.map(itemInsertPayload)),
    );
  }

  const results = await Promise.all(operations);
  const failed = results.find((result) => result.error);
  if (failed?.error) {
    throw new Error(
      "Trip details were saved, but the packing list could not be fully updated. Try again.",
    );
  }
}

export async function updateTrip(
  tripId: string,
  input: CreateTripInput,
): Promise<{ trip: Trip; items: PackingItem[] }> {
  const current = peekTrip(tripId) ?? (await getTripWithItems(tripId));
  if (!current) {
    throw new Error("This trip wasn’t found in this browser session.");
  }

  const nextGenerated = generatePackingList(input);
  const plan = planPackingReconcile(current.items, nextGenerated);
  const payload = tripPayload(input);
  const trip: Trip = { ...current.trip, ...payload };
  const inserts: PackingItem[] = plan.inserts.map((item) => ({
    id: crypto.randomUUID(),
    trip_id: tripId,
    name: item.name,
    category: item.category,
    is_packed: false,
    importance: item.importance,
    reason: item.reason,
    created_at: new Date().toISOString(),
  }));
  const items = [...plan.keep, ...inserts];
  rememberTrip(trip, items);

  enqueuePersist(tripId, () =>
    persistUpdatedTrip(
      trip,
      payload,
      plan.removeIds,
      plan.updates,
      inserts,
      items,
    ),
  );

  return { trip, items };
}
