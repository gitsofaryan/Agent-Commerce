"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Agent = {
  agent_id: string;
  name: string;
  role: string;
  description: string;
  status: string;
  wallet_address: string | null;
  balance: number;
};

type Task = {
  task_id: string;
  description: string;
  status: string;
  selected_agent?: string;
};

export default function AgentDetailPage({ params }: { params: Promise<{ agentId: string }> }) {
  const [agentId, setAgentId] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    params.then((p) => setAgentId(p.agentId)).catch(() => setAgentId(""));
  }, [params]);

  useEffect(() => {
    if (!agentId) return;
    const load = async () => {
      setLoading(true);
      try {
        const [agentsRes, tasksRes] = await Promise.all([fetch("/api/agents"), fetch("/api/tasks")]);
        const agentsData = await agentsRes.json();
        const tasksResponse = await tasksRes.json();
        setAgents(Array.isArray(agentsData) ? agentsData : []);
        setTasks(Array.isArray(tasksResponse) ? tasksResponse : (Array.isArray(tasksResponse.tasks) ? tasksResponse.tasks : []));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [agentId]);

  const agent = useMemo(() => agents.find((a) => a.agent_id === agentId), [agents, agentId]);
  const wonTasks = useMemo(() => tasks.filter((t) => t.selected_agent === agentId), [tasks, agentId]);

  return (
    <main className="min-h-screen bg-(--bg)">
      <section className="mx-auto w-full max-w-[980px] px-4 py-8 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight">AGENT PROFILE</h1>
          <Link href="/dashboard" className="neo-btn bg-white px-4 py-2 text-sm font-bold">BACK TO DASHBOARD</Link>
        </div>

        {loading ? <p className="text-sm">Loading agent...</p> : null}

        {!loading && !agent ? (
          <div className="neo-card p-5">
            <p className="text-sm font-bold">Agent not found.</p>
          </div>
        ) : null}

        {agent ? (
          <>
            <div className="neo-card p-5">
              <p className="text-xs font-bold text-(--muted)">ID: {agent.agent_id}</p>
              <p className="mt-1 text-2xl font-bold">{agent.name}</p>
              <p className="mt-2 text-sm text-(--muted)">{agent.description}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                <span className="neo-pill bg-white">{agent.role}</span>
                <span className="neo-pill bg-(--brand)">{agent.status}</span>
                <span className="neo-pill bg-(--ok)">{agent.balance.toFixed(3)} SOL</span>
              </div>
            </div>

            <div className="neo-card mt-4 p-5">
              <p className="text-sm font-bold">Won Tasks</p>
              <div className="mt-3 space-y-2">
                {wonTasks.length === 0 ? <p className="text-xs text-(--muted)">No completed wins yet.</p> : null}
                {wonTasks.map((task) => (
                  <article key={task.task_id} className="border-2 border-(--line) bg-(--panel-strong) p-3">
                    <p className="text-sm font-bold">{task.description}</p>
                    <p className="mono mt-1 text-[11px] text-(--muted)">{task.task_id}</p>
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
