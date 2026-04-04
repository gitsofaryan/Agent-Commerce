import { NextRequest, NextResponse } from "next/server";
import { listEvents } from "@/lib/mock-runtime";

export async function GET(request: NextRequest) {
  const since = request.nextUrl.searchParams.get("since") || undefined;
  const events = listEvents(since);
  return NextResponse.json(events);
}
