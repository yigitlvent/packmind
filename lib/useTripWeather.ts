import { useEffect, useRef, useState } from "react";
import { datesAreValid } from "@/lib/dates";
import { hasResolvedCoordinates } from "@/lib/geocoding";
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
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  startDate: string,
  endDate: string,
) {
  if (
    !hasResolvedCoordinates(latitude, longitude) ||
    !datesAreValid(startDate, endDate)
  ) {
    return "";
  }
  return `${latitude!.toFixed(4)}|${longitude!.toFixed(4)}|${startDate}|${endDate}`;
}

export function useTripWeather(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
  startDate: string,
  endDate: string,
  placeName = "",
) {
  const key = tripWeatherQueryKey(latitude, longitude, startDate, endDate);
  const [state, setState] = useState<TripWeatherState>(EMPTY);
  const [resolvedKey, setResolvedKey] = useState("");
  const requestId = useRef(0);

  useEffect(() => {
    if (!key || !hasResolvedCoordinates(latitude, longitude)) {
      requestId.current += 1;
      return;
    }

    const id = ++requestId.current;
    const timer = window.setTimeout(() => {
      if (id !== requestId.current) return;
      void (async () => {
        try {
          const forecast = await fetchTripWeather({
            latitude: latitude as number,
            longitude: longitude as number,
            startDate,
            endDate,
          });
          if (id !== requestId.current) return;

          if (!forecast.forecastAvailable) {
            setResolvedKey(key);
            setState({
              ...EMPTY,
              status: "unavailable",
              placeName: placeName || null,
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
            placeName: placeName || null,
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
    }, 250);

    return () => window.clearTimeout(timer);
  }, [endDate, key, latitude, longitude, placeName, startDate]);

  if (!key) return EMPTY;
  if (resolvedKey !== key) return CHECKING;
  return state;
}
