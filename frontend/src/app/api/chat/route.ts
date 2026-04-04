import { NextRequest, NextResponse } from "next/server";
import { pushEvent } from "@/lib/mock-runtime";
import { kalibrRoute } from "@/lib/integrations/kalibr";
import { unbrowseSearch } from "@/lib/integrations/unbrowse";

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

  pushEvent("orchestrator.chat", {
    agent_name: "Orchestrator",
    message,
    response: text,
    provider: kalibr.provider,
    model: kalibr.model,
    failover_used: kalibr.failoverUsed,
  });

  return NextResponse.json({
    text,
    voice_available: true,
    routing: {
      provider: kalibr.provider,
      model: kalibr.model,
      failover_used: kalibr.failoverUsed,
      attempts: kalibr.attempts,
      latency_ms: kalibr.latencyMs,
    },
  });
}
