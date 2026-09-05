import {
  addDaysIso,
  defaultTripDates,
  diffDaysInclusive,
} from "@/lib/dates";
import { isWeatherProfile, type WeatherProfile } from "@/lib/weatherProfile";

export type TripType = "business" | "vacation" | "weekend";
export type Weather = WeatherProfile;

export interface Trip {
  id: string;
  session_id: string;
  destination: string;
  duration: number;
  start_date: string | null;
  end_date: string | null;
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
  return value === "business" || value === "vacation" || value === "weekend";
}

export function tripToFormValues(trip: Trip): CreateTripInput {
  const fallback = defaultTripDates();
  const start_date =
    trip.start_date ?? trip.created_at.slice(0, 10) ?? fallback.start_date;
  const end_date =
    trip.end_date ?? addDaysIso(start_date, Math.max(1, trip.duration) - 1);

  return {
    destination: trip.destination,
    duration: diffDaysInclusive(start_date, end_date) || trip.duration,
    start_date,
    end_date,
    trip_type: trip.trip_type,
    weather: isWeatherProfile(trip.weather) ? trip.weather : "mild",
    weather_summary: trip.weather_summary,
    destination_lat: trip.destination_lat ?? null,
    destination_lon: trip.destination_lon ?? null,
    taking_laptop: trip.taking_laptop,
    gym: trip.gym,
    swimming: trip.swimming,
    hiking: trip.hiking,
    formal_event: trip.formal_event,
  };
}

export const TRIP_TYPE_LABELS: Record<TripType, string> = {
  business: "business trip",
  vacation: "vacation",
  weekend: "weekend getaway",
};

export const TRIP_TYPE_OPTIONS: { value: TripType; label: string }[] = [
  { value: "business", label: "Business" },
  { value: "vacation", label: "Vacation" },
  { value: "weekend", label: "Weekend getaway" },
];

export const WEATHER_OPTIONS: { value: Weather; label: string }[] = [
  { value: "rainy", label: "Rainy" },
  { value: "cold", label: "Cold" },
  { value: "hot", label: "Hot" },
  { value: "mixed", label: "Mixed" },
  { value: "mild", label: "Mild / Not sure" },
];
