import { NextRequest, NextResponse } from "next/server";
import {
  ensureMarketplaceAgentsSynced,
  listAgentPersonas,
  upsertAgentPersona,
} from "@/lib/integrations/spacetimedb";

export async function GET(request: NextRequest) {
  await ensureMarketplaceAgentsSynced();

  const agentId = request.nextUrl.searchParams.get("agentId");
  const personas = listAgentPersonas();

  if (agentId) {
    const persona = personas.find((item) => item.agentId === agentId);
    if (!persona) {
      return NextResponse.json(
        { error: "Agent persona not found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ ok: true, persona });
  }

  return NextResponse.json({ ok: true, personas });
}

export async function POST(request: NextRequest) {
  await ensureMarketplaceAgentsSynced();

  const body = (await request.json().catch(() => ({}))) as {
    agentId?: string;
    displayName?: string;
    archetype?: string;
    tone?: string;
    specialties?: string[];
    pricingStyle?: string;
    riskAppetite?: "low" | "medium" | "high";
  };

  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "";
  if (!agentId) {
    return NextResponse.json({ error: "agentId is required" }, { status: 400 });
  }

  const persona = await upsertAgentPersona({
    agentId,
    displayName: body.displayName,
    archetype: body.archetype,
    tone: body.tone,
    specialties: body.specialties,
    pricingStyle: body.pricingStyle,
    riskAppetite: body.riskAppetite,
  });

  return NextResponse.json({ ok: true, persona });
}
