"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleIcon } from "@/components/GoogleIcon";
import { Toast } from "@/components/Toast";
import { useAuth } from "@/components/AuthProvider";
import { getCurrentUser, toPackmindAccount } from "@/lib/supabase";

export function AccountMenu() {
  const router = useRouter();
  const { status, account, configured, signInExistingGoogleAccount, signOut } =
    useAuth();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<"signin" | "signout" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const currentUser = getCurrentUser();
  const sessionAccount = account ?? (currentUser ? toPackmindAccount(currentUser) : null);
  const busy = pending !== null;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (configured && status === "loading") {
    return null;
  }

  const isGoogle = Boolean(sessionAccount && !sessionAccount.isAnonymous);
  const displayName = isGoogle
    ? sessionAccount?.displayName || "Account"
    : "Guest";
  const accountFullName =
    sessionAccount?.fullName || sessionAccount?.firstName || displayName;
  const accountEmail = sessionAccount?.email;

  async function handleContinueWithGoogle() {
    setOpen(false);
    setPending("signin");
    setError(null);
    try {
      await signInExistingGoogleAccount();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start Google sign-in.",
      );
      setPending(null);
    }
  }

  async function handleSignOut() {
    setPending("signout");
    setError(null);
    try {
      await signOut();
      setOpen(false);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign out.");
      setPending(null);
    }
  }

  return (
    <div className="relative min-w-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="max-w-[9.5rem] truncate rounded-full px-3 py-1.5 text-sm font-medium text-ink-soft transition-colors hover:bg-sand-100 sm:max-w-[14rem]"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {displayName}
        <span className="ml-1 text-ink-muted" aria-hidden="true">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-2 w-80 rounded-2xl border border-sand-200 bg-white p-1.5 shadow-lg"
        >
          {isGoogle ? (
            <>
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-ink">
                  {accountFullName}
                </p>
                {accountEmail ? (
                  <p className="mt-0.5 truncate text-sm text-ink-muted">
                    {accountEmail}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                role="menuitem"
                disabled={busy}
                onClick={() => void handleSignOut()}
                className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-ink hover:bg-sand-50 disabled:opacity-60"
              >
                {pending === "signout" ? "Signing out..." : "Sign out"}
              </button>
            </>
          ) : (
            <>
              <p className="px-3 py-2 text-sm leading-5 text-ink-soft">
                You&apos;re using PackMind as a guest.
              </p>
              {configured ? (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    disabled={busy}
                    onClick={() => void handleContinueWithGoogle()}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-ink hover:bg-sand-50 disabled:opacity-60"
                  >
                    <GoogleIcon />
                    {pending === "signin"
                      ? "Continuing..."
                      : "Continue with Google"}
                  </button>
                  <p className="px-3 pb-2 text-xs leading-5 text-ink-muted">
                    Sign in to keep your trips and access them on any device.
                  </p>
                </>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <Toast
        open={Boolean(error)}
        title="Account"
        message={error ?? ""}
        onClose={() => setError(null)}
      />
    </div>
  );
}
