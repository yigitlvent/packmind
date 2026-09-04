import { PackingItemRow } from "@/components/PackingItem";
import type { PackingItem } from "@/types/packing";

interface PackingCategoryProps {
  title: string;
  items: PackingItem[];
  disabled?: boolean;
  onToggle: (item: PackingItem, next: boolean) => void;
}

export function PackingCategory({
  title,
  items,
  disabled,
  onToggle,
}: PackingCategoryProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="rounded-3xl border border-sand-200 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-2 px-3 text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        {title}
      </h2>
      <div className="divide-y divide-sand-100">
        {items.map((item) => (
          <PackingItemRow
            key={item.id}
            item={item}
            disabled={disabled}
            onToggle={onToggle}
          />
        ))}
      </div>
    </section>
  );
}
