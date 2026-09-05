export interface GeoPlace {
  latitude: number;
  longitude: number;
  displayName: string;
  country: string | null;
  region: string | null;
}

const suggestionCache = new Map<string, GeoPlace[]>();
const placeCache = new Map<string, GeoPlace | null>();

export function formatPlaceLabel(input: {
  name: string;
  admin1?: string | null;
  country?: string | null;
}) {
  const parts = [input.name.trim(), input.admin1?.trim(), input.country?.trim()]
    .filter((part): part is string => Boolean(part));
  return [...new Set(parts)].join(", ");
}

function parsePlaceRow(row: unknown): GeoPlace | null {
  if (!row || typeof row !== "object") return null;
  const candidate = row as {
    name?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
    admin1?: string;
  };
  if (
    typeof candidate.name !== "string" ||
    typeof candidate.latitude !== "number" ||
    typeof candidate.longitude !== "number"
  ) {
    return null;
  }

  return {
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    displayName: formatPlaceLabel({
      name: candidate.name,
      admin1: candidate.admin1,
      country: candidate.country,
    }),
    country: candidate.country ?? null,
    region: candidate.admin1 ?? null,
  };
}

export function parseGeocodingResults(payload: unknown): GeoPlace[] {
  if (!payload || typeof payload !== "object") return [];
  const results = (payload as { results?: unknown[] }).results;
  if (!Array.isArray(results)) return [];

  const places: GeoPlace[] = [];
  const seen = new Set<string>();
  for (const row of results) {
    const place = parsePlaceRow(row);
    if (!place || seen.has(place.displayName)) continue;
    seen.add(place.displayName);
    places.push(place);
  }
  return places;
}

export function parseGeocodingResult(payload: unknown): GeoPlace | null {
  return parseGeocodingResults(payload)[0] ?? null;
}

async function fetchGeocodingPayload(query: string, count: number) {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", query);
  url.searchParams.set("count", String(count));
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error("Could not look up that destination.");
  }
  return response.json();
}

export async function resolveDestination(query: string): Promise<GeoPlace | null> {
  const name = query.trim();
  if (name.length < 2) return null;
  const places = parseGeocodingResults(await fetchGeocodingPayload(name, 1));
  return places[0] ?? null;
}

export async function resolveDestinationSuggestions(
  query: string,
): Promise<GeoPlace[]> {
  const name = query.trim();
  if (name.length < 2) return [];
  return parseGeocodingResults(await fetchGeocodingPayload(name, 5));
}

export async function geocodeDestination(query: string): Promise<GeoPlace | null> {
  const key = query.trim().toLowerCase();
  if (key.length < 2) return null;
  if (placeCache.has(key)) {
    return placeCache.get(key) ?? null;
  }

  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as {
    place?: GeoPlace | null;
    places?: GeoPlace[];
  };
  const place = payload.place ?? payload.places?.[0] ?? null;
  placeCache.set(key, place);
  return place;
}

export async function searchDestinations(query: string): Promise<GeoPlace[]> {
  const key = query.trim().toLowerCase();
  if (key.length < 2) return [];
  if (suggestionCache.has(key)) {
    return suggestionCache.get(key) ?? [];
  }

  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    throw new Error("Could not look up that destination.");
  }

  const payload = (await response.json()) as {
    place?: GeoPlace | null;
    places?: GeoPlace[];
  };
  const places = payload.places ?? (payload.place ? [payload.place] : []);
  suggestionCache.set(key, places);
  if (places[0]) {
    placeCache.set(key, places[0]);
  }
  return places;
}

export function hasResolvedCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined,
) {
  return (
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude)
  );
}
