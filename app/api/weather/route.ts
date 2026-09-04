import { NextRequest } from "next/server";
import { resolveTripWeather } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const lat = Number(request.nextUrl.searchParams.get("lat"));
  const lng = Number(request.nextUrl.searchParams.get("lng"));
  const start = request.nextUrl.searchParams.get("start") ?? "";
  const end = request.nextUrl.searchParams.get("end") ?? "";

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !start || !end) {
    return Response.json({ error: "invalid_query" }, { status: 400 });
  }

  try {
    const weather = await resolveTripWeather({
      latitude: lat,
      longitude: lng,
      startDate: start,
      endDate: end,
    });
    return Response.json(weather);
  } catch {
    return Response.json(
      {
        minTempC: 0,
        maxTempC: 0,
        rainProbability: 0,
        rainyDays: 0,
        dayCount: 0,
        daytimeSwingC: 0,
        forecastAvailable: false,
        outOfRange: false,
        error: "lookup_failed",
      },
      { status: 502 },
    );
  }
}
