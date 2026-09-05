"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { WarningCard } from "@/components/WarningCard";
import { useAuth } from "@/components/AuthProvider";
import {
  areAllItemsPacked,
  getUnpackedItems,
  runFinalCheck,
} from "@/lib/finalCheckRules";
import { useTrip } from "@/lib/useTrip";

export default function FinalCheckPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { trip, items, loading, error } = useTrip(params.id);
  const { account } = useAuth();
  const [continuedAnyway, setContinuedAnyway] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const firstName = account?.isGoogle ? account.firstName : null;
  const successHeadline = firstName
    ? `You’re all set, ${firstName}.`
    : "You’re all set.";

  useEffect(() => {
    if (!trip) return;
    router.prefetch(`/trip/${trip.id}`);
  }, [router, trip]);

  const warnings = trip ? runFinalCheck({ trip, items }) : [];
  const unpackedItems = getUnpackedItems(items);
  const unpackedCount = unpackedItems.length;
  const allPacked = areAllItemsPacked(items);
  const showSuccess = Boolean(trip) && !loading && !error && (allPacked || continuedAnyway);
  const summary =
    unpackedCount === 1
      ? "You still have 1 unpacked item."
      : unpackedCount > 1
        ? `You still have ${unpackedCount} unpacked items.`
        : "Your packing list is empty.";
  const confirmMessage =
    unpackedCount === 1
      ? "You still have 1 item that isn't marked as packed. Are you sure you want to continue?"
      : `You still have ${unpackedCount} items that aren't marked as packed. Are you sure you want to continue?`;

  return (
    <div className="min-h-full">
      <main className="mx-auto w-full max-w-2xl px-5 pb-20 sm:px-8">
        {loading ? (
          <div className="animate-pulse space-y-4 pt-6">
            <div className="h-4 w-32 rounded bg-sand-200" />
            <div className="h-12 w-64 rounded bg-sand-200" />
            <div className="h-28 rounded-[2rem] bg-sand-200" />
          </div>
        ) : error ? (
          <div className="mt-10 rounded-[2rem] border border-sand-200 bg-white p-8 text-center shadow-sm">
            <h1 className="font-serif text-3xl text-ink">Final Check</h1>
            <p className="mt-3 text-ink-soft">{error}</p>
            <Link href="/trip/new" className="btn-primary mt-6">
              Plan a trip
            </Link>
          </div>
        ) : showSuccess && trip ? (
          <div className="mt-8 rounded-[2rem] border border-sand-200 bg-white p-8 text-center shadow-sm">
            <p className="text-sm font-medium tracking-[0.18em] text-teal-800 uppercase">
              Ready
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-ink">
              {successHeadline}
            </h1>
            <p className="mt-4 text-lg leading-8 text-ink-soft">
              {allPacked
                ? "Everything on your packing list is ready to go."
                : "You’re heading out with some items still unpacked."}
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/trip/new" className="btn-primary w-full sm:w-auto">
                Plan another trip
              </Link>
              <Link href="/" className="btn-secondary w-full sm:w-auto">
                Home
              </Link>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm font-medium tracking-[0.18em] text-teal-800 uppercase">
              Final Check
            </p>
            <h1 className="mt-3 font-serif text-4xl tracking-tight text-ink sm:text-5xl">
              Before you go...
            </h1>
            <p className="mt-4 font-serif text-2xl leading-snug text-ink sm:text-3xl">
              {summary}
            </p>
            <div className="mt-8 space-y-8">
              {unpackedCount > 0 ? (
                <section>
                  <h2 className="font-serif text-xl text-ink">Still unpacked</h2>
                  <ul className="mt-3 divide-y divide-sand-100 overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-sm">
                    {unpackedItems.map((item) => (
                      <li
                        key={item.id}
                        className="px-4 py-3 text-[15px] text-ink"
                      >
                        {item.name}
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {warnings.length > 0 ? (
                <section>
                  <h2 className="font-serif text-xl text-ink">
                    Things PackMind noticed
                  </h2>
                  <div className="mt-3 space-y-4">
                    {warnings.map((warning) => (
                      <WarningCard
                        key={warning.id}
                        title={warning.title}
                        message={warning.message}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              {trip ? (
                <Link
                  href={`/trip/${trip.id}`}
                  prefetch
                  className="btn-primary w-full sm:w-auto"
                >
                  Back to Packing
                </Link>
              ) : null}
              {unpackedCount > 0 ? (
                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="btn-secondary w-full sm:w-auto"
                >
                  Continue Anyway
                </button>
              ) : null}
            </div>
            <ConfirmDialog
              open={confirmOpen}
              title="Leave with unpacked items?"
              message={confirmMessage}
              cancelLabel="Go Back"
              confirmLabel="Continue Anyway"
              onCancel={() => setConfirmOpen(false)}
              onConfirm={() => {
                setConfirmOpen(false);
                setContinuedAnyway(true);
              }}
            />
          </>
        )}
      </main>
    </div>
  );
}
