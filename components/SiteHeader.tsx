"use client";

import Link from "next/link";
import { AccountMenu } from "@/components/AccountMenu";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
      <Link href="/" className="flex min-w-0 shrink-0 items-center gap-2">
        <span
          aria-hidden="true"
          className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-teal-700 text-white"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 8h12l-1 12H7L6 8Zm3-3a3 3 0 1 1 6 0v3H9V5Z"
            />
          </svg>
        </span>
        <span className="font-serif text-xl tracking-tight text-ink">
          PackMind
        </span>
      </Link>
      <AccountMenu />
    </header>
  );
}
