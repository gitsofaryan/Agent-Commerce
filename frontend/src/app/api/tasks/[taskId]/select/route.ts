import { NextRequest, NextResponse } from "next/server";
import { selectWinner, getTaskById } from "@/lib/mock-runtime";
import {
  publishBidBroadcast,
  publishTaskBroadcast,
} from "@/lib/integrations/spacetimedb";

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

    const result = await selectWinner(taskId);

    await publishTaskBroadcast({
      taskId,
      phase: "EXECUTION",
      message: `${result.winner.agentName} selected for execution`,
      agentId: result.winner.agentId,
      details: {
        winner_bid_id: result.winner.id,
        strategy: result.strategy,
      },
    });

    await publishBidBroadcast({
      taskId,
      stage: "winner_selected",
      bidCount: result.ranking?.length || undefined,
      winnerAgent: result.winner.agentName,
      details: {
        winner_bid_id: result.winner.id,
        strategy: result.strategy,
      },
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
