"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface ToastProps {
  title: string;
  message: string;
  open: boolean;
  durationMs?: number;
  onClose: () => void;
}

export function Toast({
  title,
  message,
  open,
  durationMs = 3000,
  onClose,
}: ToastProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timer);
  }, [open, durationMs, onClose, title, message]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      className="pointer-events-none fixed inset-x-0 z-50 flex justify-center px-4"
      style={{ bottom: "6.5rem" }}
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-sand-200 bg-white px-4 py-3 shadow-lg">
        <p className="text-sm font-semibold text-ink">{title}</p>
        <p className="mt-1 text-sm leading-5 text-ink-soft">{message}</p>
      </div>
    </div>,
    document.body,
  );
}
