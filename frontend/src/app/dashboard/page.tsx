"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import ChatPanel from "../components/ChatPanel";
import TaskPipeline from "../components/TaskPipeline";

interface Agent {
  agent_id: string;
  name: string;
  role: string;
  description: string;
  status: string;
  balance: number;
  wallet_address: string | null;
}

interface AgentEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface Transaction {
  from: string;
  to: string;
  amount_sol: number;
  signature: string;
  explorer_url: string;
  timestamp: string;
}

const EVENT_ICONS: Record<string, string> = {
  thinking: "\u{1F9E0}",
  plan: "\u{1F4CB}",
  bidding: "\u{1F4B0}",
  bid_received: "\u{1F3F7}\uFE0F",
  assigned: "\u2705",
  complete: "\u{1F389}",
  no_bids: "\u26A0\uFE0F",
  searching: "\u{1F50D}",
  unbrowse: "\u{1F310}",
  fallback: "\u{1F504}",
  research: "\u{1F4CA}",
  processing: "\u2699\uFE0F",
  insight: "\u{1F4A1}",
  planning: "\u{1F4DD}",
  executing: "\u26A1",
  tx_submitted: "\u{1F517}",
  service_matched: "\u{1F3E2}",
  confirmed: "\u2705",
  received: "\u{1F4E5}",
  completed: "\u2705",
  failed: "\u274C",
  airdrop: "\u{1F4A7}",
  transfer: "\u{1F4B8}",
  payment: "\u{1F4B0}",
  payment_required: "\u{1F510}",
  payment_verified: "\u2705",
  payment_completed: "\u{1F4B8}",
  service_executing: "\u2699\uFE0F",
  demo: "\u{1F3AC}",
};

function getEventIcon(type: string): string {
  const parts = type.split(".");
  for (let i = parts.length - 1; i >= 0; i--) {
    if (EVENT_ICONS[parts[i]]) return EVENT_ICONS[parts[i]];
  }
  return "\u{1F4E1}";
}

function truncateAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

