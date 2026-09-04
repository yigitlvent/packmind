"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { Toast } from "@/components/Toast";
import { hasDuplicateName } from "@/lib/packingReconcile";
import type { AddCustomItemResult } from "@/lib/trips";
import type { PackingItem } from "@/types/packing";

interface AddPackingItemProps {
  items: PackingItem[];
  disabled?: boolean;
  onAdd: (name: string) => Promise<AddCustomItemResult>;
}

const FOOTER_RESERVE_PX = 112;

function alignForm(target: HTMLElement) {
  const overflow =
    target.getBoundingClientRect().bottom -
    (window.innerHeight - FOOTER_RESERVE_PX);
  if (overflow > 0) {
    window.scrollBy({ top: overflow + 12, behavior: "auto" });
  }
}

export function AddPackingItem({
  items,
  disabled,
  onAdd,
}: AddPackingItemProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [showDuplicateToast, setShowDuplicateToast] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const prevItemCount = useRef(items.length);

  const hideDuplicateToast = useCallback(() => {
    setShowDuplicateToast(false);
  }, []);

  function showDuplicate() {
    setShowDuplicateToast(false);
    window.setTimeout(() => setShowDuplicateToast(true), 0);
  }

  useEffect(() => {
    if (!open) return;

    const form = formRef.current;
    const parent = form?.parentElement;
    if (!form || !parent) return;

    const keepFormVisible = () => {
      const target = formRef.current ?? inputRef.current;
      if (target) alignForm(target);
    };

    const observer = new ResizeObserver(keepFormVisible);
    observer.observe(parent);
    keepFormVisible();

    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    const grew = items.length > prevItemCount.current;
    prevItemCount.current = items.length;
    if (!grew || !open) return;

    const input = inputRef.current;
    input?.focus({ preventScroll: true });

    let frame2 = 0;
    const frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(() => {
        const target = formRef.current ?? input;
        if (target) alignForm(target);
      });
    });

    const timeout = window.setTimeout(() => {
      const target = formRef.current ?? inputRef.current;
      if (target) alignForm(target);
    }, 50);

    return () => {
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
      window.clearTimeout(timeout);
    };
  }, [items, open]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving || disabled) return;

    if (hasDuplicateName(items, name)) {
      showDuplicate();
      return;
    }

    setSaving(true);
    try {
      const result = await onAdd(name);
      if (result.ok) {
        setName("");
        return;
      }
      if (result.reason === "duplicate") {
        showDuplicate();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="px-3 py-2 text-sm font-medium text-teal-800"
        >
          + Add item
        </button>
      ) : (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              setName("");
            }
          }}
          className="flex scroll-mb-28 flex-col gap-2 sm:flex-row sm:items-center"
        >
          <input
            ref={inputRef}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="AirPods"
            autoComplete="off"
            autoFocus
            disabled={disabled}
            className="input"
            aria-label="Custom packing item"
          />
          <button
            type="submit"
            disabled={saving || disabled || name.trim().length === 0}
            className="btn-primary shrink-0 px-5 py-3 sm:w-auto"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </form>
      )}
      <Toast
        open={showDuplicateToast}
        title="Item already exists"
        message="This item is already on your packing list."
        onClose={hideDuplicateToast}
      />
    </>
  );
}
