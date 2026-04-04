import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    channel: "marketplace",
    open: true,
    registerEndpoint: "/api/clawbot/register",
    listEndpoint: "/api/clawbots",
    connectPage: "/connect-clawbot",
    message:
      "Marketplace clawbot onboarding is open. Register your clawbot via the register endpoint.",
  });
}
