import { FORECAST_HORIZON_DAYS, WEATHER_THRESHOLDS, type NormalizedForecast } from "@/lib/weatherProfile";
import { daysFromToday, datesAreValid } from "@/lib/dates";

export type { NormalizedForecast };

export interface TripWeatherResult extends NormalizedForecast {
  outOfRange: boolean;
}

const cache = new Map<string, TripWeatherResult>();

function cacheKey(lat: number, lng: number, start: string, end: string) {
  return `${lat.toFixed(3)}|${lng.toFixed(3)}|${start}|${end}`;
}

export function isWithinForecastHorizon(startIso: string) {
  const fromToday = daysFromToday(startIso);
  return fromToday >= -1 && fromToday <= FORECAST_HORIZON_DAYS - 1;
}

export function normalizeDailyForecast(payload: {
  daily?: {
    temperature_2m_max?: Array<number | null>;
    temperature_2m_min?: Array<number | null>;
    precipitation_probability_max?: Array<number | null>;
    precipitation_sum?: Array<number | null>;
  };
}): NormalizedForecast {
  const daily = payload.daily;
  const maxTemps = (daily?.temperature_2m_max ?? []).filter(
    (value): value is number => typeof value === "number",
  );
  const minTemps = (daily?.temperature_2m_min ?? []).filter(
    (value): value is number => typeof value === "number",
  );
  const rainChances = (daily?.precipitation_probability_max ?? []).filter(
    (value): value is number => typeof value === "number",
  );
  const rainSums = (daily?.precipitation_sum ?? []).filter(
    (value): value is number => typeof value === "number",
  );
  const dayCount = Math.max(maxTemps.length, minTemps.length, rainSums.length);

  if (dayCount === 0) {
    return {
      minTempC: 0,
      maxTempC: 0,
      rainProbability: 0,
      rainyDays: 0,
      dayCount: 0,
      daytimeSwingC: 0,
      forecastAvailable: false,
    };
  }

  const rainyDays = Math.max(rainChances.length, rainSums.length)
    ? Array.from({ length: dayCount }, (_, index) => {
        const chance = rainChances[index] ?? 0;
        const sum = rainSums[index] ?? 0;
        return (
          chance >= WEATHER_THRESHOLDS.rainProbabilityPercent ||
          sum >= WEATHER_THRESHOLDS.rainSumMm
        );
      }).filter(Boolean).length
    : 0;

  return {
    minTempC: minTemps.length ? Math.min(...minTemps) : 0,
    maxTempC: maxTemps.length ? Math.max(...maxTemps) : 0,
    rainProbability: rainChances.length ? Math.max(...rainChances) : 0,
    rainyDays,
    dayCount,
    daytimeSwingC: maxTemps.length
      ? Math.max(...maxTemps) - Math.min(...maxTemps)
      : 0,
    forecastAvailable: true,
  };
}

export async function resolveTripWeather(input: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
}): Promise<TripWeatherResult> {
  if (!datesAreValid(input.startDate, input.endDate)) {
    return {
      minTempC: 0,
      maxTempC: 0,
      rainProbability: 0,
      rainyDays: 0,
      dayCount: 0,
      daytimeSwingC: 0,
      forecastAvailable: false,
      outOfRange: false,
    };
  }

  if (!isWithinForecastHorizon(input.startDate)) {
    return {
      minTempC: 0,
      maxTempC: 0,
      rainProbability: 0,
      rainyDays: 0,
      dayCount: 0,
      daytimeSwingC: 0,
      forecastAvailable: false,
      outOfRange: true,
    };
  }

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(input.latitude));
  url.searchParams.set("longitude", String(input.longitude));
  url.searchParams.set(
    "daily",
    "temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,weather_code",
  );
  url.searchParams.set("start_date", input.startDate);
  url.searchParams.set("end_date", input.endDate);
  url.searchParams.set("timezone", "auto");

  const response = await fetch(url, { next: { revalidate: 1800 } });
  if (!response.ok) {
    const outOfRange = response.status === 400;
    return {
      minTempC: 0,
      maxTempC: 0,
      rainProbability: 0,
      rainyDays: 0,
      dayCount: 0,
      daytimeSwingC: 0,
      forecastAvailable: false,
      outOfRange,
    };
  }

  const normalized = normalizeDailyForecast(await response.json());
  return { ...normalized, outOfRange: !normalized.forecastAvailable };
}

export async function fetchTripWeather(input: {
  latitude: number;
  longitude: number;
  startDate: string;
  endDate: string;
}): Promise<TripWeatherResult> {
  const key = cacheKey(input.latitude, input.longitude, input.startDate, input.endDate);
  const cached = cache.get(key);
  if (cached) return cached;

  const params = new URLSearchParams({
    lat: String(input.latitude),
    lng: String(input.longitude),
    start: input.startDate,
    end: input.endDate,
  });
  const response = await fetch(`/api/weather?${params.toString()}`);
  if (!response.ok) {
    const failed: TripWeatherResult = {
      minTempC: 0,
      maxTempC: 0,
      rainProbability: 0,
      rainyDays: 0,
      dayCount: 0,
      daytimeSwingC: 0,
      forecastAvailable: false,
      outOfRange: false,
    };
    return failed;
  }

  const result = (await response.json()) as TripWeatherResult;
  cache.set(key, result);
  return result;
}
