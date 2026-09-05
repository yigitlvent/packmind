"use client";

import { useLayoutEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  alignEndToStart,
  datesAreOrdered,
  datesAreValid,
  diffDaysInclusive,
  formatDateRange,
  isEndBeforeStart,
  parseIsoDate,
} from "@/lib/dates";
import { DestinationField } from "@/components/DestinationField";
import { hasResolvedCoordinates, type GeoPlace } from "@/lib/geocoding";
import { createTrip, updateTrip } from "@/lib/trips";
import { formatTemperatureRange, weatherHeadline } from "@/lib/weatherProfile";
import {
  tripWeatherQueryKey,
  useTripWeather,
} from "@/lib/useTripWeather";
import {
  TRIP_TYPE_OPTIONS,
  WEATHER_OPTIONS,
  isTripType,
  type CreateTripInput,
  type TripFormValues,
  type TripType,
  type Weather,
} from "@/types/trip";

function writeNativeDate(
  el: HTMLInputElement | null,
  value: string,
  options?: { preserveIfAlready?: boolean },
) {
  if (!el) return;
  // iOS Reset restores to defaultValue. Keep it empty so Reset can clear.
  el.defaultValue = "";
  if (options?.preserveIfAlready && el.value === value) return;
  el.value = value;
}

const EMPTY_TRIP: TripFormValues = {
  destination: "",
  duration: 0,
  start_date: "",
  end_date: "",
  trip_type: "",
  weather: "mild",
  weather_summary: null,
  destination_lat: null,
  destination_lon: null,
  taking_laptop: false,
  gym: false,
  swimming: false,
  hiking: false,
  formal_event: false,
};

interface TripFormProps {
  tripId?: string;
  initialValues?: TripFormValues;
  mode?: "create" | "edit";
  cancelHref?: string;
}

