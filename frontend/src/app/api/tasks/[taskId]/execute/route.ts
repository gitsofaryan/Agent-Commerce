import { NextRequest, NextResponse } from "next/server";
import { executeTask, getTaskById } from "@/lib/mock-runtime";
import {
  createEscrowAgreement,
  releaseEscrow,
} from "@/lib/integrations/alkahest";
import { config } from "@/lib/config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  try {
    const task = getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const result = await executeTask(taskId);

    const escrow = await createEscrowAgreement({
      taskId,
      buyerWallet: result.transaction.from,
      sellerAgent: result.winner.agentName,
      amountSol: result.transaction.amount_sol,
      network: config.solanaCluster,
    });

    const release = await releaseEscrow(escrow.escrowId);

    return NextResponse.json({
      success: true,
      ...result,
      escrow: {
        ...escrow,
        release,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
