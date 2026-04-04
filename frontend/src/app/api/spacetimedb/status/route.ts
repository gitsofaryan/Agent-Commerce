import { NextRequest, NextResponse } from "next/server";
import {
  ensureMarketplaceAgentsSynced,
  listSpacetimeAgentProfiles,
  listSpacetimeMirrorRecords,
  spacetimeHealth,
} from "@/lib/integrations/spacetimedb";

export async function GET(request: NextRequest) {
  const sync = await ensureMarketplaceAgentsSynced();
  const limitParam = Number(request.nextUrl.searchParams.get("limit") || "100");
  const limit = Number.isFinite(limitParam)
    ? Math.max(1, Math.min(500, limitParam))
    : 100;

  return NextResponse.json({
    ok: true,
    integration: "spacetimedb",
    sync,
    status: spacetimeHealth(),
    agents: {
      total: listSpacetimeAgentProfiles().length,
      profiles: listSpacetimeAgentProfiles(),
    },
    records: listSpacetimeMirrorRecords(limit),
  });
}
