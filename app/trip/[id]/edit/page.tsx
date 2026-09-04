"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { TripForm } from "@/components/TripForm";
import { useTrip } from "@/lib/useTrip";
import { tripToFormValues } from "@/types/trip";

export default function EditTripPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { trip, loading, error } = useTrip(params.id);

  useEffect(() => {
    if (!trip) return;
    router.prefetch(`/trip/${trip.id}`);
  }, [router, trip]);

  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-xl px-5 pb-20 sm:px-8">
        {loading ? (
          <div className="animate-pulse space-y-4 pt-6">
            <div className="h-4 w-24 rounded bg-sand-200" />
            <div className="h-10 w-56 rounded bg-sand-200" />
            <div className="h-72 rounded-[2rem] bg-sand-200" />
          </div>
        ) : error || !trip ? (
          <div className="mt-10 rounded-[2rem] border border-sand-200 bg-white p-8 text-center shadow-sm">
            <h1 className="font-serif text-3xl text-ink">No trip here</h1>
            <p className="mt-3 text-ink-soft">
              {error ?? "This trip wasn’t found in this browser session."}
            </p>
            <Link href="/trip/new" className="btn-primary mt-6">
              Plan a trip
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium tracking-[0.18em] text-teal-800 uppercase">
              Edit trip
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-ink">
              Update the trip details.
            </h1>
            <p className="mt-3 text-base leading-7 text-ink-soft">
              PackMind will adjust the generated list and keep packed items and
              anything you added yourself.
            </p>
            <div className="mt-8 rounded-[2rem] border border-sand-200 bg-white p-5 shadow-sm sm:p-8">
              <TripForm
                mode="edit"
                tripId={trip.id}
                initialValues={tripToFormValues(trip)}
                cancelHref={`/trip/${trip.id}`}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
