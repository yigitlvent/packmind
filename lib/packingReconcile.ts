import type { GeneratedPackingItem, PackingItem } from "@/types/packing";

export function normalizeItemName(name: string) {
  return name.trim().toLowerCase();
}

export function itemIdentity(name: string) {
  const normalized = normalizeItemName(name);
  const quantityMatch = normalized.match(/^(.*)\s+\((\d+)\)$/);
  if (quantityMatch) {
    return quantityMatch[1].trim();
  }
  return normalized;
}

export function namesMatch(a: string, b: string) {
  return normalizeItemName(a) === normalizeItemName(b);
}

export function hasDuplicateName(items: PackingItem[], name: string) {
  const normalized = normalizeItemName(name);
  if (!normalized) return false;
  return items.some((item) => normalizeItemName(item.name) === normalized);
}

export function isCustomItem(item: PackingItem) {
  return item.category === "Other";
}

function takeMatch(
  generated: GeneratedPackingItem,
  unused: PackingItem[],
): PackingItem | null {
  const exactIndex = unused.findIndex((item) =>
    namesMatch(item.name, generated.name),
  );
  if (exactIndex >= 0) {
    return unused.splice(exactIndex, 1)[0];
  }

  const identity = itemIdentity(generated.name);
  const identityIndex = unused.findIndex(
    (item) => itemIdentity(item.name) === identity,
  );
  if (identityIndex >= 0) {
    return unused.splice(identityIndex, 1)[0];
  }

  return null;
}

export interface ReconcilePlan {
  keep: PackingItem[];
  updates: PackingItem[];
  inserts: GeneratedPackingItem[];
  removeIds: string[];
}

export function planPackingReconcile(
  existing: PackingItem[],
  nextGenerated: GeneratedPackingItem[],
): ReconcilePlan {
  const unused = [...existing];
  const keep: PackingItem[] = [];
  const updates: PackingItem[] = [];
  const inserts: GeneratedPackingItem[] = [];

  for (const generated of nextGenerated) {
    const match = takeMatch(generated, unused);
    if (!match) {
      inserts.push(generated);
      continue;
    }

    if (isCustomItem(match)) {
      keep.push(match);
      continue;
    }

    const nextItem: PackingItem = {
      ...match,
      name: generated.name,
      category: generated.category,
      importance: generated.importance,
      reason: generated.reason,
    };

    keep.push(nextItem);
    if (
      nextItem.name !== match.name ||
      nextItem.category !== match.category ||
      nextItem.importance !== match.importance ||
      nextItem.reason !== match.reason
    ) {
      updates.push(nextItem);
    }
  }

  const removeIds: string[] = [];
  for (const leftover of unused) {
    if (isCustomItem(leftover)) {
      keep.push(leftover);
    } else {
      removeIds.push(leftover.id);
    }
  }

  return { keep, updates, inserts, removeIds };
}
