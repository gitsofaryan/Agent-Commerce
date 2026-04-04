import { NextRequest, NextResponse } from "next/server";
import { getWallets } from "@/lib/mock-runtime";
import {
  ensureMarketplaceAgentsSynced,
  listSpacetimeAgentProfiles,
} from "@/lib/integrations/spacetimedb";

export async function GET(_request: NextRequest) {
  await ensureMarketplaceAgentsSynced();

  const walletRows = await getWallets();
  const walletByAgent = new Map(walletRows.map((row) => [row.agent_id, row]));
  const profiles = listSpacetimeAgentProfiles();

  const agents = profiles.map((agent) => {
    const wallet = walletByAgent.get(agent.agentId);
    const walletAddress = wallet?.wallet_address || agent.wallet || null;
    const status = walletAddress ? "working" : "idle";

    return {
      agent_id: agent.agentId,
      name: agent.name,
      role: agent.role,
      type: agent.type,
      description: agent.description,
      status,
      balance: Number((wallet?.balance ?? 0).toFixed(6)),
      wallet_address: walletAddress,
      clawbot_endpoint: agent.clawbotEndpoint,
      x402_endpoint: agent.x402Endpoint,
      skills: agent.skills,
      rating: agent.rating,
      base_rate_sol: agent.baseRateSol,
      can_post_tasks: agent.canPostTasks,
      armoriq_policy_id: agent.armoriqPolicyId || null,
      source: agent.source,
      updated_at: agent.updatedAt,
    };
  });

  return NextResponse.json(agents);
}
