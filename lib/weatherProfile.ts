export type WeatherProfile = "rainy" | "cold" | "hot" | "mixed" | "mild";

export const WEATHER_THRESHOLDS = {
  rainProbabilityPercent: 50,
  rainSumMm: 1.5,
  rainyDayFraction: 0.35,
  coldMaxC: 10,
  coldMinC: 4,
  hotMaxC: 28,
  hotMinC: 18,
  mixedSwingC: 10,
} as const;

export const FORECAST_HORIZON_DAYS = 16;

export interface NormalizedForecast {
  minTempC: number;
  maxTempC: number;
  rainProbability: number;
  rainyDays: number;
  dayCount: number;
  daytimeSwingC: number;
  forecastAvailable: boolean;
}

export function isWeatherProfile(value: string): value is WeatherProfile {
  return (
    value === "rainy" ||
    value === "cold" ||
    value === "hot" ||
    value === "mixed" ||
    value === "mild"
  );
}

export function buildWeatherProfile(
  forecast: NormalizedForecast,
): WeatherProfile {
  if (!forecast.forecastAvailable || forecast.dayCount === 0) {
    return "mild";
  }

  const { rainProbabilityPercent, rainyDayFraction, coldMaxC, coldMinC, hotMaxC, hotMinC, mixedSwingC } =
    WEATHER_THRESHOLDS;

  const rainyDayThreshold = Math.max(
    1,
    Math.ceil(forecast.dayCount * rainyDayFraction),
  );
  const rainy =
    forecast.rainProbability >= rainProbabilityPercent ||
    forecast.rainyDays >= rainyDayThreshold;
  const cold =
    forecast.minTempC <= coldMinC || forecast.maxTempC <= coldMaxC;
  const hot =
    forecast.maxTempC >= hotMaxC && forecast.minTempC >= hotMinC - 6;
  const tempSwing = forecast.daytimeSwingC >= mixedSwingC;
  const mixed =
    (rainy && tempSwing) ||
    (tempSwing && (cold || hot)) ||
    (cold && hot);

  if (mixed) return "mixed";
  if (rainy) return "rainy";
  if (cold) return "cold";
  if (hot) return "hot";
  return "mild";
}

export function tripWeatherProfile(trip: { weather: string }): WeatherProfile {
  return isWeatherProfile(trip.weather) ? trip.weather : "mild";
}

export function weatherHeadline(profile: WeatherProfile): string {
  switch (profile) {
    case "rainy":
      return "Rain likely";
    case "cold":
      return "Cold";
    case "hot":
      return "Hot";
    case "mixed":
      return "Mixed conditions";
    default:
      return "Mild";
  }
}

export function formatTemperatureRange(minTempC: number, maxTempC: number) {
  return `${Math.round(minTempC)}–${Math.round(maxTempC)}°C`;
}

export function formatWeatherSummary(input: {
  minTempC: number;
  maxTempC: number;
  rainProbability: number;
  profile: WeatherProfile;
}) {
  const temps = formatTemperatureRange(input.minTempC, input.maxTempC);
  if (input.rainProbability >= WEATHER_THRESHOLDS.rainProbabilityPercent) {
    return `${temps} · ${Math.round(input.rainProbability)}% rain`;
  }
  return `${temps} · ${weatherHeadline(input.profile)}`;
}
