import { NextRequest, NextResponse } from "next/server";
import {
  listSpacetimeRealtimeFeed,
  type SpacetimeRealtimeItem,
} from "@/lib/integrations/spacetimedb";

const ALLOWED_TOPICS: SpacetimeRealtimeItem["topic"][] = [
  "tasks",
  "bids",
  "agents",
  "messages",
  "events",
  "system",
];

function parseTopics(raw: string | null) {
  if (!raw) return undefined;
  const requested = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as SpacetimeRealtimeItem["topic"][];

  const filtered = requested.filter((topic) => ALLOWED_TOPICS.includes(topic));
  return filtered.length > 0 ? filtered : undefined;
}

export async function GET(request: NextRequest) {
  const afterSeq = Number(request.nextUrl.searchParams.get("afterSeq") || "0");
  const limit = Number(request.nextUrl.searchParams.get("limit") || "200");
  const topics = parseTopics(request.nextUrl.searchParams.get("topics"));
  const agentId = request.nextUrl.searchParams.get("agentId") || undefined;

  const feed = listSpacetimeRealtimeFeed({
    afterSeq: Number.isFinite(afterSeq) ? afterSeq : 0,
    limit: Number.isFinite(limit) ? limit : 200,
    topics,
    agentId,
  });

  return NextResponse.json({
    ok: true,
    integration: "spacetimedb",
    realtime: true,
    channels: topics || ALLOWED_TOPICS,
    ...feed,
  });
}
