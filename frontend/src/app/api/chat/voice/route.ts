import { NextRequest, NextResponse } from "next/server";
import { pushEvent } from "@/lib/mock-runtime";
import { kalibrRoute } from "@/lib/integrations/kalibr";
import { isVoiceAvailable, textToSpeech } from "@/lib/integrations/elevenlabs";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = String(body.message || "").trim();

  const kalibr = await kalibrRoute(
    `${message}\n\nKeep response under 2 short sentences for voice playback.`,
  );
  const text = kalibr.text;

  pushEvent("orchestrator.voice", {
    agent_name: "Orchestrator",
    message,
    response: text,
    provider: kalibr.provider,
    model: kalibr.model,
  });

  if (isVoiceAvailable()) {
    const audio = await textToSpeech(text);
    if (audio) {
      return new NextResponse(Buffer.from(audio), {
        headers: {
          "Content-Type": "audio/mpeg",
          "X-Text-Response": text.slice(0, 500),
          "X-Voice-Provider": "elevenlabs",
        },
      });
    }
  }

  return NextResponse.json({
    text,
    audio_available: false,
    provider: isVoiceAvailable() ? "elevenlabs-fallback" : "text-only",
  });
}
