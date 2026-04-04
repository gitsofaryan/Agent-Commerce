import { NextRequest, NextResponse } from "next/server";
import { createTask, listTasks, getTaskById } from "@/lib/mock-runtime";

export async function GET(request: NextRequest) {
  const taskId = request.nextUrl.searchParams.get("taskId");
  if (taskId) {
    const task = getTaskById(taskId);
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    return NextResponse.json({ task });
  }
  return NextResponse.json({ tasks: listTasks() });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const description = String(
    body.description || body.title || "Untitled task",
  ).trim();

  const task = createTask({
    title: body.title,
    description,
    budgetSol: Number(body.budgetSol || body.max_budget || 1),
    deadlineHours: Number(body.deadlineHours || 12),
    requiredSkills: Array.isArray(body.requiredSkills)
      ? body.requiredSkills
      : undefined,
    createdByType: body.createdByType === "agent" ? "agent" : "human",
    createdById: body.createdById || body.wallet_address || "wallet-user",
  });

  return NextResponse.json({
    success: true,
    data: task,
    phase: "OPEN",
    message: "Task created. Ready to start bidding phase.",
  });
}
