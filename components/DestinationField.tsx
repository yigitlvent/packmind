"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import {
  searchDestinations,
  type GeoPlace,
} from "@/lib/geocoding";

interface DestinationFieldProps {
  value: string;
  resolved: boolean;
  disabled?: boolean;
  invalid?: boolean;
  onChange: (value: string) => void;
  onSelect: (place: GeoPlace) => void;
  onSearchFailedChange?: (failed: boolean) => void;
  onBlur?: () => void;
}

export function DestinationField({
  value,
  resolved,
  disabled,
  invalid,
  onChange,
  onSelect,
  onSearchFailedChange,
  onBlur,
}: DestinationFieldProps) {
  const listId = useId();
  const requestId = useRef(0);
  const blurTimer = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [suggestions, setSuggestions] = useState<GeoPlace[]>([]);
  const [highlight, setHighlight] = useState(0);

  const query = value.trim();
  const canSearch = !resolved && query.length >= 2;

  useEffect(() => {
    if (!canSearch) {
      requestId.current += 1;
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      if (id !== requestId.current) return;
      setLoading(true);
      void searchDestinations(query)
        .then((places) => {
          if (id !== requestId.current) return;
          setSuggestions(places);
          setHighlight(0);
          setLoading(false);
          setFailed(false);
          onSearchFailedChange?.(false);
          setOpen(true);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setSuggestions([]);
          setLoading(false);
          setFailed(true);
          onSearchFailedChange?.(true);
          setOpen(true);
        });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [canSearch, onSearchFailedChange, query]);

  function choose(place: GeoPlace) {
    onSelect(place);
    setOpen(false);
  }

  function handleBlur() {
    blurTimer.current = window.setTimeout(() => {
      setOpen(false);
      onBlur?.();
    }, 120);
  }

  function handleFocus() {
    if (blurTimer.current) {
      window.clearTimeout(blurTimer.current);
      blurTimer.current = null;
    }
    if (canSearch) {
      setOpen(true);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      if (canSearch) setOpen(true);
      return;
    }
    if (!open || !canSearch) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) =>
        visibleSuggestions.length
          ? (current + 1) % visibleSuggestions.length
          : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) =>
        visibleSuggestions.length
          ? (current - 1 + visibleSuggestions.length) %
            visibleSuggestions.length
          : 0,
      );
    } else if (event.key === "Enter" && visibleSuggestions[highlight]) {
      event.preventDefault();
      choose(visibleSuggestions[highlight]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  const visibleSuggestions = canSearch ? suggestions : [];
  const showPanel = open && canSearch;
  const showLoading = showPanel && loading && visibleSuggestions.length === 0;
  const showFailed = showPanel && failed;
  const showEmpty =
    showPanel && !loading && !failed && visibleSuggestions.length === 0;

  return (
    <div className="relative">
      <input
        id="destination"
        name="destination"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const next = event.target.value;
          if (next.trim().length < 2) {
            onSearchFailedChange?.(false);
          }
          onChange(next);
        }}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder="City or destination"
        autoComplete="off"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-invalid={invalid}
        className="input"
      />
      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-sand-200 bg-white shadow-lg"
        >
          {showLoading ? (
            <p className="px-3 py-2.5 text-sm text-ink-muted">
              Searching locations…
            </p>
          ) : showFailed ? (
            <p className="px-3 py-2.5 text-sm text-ink-muted">
              Couldn&apos;t search destinations right now.
            </p>
          ) : showEmpty ? (
            <p className="px-3 py-2.5 text-sm text-ink-muted">
              No matching destinations found.
            </p>
          ) : (
            visibleSuggestions.map((place, index) => (
              <button
                key={`${place.displayName}-${place.latitude}-${place.longitude}`}
                type="button"
                role="option"
                aria-selected={index === highlight}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => choose(place)}
                className={`block w-full truncate px-3 py-2.5 text-left text-sm ${
                  index === highlight
                    ? "bg-teal-50 text-teal-900"
                    : "text-ink hover:bg-sand-50"
                }`}
              >
                {place.displayName}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
