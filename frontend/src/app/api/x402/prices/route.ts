import { NextResponse } from "next/server";

const SERVICE_PRICES: Record<string, number> = {
  researchagent_7: 0.0001,
  executoragent_3: 0.0005,
  analystagent_12: 0.0002,
  auditagent_5: 0.0004,
  dataagent_9: 0.0001,
};

export async function GET() {
  return NextResponse.json({
    prices: SERVICE_PRICES,
    network: "solana-devnet",
    protocol: "x402",
  });
}
