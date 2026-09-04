import type { PackingItem } from "@/types/packing";
import type { Trip } from "@/types/trip";

export interface TripSnapshot {
  trip: Trip;
  items: PackingItem[];
}

const snapshots = new Map<string, TripSnapshot>();
const persistTasks = new Map<string, Promise<void>>();

export function peekTrip(tripId: string | undefined) {
  if (!tripId) return null;
  return snapshots.get(tripId) ?? null;
}

export function rememberTrip(trip: Trip, items: PackingItem[]) {
  snapshots.set(trip.id, { trip, items });
}

export function enqueuePersist(tripId: string, task: () => Promise<void>) {
  const previous = persistTasks.get(tripId) ?? Promise.resolve();
  const next = previous.then(task);
  persistTasks.set(tripId, next);
  void next.catch(() => undefined);
  return next;
}

export function waitForPersist(tripId: string) {
  return persistTasks.get(tripId) ?? Promise.resolve();
}

export async function waitForAllPersists() {
  await Promise.all(
    [...persistTasks.values()].map((task) => task.catch(() => undefined)),
  );
}

export function clearTripCache() {
  snapshots.clear();
  persistTasks.clear();
}

export function hasCachedTrips() {
  return snapshots.size > 0;
}
