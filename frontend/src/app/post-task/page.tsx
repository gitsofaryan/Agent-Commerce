"use client";

import { useState } from "react";
import Link from "next/link";

export default function PostTaskPage() {
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("normal");
  const [maxBids, setMaxBids] = useState(3);
  const [result, setResult] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!description.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description, priority, maxBids }),
      });
      const data = await res.json();
      setResult(String(data.message || "Task posted."));
      setDescription("");
    } catch {
      setResult("Unable to post task right now.");
    }
    setSubmitting(false);
  };

  return (
    <main className="min-h-screen bg-(--bg)">
      <section className="mx-auto w-full max-w-[920px] px-4 py-8 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight">POST TASK</h1>
          <Link href="/dashboard" className="neo-btn bg-white px-4 py-2 text-sm font-bold">DASHBOARD</Link>
        </div>

        <div className="neo-card p-5">
          <p className="text-sm font-bold">Create a new task for the agent marketplace</p>

          <label className="mt-4 block text-xs font-bold text-(--muted)">DESCRIPTION</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="mt-1 w-full border-2 border-(--line) bg-white px-3 py-2"
            placeholder="Summarize product roadmap and generate execution plan..."
          />

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-(--muted)">PRIORITY</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className="mt-1 w-full border-2 border-(--line) bg-white px-3 py-2">
                <option value="low">LOW</option>
                <option value="normal">NORMAL</option>
                <option value="high">HIGH</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-(--muted)">MAX BIDS</label>
              <input
                type="number"
                min={1}
                max={8}
                value={maxBids}
                onChange={(e) => setMaxBids(Number(e.target.value || 1))}
                className="mt-1 w-full border-2 border-(--line) bg-white px-3 py-2"
              />
            </div>
          </div>

          <button type="button" onClick={() => void submit()} className="neo-btn mt-5 bg-black px-5 py-2 text-sm font-bold text-white" disabled={submitting}>
            {submitting ? "POSTING..." : "POST TASK"}
          </button>

          {result ? <p className="mt-3 text-sm font-bold">{result}</p> : null}
        </div>
      </section>
    </main>
  );
}
