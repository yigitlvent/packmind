"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { completeGuestTripMigration } from "@/lib/guestMigration";
import {
  exchangeAuthCode,
  isGoogleIdentityInUseError,
  safeReturnPath,
  takeAuthReturnPath,
} from "@/lib/supabase";

function CallbackFallback() {
  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-20 sm:px-8">
      <p className="mt-16 text-ink-muted">Finishing Google sign-in…</p>
    </main>
  );
}

function isIdentityConflictText(value: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    normalized.includes("identity_already_exists") ||
    normalized.includes("already been linked") ||
    normalized.includes("already linked") ||
    normalized.includes("identity is already")
  );
}

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInExistingGoogleAccount } = useAuth();
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const oauthError =
    searchParams.get("error_description") || searchParams.get("error");
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const [identityConflict, setIdentityConflict] = useState(
    isIdentityConflictText(oauthError),
  );
  const [switching, setSwitching] = useState(false);
  const exchangeStarted = useRef(false);

  useEffect(() => {
    if (oauthError || !code || identityConflict) return;
    if (exchangeStarted.current) return;
    exchangeStarted.current = true;
    const next = safeReturnPath(nextParam || takeAuthReturnPath(false));
    exchangeAuthCode(code)
      .then(async () => {
        await completeGuestTripMigration();
        takeAuthReturnPath();
        router.replace(next);
      })
      .catch((err: unknown) => {
        if (isGoogleIdentityInUseError(err) || isIdentityConflictText(
          err instanceof Error ? err.message : null,
        )) {
          setIdentityConflict(true);
          return;
        }
        setExchangeError("Could not complete Google sign-in.");
      });
  }, [code, identityConflict, nextParam, oauthError, router]);

  const guestReturnPath = safeReturnPath(nextParam || takeAuthReturnPath(false));

  async function handleSignInExisting() {
    setSwitching(true);
    try {
      await signInExistingGoogleAccount();
    } catch (err) {
      setSwitching(false);
      setExchangeError(
        err instanceof Error ? err.message : "Could not start Google sign-in.",
      );
      setIdentityConflict(false);
    }
  }

  if (identityConflict) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 pb-20 sm:px-8">
        <h1 className="mt-8 font-serif text-3xl text-ink">
          This Google account already has a PackMind account
        </h1>
        <p className="mt-3 text-ink-soft">
          Sign in to that account to access its existing trips, or keep using
          this guest session.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href={guestReturnPath} className="btn-primary w-full sm:w-auto">
            Keep Using Guest
          </Link>
          <button
            type="button"
            disabled={switching}
            onClick={() => void handleSignInExisting()}
            className="btn-secondary w-full sm:w-auto"
          >
            {switching ? "Signing in..." : "Sign In to Existing Account"}
          </button>
        </div>
      </main>
    );
  }

  const error = oauthError
    ? "Google sign-in was cancelled or could not be completed."
    : !code
      ? "Google sign-in did not return a valid session."
      : exchangeError;

  return (
    <main className="mx-auto w-full max-w-xl px-5 pb-20 sm:px-8">
      {error ? (
        <>
          <h1 className="mt-8 font-serif text-3xl text-ink">
            Couldn’t finish signing in
          </h1>
          <p className="mt-3 text-ink-soft">{error}</p>
          <Link href="/" className="btn-primary mt-6">
            Back to PackMind
          </Link>
        </>
      ) : (
        <p className="mt-16 text-ink-muted">Finishing Google sign-in…</p>
      )}
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
