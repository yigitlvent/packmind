"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AddPackingItem } from "@/components/AddPackingItem";
import { PackingCategory } from "@/components/PackingCategory";
import { ProgressBar } from "@/components/ProgressBar";
import { SavedItemsPanel } from "@/components/SavedItemsPanel";
import { useAuth } from "@/components/AuthProvider";
import { rememberSavedItem } from "@/lib/savedItems";
import {
  persistCustomItem,
  prepareCustomItem,
  setItemPacked,
  usesCloudStorage,
} from "@/lib/trips";
import { waitForPersist } from "@/lib/tripStore";
import type { AddCustomItemResult } from "@/lib/trips";
import { useTrip } from "@/lib/useTrip";
import { CATEGORY_ORDER, type PackingItem } from "@/types/packing";
import { tripTypeLabel } from "@/types/trip";

export default function TripPackingPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { trip, items, setItems, loading, error } = useTrip(params.id);
  const { account } = useAuth();
  const [persistenceError, setPersistenceError] = useState<string | null>(
    null,
  );
  const [savedMemoryError, setSavedMemoryError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!trip) return;
    router.prefetch(`/trip/${trip.id}/edit`);
    router.prefetch(`/trip/${trip.id}/final-check`);
  }, [router, trip]);

  useEffect(() => {
    if (!trip) return;
    let cancelled = false;
    waitForPersist(trip.id)
      .then(() => {
        if (!cancelled) setPersistenceError(null);
      })
      .catch(() => {
        if (cancelled) return;
        setPersistenceError(
          "Could not save this trip. Check your connection and try again.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [trip]);

  const packedCount = items.filter((item) => item.is_packed).length;
  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    items: items.filter((item) => item.category === category),
  }));

  async function handleToggle(item: PackingItem, next: boolean) {
    if (!trip) return;
    setItems((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, is_packed: next } : entry,
      ),
    );
    try {
      await setItemPacked(trip.id, item.id, next);
      setPersistenceError(null);
    } catch {
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id && entry.is_packed === next
            ? { ...entry, is_packed: !next }
            : entry,
        ),
      );
      setPersistenceError("Could not save packing state. Try again.");
    }
  }

  async function handleAddItem(name: string): Promise<AddCustomItemResult> {
    if (!trip) {
      const message = "Could not add that item. Try again.";
      setPersistenceError(message);
      return { ok: false, reason: "error", message };
    }

    const prepared = prepareCustomItem(trip.id, name, items);
    if (!prepared.ok) {
      return prepared;
    }

    setItems((current) => [...current, prepared.item]);
    setSavedMemoryError(null);
    try {
      const persistTrip = persistCustomItem(prepared.item);
      const persistLibrary = account?.isGoogle
        ? rememberSavedItem(prepared.item.name)
        : Promise.resolve();
      const [tripResult, libraryResult] = await Promise.allSettled([
        persistTrip,
        persistLibrary,
      ]);

      if (tripResult.status === "rejected") {
        setItems((current) =>
          current.filter((entry) => entry.id !== prepared.item.id),
        );
        const message =
          tripResult.reason instanceof Error
            ? tripResult.reason.message
            : "Could not add that item.";
        setPersistenceError(message);
        return { ok: false, reason: "error", message };
      }

      setPersistenceError(null);
      if (libraryResult.status === "rejected") {
        setSavedMemoryError(
          libraryResult.reason instanceof Error
            ? libraryResult.reason.message
            : "Item added to this trip, but PackMind couldn't save it for future trips.",
        );
      }
      return prepared;
    } catch (err) {
      setItems((current) =>
        current.filter((entry) => entry.id !== prepared.item.id),
      );
      const message =
        err instanceof Error ? err.message : "Could not add that item.";
      setPersistenceError(message);
      return { ok: false, reason: "error", message };
    }
  }

  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-2xl px-5 pb-28 sm:px-8">
        {loading ? (
          <LoadingState />
        ) : error && !trip ? (
          <EmptyState message={error} />
        ) : trip ? (
          <>
            <p className="text-sm text-ink-muted">Packing list</p>
            <h1 className="mt-1 font-serif text-4xl tracking-tight text-ink sm:text-5xl">
              {trip.destination}
            </h1>
            <p className="mt-2 text-ink-soft">
              {trip.duration}-day {tripTypeLabel(trip.trip_type)}
            </p>
            <Link
              href={`/trip/${trip.id}/edit`}
              prefetch
              className="mt-3 inline-block text-sm font-medium text-teal-800"
            >
              Edit trip
            </Link>

            <div className="mt-8 rounded-[2rem] border border-sand-200 bg-white p-6 shadow-sm">
              <ProgressBar packed={packedCount} total={items.length} />
              <p className="mt-3 text-sm text-ink-muted">
                {usesCloudStorage()
                  ? "Progress is saved to your trip."
                  : "Progress is saved on this device."}
              </p>
            </div>

            {persistenceError ? (
              <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                {persistenceError}
              </p>
            ) : null}
            {savedMemoryError ? (
              <p className="mt-4 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-ink-soft">
                {savedMemoryError}
              </p>
            ) : null}

            <div className="mt-6 space-y-4">
              {grouped.map((group) => (
                <PackingCategory
                  key={group.category}
                  title={group.category}
                  items={group.items}
                  onToggle={handleToggle}
                />
              ))}
              <AddPackingItem items={items} onAdd={handleAddItem} />
              <SavedItemsPanel items={items} onAdd={handleAddItem} />
            </div>

            <div className="fixed inset-x-0 bottom-0 border-t border-sand-200 bg-sand/95 px-5 py-4 backdrop-blur sm:px-8">
              <div className="mx-auto max-w-2xl">
                <Link
                  href={`/trip/${trip.id}/final-check`}
                  prefetch
                  className="btn-primary w-full"
                >
                  Run Final Check
                </Link>
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="animate-pulse space-y-4 pt-6">
      <div className="h-4 w-24 rounded bg-sand-200" />
      <div className="h-12 w-48 rounded bg-sand-200" />
      <div className="h-28 rounded-[2rem] bg-sand-200" />
      <div className="h-52 rounded-[2rem] bg-sand-200" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-10 rounded-[2rem] border border-sand-200 bg-white p-8 text-center shadow-sm">
      <h1 className="font-serif text-3xl text-ink">No trip here</h1>
      <p className="mt-3 text-ink-soft">{message}</p>
      <Link href="/trip/new" className="btn-primary mt-6">
        Plan a trip
      </Link>
    </div>
  );
}
