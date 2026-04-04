import { NextRequest, NextResponse } from "next/server";
import { listClawbots, registerClawbot } from "@/lib/mock-runtime";
import { writeSpacetimeRecord } from "@/lib/integrations/spacetimedb";

function normalizeSkills(input: unknown) {
  if (Array.isArray(input)) {
    return input.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof input === "string") {
    return input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Use POST to register your clawbot for marketplace bidding.",
    clawbots: listClawbots(),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    id?: string;
    owner_wallet?: string;
    endpoint?: string;
    metadata_url?: string;
    x402_endpoint?: string;
    auth_scheme?: string;
    skills?: string[] | string;
  };

  const ownerWallet = String(body.owner_wallet || "").trim();
  const endpoint = String(body.endpoint || "").trim();

  if (!ownerWallet || !endpoint) {
    return NextResponse.json(
      {
        ok: false,
        error: "owner_wallet and endpoint are required",
      },
      { status: 400 },
    );
  }

  const clawbot = registerClawbot({
    id: body.id || `clawbot-${Date.now().toString(36)}`,
    owner_wallet: ownerWallet,
    endpoint,
    skills: normalizeSkills(body.skills),
  });

  await writeSpacetimeRecord({
    table: "clawbot_registry",
    source: "clawbot-register-api",
    payload: {
      action: "register",
      clawbot_id: clawbot.id,
      owner_wallet: clawbot.owner_wallet,
      endpoint: clawbot.endpoint,
      metadata_url: body.metadata_url || null,
      x402_endpoint: body.x402_endpoint || null,
      auth_scheme: body.auth_scheme || null,
      skills: clawbot.skills,
      connected_at: clawbot.connected_at,
    },
  });

  return NextResponse.json({
    ok: true,
    message: "Clawbot connected to platform and marketplace bidding.",
    clawbot,
    marketplace: {
      connected: true,
      open_bidding: true,
    },
  });
}
