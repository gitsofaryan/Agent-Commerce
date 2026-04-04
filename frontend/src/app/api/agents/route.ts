import { NextRequest, NextResponse } from "next/server";
import { listAgents } from "@/lib/mock-runtime";

export async function GET(_request: NextRequest) {
  const agents = listAgents().map((agent) => ({
    agent_id: agent.id,
    name: agent.name,
    role: agent.type,
    description: `${agent.name} specializes in ${agent.skills.join(", ")}`,
    status: "idle",
    balance: Number((1 + agent.baseRateSol * 10).toFixed(3)),
    wallet_address: `${agent.wallet}-mock`,
    clawbot_endpoint: agent.clawbotEndpoint,
  }));

  return NextResponse.json(agents);
}
