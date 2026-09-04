import type { PackingItem } from "@/types/packing";

interface PackingItemRowProps {
  item: PackingItem;
  disabled?: boolean;
  onToggle: (item: PackingItem, next: boolean) => void;
}

export function PackingItemRow({
  item,
  disabled,
  onToggle,
}: PackingItemRowProps) {
  return (
    <label
      id={`packing-item-${item.id}`}
      className={`flex scroll-mt-28 cursor-pointer items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-sand-50 ${
        item.is_packed ? "opacity-70" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={item.is_packed}
        disabled={disabled}
        onChange={(event) => onToggle(item, event.target.checked)}
        className="mt-1 h-5 w-5 shrink-0 rounded border-sand-300 text-teal-700 accent-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700"
      />
      <span className="min-w-0">
        <span
          className={`block text-[15px] text-ink ${
            item.is_packed ? "line-through decoration-sand-400" : ""
          }`}
        >
          {item.name}
        </span>
        {item.reason ? (
          <span className="mt-0.5 block text-sm leading-5 text-ink-muted">
            {item.reason}
          </span>
        ) : null}
      </span>
    </label>
  );
}
