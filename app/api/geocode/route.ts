import { NextRequest } from "next/server";
import { resolveDestination } from "@/lib/geocoding";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return Response.json({ place: null }, { status: 400 });
  }

  try {
    const place = await resolveDestination(query);
    return Response.json({ place });
  } catch {
    return Response.json({ place: null, error: "lookup_failed" }, { status: 502 });
  }
}
