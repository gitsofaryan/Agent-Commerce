import { NextRequest, NextResponse } from "next/server";
import {
  listAgentMessages,
  sendAgentMessage,
} from "@/lib/integrations/spacetimedb";

export async function GET(request: NextRequest) {
  const agentId = request.nextUrl.searchParams.get("agentId") || undefined;
  const taskId = request.nextUrl.searchParams.get("taskId") || undefined;
  const limit = Number(request.nextUrl.searchParams.get("limit") || "100");

  return NextResponse.json({
    ok: true,
    messages: listAgentMessages({
      agentId,
      taskId,
      limit: Number.isFinite(limit) ? limit : 100,
    }),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    fromAgentId?: string;
    toAgentId?: string;
    taskId?: string;
    message?: string;
    metadata?: Record<string, unknown>;
  };

  const fromAgentId =
    typeof body.fromAgentId === "string" ? body.fromAgentId.trim() : "";
  const toAgentId =
    typeof body.toAgentId === "string" ? body.toAgentId.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!fromAgentId || !toAgentId || !message) {
    return NextResponse.json(
      {
        ok: false,
        error: "fromAgentId, toAgentId and message are required",
      },
      { status: 400 },
    );
  }

  const sent = await sendAgentMessage({
    fromAgentId,
    toAgentId,
    taskId: typeof body.taskId === "string" ? body.taskId.trim() : undefined,
    message,
    metadata: body.metadata,
  });

  return NextResponse.json({
    ok: true,
    message: sent,
  });
}