function formatEventData(data: Record<string, unknown>): React.ReactNode {
  const filtered = Object.fromEntries(
    Object.entries(data).filter(
      ([k]) => !["agent_id", "agent_name"].includes(k)
    )
  );

  if (filtered.message) {
    const msg = String(filtered.message);
    const explorerUrl = filtered.explorer_url as string | undefined;
    if (explorerUrl) {
      return (
        <span>
          {msg}{" "}
          <a href={explorerUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            [View on Explorer]
          </a>
        </span>
      );
    }
    return msg;
  }

  if (filtered.explorer_url) {
    return (
      <a href={String(filtered.explorer_url)} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
        View transaction on Solana Explorer
      </a>
    );
  }

  if (filtered.summary) return String(filtered.summary);
  if (filtered.confirmation) return String(filtered.confirmation);

  if (filtered.amount_sol !== undefined) {
    return (
      <span>
        <span className="text-emerald-400 font-mono font-medium">{Number(filtered.amount_sol).toFixed(4)} SOL</span>
        {!!filtered.signature && (
          <span className="text-zinc-600 ml-2">sig: {String(filtered.signature).slice(0, 8)}...</span>
        )}
      </span>
    );
  }

  const meaningful = Object.entries(filtered)
    .filter(([, v]) => typeof v === "string" || typeof v === "number")
    .map(([k, v]) => `${k}: ${v}`)
    .slice(0, 3)
    .join(" \u00B7 ");

  return meaningful || JSON.stringify(filtered).slice(0, 150);
}

export default function Dashboard() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [walletsInitialized, setWalletsInitialized] = useState(false);
  const [initializingWallets, setInitializingWallets] = useState(false);
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const lastEventTimestamp = useRef<string>("");

  const fetchAgents = useCallback((refresh = false) => {
    const url = refresh ? "/api/agents?refresh=true" : "/api/agents";
    fetch(url)
      .then((res) => res.json())
      .then(setAgents)
      .catch(() => { });
  }, []);

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  useEffect(() => {
    fetch("/api/wallets")
      .then((r) => r.json())
      .then((data) => {
        const wallets = data.wallets || data;
        if (Array.isArray(wallets) && wallets.length > 0 && wallets[0].wallet_address) {
          setWalletsInitialized(true);
        }
      })
      .catch(() => { });
  }, []);

  // Poll for events instead of SSE
  useEffect(() => {
    const pollEvents = () => {
      const since = lastEventTimestamp.current;
      const url = since ? `/api/events?since=${encodeURIComponent(since)}` : "/api/events";
      fetch(url)
        .then((r) => r.json())
        .then((newEvents: AgentEvent[]) => {
          if (newEvents.length === 0) return;

          setEvents((prev) => [...prev.slice(-200), ...newEvents]);
          lastEventTimestamp.current = newEvents[newEvents.length - 1].timestamp;

          let hasPayment = false;
          for (const event of newEvents) {
            const isPaymentEvent =
              event.type === "solana.transfer" ||
              event.type === "solana.airdrop" ||
              event.type.includes("payment.completed") ||
              event.type === "x402.payment_verified";

            if (isPaymentEvent) {
              hasPayment = true;
              setTransactions((prev) => [
                ...prev,
                {
                  from: String(event.data.from || event.data.payer || event.data.agent_name || ""),
                  to: String(event.data.to || event.data.recipient || ""),
                  amount_sol: Number(event.data.amount_sol || event.data.bid_price || 0),
                  signature: String(event.data.signature || event.data.payment_signature || ""),
                  explorer_url: String(event.data.explorer_url || (event.data.signature ? `https://explorer.solana.com/tx/${event.data.signature}?cluster=devnet` : "")),
                  timestamp: event.timestamp,
                },
              ]);
            }

            if (event.type === "orchestrator.complete") {
              setTaskCount((c) => c + 1);
              setTotalSpent((s) => s + Number(event.data.total_cost || 0));
            }
          }

          // Only refresh balances from RPC when payments happened
          fetchAgents(hasPayment);
        })
        .catch(() => { });
    };

    const interval = setInterval(pollEvents, 1500);
    return () => clearInterval(interval);
  }, [fetchAgents]);

  useEffect(() => {
    const el = eventsContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [events]);

  const initWallets = async () => {
    setInitializingWallets(true);
    try {
      const res = await fetch("/api/wallets/init", { method: "POST" });
      const data = await res.json();
      if (data.wallets || data.success !== false) {
        setWalletsInitialized(true);
        fetchAgents(true);
      }
    } catch (err) {
      console.error("Failed to init wallets:", err);
    }
    setInitializingWallets(false);
  };

  const submitTask = async () => {
    if (!taskInput.trim()) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: taskInput }),
      });
      setTaskInput("");
    } catch (err) {
      console.error("Failed:", err);
    }
    setIsSubmitting(false);
  };

  const quickTask = async (description: string) => {
    setTaskInput(description);
    setIsSubmitting(true);
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description }),
      });
    } catch (err) {
      console.error("Failed:", err);
    }
    setIsSubmitting(false);
    setTaskInput("");
  };

  const activeAgents = agents.filter((a) => a.status === "working").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <header className="border-b-2" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="section-title">Dashboard</h1>
          <div className="flex items-center gap-8 text-sm">
            <div className="text-center">
              <p className="text-xs mono" style={{ color: "var(--muted)" }}>Tasks</p>
              <p className="mono font-bold">{taskCount}</p>
            </div>
            <div className="text-center">
              <p className="text-xs mono" style={{ color: "var(--muted)" }}>Spent</p>
              <p className="mono font-bold">{totalSpent.toFixed(4)} SOL</p>
            </div>
            <div className="text-center">
              <p className="text-xs mono" style={{ color: "var(--muted)" }}>Txns</p>
              <p className="mono font-bold">{transactions.length}</p>
            </div>
            <div className="text-center">
              <p className="text-xs mono" style={{ color: "var(--muted)" }}>Active</p>
              <p className="mono font-bold">{activeAgents}/{agents.length}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Wallet Setup Banner */}
        {!walletsInitialized && (
          <div className="neo-card p-6 flex items-center justify-between mb-6" style={{ backgroundColor: "var(--panel-strong)" }}>
            <div>
              <h3 className="font-bold" style={{ color: "var(--brand)" }}>Initialize Agent Wallets</h3>
              <p className="text-sm mono mt-1" style={{ color: "var(--muted)" }}>Create devnet wallets and airdrop test SOL</p>
            </div>
            <button
              onClick={initWallets}
              disabled={initializingWallets}
              className="neo-btn px-6 py-3 font-bold mono"
              style={{ background: "var(--brand)", color: "var(--ink)" }}
            >
              {initializingWallets ? "Initializing..." : "Initialize"}
            </button>
          </div>
        )}

        {/* Task Input */}
        <div className="neo-card p-6" style={{ backgroundColor: "var(--panel-strong)" }}>
          <div className="flex gap-3">
            <input
              type="text"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitTask()}
              placeholder="Describe a task..."
              className="flex-1 neo-pill px-4 py-2"
              style={{ background: "var(--bg)", color: "var(--ink)" }}
            />
            <button
              onClick={submitTask}
              disabled={isSubmitting || !taskInput.trim()}
              className="neo-btn px-6 py-2 font-bold mono"
              style={{ background: "var(--accent)", color: "var(--ink)" }}
            >
              {isSubmitting ? "Running..." : "Submit"}
            </button>
          </div>
        </div>

        {/* Quick Demo Tasks */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold mono" style={{ color: "var(--muted)" }}>Quick Tasks</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              { label: "\u{1F50D} Find DeFi", task: "Find npm packages for Solana DeFi" },
              { label: "\u{1F3E2} Book Room", task: "Book a meeting room at Frontier Tower" },
              { label: "\u{1F4CA} Analyze Trade", task: "Analyze SOL/USDC and execute limit order" },
              { label: "\u{1F91D} Find Expert", task: "Find robotics and computer vision expert" },
            ].map((item, i) => (
              <button
                key={i}
                onClick={() => quickTask(item.task)}
                disabled={isSubmitting}
                className="neo-btn neo-pill py-3 text-xs font-bold"
                style={{ background: "var(--panel)", color: "var(--ink)" }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task Pipeline - Manual Flow Control */}
        <TaskPipeline />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Agents Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            <h2 className="text-sm font-bold mono" style={{ color: "var(--muted)" }}>AGENTS</h2>
            {agents.map((agent) => (
              <div key={agent.agent_id} className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-bold text-sm">{agent.name}</h3>
                  <span className="neo-pill text-xs" style={{ background: agent.status === "working" ? "var(--brand)" : "var(--accent)" }}>
                    {agent.status}
                  </span>
                </div>
                <p className="text-xs mono" style={{ color: "var(--muted)" }} >
                  {agent.description}
                </p>
                <div className="mt-2 text-xs mono">
                  <p style={{ color: "var(--muted)" }}>{agent.wallet_address ? truncateAddress(agent.wallet_address) : "No wallet"}</p>
                  <p className="font-bold">{agent.balance.toFixed(4)} SOL</p>
                </div>
              </div>
            ))}
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Activity Feed */}
            <div>
              <h2 className="text-sm font-bold mono mb-3" style={{ color: "var(--muted)" }}>LIVE ACTIVITY</h2>
              <div ref={eventsContainerRef} className="neo-card p-4 h-125 overflow-y-auto space-y-1" style={{ backgroundColor: "var(--panel)" }}>
                {events.length === 0 && (
                  <div className="flex items-center justify-center h-full text-center">
                    <div>
                      <p className="text-2xl mb-2">{"\u{1F916}"}</p>
                      <p className="text-sm font-bold">No activity</p>
                      <p className="text-xs mono" style={{ color: "var(--muted)" }}>Submit a task to see agents in action</p>
                    </div>
                  </div>
                )}
                {events.map((event, i) => (
                  <div key={i} className="neo-pill p-2 text-xs animate-fade-in">
                    <div className="flex gap-2 items-start">
                      <span className="text-base">{getEventIcon(event.type)}</span>
                      <div className="flex-1">
                        <p className="font-bold">{String(event.data.agent_name || "System")}</p>
                        <p style={{ color: "var(--muted)" }}>{formatEventData(event.data)}</p>
                        <p className="mono text-[11px]" style={{ color: "var(--muted)" }}>{new Date(event.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Panel */}
            <ChatPanel />

            {/* Transactions */}
            {transactions.length > 0 && (
              <div>
                <h2 className="text-sm font-bold mono mb-3" style={{ color: "var(--muted)" }}>SOLANA TRANSACTIONS</h2>
                <div className="neo-card overflow-hidden" style={{ backgroundColor: "var(--panel)" }}>
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--line)" }}>
                        <th className="text-left px-4 py-3 font-bold">From</th>
                        <th className="text-left px-4 py-3 font-bold">To</th>
                        <th className="text-right px-4 py-3 font-bold">Amount</th>
                        <th className="text-right px-4 py-3 font-bold">Tx</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid var(--line)" }}>
                          <td className="px-4 py-2 mono">{truncateAddress(tx.from)}</td>
                          <td className="px-4 py-2 mono">{truncateAddress(tx.to)}</td>
                          <td className="px-4 py-2 text-right mono font-bold">{tx.amount_sol.toFixed(4)} SOL</td>
                          <td className="px-4 py-2 text-right">
                            {tx.explorer_url ? (
                              <a href={tx.explorer_url} target="_blank" rel="noopener noreferrer" className="neo-pill text-[10px]">
                                View
                              </a>
                            ) : (
                              <span>{"\u2014"}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
