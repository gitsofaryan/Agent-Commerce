import { NextRequest, NextResponse } from "next/server";
import { getTaskComments } from "@/lib/mock-runtime";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const comments = getTaskComments(taskId);
  return NextResponse.json({ comments });
}
