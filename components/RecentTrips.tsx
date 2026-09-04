"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { listSessionTrips } from "@/lib/trips";
import type { Trip } from "@/types/trip";
import { TRIP_TYPE_LABELS } from "@/types/trip";

export function RecentTrips() {
  const { account } = useAuth();
  const [trips, setTrips] = useState<Trip[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    listSessionTrips()
      .then((rows) => {
        if (!cancelled) setTrips(rows);
      })
      .catch(() => {
        if (!cancelled) setTrips([]);
      });
    return () => {
      cancelled = true;
    };
  }, [account?.id]);

  if (!trips || trips.length === 0) {
    return null;
  }

  return (
    <section className="mt-16">
      <h2 className="font-serif text-2xl text-ink">Continue packing</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Trips from this browser session.
      </p>
      <ul className="mt-4 space-y-3">
        {trips.slice(0, 4).map((trip) => (
          <li key={trip.id}>
            <Link
              href={`/trip/${trip.id}`}
              className="flex items-center justify-between rounded-2xl border border-sand-200 bg-white px-4 py-4 shadow-sm transition-colors hover:border-sand-300"
            >
              <span>
                <span className="block font-medium text-ink">
                  {trip.destination}
                </span>
                <span className="text-sm text-ink-muted">
                  {trip.duration}-day {TRIP_TYPE_LABELS[trip.trip_type]}
                </span>
              </span>
              <span className="text-sm text-teal-800">Open</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
