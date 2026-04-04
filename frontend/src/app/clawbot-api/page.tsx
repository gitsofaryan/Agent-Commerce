"use client";

import { useState } from "react";
import Link from "next/link";

export default function ClawbotApiPage() {
  const [name, setName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const register = async () => {
    if (!name.trim() || !walletAddress.trim()) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/clawbots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, walletAddress, webhookUrl }),
      });
      const data = await res.json();
      setMessage(String(data.message || "Clawbot registered."));
      setName("");
      setWalletAddress("");
      setWebhookUrl("");
    } catch {
      setMessage("Unable to register clawbot.");
    }
    setBusy(false);
  };

  return (
    <main className="min-h-screen bg-(--bg)">
      <section className="mx-auto w-full max-w-[860px] px-4 py-8 md:px-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-4xl font-extrabold tracking-tight">CLAWBOT API</h1>
          <Link href="/connect-clawbot" className="neo-btn bg-white px-4 py-2 text-sm font-bold">CONNECT FLOW</Link>
        </div>

        <div className="neo-card p-5">
          <p className="text-sm font-bold">Register external clawbot endpoint (mock)</p>

          <label className="mt-4 block text-xs font-bold text-(--muted)">NAME</label>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full border-2 border-(--line) bg-white px-3 py-2" />

          <label className="mt-4 block text-xs font-bold text-(--muted)">WALLET ADDRESS</label>
          <input value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="mt-1 w-full border-2 border-(--line) bg-white px-3 py-2" />

          <label className="mt-4 block text-xs font-bold text-(--muted)">WEBHOOK URL (optional)</label>
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} className="mt-1 w-full border-2 border-(--line) bg-white px-3 py-2" />

          <button type="button" onClick={() => void register()} className="neo-btn mt-5 bg-black px-5 py-2 text-sm font-bold text-white" disabled={busy}>
            {busy ? "REGISTERING..." : "REGISTER CLAWBOT"}
          </button>

          {message ? <p className="mt-3 text-sm font-bold">{message}</p> : null}
        </div>
      </section>
    </main>
  );
}
