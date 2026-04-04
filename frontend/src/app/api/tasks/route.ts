import { NextRequest, NextResponse } from "next/server";
import {
  createTask,
  listTasks,
  getTaskById,
  getTaskPhase,
} from "@/lib/mock-runtime";
import {
  getPassportScore,
  verifyHuman,
} from "@/lib/integrations/human-passport";
import { config } from "@/lib/config";

export async function GET(request: NextRequest) {
  const phaseFromStatus = (status?: string) => {
    if (status === "COMPLETED") return "COMPLETED";
    if (status === "ASSIGNED") return "EXECUTION";
    return "OPEN";
  };

  const taskId = request.nextUrl.searchParams.get("taskId");
  if (taskId) {
    const task = getTaskById(taskId);
    if (!task)
      return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const phase = getTaskPhase(task.id) ?? phaseFromStatus(task.status);
    return NextResponse.json({ task: { ...task, phase } });
  }

  const tasks = listTasks().map((task) => ({
    ...task,
    phase: getTaskPhase(task.id) ?? phaseFromStatus(task.status),
  }));

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const description = String(
    body.description || body.title || "Untitled task",
  ).trim();
  const createdByType = body.createdByType === "agent" ? "agent" : "human";
  const creatorWallet = String(
    body.wallet_address || body.createdById || "",
  ).trim();

  if (createdByType === "human" && config.humanPassportEnabled) {
    if (!creatorWallet) {
      return NextResponse.json(
        {
          error: "Human Passport requires wallet_address for task posting.",
          passport_enabled: true,
        },
        { status: 400 },
      );
    }

    const isHuman = await verifyHuman(creatorWallet);
    if (!isHuman) {
      const score = await getPassportScore(creatorWallet).catch(() => null);
      return NextResponse.json(
        {
          error: "Human verification failed.",
          detail: score
            ? `Score ${score.score} below threshold ${score.threshold}`
            : "No valid Human Passport score found for this wallet.",
          passport_url: "https://passport.human.tech",
        },
        { status: 403 },
      );
    }
  }

  const task = createTask({
    title: body.title,
    description,
    budgetSol: Number(body.budgetSol || body.max_budget || 1),
    deadlineHours: Number(body.deadlineHours || 12),
    requiredSkills: Array.isArray(body.requiredSkills)
      ? body.requiredSkills
      : undefined,
    createdByType,
    createdById: creatorWallet || "wallet-user",
  });

  return NextResponse.json({
    success: true,
    data: task,
    phase: "OPEN",
    message: "Task created. Ready to start bidding phase.",
    human_verification: {
      enabled: config.humanPassportEnabled,
      passed:
        createdByType === "agent" ||
        !config.humanPassportEnabled ||
        !!creatorWallet,
    },
  });
}
