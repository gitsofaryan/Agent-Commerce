"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
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

interface PlatformWalletInfo {
  wallet_address: string | null;
  balance: number;
  network: string;
}

interface TaskListResponse {
  tasks?: Array<{ id: string }>;
}

interface WalletRow {
  wallet_address: string | null;
  balance?: number;
}

interface WalletSnapshotResponse {
  success?: boolean;
  wallets?: WalletRow[];
  platform?: PlatformWalletInfo;
  error?: string;
}

const EVENT_ICONS: Record<string, string> = {
  thinking: "\u{1F9E0}",
  interest: "\u{1F4AC}",
  plan: "\u{1F4CB}",
  bidding: "\u{1F4B0}",
  bid_received: "\u{1F3F7}\uFE0F",
  selected: "\u{1F3C6}",
  gemini: "\u2728",
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
  agent_to_agent: "\u{1F91D}",
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
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [walletsInitialized, setWalletsInitialized] = useState(false);
  const [initializingWallets, setInitializingWallets] = useState(false);
  const [platformWallet, setPlatformWallet] = useState<PlatformWalletInfo | null>(null);
  const [connectedWalletBalance, setConnectedWalletBalance] = useState<number | null>(null);
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
    const refreshWalletSnapshot = () => {
      fetch("/api/wallets")
        .then((r) => r.json())
        .then((data: WalletSnapshotResponse) => {
          const wallets = Array.isArray(data.wallets) ? data.wallets : [];
          if (wallets.some((row) => !!row.wallet_address)) {
            setWalletsInitialized(true);
          }
          if (data.platform) {
            setPlatformWallet(data.platform);
          }
        })
        .catch(() => { });
    };

    const refreshTaskCount = () => {
      fetch("/api/tasks")
        .then((r) => r.json())
        .then((data: TaskListResponse) => {
          const tasks = Array.isArray(data.tasks) ? data.tasks : [];
          setTaskCount(tasks.length);
        })
        .catch(() => { });
    };

    refreshWalletSnapshot();
    refreshTaskCount();
    const interval = setInterval(refreshWalletSnapshot, 10000);
    const taskInterval = setInterval(refreshTaskCount, 5000);
    return () => {
      clearInterval(interval);
      clearInterval(taskInterval);
    };
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
              const paymentAmount = Number(event.data.amount_sol || event.data.bid_price || 0);
              hasPayment = true;
              setTransactions((prev) => [
                ...prev,
                {
                  from: String(event.data.from || event.data.payer || event.data.agent_name || ""),
                  to: String(event.data.to || event.data.recipient || ""),
                  amount_sol: paymentAmount,
                  signature: String(event.data.signature || event.data.payment_signature || ""),
                  explorer_url: String(event.data.explorer_url || (event.data.signature ? `https://explorer.solana.com/tx/${event.data.signature}?cluster=devnet` : "")),
                  timestamp: event.timestamp,
                },
              ]);
              setTotalSpent((s) => s + paymentAmount);

              fetch("/api/wallets")
                .then((r) => r.json())
                .then((data: WalletSnapshotResponse) => {
                  if (data.platform) {
                    setPlatformWallet(data.platform);
                  }
                })
                .catch(() => { });
            }

            if (event.type === "orchestrator.complete") {
              setTaskCount((c) => c + 1);
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

  useEffect(() => {
    let cancelled = false;

    const refreshConnectedWalletBalance = async () => {
      if (!connected || !publicKey) {
        if (!cancelled) setConnectedWalletBalance(null);
        return;
      }

      try {
        const lamports = await connection.getBalance(publicKey, "confirmed");
        if (!cancelled) {
          setConnectedWalletBalance(Number((lamports / 1e9).toFixed(4)));
        }
      } catch {
        if (!cancelled) setConnectedWalletBalance(null);
      }
    };

    void refreshConnectedWalletBalance();
    const timer = setInterval(() => {
      void refreshConnectedWalletBalance();
    }, 10000);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [connected, publicKey, connection]);

  const initWallets = async () => {
    setInitializingWallets(true);
    try {
      const res = await fetch("/api/wallets/init", { method: "POST" });
      const raw = await res.text();
      let data: Record<string, unknown> = {};
      if (raw.trim().length > 0) {
        try {
          data = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          data = { error: raw };
        }
      }

      if (!res.ok) {
        throw new Error(String(data.error || `Wallet init failed with status ${res.status}`));
      }

      const payload = data as unknown as WalletSnapshotResponse;
      if (payload.platform) {
        setPlatformWallet(payload.platform);
      }

      const wallets = Array.isArray(payload.wallets) ? payload.wallets : [];
      if (wallets.some((row) => !!row.wallet_address) || data.success !== false) {
        setWalletsInitialized(true);
        fetchAgents(true);
      }
    } catch (err) {
      console.error("Failed to init wallets:", err);
    }
    setInitializingWallets(false);
  };

  const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runAIAgentOrchestration = async (taskId: string) => {
    // OPEN -> BIDDING
    await fetch(`/api/tasks/${taskId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });

    await pause(900);

    // BIDDING -> SELECTION (also emits interest + bid events)
    await fetch(`/api/tasks/${taskId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });

    await pause(900);

    // SELECTION -> EXECUTION (Gemini selects best bid)
    await fetch(`/api/tasks/${taskId}/select`, {
      method: "POST",
    });

    await pause(900);

    // EXECUTION -> COMPLETED (x402 + agent-to-agent payment)
    await fetch(`/api/tasks/${taskId}/execute`, {
      method: "POST",
    });
  };

  const quickTask = async (description: string) => {
    setIsSubmitting(true);
    try {
      const createRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          createdByType: "agent",
          createdById: "researchagent-7",
        }),
      });

      const createData = await createRes.json();
      const taskId = createData?.data?.id as string | undefined;
      if (createRes.ok && taskId) {
        await runAIAgentOrchestration(taskId);
      }
    } catch (err) {
      console.error("Failed:", err);
    }
    setIsSubmitting(false);
  };

  const activeAgents = agents.filter((a) => a.wallet_address).length;

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
            <div className="text-center">
              <p className="text-xs mono" style={{ color: "var(--muted)" }}>Devnet Wallet</p>
              <p className="mono font-bold">
                {connectedWalletBalance !== null
                  ? `${connectedWalletBalance.toFixed(4)} SOL`
                  : platformWallet
                    ? `${platformWallet.balance.toFixed(4)} SOL`
                    : "--"}
              </p>
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
              <p className="text-sm mono mt-1" style={{ color: "var(--muted)" }}>
                Create devnet wallets and airdrop test SOL
                {platformWallet?.wallet_address ? ` • Treasury ${truncateAddress(platformWallet.wallet_address)}` : ""}
              </p>
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

        {/* LIVE ACTIVITY - TOP */}
        <div>
          <h2 className="text-sm mono font-bold mb-3" style={{ color: "var(--muted)" }}>LIVE ACTIVITY</h2>
          <p className="text-xs mono mb-2" style={{ color: "var(--muted)" }}>
            Interactive flow: AI task submit | interest comments | bidding | Gemini selection | agent-to-agent payment
          </p>
          <div
            ref={eventsContainerRef}
            className="neo-card p-4 space-y-2 max-h-80 overflow-y-auto"
            style={{ backgroundColor: "var(--panel)" }}
          >
            {events.length === 0 ? (
              <p className="text-xs mono" style={{ color: "var(--muted)" }}>Waiting for agents...</p>
            ) : (
              events.map((event, idx) => (
                <div key={idx} className="text-xs mono flex items-start gap-2 pb-2 border-b" style={{ borderColor: "var(--line)" }}>
                  <span>{getEventIcon(event.type)}</span>
                  <div className="flex-1">
                    <span style={{ color: "var(--brand)" }}>{event.type}</span> {formatEventData(event.data as Record<string, unknown>)}
                    <div style={{ color: "var(--muted)" }} className="text-[10px]">{new Date(event.timestamp).toLocaleTimeString()}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Demo Tasks */}
        <div className="space-y-2">
          <h3 className="text-sm font-bold mono" style={{ color: "var(--muted)" }}>TASK PIPELINE</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[
              "Liquidity pool rebalancer",
              "Twitter sentiment analysis bot",
              "Smart contract audit report",
              "NFT metadata scraper & analyzer",
            ].map((task, i) => (
              <button
                key={i}
                onClick={() => quickTask(task)}
                disabled={isSubmitting}
                className="neo-card p-4 text-left hover:shadow-lg transition-all"
                style={{ backgroundColor: "var(--panel-strong)" }}
              >
                <p className="font-bold text-sm">{task}</p>
                <p className="text-xs mono mt-2" style={{ color: "var(--muted)" }}>AI AGENT SUBMITS</p>
                <p className="text-xs font-bold mt-1" style={{ color: "var(--brand)" }}>→ INTEREST → BIDDING → GEMINI SELECTS → PAY</p>
              </button>
            ))}
          </div>
        </div>

        {/* Task Pipeline - Manual Flow Control */}
        <TaskPipeline />
      </main>
    </div>
  );
}