export function TripForm({
  tripId,
  initialValues = EMPTY_TRIP,
  mode = "create",
  cancelHref,
}: TripFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<TripFormValues>(initialValues);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [destinationSearchFailed, setDestinationSearchFailed] = useState(false);
  const [endRejected, setEndRejected] = useState(false);
  const allowEndNormalizeRef = useRef(true);
  const startInputRef = useRef<HTMLInputElement>(null);
  const endInputRef = useRef<HTMLInputElement>(null);
  const initialDatesRef = useRef({
    start_date: initialValues.start_date,
    end_date: initialValues.end_date,
  });
  const [touched, setTouched] = useState({
    destination: false,
    start_date: false,
    end_date: false,
    trip_type: false,
  });

  const locationResolved = hasResolvedCoordinates(
    form.destination_lat,
    form.destination_lon,
  );
  const weatherLookup = useTripWeather(
    form.destination_lat,
    form.destination_lon,
    form.start_date,
    form.end_date,
    form.destination,
  );

  const destinationError = destinationMessage(
    form.destination,
    locationResolved,
    destinationSearchFailed,
  );
  const startDateError = startDateMessage(form.start_date);
  const endDateError = endDateMessage(
    form.start_date,
    form.end_date,
    endRejected,
  );
  const tripTypeError = tripTypeMessage(form.trip_type);
  const datesValid = datesAreValid(form.start_date, form.end_date);
  const duration = datesValid
    ? diffDaysInclusive(form.start_date, form.end_date)
    : 0;
  const detailsValid = !destinationError && datesValid;
  const formValid = detailsValid && !tripTypeError;
  const readyToLookup =
    locationResolved &&
    datesAreOrdered(form.start_date, form.end_date) &&
    datesValid;
  const weatherPending =
    readyToLookup &&
    (weatherLookup.status === "checking" || weatherLookup.status === "idle");
  const canSubmit = formValid && !submitting && !weatherPending;
  const currentWeatherKey = tripWeatherQueryKey(
    form.destination_lat,
    form.destination_lon,
    form.start_date,
    form.end_date,
  );
  const seedWeatherKey =
    mode === "edit"
      ? tripWeatherQueryKey(
          initialValues.destination_lat,
          initialValues.destination_lon,
          initialValues.start_date,
          initialValues.end_date,
        )
      : "";

  const durationLabel = useMemo(() => {
    return duration === 1 ? "day" : "days";
  }, [duration]);

  function updateDestination(destination: string) {
    setForm((current) => ({
      ...current,
      destination,
      destination_lat: null,
      destination_lon: null,
      weather_summary: null,
    }));
  }

  function selectDestination(place: GeoPlace) {
    setDestinationSearchFailed(false);
    setForm((current) => ({
      ...current,
      destination: place.displayName,
      destination_lat: place.latitude,
      destination_lon: place.longitude,
      weather_summary: null,
    }));
  }

  useLayoutEffect(() => {
    writeNativeDate(startInputRef.current, initialDatesRef.current.start_date);
    writeNativeDate(endInputRef.current, initialDatesRef.current.end_date);
  }, []);

  function applyDateState(start_date: string, end_date: string) {
    setForm((current) => ({
      ...current,
      start_date,
      end_date,
      duration: datesAreValid(start_date, end_date)
        ? diffDaysInclusive(start_date, end_date)
        : 0,
      weather_summary: datesAreValid(start_date, end_date)
        ? current.weather_summary
        : null,
    }));
  }

  function updateDates(next: { start_date?: string; end_date?: string }) {
    if (next.end_date === "") {
      allowEndNormalizeRef.current = false;
    }
    if (next.start_date !== undefined && next.start_date === "") {
      allowEndNormalizeRef.current = false;
    }

    setForm((current) => {
      const start_date =
        next.start_date !== undefined ? next.start_date : current.start_date;
      let end_date =
        next.end_date !== undefined ? next.end_date : current.end_date;
      if (next.start_date !== undefined && !parseIsoDate(start_date)) {
        end_date = "";
      }
      return {
        ...current,
        start_date,
        end_date,
        duration: datesAreValid(start_date, end_date)
          ? diffDaysInclusive(start_date, end_date)
          : 0,
        weather_summary: datesAreValid(start_date, end_date)
          ? current.weather_summary
          : null,
      };
    });

    if (next.start_date !== undefined && !parseIsoDate(next.start_date)) {
      writeNativeDate(endInputRef.current, "");
    }

    if (next.start_date !== undefined) {
      writeNativeDate(
        startInputRef.current,
        next.start_date,
        { preserveIfAlready: true },
      );
      setEndRejected(false);
    } else if (next.end_date !== undefined) {
      writeNativeDate(endInputRef.current, next.end_date, {
        preserveIfAlready: true,
      });
      if (next.end_date !== "" && !isEndBeforeStart(form.start_date, next.end_date)) {
        setEndRejected(false);
      }
    }
  }

  function normalizeEndBeforePicker(input: HTMLInputElement) {
    if (!allowEndNormalizeRef.current) return;

    const start_date = form.start_date;
    if (!parseIsoDate(start_date)) return;
    const end_date = alignEndToStart(start_date, form.end_date);
    if (end_date === form.end_date) return;

    writeNativeDate(input, end_date);
    applyDateState(start_date, end_date);
    setEndRejected(false);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setAttempted(true);

    const hasOrderedDates = datesAreOrdered(form.start_date, form.end_date);
    if (!hasOrderedDates && form.start_date && form.end_date) {
      setEndRejected(true);
    }

    if (
      destinationError ||
      startDateError ||
      endDateError ||
      tripTypeError ||
      !isTripType(form.trip_type) ||
      !form.start_date ||
      !form.end_date ||
      !hasOrderedDates ||
      !datesAreValid(form.start_date, form.end_date)
    ) {
      return;
    }

    if (
      readyToLookup &&
      (weatherLookup.status === "checking" || weatherLookup.status === "idle")
    ) {
      return;
    }

    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    const resolvedWeather =
      weatherLookup.status === "ready" && weatherLookup.profile
        ? weatherLookup.profile
        : form.weather;
    const input: CreateTripInput = {
      ...form,
      destination: form.destination.trim(),
      duration,
      trip_type: form.trip_type,
      weather: resolvedWeather,
      weather_summary:
        weatherLookup.status === "ready" ? weatherLookup.summary : null,
    };

    try {
      if (mode === "edit") {
        if (!tripId) {
          throw new Error("This trip could not be saved.");
        }
        await updateTrip(tripId, input);
        router.push(`/trip/${tripId}`);
        return;
      }

      const { trip } = createTrip(input);
      router.push(`/trip/${trip.id}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : mode === "edit"
            ? "Something went wrong saving your trip."
            : "Something went wrong creating your trip.",
      );
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  function toggleActivity(
    key: "gym" | "swimming" | "hiking" | "formal_event",
  ) {
    setForm((current) => ({ ...current, [key]: !current[key] }));
  }

  const showManualWeather =
    datesValid &&
    ((readyToLookup &&
      (weatherLookup.status === "unavailable" ||
        weatherLookup.status === "error")) ||
      (!locationResolved && destinationSearchFailed));
  const showDestError = (attempted || touched.destination) && destinationError;
  const showStartError = (attempted || touched.start_date) && startDateError;
  const showEndError =
    (endRejected || attempted || touched.end_date) && endDateError;
  const showTripTypeError = (attempted || touched.trip_type) && tripTypeError;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="trip-form min-w-0 space-y-8"
      aria-busy={submitting}
    >
      <Field label="Destination" htmlFor="destination">
        <DestinationField
          value={form.destination}
          resolved={locationResolved}
          invalid={Boolean(showDestError)}
          onChange={updateDestination}
          onSelect={selectDestination}
          onSearchFailedChange={setDestinationSearchFailed}
          onBlur={() =>
            setTouched((current) => ({ ...current, destination: true }))
          }
        />
        {showDestError ? (
          <p className="mt-2 text-sm text-amber-800">{destinationError}</p>
        ) : destinationSearchFailed && !locationResolved && form.destination.trim() ? (
          <p className="mt-2 text-sm text-ink-muted">
            We couldn&apos;t verify that destination. You can continue and choose
            weather manually.
          </p>
        ) : null}
      </Field>

      <div className="date-grid grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Start date" htmlFor="start_date">
          <span className="date-field">
            <input
              ref={startInputRef}
              id="start_date"
              name="start_date"
              type="date"
              defaultValue=""
              onInput={(event) =>
                updateDates({ start_date: event.currentTarget.value })
              }
              onChange={(event) =>
                updateDates({ start_date: event.currentTarget.value })
              }
              onBlur={() => {
                updateDates({
                  start_date: startInputRef.current?.value ?? "",
                });
                setTouched((current) => ({ ...current, start_date: true }));
              }}
              aria-invalid={Boolean(showStartError)}
              className="input"
            />
          </span>
          {showStartError ? (
            <p className="mt-2 text-sm text-amber-800">{startDateError}</p>
          ) : null}
        </Field>
        <Field label="End date" htmlFor="end_date">
          <span className="date-field">
            <input
              ref={endInputRef}
              id="end_date"
              name="end_date"
              type="date"
              defaultValue=""
              min={form.start_date || undefined}
              onPointerDown={(event) =>
                normalizeEndBeforePicker(event.currentTarget)
              }
              onInput={(event) =>
                updateDates({ end_date: event.currentTarget.value })
              }
              onChange={(event) =>
                updateDates({ end_date: event.currentTarget.value })
              }
              onBlur={() => {
                allowEndNormalizeRef.current = true;
                updateDates({
                  end_date: endInputRef.current?.value ?? "",
                });
                setTouched((current) => ({ ...current, end_date: true }));
                setEndRejected(
                  isEndBeforeStart(
                    form.start_date,
                    endInputRef.current?.value ?? "",
                  ),
                );
              }}
              aria-invalid={Boolean(showEndError)}
              className="input"
            />
          </span>
          {showEndError ? (
            <p className="mt-2 text-sm text-amber-800">{endDateError}</p>
          ) : null}
        </Field>
      </div>
      {datesValid ? (
        <p className="-mt-5 text-sm text-ink-muted">
          {duration} {durationLabel}
        </p>
      ) : null}

      <WeatherPanel
        destination={form.destination.trim()}
        startDate={form.start_date}
        endDate={form.end_date}
        lookup={weatherLookup}
        readyToLookup={readyToLookup}
        seed={
          seedWeatherKey && currentWeatherKey === seedWeatherKey
            ? {
                summary: initialValues.weather_summary,
                destination: initialValues.destination,
                startDate: initialValues.start_date,
                endDate: initialValues.end_date,
                profile: initialValues.weather,
              }
            : null
        }
      />

      {showManualWeather ? (
        <fieldset>
          <legend className="mb-3 text-sm font-medium text-ink">
            Weather
          </legend>
          <p className="mb-3 text-sm text-ink-muted">
            {weatherLookup.status === "unavailable"
              ? "Detailed forecast isn't available yet. Choose the weather you expect."
              : weatherLookup.status === "error"
                ? "We couldn't check the forecast. Choose the weather you expect."
                : destinationSearchFailed && !locationResolved
                  ? "We couldn't verify that destination. Choose the weather you expect."
                  : "Choose the weather you expect."}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {WEATHER_OPTIONS.map((option) => (
              <ChoiceButton
                key={option.value}
                selected={form.weather === option.value}
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    weather: option.value as Weather,
                    weather_summary: null,
                  }))
                }
              >
                {option.label}
              </ChoiceButton>
            ))}
          </div>
        </fieldset>
      ) : null}

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink">Trip type</legend>
        {!form.trip_type && !showTripTypeError ? (
          <p className="mb-3 text-sm text-ink-muted">Select trip type</p>
        ) : null}
        {showTripTypeError ? (
          <p className="mb-3 text-sm text-amber-800">{tripTypeError}</p>
        ) : null}
        <div className="grid grid-cols-2 gap-2">
          {TRIP_TYPE_OPTIONS.map((option) => (
            <ChoiceButton
              key={option.value}
              selected={form.trip_type === option.value}
              onClick={() => {
                setTouched((current) => ({ ...current, trip_type: true }));
                setForm((current) => ({
                  ...current,
                  trip_type: option.value as TripType,
                }));
              }}
            >
              {option.label}
            </ChoiceButton>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink">Activities</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <CheckRow
            label="Gym"
            checked={form.gym}
            onChange={() => toggleActivity("gym")}
          />
          <CheckRow
            label="Swimming"
            checked={form.swimming}
            onChange={() => toggleActivity("swimming")}
          />
          <CheckRow
            label="Hiking"
            checked={form.hiking}
            onChange={() => toggleActivity("hiking")}
          />
          <CheckRow
            label="Formal event"
            checked={form.formal_event}
            onChange={() => toggleActivity("formal_event")}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-medium text-ink">Technology</legend>
        <CheckRow
          label="I’m taking my laptop"
          checked={form.taking_laptop}
          onChange={() =>
            setForm((current) => ({
              ...current,
              taking_laptop: !current.taking_laptop,
            }))
          }
        />
      </fieldset>

      {error ? (
        <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {mode === "edit" ? (
        <div className="flex flex-col gap-3 sm:flex-row">
          {cancelHref ? (
            <Link href={cancelHref} className="btn-secondary w-full sm:w-auto">
              Cancel
            </Link>
          ) : null}
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary w-full sm:flex-1"
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </div>
      ) : (
        <div>
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-primary w-full"
          >
            {submitting ? "Building your list..." : "Build My Packing List"}
          </button>
          {submitting ? (
            <p className="mt-2 text-center text-sm text-ink-muted">
              Generating your list and saving the trip…
            </p>
          ) : weatherPending && formValid ? (
            <p className="mt-2 text-center text-sm text-ink-muted">
              Checking weather...
            </p>
          ) : null}
        </div>
      )}
    </form>
  );
}

function destinationMessage(
  destination: string,
  resolved: boolean,
  searchFailed: boolean,
) {
  if (!destination.trim()) return "Enter a destination.";
  if (!resolved && !searchFailed) {
    return "Please select a destination from the suggestions.";
  }
  return null;
}

function tripTypeMessage(tripType: TripFormValues["trip_type"]) {
  if (!isTripType(tripType)) return "Select a trip type.";
  return null;
}

function startDateMessage(startDate: string) {
  if (!startDate) return "Choose a start date.";
  if (!parseIsoDate(startDate)) return "Enter a valid start date.";
  return null;
}

function endDateMessage(
  startDate: string,
  endDate: string,
  rejected: boolean,
) {
  if (!endDate) return "Choose an end date.";
  if (!parseIsoDate(endDate)) return "Enter a valid end date.";
  if (rejected || isEndBeforeStart(startDate, endDate)) {
    return "End date can't be before the start date.";
  }
  if (startDate && parseIsoDate(startDate)) {
    const days = diffDaysInclusive(startDate, endDate);
    if (days > 90) return "Trips can be up to 90 days.";
  }
  return null;
}

function WeatherPanel({
  destination,
  startDate,
  endDate,
  lookup,
  readyToLookup,
  seed,
}: {
  destination: string;
  startDate: string;
  endDate: string;
  lookup: ReturnType<typeof useTripWeather>;
  readyToLookup: boolean;
  seed: {
    summary: string | null;
    destination: string;
    startDate: string;
    endDate: string;
    profile: Weather;
  } | null;
}) {
  if (!readyToLookup) return null;

  const showingSeed =
    seed &&
    lookup.status !== "ready" &&
    lookup.status !== "unavailable" &&
    lookup.status !== "error";

  return (
    <div className="rounded-3xl border border-sand-200 bg-sand-50 p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Weather for your trip
      </p>
      {lookup.status === "ready" ? (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            {lookup.placeName ?? destination} · {formatDateRange(startDate, endDate)}
          </p>
          <p className="mt-1 font-serif text-xl text-ink">
            {lookup.minTempC != null && lookup.maxTempC != null
              ? formatTemperatureRange(lookup.minTempC, lookup.maxTempC)
              : lookup.summary}
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            {lookup.rainProbability != null && lookup.rainProbability >= 50
              ? `${Math.round(lookup.rainProbability)}% rain`
              : lookup.headline}
          </p>
        </>
      ) : showingSeed ? (
        <>
          <p className="mt-2 text-sm text-ink-soft">
            {seed.destination} · {formatDateRange(seed.startDate, seed.endDate)}
          </p>
          <p className="mt-1 font-serif text-xl text-ink">
            {seed.summary ?? weatherHeadline(seed.profile)}
          </p>
        </>
      ) : lookup.status === "unavailable" ? (
        <p className="mt-2 text-sm text-ink-soft">
          Detailed forecast isn&apos;t available yet.
        </p>
      ) : lookup.status === "error" ? (
        <p className="mt-2 text-sm text-ink-soft">
          We couldn&apos;t check the forecast right now.
        </p>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">Checking weather...</p>
      )}
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div className="field min-w-0">
      <label htmlFor={htmlFor} className="mb-2 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-2xl border px-4 py-3 text-sm font-medium transition-colors ${
        selected
          ? "border-teal-700 bg-teal-50 text-teal-900"
          : "border-sand-200 bg-white text-ink-soft hover:border-sand-300"
      }`}
    >
      {children}
    </button>
  );
}

function CheckRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-sand-200 bg-white px-4 py-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-5 w-5 rounded border-sand-300 accent-teal-700"
      />
      <span className="text-sm text-ink">{label}</span>
    </label>
  );
}
