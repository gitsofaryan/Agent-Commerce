import { NextRequest, NextResponse } from "next/server";
import {
  startBidding,
  submitBids,
  getTaskById,
  listBids,
} from "@/lib/mock-runtime";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const body = await request.json();
  const action = body.action || "start"; // "start" or "close"

  try {
    const task = getTaskById(taskId);
    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (action === "start") {
      const result = startBidding(taskId);
      return NextResponse.json({
        success: true,
        ...result,
        bids: [],
      });
    } else if (action === "close") {
      const result = submitBids(taskId);
      const bids = listBids(taskId);
      return NextResponse.json({
        success: true,
        ...result,
        bids,
      });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'start' or 'close'" },
      { status: 400 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
) {
  const { taskId } = await params;
  const bids = listBids(taskId);
  return NextResponse.json({ taskId, bids, count: bids.length });
}
