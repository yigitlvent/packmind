import { useEffect, useRef, useState } from "react";
import { datesAreValid } from "@/lib/dates";
import { geocodeDestination, type GeoPlace } from "@/lib/geocoding";
import { fetchTripWeather } from "@/lib/weather";
import {
  buildWeatherProfile,
  formatWeatherSummary,
  weatherHeadline,
  type WeatherProfile,
} from "@/lib/weatherProfile";

export type WeatherLookupStatus =
  | "idle"
  | "checking"
  | "ready"
  | "unavailable"
  | "error";

export interface TripWeatherState {
  status: WeatherLookupStatus;
  profile: WeatherProfile | null;
  summary: string | null;
  headline: string | null;
  placeName: string | null;
  minTempC: number | null;
  maxTempC: number | null;
  rainProbability: number | null;
  outOfRange: boolean;
}

const EMPTY: TripWeatherState = {
  status: "idle",
  profile: null,
  summary: null,
  headline: null,
  placeName: null,
  minTempC: null,
  maxTempC: null,
  rainProbability: null,
  outOfRange: false,
};

const CHECKING: TripWeatherState = {
  ...EMPTY,
  status: "checking",
};

export function tripWeatherQueryKey(
  destination: string,
  startDate: string,
  endDate: string,
) {
  const trimmed = destination.trim();
  if (!trimmed || !datesAreValid(startDate, endDate)) return "";
  return `${trimmed.toLowerCase()}|${startDate}|${endDate}`;
}

export function useTripWeather(
  destination: string,
  startDate: string,
  endDate: string,
) {
  const key = tripWeatherQueryKey(destination, startDate, endDate);
  const [state, setState] = useState<TripWeatherState>(EMPTY);
  const [resolvedKey, setResolvedKey] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (!key) {
      requestId.current += 1;
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      if (id !== requestId.current) return;
      void (async () => {
        try {
          const place: GeoPlace | null = await geocodeDestination(
            destination.trim(),
          );
          if (id !== requestId.current) return;
          if (!place) {
            setResolvedKey(key);
            setState({ ...EMPTY, status: "error" });
            return;
          }

          const forecast = await fetchTripWeather({
            latitude: place.latitude,
            longitude: place.longitude,
            startDate,
            endDate,
          });
          if (id !== requestId.current) return;

          if (!forecast.forecastAvailable) {
            setResolvedKey(key);
            setState({
              ...EMPTY,
              status: "unavailable",
              placeName: place.displayName,
              outOfRange: forecast.outOfRange,
            });
            return;
          }

          const profile = buildWeatherProfile(forecast);
          setResolvedKey(key);
          setState({
            status: "ready",
            profile,
            summary: formatWeatherSummary({
              minTempC: forecast.minTempC,
              maxTempC: forecast.maxTempC,
              rainProbability: forecast.rainProbability,
              profile,
            }),
            headline: weatherHeadline(profile),
            placeName: place.displayName,
            minTempC: forecast.minTempC,
            maxTempC: forecast.maxTempC,
            rainProbability: forecast.rainProbability,
            outOfRange: false,
          });
        } catch {
          if (id !== requestId.current) return;
          setResolvedKey(key);
          setState({ ...EMPTY, status: "error" });
        }
      })();
    }, 450);

    return () => window.clearTimeout(timer);
  }, [destination, endDate, key, startDate]);

  if (!key) return EMPTY;
  if (resolvedKey !== key) return CHECKING;
  return state;
}
