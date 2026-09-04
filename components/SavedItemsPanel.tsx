"use client";

import { useMemo, useState } from "react";
import { hasDuplicateName } from "@/lib/packingReconcile";
import { forgetSavedItem, type SavedItem } from "@/lib/savedItems";
import { useSavedItems } from "@/lib/useSavedItems";
import type { PackingItem } from "@/types/packing";

interface SavedItemsPanelProps {
  items: PackingItem[];
  disabled?: boolean;
  onAdd: (name: string) => Promise<unknown>;
}

export function SavedItemsPanel({
  items,
  disabled,
  onAdd,
}: SavedItemsPanelProps) {
  const { items: savedItems, isGoogle, isGuest } = useSavedItems();
  const [managing, setManaging] = useState(false);
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(
    () => savedItems.filter((saved) => !hasDuplicateName(items, saved.name)),
    [items, savedItems],
  );

  async function handleAdd(saved: SavedItem) {
    if (disabled || pendingName) return;
    setPendingName(saved.name);
    setError(null);
    try {
      await onAdd(saved.name);
    } finally {
      setPendingName(null);
    }
  }

  async function handleForget(saved: SavedItem) {
    setError(null);
    try {
      await forgetSavedItem(saved.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not forget that saved item.",
      );
    }
  }

  if (isGuest) {
    return (
      <p className="px-1 text-sm text-ink-muted">
        Sign in with Google to remember items across trips.
      </p>
    );
  }

  if (!isGoogle) {
    return null;
  }

  if (savedItems.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {suggestions.length > 0 ? (
        <section>
          <h2 className="px-1 text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
            Previously added
          </h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.slice(0, 12).map((saved) => (
              <button
                key={saved.id}
                type="button"
                disabled={disabled || pendingName === saved.name}
                onClick={() => void handleAdd(saved)}
                className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-sm text-ink hover:border-sand-300 disabled:opacity-60"
              >
                {pendingName === saved.name ? "Adding..." : `+ ${saved.name}`}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {savedItems.length > 0 ? (
        <div>
          <button
            type="button"
            onClick={() => setManaging((current) => !current)}
            className="px-1 text-sm font-medium text-teal-800"
          >
            {managing ? "Hide saved items" : "Manage saved items"}
          </button>
          {managing ? (
            <>
              <ul className="mt-2 divide-y divide-sand-100 overflow-hidden rounded-2xl border border-sand-200 bg-white">
                {savedItems.map((saved) => (
                  <li
                    key={saved.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-sm text-ink">
                      {saved.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => void handleForget(saved)}
                      className="shrink-0 text-sm font-medium text-ink-muted hover:text-ink"
                    >
                      Forget
                    </button>
                  </li>
                ))}
              </ul>
              <p className="mt-2 px-1 text-xs leading-5 text-ink-muted">
                Forgetting a saved item only removes it from future suggestions.
                It stays on trips where you already added it.
              </p>
            </>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}
    </div>
  );
}
