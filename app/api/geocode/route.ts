import { NextRequest } from "next/server";
import { resolveDestinationSuggestions } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ place: null, places: [] }, { status: 400 });
  }

  try {
    const places = await resolveDestinationSuggestions(query);
    return Response.json({ places, place: places[0] ?? null });
  } catch {
    return Response.json(
      { place: null, places: [], error: "lookup_failed" },
      { status: 502 },
    );
  }
}
