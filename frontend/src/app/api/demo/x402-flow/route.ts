import { NextResponse } from "next/server";

export async function POST() {
  const signature = `mock-${Date.now().toString(36)}`;

  return NextResponse.json({
    success: true,
    flow: [
      "Client requests protected endpoint",
      "Server returns HTTP 402 + payment requirements",
      "Client submits x-payment signature",
      "Server verifies mock payment and executes service",
    ],
    signature,
    explorer_url: `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
  });
}
