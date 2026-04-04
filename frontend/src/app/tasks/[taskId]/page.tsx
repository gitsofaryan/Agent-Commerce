"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

interface TaskItem {
  task_id: string;
  description: string;
  status: string;
  selected_agent?: string;
  selected_bid_amount?: number;
  selection_reasoning?: string;
  created_at: string;
}

interface BidItem {
  bid_id: string;
  task_id: string;
  agent_id: string;
  bid_amount: number;
  reasoning: string;
  confidence_score?: number;
  timestamp: string;
}

export default function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const [taskId, setTaskId] = useState("");
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [bids, setBids] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setTaskId(p.taskId)).catch(() => setTaskId(""));
  }, [params]);

  useEffect(() => {
    if (!taskId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [taskRes, bidRes] = await Promise.all([fetch("/api/tasks"), fetch("/api/tasks?include=bids")]);
        const taskResponse = await taskRes.json();
        const bidResponse = await bidRes.json();
        setTasks(Array.isArray(taskResponse) ? taskResponse : (Array.isArray(taskResponse.tasks) ? taskResponse.tasks : []));
        setBids(Array.isArray(bidResponse) ? bidResponse : (Array.isArray(bidResponse.bids) ? bidResponse.bids : []));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [taskId]);

  const task = useMemo(() => tasks.find((t) => t.task_id === taskId), [tasks, taskId]);
  const taskBids = useMemo(
    () => bids.filter((b) => b.task_id === taskId).sort((a, b) => a.bid_amount - b.bid_amount),
    [bids, taskId],
  );

  return (
    <main className="min-h-screen bg-(--bg)">
      <section className="mx-auto w-full max-w-[980px] px-4 py-8 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight">TASK DETAIL</h1>
          <Link href="/marketplace" className="neo-btn bg-white px-4 py-2 text-sm font-bold">BACK TO MARKET</Link>
        </div>

        {loading ? <p className="text-sm">Loading task...</p> : null}

        {!loading && !task ? (
          <div className="neo-card p-5">
            <p className="text-sm font-bold">Task not found.</p>
          </div>
        ) : null}

        {task ? (
          <>
            <div className="neo-card p-5">
              <p className="text-xs font-bold text-(--muted)">TASK ID: {task.task_id}</p>
              <p className="mt-2 text-lg font-bold">{task.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="neo-pill bg-white">STATUS {task.status.toUpperCase()}</span>
                {task.selected_agent ? <span className="neo-pill bg-(--brand)">WINNER {task.selected_agent}</span> : null}
              </div>
              {task.selection_reasoning ? <p className="mt-3 text-sm text-(--muted)">{task.selection_reasoning}</p> : null}
            </div>

            <div className="neo-card mt-4 p-5">
              <p className="text-sm font-bold">BIDS</p>
              <div className="mt-3 space-y-2">
                {taskBids.length === 0 ? <p className="text-xs text-(--muted)">No bids found.</p> : null}
                {taskBids.map((bid) => (
                  <article key={bid.bid_id} className="border-2 border-(--line) bg-(--panel-strong) p-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold">{bid.agent_id}</p>
                      <p className="mono text-sm font-bold">{bid.bid_amount.toFixed(3)} SOL</p>
                    </div>
                    <p className="mt-1 text-xs text-(--muted)">{bid.reasoning}</p>
                    <p className="mono mt-1 text-[10px] text-(--muted)">confidence {Number(bid.confidence_score || 0).toFixed(2)}</p>
                  </article>
                ))}
              </div>
            </div>
          </>
        ) : null}
      </section>
    </main>
  );
}
