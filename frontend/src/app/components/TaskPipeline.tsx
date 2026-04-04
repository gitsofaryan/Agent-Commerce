"use client";

import { useEffect, useState } from "react";

interface Task {
  id: string;
  title: string;
  budgetSol: number;
  status: string;
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
            if (!phases[task.id]) {
              phases[task.id] = { phase: "OPEN", taskId: task.id };
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
        console.error("Phase action failed:", result.error);
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
