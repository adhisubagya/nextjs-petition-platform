import { NextResponse, type NextRequest } from "next/server";
import { getComments } from "@/lib/petition";

export async function GET(req: NextRequest) {
  const page = await getComments(req.nextUrl.searchParams.get("cursor"));
  // Cached at the edge for 24h so pagination costs no Firestore reads for most visitors.
  return NextResponse.json(page, {
    headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=3600" },
  });
}
