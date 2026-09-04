"use client";

import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmPrimary?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  cancelLabel,
  confirmLabel,
  confirmPrimary = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const messageId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const onCancelRef = useRef(onCancel);

  useEffect(() => {
    onCancelRef.current = onCancel;
  }, [onCancel]);

  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement;
    if (!confirmPrimary) {
      cancelRef.current?.focus();
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onCancelRef.current();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      if (previous instanceof HTMLElement) {
        previous.focus();
      }
    };
  }, [confirmPrimary, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center px-4 pb-6 sm:items-center sm:pb-0">
      <div
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-ink)_40%,transparent)]"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="relative w-full max-w-md rounded-[2rem] border border-sand-200 bg-white p-6 shadow-lg"
      >
        <h2 id={titleId} className="font-serif text-2xl tracking-tight text-ink">
          {title}
        </h2>
        <p id={messageId} className="mt-3 text-[15px] leading-6 text-ink-soft">
          {message}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          {confirmPrimary ? (
            <>
              <button
                type="button"
                onClick={onConfirm}
                className="btn-primary w-full sm:w-auto"
              >
                {confirmLabel}
              </button>
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="btn-secondary w-full sm:w-auto"
              >
                {cancelLabel}
              </button>
            </>
          ) : (
            <>
              <button
                ref={cancelRef}
                type="button"
                onClick={onCancel}
                className="btn-primary w-full sm:w-auto"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                className="btn-secondary w-full sm:w-auto"
              >
                {confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
