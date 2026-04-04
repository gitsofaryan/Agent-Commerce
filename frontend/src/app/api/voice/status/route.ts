import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    voice_available: true,
    provider: "elevenlabs-mock",
    mode: "frontend-mock",
  });
}
