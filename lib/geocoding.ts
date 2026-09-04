export interface GeoPlace {
  latitude: number;
  longitude: number;
  displayName: string;
  country: string | null;
  region: string | null;
}

const cache = new Map<string, GeoPlace | null>();

function displayName(input: {
  name: string;
  admin1?: string | null;
  country?: string | null;
}) {
  return [input.name, input.admin1, input.country].filter(Boolean).join(", ");
}

export function parseGeocodingResult(payload: unknown): GeoPlace | null {
  if (!payload || typeof payload !== "object") return null;
  const results = (payload as { results?: unknown[] }).results;
  const first = results?.[0];
  if (!first || typeof first !== "object") return null;
  const row = first as {
    name?: string;
    latitude?: number;
    longitude?: number;
    country?: string;
    admin1?: string;
  };
  if (
    typeof row.name !== "string" ||
    typeof row.latitude !== "number" ||
    typeof row.longitude !== "number"
  ) {
    return null;
  }

  return {
    latitude: row.latitude,
    longitude: row.longitude,
    displayName: displayName({
      name: row.name,
      admin1: row.admin1,
      country: row.country,
    }),
    country: row.country ?? null,
    region: row.admin1 ?? null,
  };
}

export async function resolveDestination(query: string): Promise<GeoPlace | null> {
  const name = query.trim();
  if (name.length < 2) return null;

  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", name);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const response = await fetch(url, { next: { revalidate: 3600 } });
  if (!response.ok) {
    throw new Error("Could not look up that destination.");
  }

  return parseGeocodingResult(await response.json());
}

export async function geocodeDestination(query: string): Promise<GeoPlace | null> {
  const key = query.trim().toLowerCase();
  if (key.length < 2) return null;
  if (cache.has(key)) {
    return cache.get(key) ?? null;
  }

  const response = await fetch(`/api/geocode?q=${encodeURIComponent(query.trim())}`);
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as { place?: GeoPlace | null };
  const place = payload.place ?? null;
  cache.set(key, place);
  return place;
}
