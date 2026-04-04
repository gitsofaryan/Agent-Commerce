import { NextRequest, NextResponse } from "next/server";
import {
  executeTaskWithExternalPayment,
  getTaskById,
  getTaskExecutionPaymentRequirements,
  getTaskWinnerBid,
  pushEvent,
} from "@/lib/mock-runtime";
import {
  createEscrowAgreement,
  releaseEscrow,
} from "@/lib/integrations/alkahest";
import { evaluateArmorIqIntent } from "@/lib/integrations/armoriq";
import { publishTaskBroadcast } from "@/lib/integrations/spacetimedb";
import { config } from "@/lib/config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;

  try {
    const body = await request
      .json()
      .catch(() => ({}) as Record<string, unknown>);
    const mode = String(body.mode || "challenge").toLowerCase();

    const task = getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (mode === "challenge") {
      const winnerBid = getTaskWinnerBid(taskId);
      if (winnerBid) {
        const decision = await evaluateArmorIqIntent({
          agentId: winnerBid.agentId,
          agentName: winnerBid.agentName,
          taskId,
          taskSummary: task.summary,
          requestedAction: "execute_task_and_settle_x402",
          context: {
            mode: "challenge",
            budget_sol: task.budgetSol,
            deadline_hours: task.deadlineHours,
          },
        });

        pushEvent("armoriq.intent_evaluated", {
          task_id: taskId,
          agent_name: winnerBid.agentName,
          allowed: decision.allowed,
          risk_score: decision.riskScore,
          mode: decision.mode,
          reason: decision.reason,
        });

        if (!decision.allowed) {
          pushEvent("armoriq.execution_blocked", {
            task_id: taskId,
            agent_name: winnerBid.agentName,
            reason: decision.reason,
            risk_score: decision.riskScore,
          });

          return NextResponse.json(
            {
              error: "ArmorIQ blocked this task execution",
              reason: decision.reason,
              decision,
            },
            { status: 403 },
          );
        }
      }

      const payerWallet =
        typeof body.payerWallet === "string" ? body.payerWallet : undefined;
      const requirements = await getTaskExecutionPaymentRequirements(
        taskId,
        payerWallet,
      );

      pushEvent("x402.payment_required", {
        task_id: taskId,
        payer_wallet: requirements.payer_wallet,
        recipient_wallet: requirements.recipient,
        amount_sol: requirements.amount_sol,
        message: "x402 challenge issued for task execution",
      });

      return NextResponse.json(
        {
          error: "Payment Required",
          payment_requirements: {
            protocol: "x402",
            network: requirements.network,
            task_id: requirements.task_id,
            recipient: requirements.recipient,
            amount_sol: requirements.amount_sol,
            amount_lamports: requirements.amount_lamports,
            memo: requirements.memo,
            winner_agent: requirements.winner_agent,
            payer_wallet: requirements.payer_wallet,
          },
        },
        { status: 402 },
      );
    }

    if (mode !== "finalize") {
      return NextResponse.json(
        { error: "Invalid mode. Use 'challenge' or 'finalize'." },
        { status: 400 },
      );
    }

    const paymentSignature =
      typeof body.paymentSignature === "string" ? body.paymentSignature : "";
    const payerWallet =
      typeof body.payerWallet === "string" ? body.payerWallet : "";

    if (!paymentSignature || !payerWallet) {
      return NextResponse.json(
        {
          error: "Missing paymentSignature or payerWallet for finalization.",
        },
        { status: 400 },
      );
    }

    const winnerBid = getTaskWinnerBid(taskId);
    if (winnerBid) {
      const decision = await evaluateArmorIqIntent({
        agentId: winnerBid.agentId,
        agentName: winnerBid.agentName,
        taskId,
        taskSummary: task.summary,
        requestedAction: "finalize_task_execution",
        context: {
          mode: "finalize",
          payer_wallet: payerWallet,
          payment_signature: paymentSignature,
        },
      });

      pushEvent("armoriq.intent_evaluated", {
        task_id: taskId,
        agent_name: winnerBid.agentName,
        allowed: decision.allowed,
        risk_score: decision.riskScore,
        mode: decision.mode,
        reason: decision.reason,
      });

      if (!decision.allowed) {
        pushEvent("armoriq.execution_blocked", {
          task_id: taskId,
          agent_name: winnerBid.agentName,
          reason: decision.reason,
          risk_score: decision.riskScore,
        });

        return NextResponse.json(
          {
            error: "ArmorIQ blocked finalize execution",
            reason: decision.reason,
            decision,
          },
          { status: 403 },
        );
      }
    }

    const result = await executeTaskWithExternalPayment({
      taskId,
      paymentSignature,
      payerWallet,
    });

    const escrow = await createEscrowAgreement({
      taskId,
      buyerWallet: result.transaction.from,
      sellerAgent: result.winner.agentName,
      amountSol: result.transaction.amount_sol,
      network: config.solanaCluster,
    });

    const release = await releaseEscrow(escrow.escrowId);

    await publishTaskBroadcast({
      taskId,
      phase: "COMPLETED",
      message: "Task execution completed and payment settled",
      agentId: result.winner.agentId,
      details: {
        winner_agent: result.winner.agentName,
        amount_sol: result.transaction.amount_sol,
        signature: result.transaction.signature,
        escrow_id: escrow.escrowId,
      },
    });

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
