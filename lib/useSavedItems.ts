"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import {
  listSavedItems,
  peekSavedItems,
  subscribeSavedItems,
  type SavedItem,
} from "@/lib/savedItems";

export function useSavedItems() {
  const { account, status, configured } = useAuth();
  const isGoogle = Boolean(account?.isGoogle);
  const [items, setItems] = useState<SavedItem[]>(() => peekSavedItems() ?? []);

  useEffect(() => {
    return subscribeSavedItems(() => {
      setItems(peekSavedItems() ?? []);
    });
  }, []);

  useEffect(() => {
    if (!configured || status !== "ready" || !isGoogle) {
      return;
    }
    if (peekSavedItems()) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      listSavedItems()
        .then((rows) => {
          if (!cancelled) setItems(rows);
        })
        .catch(() => undefined);
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [account?.id, configured, isGoogle, status]);

  return {
    items: isGoogle ? items : [],
    isGoogle,
    isGuest: Boolean(account?.isAnonymous),
  };
}
