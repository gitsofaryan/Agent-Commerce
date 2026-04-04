import { NextRequest, NextResponse } from "next/server";
import { pushEvent } from "@/lib/mock-runtime";
import { kalibrRoute } from "@/lib/integrations/kalibr";
import { unbrowseSearch } from "@/lib/integrations/unbrowse";
import { callVultrInference } from "@/lib/vultr-inference";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const message = String(body.message || "").trim();

  let unbrowseSummary = "";
  const researchIntent = /research|find|search|news|web|docs?/i.test(message);

  if (researchIntent) {
    try {
      const result = await unbrowseSearch(message);
      const topHit = Array.isArray(result.items)
        ? (result.items[0] as Record<string, unknown> | undefined)
        : undefined;
      if (topHit?.title) {
        unbrowseSummary = ` Top Unbrowse hit: ${String(topHit.title)}.`;
      }
    } catch {
      unbrowseSummary =
        " Unbrowse not reachable; using local reasoning fallback.";
    }
  }

  const kalibr = await kalibrRoute(
    `${message}\n\nRespond as the Agentic Commerce orchestrator with concrete next actions.`,
  );
  const text = `${kalibr.text}${unbrowseSummary}`;

  // Vultr Inference integration
  let vultrResponse = null;
  try {
    vultrResponse = await callVultrInference("/v1/chat/completions", {
      messages: [
        { role: "system", content: "You are the AgentCommerce orchestrator. Keep responses concise and practical." },
        { role: "user", content: message },
      ],
      model: "mixtral-8x7b-instruct", // Example model, update as needed
      max_tokens: 512,
      temperature: 0.4,
    });
  } catch (e) {
    // Optionally log or handle Vultr API errors
  }

  // Prefer Vultr response if available
  const finalText = vultrResponse?.choices?.[0]?.message?.content?.trim() || text;

  pushEvent("orchestrator.chat", {
    agent_name: "Orchestrator",
    message,
    response: finalText,
    provider: vultrResponse ? "vultr-inference" : kalibr.provider,
    model: vultrResponse?.model || kalibr.model,
    failover_used: vultrResponse ? false : kalibr.failoverUsed,
  });

  return NextResponse.json({
    text: finalText,
    voice_available: true,
    routing: {
      provider: vultrResponse ? "vultr-inference" : kalibr.provider,
      model: vultrResponse?.model || kalibr.model,
      failover_used: vultrResponse ? false : kalibr.failoverUsed,
      attempts: vultrResponse ? 1 : kalibr.attempts,
      latency_ms: vultrResponse ? null : kalibr.latencyMs,
    },
  });
}
