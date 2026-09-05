import {
  addDaysIso,
  alignEndToStart,
  datesAreValid,
  defaultTripDates,
  diffDaysInclusive,
} from "@/lib/dates";
import { isWeatherProfile, type WeatherProfile } from "@/lib/weatherProfile";

export type TripType = "business" | "vacation";
export type PersistedTripType = TripType | "weekend";
export type Weather = WeatherProfile;

export interface Trip {
  id: string;
  session_id: string;
  destination: string;
  duration: number;
  start_date: string | null;
  end_date: string | null;
  trip_type: PersistedTripType;
  weather: Weather;
  weather_summary: string | null;
  destination_lat: number | null;
  destination_lon: number | null;
  taking_laptop: boolean;
  gym: boolean;
  swimming: boolean;
  hiking: boolean;
  formal_event: boolean;
  created_at: string;
}

export interface CreateTripInput {
  destination: string;
  duration: number;
  start_date: string;
  end_date: string;
  trip_type: TripType;
  weather: Weather;
  weather_summary: string | null;
  destination_lat: number | null;
  destination_lon: number | null;
  taking_laptop: boolean;
  gym: boolean;
  swimming: boolean;
  hiking: boolean;
  formal_event: boolean;
}

export type TripFormValues = Omit<CreateTripInput, "trip_type"> & {
  trip_type: TripType | "";
};

export function isTripType(value: string): value is TripType {
  return value === "business" || value === "vacation";
}

export function normalizeTripType(value: string): TripType {
  return value === "business" ? "business" : "vacation";
}

export function tripTypeLabel(value: string) {
  if (value === "business") return TRIP_TYPE_LABELS.business;
  if (value === "weekend") return TRIP_TYPE_LABELS.weekend;
  return TRIP_TYPE_LABELS.vacation;
}

export function tripToFormValues(trip: Trip): CreateTripInput {
  const fallback = defaultTripDates();
  const start_date =
    trip.start_date ?? trip.created_at.slice(0, 10) ?? fallback.start_date;
  const derivedEnd =
    trip.end_date ?? addDaysIso(start_date, Math.max(1, trip.duration) - 1);
  const end_date = alignEndToStart(start_date, derivedEnd);

  return {
    destination: trip.destination,
    duration: datesAreValid(start_date, end_date)
      ? diffDaysInclusive(start_date, end_date)
      : 0,
    start_date,
    end_date,
    trip_type: normalizeTripType(trip.trip_type),
    weather: isWeatherProfile(trip.weather) ? trip.weather : "mild",
    weather_summary: end_date ? trip.weather_summary : null,
    destination_lat: trip.destination_lat ?? null,
    destination_lon: trip.destination_lon ?? null,
    taking_laptop: trip.taking_laptop,
    gym: trip.gym,
    swimming: trip.swimming,
    hiking: trip.hiking,
    formal_event: trip.formal_event,
  };
}

export const TRIP_TYPE_LABELS: Record<PersistedTripType, string> = {
  business: "business trip",
  vacation: "vacation",
  weekend: "weekend getaway",
};

export const TRIP_TYPE_OPTIONS: { value: TripType; label: string }[] = [
  { value: "business", label: "Business" },
  { value: "vacation", label: "Vacation" },
];

export const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: "rainy", label: "Rainy" },
  { value: "cold", label: "Cold" },
  { value: "hot", label: "Hot" },
  { value: "mixed", label: "Mixed" },
  { value: "mild", label: "Mild / Not sure" },
];
