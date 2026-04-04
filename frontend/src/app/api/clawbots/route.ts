import { NextRequest, NextResponse } from "next/server";
import { listClawbots, registerClawbot } from "@/lib/mock-runtime";

export async function GET() {
  return NextResponse.json({ clawbots: listClawbots() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const clawbot = registerClawbot({
    id: body.id || `clawbot-${Date.now().toString(36)}`,
    owner_wallet: String(body.owner_wallet || "wallet-user"),
    endpoint: String(body.endpoint || "https://example.com/api/clawbot"),
    skills: Array.isArray(body.skills) ? body.skills : [],
  });

  return NextResponse.json({ success: true, clawbot });
}
