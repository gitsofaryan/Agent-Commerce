"use client";

import { useEffect, useState } from "react";

interface Task {
    id: string;
    title: string;
    budgetSol: number;
    status: string;
    phase?: TaskPhaseData["phase"];
}

interface TaskPhaseData {
    phase: "OPEN" | "BIDDING" | "SELECTION" | "EXECUTION" | "COMPLETED";
    taskId: string;
    statusMessage?: string;
    bids?: number;
}

export default function TaskPipeline() {
    const [activeTasks, setActiveTasks] = useState<Task[]>([]);
    const [taskPhases, setTaskPhases] = useState<Record<string, TaskPhaseData>>({});
    const [loadingTask, setLoadingTask] = useState<string | null>(null);

    const getServerPhase = (task: Task): TaskPhaseData["phase"] => {
        if (task.phase) return task.phase;
        if (task.status === "COMPLETED") return "COMPLETED";
        if (task.status === "ASSIGNED") return "EXECUTION";
        return "OPEN";
    };

    const phaseRank: Record<TaskPhaseData["phase"], number> = {
        OPEN: 0,
        BIDDING: 1,
        SELECTION: 2,
        EXECUTION: 3,
        COMPLETED: 4,
    };

    const syncTaskPhase = async (taskId: string) => {
        try {
            const res = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`);
            if (!res.ok) return;
            const data = await res.json();
            const task = data.task as Task | undefined;
            if (!task) return;
            const phase = getServerPhase(task);
            setTaskPhases((prev) => ({
                ...prev,
                [taskId]: {
                    ...prev[taskId],
                    taskId,
                    phase,
                    statusMessage: prev[taskId]?.statusMessage,
                    bids: prev[taskId]?.bids,
                },
            }));
        } catch {
            // Ignore sync failures; polling will reconcile.
        }
    };

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const res = await fetch("/api/tasks");
                const data = await res.json();
                const tasks = (data.tasks || []).slice(0, 5) as Task[]; // Show last 5 tasks
                setActiveTasks(tasks);

                // Initialize phases for new tasks
                setTaskPhases((prev) => {
                    const phases = { ...prev };
                    tasks.forEach((task: Task) => {
                        const serverPhase = getServerPhase(task);
                        if (!phases[task.id]) {
                            phases[task.id] = { phase: serverPhase, taskId: task.id };
                            return;
                        }

                        // Keep client phase if it's ahead; adopt server phase if server is ahead.
                        const currentPhase = phases[task.id].phase;
                        if (phaseRank[serverPhase] > phaseRank[currentPhase]) {
                            phases[task.id] = {
                                ...phases[task.id],
                                phase: serverPhase,
                            };
                        }
                    });
                    return phases;
                });
            } catch (error) {
                console.error("Failed to fetch tasks:", error);
            }
        };

        fetchTasks();
        const interval = setInterval(fetchTasks, 3000);
        return () => clearInterval(interval);
    }, []);

    const handlePhaseAction = async (
        taskId: string,
        phase: TaskPhaseData["phase"]
    ) => {
        setLoadingTask(taskId);
        try {
            let endpoint = "";
            let body = {};

            if (phase === "OPEN") {
                endpoint = `/api/tasks/${taskId}/bid`;
                body = { action: "start" };
            } else if (phase === "BIDDING") {
                endpoint = `/api/tasks/${taskId}/bid`;
                body = { action: "close" };
            } else if (phase === "SELECTION") {
                endpoint = `/api/tasks/${taskId}/select`;
            } else if (phase === "EXECUTION") {
                endpoint = `/api/tasks/${taskId}/execute`;
            }

            if (!endpoint) return;

            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const result = await res.json();

            if (res.ok && result.phase) {
                setTaskPhases((prev) => ({
                    ...prev,
                    [taskId]: {
                        ...prev[taskId],
                        phase: result.phase,
                        statusMessage: result.statusMessage,
                        bids: result.bids?.length || result.totalBids,
                    },
                }));
            } else {
                const rawError = result?.error;
                const errorMessage =
                    typeof rawError === "string"
                        ? rawError
                        : typeof rawError?.message === "string"
                            ? rawError.message
                            : String(rawError || "Unknown phase action error");
                const isPhaseConflict =
                    errorMessage.includes("Task not in OPEN state") ||
                    errorMessage.includes("Bidding window not active") ||
                    errorMessage.includes("Selection phase not active") ||
                    errorMessage.includes("Execution phase not active");

                if (isPhaseConflict) {
                    await syncTaskPhase(taskId);
                } else {
                    // Keep UI responsive even for unexpected backend responses.
                    await syncTaskPhase(taskId);
                    console.warn("Phase action mismatch:", errorMessage);
                }
            }
        } catch (error) {
            console.error("Failed to advance phase:", error);
        } finally {
            setLoadingTask(null);
        }
    };

    const getPhaseColor = (phase: TaskPhaseData["phase"]) => {
        const colors: Record<string, string> = {
            OPEN: "var(--brand)",
            BIDDING: "#3b82f6",
            SELECTION: "#8b5cf6",
            EXECUTION: "#f59e0b",
            COMPLETED: "var(--accent)",
        };
        return colors[phase] || "var(--muted)";
    };

    const getNextPhase = (phase: TaskPhaseData["phase"]) => {
        const phases: Record<TaskPhaseData["phase"], TaskPhaseData["phase"] | null> = {
            OPEN: "BIDDING",
            BIDDING: "SELECTION",
            SELECTION: "EXECUTION",
            EXECUTION: "COMPLETED",
            COMPLETED: null,
        };
        return phases[phase];
    };

    if (activeTasks.length === 0) {
        return null;
    }

    return (
        <div>
            <h2 className="text-sm font-bold mono mb-3" style={{ color: "var(--muted)" }}>
                TASK PIPELINE
            </h2>
            <div className="space-y-2">
                {activeTasks.map((task) => {
                    const phaseData = taskPhases[task.id] || { phase: "OPEN", taskId: task.id };
                    const nextPhase = getNextPhase(phaseData.phase);
                    const phaseColor = getPhaseColor(phaseData.phase);

                    return (
                        <div
                            key={task.id}
                            className="neo-card p-3"
                            style={{ backgroundColor: "var(--panel)" }}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold truncate">{task.title}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span
                                            className="neo-pill text-[10px] font-bold"
                                            style={{ background: phaseColor, color: "var(--ink)" }}
                                        >
                                            {phaseData.phase}
                                        </span>
                                        {phaseData.bids && (
                                            <span className="text-[10px] mono" style={{ color: "var(--muted)" }}>
                                                {phaseData.bids} bids
                                            </span>
                                        )}
                                    </div>
                                </div>
                                {nextPhase && (
                                    <button
                                        onClick={() => handlePhaseAction(task.id, phaseData.phase)}
                                        disabled={loadingTask === task.id}
                                        className="neo-btn px-3 py-1.5 text-xs font-bold whitespace-nowrap"
                                        style={{ background: phaseColor, color: "var(--ink)" }}
                                    >
                                        {loadingTask === task.id ? "..." : `→ ${nextPhase}`}
                                    </button>
                                )}
                                {phaseData.phase === "COMPLETED" && (
                                    <span className="text-xs font-bold neo-pill" style={{ background: phaseColor }}>
                                        ✓ Done
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
