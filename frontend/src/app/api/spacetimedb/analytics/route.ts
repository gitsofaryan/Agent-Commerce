import { NextResponse } from "next/server";
import {
  computeSpacetimeAnalytics,
  ensureMarketplaceAgentsSynced,
  listAgentPersonas,
  listSpacetimeAgentProfiles,
  spacetimeHealth,
} from "@/lib/integrations/spacetimedb";

export async function GET() {
  const sync = await ensureMarketplaceAgentsSynced();
  const analytics = computeSpacetimeAnalytics();
  const personas = listAgentPersonas();
  const profiles = listSpacetimeAgentProfiles();

  return NextResponse.json({
    ok: true,
    sync,
    analytics,
    agents: {
      total: profiles.length,
      recent: profiles.slice(0, 5),
    },
    personas: {
      total: personas.length,
      recent: personas.slice(0, 5),
    },
    status: spacetimeHealth(),
  });
}
