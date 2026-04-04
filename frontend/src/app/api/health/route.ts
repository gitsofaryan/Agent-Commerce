import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "agent-commerce-mock",
    mode: "frontend-mock",
    timestamp: new Date().toISOString(),
  });
}
