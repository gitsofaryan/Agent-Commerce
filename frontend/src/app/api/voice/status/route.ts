import { NextResponse } from "next/server";
import { isVoiceAvailable } from "@/lib/integrations/elevenlabs";

export async function GET() {
  const available = isVoiceAvailable();

  return NextResponse.json({
    voice_available: available,
    provider: available ? "elevenlabs" : null,
    fallback: "text",
  });
}
