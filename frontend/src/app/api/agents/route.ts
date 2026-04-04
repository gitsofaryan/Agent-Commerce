import { NextRequest, NextResponse } from "next/server";
import { listAgents, getWallets } from "@/lib/mock-runtime";

export async function GET(_request: NextRequest) {
  const walletRows = await getWallets();
  const walletByAgent = new Map(walletRows.map((row) => [row.agent_id, row]));

  const agents = listAgents().map((agent) => {
    const wallet = walletByAgent.get(agent.id);
    return {
      agent_id: agent.id,
      name: agent.name,
      role: agent.type,
      description: `${agent.name} specializes in ${agent.skills.join(", ")}`,
      status: wallet?.wallet_address ? "working" : "idle",
      balance: Number((wallet?.balance ?? 0).toFixed(6)),
      wallet_address: wallet?.wallet_address || null,
      clawbot_endpoint: agent.clawbotEndpoint,
    };
  });

  return NextResponse.json(agents);
}
