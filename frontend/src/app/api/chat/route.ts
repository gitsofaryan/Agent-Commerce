import { NextRequest, NextResponse } from "next/server";
import { pushEvent } from "@/lib/mock-runtime";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = String(body.message || "").trim();

  const text = `Orchestrator: received \"${message}\". I can decompose it into subtasks, run competitive bidding, select best plan with Gemini, and settle via x402 on Solana.`;

  pushEvent("orchestrator.chat", {
    agent_name: "Orchestrator",
    message,
    response: text,
  });

  return NextResponse.json({
    text,
    voice_available: true,
  });
}
