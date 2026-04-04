import { NextRequest, NextResponse } from "next/server";
import { pushEvent } from "@/lib/mock-runtime";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = String(body.message || "").trim();

  const text = `Voice mock response: ${message}. ElevenLabs integration point is ready in frontend-mock mode.`;

  pushEvent("orchestrator.voice", {
    agent_name: "Orchestrator",
    message,
    response: text,
  });

  return NextResponse.json({
    text,
    audio_available: false,
    provider: "elevenlabs-mock",
  });
}
