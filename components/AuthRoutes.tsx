"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { RequireAuth } from "@/components/RequireAuth";

export function AuthRoutes({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (!pathname?.startsWith("/trip")) {
    return children;
  }
  return <RequireAuth>{children}</RequireAuth>;
}
