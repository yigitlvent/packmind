"use client";

import {
  useCallback,
  useEffect,
  useState,
  type SetStateAction,
} from "react";
import { getTripWithItems } from "@/lib/trips";
import { peekTrip, rememberTrip } from "@/lib/tripStore";
import type { PackingItem } from "@/types/packing";
import type { Trip } from "@/types/trip";

export function useTrip(tripId: string | undefined) {
  const cached = peekTrip(tripId);
  const [activeTripId, setActiveTripId] = useState(tripId);
  const [trip, setTrip] = useState<Trip | null>(cached?.trip ?? null);
  const [items, setItemsState] = useState<PackingItem[]>(
    cached?.items ?? [],
  );
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  if (tripId !== activeTripId) {
    setActiveTripId(tripId);
    const next = peekTrip(tripId);
    setTrip(next?.trip ?? null);
    setItemsState(next?.items ?? []);
    setLoading(!next);
    setError(null);
  }

  const setItems = useCallback(
    (updater: SetStateAction<PackingItem[]>) => {
      setItemsState((current) => {
        const next = typeof updater === "function" ? updater(current) : updater;
        const snapshot = peekTrip(tripId);
        if (snapshot) {
          rememberTrip(snapshot.trip, next);
        } else if (tripId && trip) {
          rememberTrip(trip, next);
        }
        return next;
      });
    },
    [trip, tripId],
  );

  useEffect(() => {
    if (!tripId) {
      return;
    }

    if (peekTrip(tripId)) {
      return;
    }

    let cancelled = false;

    getTripWithItems(tripId)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setTrip(null);
          setItemsState([]);
          setError("This trip wasn’t found in this browser session.");
          return;
        }
        setTrip(result.trip);
        setItemsState(result.items);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load this packing list.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tripId]);

  return { trip, items, setItems, loading, error, setError };
}
