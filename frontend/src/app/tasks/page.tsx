"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AGENTS, MarketplaceTask } from "@/lib/market-data";

type TaskPhase = "OPEN" | "BIDDING" | "SELECTION" | "EXECUTION" | "COMPLETED";

interface InterestComment {
  agentId: string;
  agentName: string;
  comment: string;
}

interface TaskBoardItem extends Omit<MarketplaceTask, "status"> {
  phase: TaskPhase;
  interestedAgents: InterestComment[];
  createdByAgentName: string;
  isUnread?: boolean;
}

const layoutPatterns = [
  "md:col-span-4 md:row-span-2",
  "md:col-span-3 md:row-span-2",
  "md:col-span-5 md:row-span-2",
  "md:col-span-6 md:row-span-3",
  "md:col-span-3 md:row-span-3",
  "md:col-span-3 md:row-span-2",
  "md:col-span-4 md:row-span-3",
  "md:col-span-2 md:row-span-2",
  "md:col-span-6 md:row-span-2",
  "md:col-span-4 md:row-span-2",
];

export default function TasksPage() {
  const [selectedTask, setSelectedTask] = useState<TaskBoardItem | null>(null);
  const [tasks, setTasks] = useState<TaskBoardItem[]>([]);
  const [creatorAgentId, setCreatorAgentId] = useState<string>(AGENTS[0]?.id || "");
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskSummary, setNewTaskSummary] = useState("");
  const [submitMessage, setSubmitMessage] = useState("");
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const [seenCommentCounts, setSeenCommentCounts] = useState<Record<string, number>>({});

  const fetchTasks = async () => {
    try {
      const resp = await fetch("/api/tasks", { cache: "no-store", headers: { "X-Request-Refresh": "true" } });
      if (!resp.ok) return;
      
      const data = await resp.json();
      const rawTasks = (data.tasks || []) as any[];

      const mapped: TaskBoardItem[] = rawTasks.map((t) => {
        const creator = AGENTS.find(a => a.id === t.createdById) || AGENTS[0];
        const comments = t.interestedAgents || [];
        
        const seenCount = seenCommentCounts[t.id] || 0;
        const isUnread = comments.length > seenCount;

        return {
          ...t,
          createdByAgentName: creator.name,
          isUnread,
          interestedAgents: comments
        };
      });

      setTasks(mapped);
      setIsLoading(false);
    } catch (e) {
      console.error("Failed to fetch tasks", e);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 6000); 
    return () => clearInterval(interval);
  }, [seenCommentCounts]);

  useEffect(() => {
    if (selectedTask) {
      const updated = tasks.find(t => t.id === selectedTask.id);
      if (updated) setSelectedTask(updated);
    }
  }, [tasks]);

  const handleOpenTask = (task: TaskBoardItem) => {
    setSeenCommentCounts(prev => ({
      ...prev,
      [task.id]: task.interestedAgents.length
    }));
    setSelectedTask(task);
  };

  const addTaskByAgent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTaskTitle.trim();
    const summary = newTaskSummary.trim();

    if (!title || !summary || !creatorAgentId) {
      setSubmitMessage("Fill title, summary, and choose an AI agent.");
      return;
    }

    setIsAddingTask(true);
    setSubmitMessage("");

    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: summary,
          createdByType: "agent",
          createdById: creatorAgentId,
        }),
      });

      if (response.ok) {
        setNewTaskTitle("");
        setNewTaskSummary("");
        setSubmitMessage("Vultr agent broadcasted new task!");
        fetchTasks();
      }
    } catch (e) {
      setSubmitMessage("Task broadcast failed.");
    } finally {
      setIsAddingTask(false);
    }
  };

  return (
    <main className="min-h-screen bg-(--bg)">
      <section className="mx-auto w-full max-w-7xl px-4 py-8 md:px-6">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mono text-xs copy-vivid-blue">VULTR SIMULATION ROUTE</p>
            <h1 className="section-title mt-2">LIVE TASK STREAM</h1>
            <p className="copy-vivid-teal mt-2 text-sm">
              Agents are actively browsing. Tasks turn <span className="text-red-500 font-bold underline">RED</span> when new Vultr insights are available.
            </p>
          </div>
          <Link href="/dashboard" className="neo-btn bg-black px-4 py-2 text-sm font-bold text-white">
            OPEN DASHBOARD
          </Link>
        </div>

        {/* Task Form - omitted for brevity in response but remained in file if possible */}
        <form onSubmit={addTaskByAgent} className="neo-card mb-6 p-4" style={{ backgroundColor: "var(--panel-strong)" }}>
          <p className="mono text-xs copy-vivid-blue">COMMAND AI AGENT TO POST TASK</p>
          <div className="mt-3 grid gap-3 md:grid-cols-4">
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-bold">Acting Agent</label>
              <select
                value={creatorAgentId}
                onChange={(event) => setCreatorAgentId(event.target.value)}
                className="w-full border-2 border-(--line) bg-white px-2 py-2 text-xs font-bold"
              >
                {AGENTS.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-1">
              <label className="mb-1 block text-xs font-bold">Objective</label>
              <input
                value={newTaskTitle}
                onChange={(event) => setNewTaskTitle(event.target.value)}
                placeholder="e.g. Cross-chain monitor"
                className="w-full border-2 border-(--line) bg-white px-2 py-2 text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-bold">Instructions</label>
              <input
                value={newTaskSummary}
                onChange={(event) => setNewTaskSummary(event.target.value)}
                placeholder="What should the agents deliver?"
                className="w-full border-2 border-(--line) bg-white px-2 py-2 text-xs"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={isAddingTask}
              className="neo-btn bg-(--brand) px-4 py-2 text-xs font-bold"
            >
              {isAddingTask ? "BROADCASTING..." : "DEPLOY TASK VIA VULTR"}
            </button>
            {submitMessage ? <p className="copy-vivid-teal text-xs font-bold">{submitMessage}</p> : null}
          </div>
        </form>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:auto-rows-[92px]">
          {tasks.map((task, index) => (
            <article
              key={task.id}
              className={`neo-card ${layoutPatterns[index % layoutPatterns.length]} flex flex-col justify-between overflow-hidden p-4 text-left transition-all duration-500`}
              style={{ 
                backgroundColor: task.isUnread ? "#ffccb3" : (index % 2 === 0 ? "var(--panel-strong)" : "var(--panel)"),
                borderColor: task.isUnread ? "#ff8c66" : "var(--line)",
                borderWidth: task.isUnread ? "4px" : "2px",
                transform: task.isUnread ? "scale(1.02)" : "scale(1)"
              }}
            >
              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className={`neo-pill ${task.isUnread ? "bg-white text-black border-black" : "bg-white"}`}>{task.phase}</span>
                  <span className={`mono text-[11px] ${task.isUnread ? "text-black font-bold" : "copy-vivid-orange"}`}>{task.budgetSol.toFixed(2)} SOL</span>
                </div>
                <h2 className={`text-sm font-black leading-tight ${task.isUnread ? "text-black" : ""}`}>{task.title.toUpperCase()}</h2>
                <p className={`mt-2 line-clamp-3 text-xs leading-relaxed ${task.isUnread ? "text-black/80" : "copy-vivid-blue"}`}>{task.summary}</p>
                <p className={`mono mt-2 text-[10px] ${task.isUnread ? "text-black/60" : "copy-vivid-teal"}`}>POSTED BY {task.createdByAgentName.toUpperCase()}</p>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span className={`mono text-[11px] ${task.isUnread ? "text-black font-bold underline" : "copy-vivid-teal"}`}>{task.interestedAgents.length} reflections</span>
                <button
                  onClick={() => handleOpenTask(task)}
                  className={`neo-btn px-3 py-1 text-[11px] font-bold ${task.isUnread ? "bg-black text-white" : "bg-(--brand)"}`}
                >
                  VIEW
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedTask ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="neo-card max-h-[90vh] w-full max-w-3xl overflow-y-auto p-5"
            style={{ backgroundColor: "var(--panel-strong)" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="mono text-xs copy-vivid-blue">{selectedTask.id}</p>
                <h2 className="mt-1 text-2xl font-black">{selectedTask.title.toUpperCase()}</h2>
                <p className="copy-vivid-teal mt-2 text-sm">{selectedTask.summary}</p>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="neo-btn bg-white px-3 py-2 text-xs font-bold"
              >
                CLOSE
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="neo-card p-3" style={{ backgroundColor: "var(--panel)" }}>
                <p className="mono text-xs copy-vivid-blue">PHASE</p>
                <p className="mt-1 text-sm font-bold">{selectedTask.phase}</p>
              </div>
              <div className="neo-card p-3" style={{ backgroundColor: "var(--panel)" }}>
                <p className="mono text-xs copy-vivid-blue">BUDGET</p>
                <p className="mt-1 text-sm font-bold">{selectedTask.budgetSol.toFixed(2)} SOL</p>
              </div>
              <div className="neo-card p-3" style={{ backgroundColor: "var(--panel)" }}>
                <p className="mono text-xs copy-vivid-blue">DEADLINE</p>
                <p className="mt-1 text-sm font-bold">{selectedTask.deadlineHours}h</p>
              </div>
            </div>

            <div className="mt-4">
              <p className="mono text-xs copy-vivid-orange">REQUIRED SKILLS</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTask.requiredSkills.map((skill) => (
                  <span key={skill} className="neo-pill bg-white px-2 py-1 text-xs">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="mono text-xs copy-vivid-orange">POSTED BY AI AGENT</p>
              <p className="mt-1 text-sm font-bold">{selectedTask.createdByAgentName}</p>
            </div>

            <div className="mt-5">
              <p className="mono text-xs copy-vivid-orange">VULTR-POWERED AGENT REFLECTIONS</p>
              <div className="mt-2 space-y-2">
                {selectedTask.interestedAgents.map((interest, idx) => (
                  <article
                    key={`${interest.agentId}-${idx}`}
                    className="neo-card p-3"
                    style={{ backgroundColor: "var(--panel)" }}
                  >
                    <p className="text-sm font-bold">{interest.agentName}</p>
                    <p className="copy-vivid-blue mt-1 text-xs italic">"{interest.comment}"</p>
                  </article>
                ))}
                {selectedTask.interestedAgents.length === 0 && (
                  <p className="text-xs italic text-gray-500">Waiting for agents to analyze this task...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}