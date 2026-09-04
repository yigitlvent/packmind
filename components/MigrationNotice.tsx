"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Toast } from "@/components/Toast";
import {
  clearMigrationNotice,
  peekMigrationNotice,
  retryGuestTripMigration,
  subscribeMigrationNotice,
  type GuestMigrationNotice,
} from "@/lib/guestMigration";

export function MigrationNotice() {
  const [notice, setNotice] = useState<GuestMigrationNotice | null>(null);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNotice(peekMigrationNotice());
    }, 0);
    const unsubscribe = subscribeMigrationNotice(setNotice);
    return () => {
      window.clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (notice === "failed") {
    if (typeof document === "undefined") return null;
    return createPortal(
      <div
        className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
        style={{ bottom: "6.5rem" }}
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-sand-200 bg-white px-4 py-3 shadow-lg">
          <p className="text-sm font-semibold text-ink">Signed in</p>
          <p className="mt-1 text-sm leading-5 text-ink-soft">
            You&apos;re signed in, but we couldn&apos;t move your guest trips
            yet.
          </p>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              disabled={retrying}
              onClick={() => {
                setRetrying(true);
                void retryGuestTripMigration().finally(() => setRetrying(false));
              }}
              className="text-sm font-medium text-teal-800 disabled:opacity-60"
            >
              {retrying ? "Trying again..." : "Try again"}
            </button>
            <button
              type="button"
              onClick={() => clearMigrationNotice()}
              className="text-sm text-ink-muted"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>,
      document.body,
    );
  }

  return (
    <Toast
      open={notice === "success"}
      title="Trips saved"
      message="Your trips were saved to your account."
      durationMs={4500}
      onClose={() => clearMigrationNotice()}
    />
  );
}
