"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { getCurrentUser } from "@/lib/supabase";

export function RequireAuth({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, account, configured } = useAuth();
  const signedIn = Boolean(account || getCurrentUser());

  useEffect(() => {
    if (!configured) return;
    if (status === "ready" && !signedIn) {
      router.replace("/");
    }
  }, [configured, router, signedIn, status]);

  if (!configured) {
    return children;
  }

  if (status === "loading" || !signedIn) {
    return <div className="min-h-full bg-sand" />;
  }

  return children;
}
