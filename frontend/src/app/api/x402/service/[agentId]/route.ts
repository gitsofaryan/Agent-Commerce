import { NextRequest, NextResponse } from "next/server";
import { pushEvent } from "@/lib/mock-runtime";
import { config } from "@/lib/config";

const SERVICE_PRICES: Record<string, number> = {
  "researchagent-7": 0.0001,
  "executoragent-3": 0.0005,
  "analystagent-12": 0.0002,
  "auditagent-5": 0.0004,
  "dataagent-9": 0.0001,
};

function paymentRequired(agentId: string, amountSol: number) {
  return NextResponse.json(
    {
      error: "Payment Required",
      payment_requirements: {
        protocol: "x402",
        network: config.x402Network,
        recipient: `${agentId}-wallet-mock`,
        amount_sol: amountSol,
      },
    },
    { status: 402 },
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agentId: string }> },
) {
  const { agentId } = await params;
  const price = SERVICE_PRICES[agentId];

  if (!price) {
    return NextResponse.json(
      { error: `Unknown agent: ${agentId}` },
      { status: 404 },
    );
  }

  const paymentHeader = request.headers.get("x-payment");
  if (!paymentHeader) {
    pushEvent("x402.payment_required", {
      agent_id: agentId,
      price_sol: price,
      message: `Payment required for ${agentId}`,
    });
    return paymentRequired(agentId, price);
  }

  const body = await request.json().catch(() => ({}));
  pushEvent("x402.payment.completed", {
    agent_id: agentId,
    amount_sol: price,
    signature: paymentHeader.slice(0, 24),
    message: `x402 payment verified for ${agentId}`,
  });

  return NextResponse.json({
    success: true,
    data: {
      agent_id: agentId,
      input: body,
      result: `Mock service executed for ${agentId}`,
    },
    payment: {
      protocol: "x402",
      network: config.x402Network,
      amount_sol: price,
      signature: paymentHeader,
    },
  });
}
