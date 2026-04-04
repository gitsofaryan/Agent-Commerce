"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";

type TaskPhase = "OPEN" | "BIDDING" | "SELECTION" | "EXECUTION" | "COMPLETED";

interface TaskItem {
  id: string;
  title: string;
  summary: string;
  budgetSol: number;
  deadlineHours: number;
  status: "OPEN" | "ASSIGNED" | "COMPLETED";
  phase?: TaskPhase;
}

interface TaskBid {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  priceSol: number;
  etaHours: number;
  confidence: number;
  executionPlan: string[];
}

interface WinnerSelection {
  winner: TaskBid;
  rationale: string;
  strategy?: "gemini" | "random_fallback";
}

interface RuntimeEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

interface PlatformWalletInfo {
  wallet_address: string | null;
  balance: number;
  network: string;
}

interface WalletSnapshotResponse {
  success?: boolean;
  wallets?: Array<{ wallet_address: string | null; balance?: number }>;
  platform?: PlatformWalletInfo;
}

interface ExecutePaymentRequirements {
  protocol: "x402";
  network: string;
  task_id: string;
  recipient: string;
  amount_sol: number;
  amount_lamports: number;
  memo: string;
  winner_agent: string;
  payer_wallet: string | null;
}

interface TaskDetailsResponse {
  task?: TaskItem;
  winner?: TaskBid | null;
  bids?: TaskBid[];
  error?: string;
}

interface SpacetimeAnalytics {
  tasksCreated: number;
  bidsSubmitted: number;
  eventsCaptured: number;
  settlements: number;
  totalSolSpent: number;
  averageSettlementSol: number;
  topWinningAgents: Array<{ agentName: string; wins: number }>;
  topSpendTasks: Array<{ taskId: string; amountSol: number }>;
}

interface SpacetimeAnalyticsResponse {
  ok?: boolean;
  analytics?: SpacetimeAnalytics;
  personas?: { total?: number };
}

type ToastTone = "info" | "success" | "warning" | "winner";

interface UiToast {
  id: string;
  title: string;
  detail?: string;
  tone: ToastTone;
}

const DEMO_TASKS = [
  "Researching about context engineering",
  "Build a prompt quality benchmark suite",
  "Design an autonomous agent QA checklist",
  "Create model routing strategy for tool calls",
  "Draft execution safety policy for AI agents",
];

function truncateAddress(address: string | null | undefined): string {
  if (!address) return "--";
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

function eventMessage(event: RuntimeEvent): string {
  const message = event.data.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  const winner = event.data.winner_agent;
  if (typeof winner === "string") {
    return `Winner: ${winner}`;
  }

  return event.type;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pixelAvatarUrl(seed: string, size = 72): string {
  return `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&size=${size}`;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function phaseBadgeStyle(phase?: TaskPhase) {
  if (phase === "OPEN") {
    return { backgroundColor: "#ede9fe", color: "#5b21b6" };
  }
  if (phase === "BIDDING") {
    return { backgroundColor: "var(--info-soft)", color: "var(--info-ink)" };
  }
  if (phase === "SELECTION") {
    return { backgroundColor: "var(--warning-soft)", color: "var(--warning-ink)" };
  }
  if (phase === "EXECUTION") {
    return { backgroundColor: "#ede9fe", color: "#5b21b6" };
  }
  if (phase === "COMPLETED") {
    return { backgroundColor: "var(--success-soft)", color: "var(--success-ink)" };
  }
  return { backgroundColor: "#e2e8f0", color: "#334155" };
}

function getToastToneStyle(tone: ToastTone) {
  if (tone === "success") {
    return {
      label: "SUCCESS",
      background: "var(--success-soft)",
      border: "var(--green)",
      title: "var(--success-ink)",
      detail: "#166534",
      pill: "#bbf7d0",
    };
  }

  if (tone === "warning") {
    return {
      label: "ALERT",
      background: "var(--error-soft)",
      border: "var(--red)",
      title: "var(--error-ink)",
      detail: "#991b1b",
      pill: "#fecaca",
    };
  }

  if (tone === "winner") {
    return {
      label: "WINNER",
      background: "var(--winner-soft)",
      border: "var(--gold)",
      title: "var(--winner-ink)",
      detail: "#92400e",
      pill: "#fde68a",
    };
  }

  return {
    label: "LIVE",
    background: "var(--panel-strong)",
    border: "var(--blue)",
    title: "#1f2937",
    detail: "#475569",
    pill: "#dbeafe",
  };
}

export default function DashboardPage() {
  const { connection } = useConnection();
  const { publicKey, connected, sendTransaction } = useWallet();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [bidsByTask, setBidsByTask] = useState<Record<string, TaskBid[]>>({});
  const [selectionByTask, setSelectionByTask] = useState<
    Record<string, WinnerSelection>
  >({});
  const [events, setEvents] = useState<RuntimeEvent[]>([]);
  const [statusText, setStatusText] = useState<string>("Ready");
  const [errorText, setErrorText] = useState<string>("");
  const [isBusy, setIsBusy] = useState(false);
  const [walletsInitialized, setWalletsInitialized] = useState(false);
  const [initializingWallets, setInitializingWallets] = useState(false);
  const [platformWallet, setPlatformWallet] = useState<PlatformWalletInfo | null>(
    null,
  );
  const [sharedAiWalletAddress, setSharedAiWalletAddress] =
    useState<string | null>(null);
  const [sharedAiWalletBalance, setSharedAiWalletBalance] = useState(0);
  const [connectedWalletBalance, setConnectedWalletBalance] = useState<number | null>(
    null,
  );
  const [customTaskText, setCustomTaskText] = useState("");
  const [toasts, setToasts] = useState<UiToast[]>([]);
  const [revealedBidCountByTask, setRevealedBidCountByTask] = useState<
    Record<string, number>
  >({});
  const [spacetimeAnalytics, setSpacetimeAnalytics] = useState<SpacetimeAnalytics | null>(null);
  const [personaProfiles, setPersonaProfiles] = useState(0);

  const lastEventTimestamp = useRef("");
  const eventsContainerRef = useRef<HTMLDivElement>(null);

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  const selectedBids = useMemo(() => {
    if (!selectedTaskId) return [];
    const bids = bidsByTask[selectedTaskId] ?? [];
    const visibleCount = revealedBidCountByTask[selectedTaskId] ?? bids.length;
    return bids.slice(0, visibleCount);
  }, [bidsByTask, revealedBidCountByTask, selectedTaskId]);

  const selectedWinner = useMemo(() => {
    if (!selectedTaskId) return null;
    return selectionByTask[selectedTaskId] ?? null;
  }, [selectionByTask, selectedTaskId]);

  const visibleEvents = useMemo(() => {
    if (!selectedTaskId) {
      return events.slice(-60);
    }

    const filtered = events.filter((event) => {
      const taskId =
        typeof event.data.task_id === "string" ? event.data.task_id : null;
      if (taskId) return taskId === selectedTaskId;

      return event.type === "system.ready" || event.type === "wallets.initialized";
    });

    return filtered.slice(-80);
  }, [events, selectedTaskId]);

  const selectedPaymentSummary = useMemo(() => {
    if (!selectedTaskId) return null;

    for (let i = events.length - 1; i >= 0; i -= 1) {
      const event = events[i];
      const eventTaskId = asString(event.data.task_id);
      if (eventTaskId !== selectedTaskId) continue;

      const signature = asString(event.data.signature) || asString(event.data.payment_signature);
      const amount = asNumber(event.data.amount_sol) || asNumber(event.data.bid_price);
      const explorer =
        asString(event.data.explorer_url) ||
        (signature
          ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
          : null);

      if (!signature && amount === null && !explorer) continue;

      return {
        signature,
        amount,
        explorer,
      };
    }

    return null;
  }, [events, selectedTaskId]);

  const addToast = useCallback(
    (title: string, detail?: string, tone: ToastTone = "info") => {
      const toast: UiToast = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        detail,
        tone,
      };

      setToasts((previous) => [...previous.slice(-4), toast]);
      setTimeout(() => {
        setToasts((previous) => previous.filter((item) => item.id !== toast.id));
      }, 3400);
    },
    [],
  );

  const refreshWallets = useCallback(async () => {
    const response = await fetch("/api/wallets");
    const data = (await response.json()) as WalletSnapshotResponse;

    const wallets = Array.isArray(data.wallets) ? data.wallets : [];
    const firstWallet = wallets.find((wallet) => !!wallet.wallet_address) || null;

    setWalletsInitialized(wallets.length > 0 && !!firstWallet?.wallet_address);
    setPlatformWallet(data.platform || null);
    setSharedAiWalletAddress(firstWallet?.wallet_address || null);
    setSharedAiWalletBalance(Number(firstWallet?.balance || 0));
  }, []);

  const refreshSpacetimeAnalytics = useCallback(async () => {
    try {
      const response = await fetch("/api/spacetimedb/analytics", { cache: "no-store" });
      if (!response.ok) return;
      const data = (await response.json()) as SpacetimeAnalyticsResponse;
      if (data.analytics) {
        setSpacetimeAnalytics(data.analytics);
      }
      setPersonaProfiles(Number(data.personas?.total || 0));
    } catch {
      // Keep dashboard stable if integration endpoint is not available.
    }
  }, []);

  const refreshTasks = useCallback(async () => {
    const response = await fetch("/api/tasks");
    const data = (await response.json()) as { tasks?: TaskItem[] };
    const nextTasks = Array.isArray(data.tasks) ? data.tasks : [];

    setTasks(nextTasks);
    setSelectedTaskId((current) => {
      if (current && nextTasks.some((task) => task.id === current)) {
        return current;
      }

      const contextTask = nextTasks.find((task) => {
        const text = `${task.title} ${task.summary}`.toLowerCase();
        return text.includes("context engineering");
      });

      return contextTask?.id || nextTasks[0]?.id || null;
    });
  }, []);

  const refreshBids = useCallback(async (taskId: string) => {
    const response = await fetch(`/api/tasks/${taskId}/bid`);
    const data = (await response.json()) as { bids?: TaskBid[] };
    const bids = Array.isArray(data.bids) ? data.bids : [];

    setBidsByTask((previous) => ({
      ...previous,
      [taskId]: bids,
    }));

    return bids;
  }, []);

  const hydrateSelectedTaskState = useCallback(async (taskId: string) => {
    const response = await fetch(`/api/tasks?taskId=${encodeURIComponent(taskId)}`);
    const data = (await response.json()) as TaskDetailsResponse;

    if (Array.isArray(data.bids)) {
      setBidsByTask((previous) => ({
        ...previous,
        [taskId]: data.bids as TaskBid[],
      }));
      setRevealedBidCountByTask((previous) => ({
        ...previous,
        [taskId]: data.bids?.length || 0,
      }));
    }

    if (data.winner) {
      setSelectionByTask((previous) => ({
        ...previous,
        [taskId]: {
          winner: data.winner as TaskBid,
          rationale: "Winner selected by orchestration.",
          strategy: "gemini",
        },
      }));
    }
  }, []);

  useEffect(() => {
    void refreshTasks();
    void refreshWallets();
    void refreshSpacetimeAnalytics();

    const timer = setInterval(() => {
      void refreshTasks();
      void refreshWallets();
      void refreshSpacetimeAnalytics();
    }, 8000);

    return () => clearInterval(timer);
  }, [refreshTasks, refreshWallets, refreshSpacetimeAnalytics]);

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

  useEffect(() => {
    if (!selectedTaskId) return;
    void hydrateSelectedTaskState(selectedTaskId);
  }, [selectedTaskId, hydrateSelectedTaskState]);

  useEffect(() => {
    // Start event polling from "now" so stale historical events do not pollute this run.
    lastEventTimestamp.current = new Date().toISOString();
    setEvents([]);

    const pollEvents = async () => {
      const since = lastEventTimestamp.current;
      const endpoint = since
        ? `/api/events?since=${encodeURIComponent(since)}`
        : "/api/events";

      try {
        const response = await fetch(endpoint);
        const incoming = (await response.json()) as RuntimeEvent[];
        if (!Array.isArray(incoming) || incoming.length === 0) return;

        setEvents((previous) => [...previous.slice(-250), ...incoming]);
        lastEventTimestamp.current = incoming[incoming.length - 1].timestamp;

        if (incoming.some((event) => event.type.includes("payment"))) {
          void refreshWallets();
        }
      } catch {
        // Ignore polling failures and continue polling.
      }
    };

    const timer = setInterval(() => {
      void pollEvents();
    }, 1500);

    return () => clearInterval(timer);
  }, [refreshWallets]);

  useEffect(() => {
    const node = eventsContainerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [visibleEvents]);

  const initializeWallets = async () => {
    setInitializingWallets(true);
    setErrorText("");
    try {
      const response = await fetch("/api/wallets/init", { method: "POST" });
      if (!response.ok) {
        throw new Error(`Wallet initialization failed: ${response.status}`);
      }
      await refreshWallets();
      setStatusText("Devnet wallets initialized. Use connected wallet balance for real x402 payment.");
      addToast("Wallets ready", "Devnet wallets initialized", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
      addToast("Wallet init failed", message, "warning");
    } finally {
      setInitializingWallets(false);
    }
  };

  const createTask = async (description: string) => {
    const response = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description,
        createdByType: "agent",
        createdById: "researchagent-7",
        budgetSol: 1.2,
        deadlineHours: 12,
      }),
    });

    const data = (await response.json()) as { data?: TaskItem; error?: string };
    if (!response.ok) {
      throw new Error(data.error || `Task creation failed: ${response.status}`);
    }

    return data.data?.id || null;
  };

  const seedTasks = async () => {
    setIsBusy(true);
    setErrorText("");
    setStatusText("Creating demo tasks...");

    try {
      const createdTaskIds: string[] = [];
      for (const taskText of DEMO_TASKS) {
        const id = await createTask(taskText);
        if (id) createdTaskIds.push(id);
      }

      await refreshTasks();

      const contextTaskId = createdTaskIds.find((id) =>
        id.toLowerCase().includes("context-engineering"),
      );
      if (contextTaskId) {
        setSelectedTaskId(contextTaskId);
      }

      setStatusText("Demo tasks created. Select one and run bidding.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
    } finally {
      setIsBusy(false);
    }
  };

  const addContextEngineeringTask = async () => {
    setIsBusy(true);
    setErrorText("");
    setStatusText("Creating context engineering task...");

    try {
      const taskId = await createTask("Researching about context engineering");
      await refreshTasks();
      if (taskId) {
        setSelectedTaskId(taskId);
        setStatusText("Context engineering task created and selected.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
    } finally {
      setIsBusy(false);
    }
  };

  const addCustomTask = async () => {
    const description = customTaskText.trim();
    if (!description) return;

    setIsBusy(true);
    setErrorText("");
    setStatusText("Creating task...");

    try {
      const taskId = await createTask(description);
      await refreshTasks();
      if (taskId) {
        setSelectedTaskId(taskId);
      }
      setCustomTaskText("");
      setStatusText("Task added. Click Post Task to run it.");
      addToast("Task added", "Click Post Task to run orchestration", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
      addToast("Could not add task", message, "warning");
    } finally {
      setIsBusy(false);
    }
  };

  const resetAllOpen = async () => {
    setIsBusy(true);
    setErrorText("");
    setStatusText("Resetting all tasks to OPEN...");

    try {
      const response = await fetch("/api/tasks/reset-all", { method: "POST" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error || `Reset failed: ${response.status}`);
      }

      setSelectionByTask({});
      setBidsByTask({});
      setRevealedBidCountByTask({});
      await refreshTasks();
      addToast("All tasks OPEN", "Bidding can restart from beginning", "success");
      setStatusText("All tasks reset to OPEN.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
      addToast("Reset failed", message, "warning");
    } finally {
      setIsBusy(false);
    }
  };

  const collectBids = async (taskId: string) => {
    setStatusText("Opening bidding window...");
    addToast("Bidding started", "Skilled agents are submitting bids", "info");

    await fetch(`/api/tasks/${taskId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    });

    await pause(900);

    const closeResponse = await fetch(`/api/tasks/${taskId}/bid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "close" }),
    });

    if (!closeResponse.ok) {
      throw new Error(`Could not close bidding: ${closeResponse.status}`);
    }

    const closeData = (await closeResponse.json()) as { bids?: TaskBid[] };
    const nextBids = Array.isArray(closeData.bids)
      ? closeData.bids
      : await refreshBids(taskId);

    setBidsByTask((previous) => ({
      ...previous,
      [taskId]: nextBids,
    }));

    setStatusText(`${nextBids.length} bids collected with SOL price, ETA, and plans.`);
    await refreshTasks();
    return nextBids;
  };

  const pickWinner = async (taskId: string) => {
    setStatusText("Gemini orchestration selecting best bid...");
    addToast("Gemini selecting", "Evaluating bids and plans", "info");

    const response = await fetch(`/api/tasks/${taskId}/select`, {
      method: "POST",
    });
    const data = (await response.json()) as {
      winner?: TaskBid;
      rationale?: string;
      strategy?: "gemini" | "random_fallback";
      error?: string;
    };

    if (!response.ok || !data.winner) {
      throw new Error(data.error || `Selection failed: ${response.status}`);
    }

    setSelectionByTask((previous) => ({
      ...previous,
      [taskId]: {
        winner: data.winner as TaskBid,
        rationale: data.rationale || "Winner selected.",
        strategy: data.strategy,
      },
    }));

    setStatusText("Gemini selected the winner for orchestration.");
    addToast(
      `Winner is ${(data.winner as TaskBid).agentName}`,
      "Golden winner locked. Ready for x402 execution",
      "winner",
    );

    await refreshTasks();
  };

  const executeAndPay = async (taskId: string) => {
    if (!connected || !publicKey) {
      throw new Error("Connect app wallet from navbar before x402 payment.");
    }

    setStatusText("Requesting x402 challenge...");
    addToast("x402 executing", "Preparing payment challenge", "info");

    const challengeResponse = await fetch(`/api/tasks/${taskId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "challenge",
        payerWallet: publicKey.toBase58(),
      }),
    });

    const challengeData = (await challengeResponse.json()) as {
      error?: string;
      payment_requirements?: ExecutePaymentRequirements;
    };

    if (challengeResponse.status !== 402 || !challengeData.payment_requirements) {
      throw new Error(
        challengeData.error ||
        `Expected x402 challenge, got status ${challengeResponse.status}`,
      );
    }

    const requirements = challengeData.payment_requirements;
    setStatusText("Signing real Solana payment from connected wallet...");
    addToast("x402 executing", "Signing and sending devnet transaction", "info");

    const latestBlockhash = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({
      feePayer: publicKey,
      recentBlockhash: latestBlockhash.blockhash,
    }).add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: new PublicKey(requirements.recipient),
        lamports: requirements.amount_lamports,
      }),
    );

    const signature = await sendTransaction(tx, connection, {
      preflightCommitment: "confirmed",
      skipPreflight: false,
    });

    await connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      "confirmed",
    );

    setStatusText("Finalizing x402 payment verification...");

    const finalizeResponse = await fetch(`/api/tasks/${taskId}/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "finalize",
        paymentSignature: signature,
        payerWallet: publicKey.toBase58(),
      }),
    });

    const finalizeData = (await finalizeResponse.json()) as { error?: string };

    if (!finalizeResponse.ok) {
      throw new Error(
        finalizeData.error || `Execution failed: ${finalizeResponse.status}`,
      );
    }

    setStatusText("Task completed. Real x402 payment sent from connected app wallet.");
    addToast("Agent paid", "x402 payment verified on Solana devnet", "success");
    await refreshTasks();
    await refreshWallets();
  };

  const runTaskFlow = async (task: TaskItem) => {
    const taskId = task.id;
    setSelectedTaskId(taskId);
    setIsBusy(true);
    setErrorText("");
    addToast("Task posted", "Restarting flow from OPEN bidding", "info");

    setSelectionByTask((previous) => {
      const next = { ...previous };
      delete next[taskId];
      return next;
    });

    setBidsByTask((previous) => ({ ...previous, [taskId]: [] }));
    setRevealedBidCountByTask((previous) => ({ ...previous, [taskId]: 0 }));

    try {
      const resetResponse = await fetch(`/api/tasks/${taskId}/reset`, {
        method: "POST",
      });
      if (!resetResponse.ok) {
        const resetBody = (await resetResponse.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(
          resetBody.error || `Failed to reset task: ${resetResponse.status}`,
        );
      }

      const allBids = await collectBids(taskId);
      const previewBidCount = Math.min(allBids.length, 5);

      for (let i = 0; i < previewBidCount; i++) {
        setRevealedBidCountByTask((previous) => ({
          ...previous,
          [taskId]: i + 1,
        }));
        setStatusText(
          `${allBids[i].agentName} submitted bid (${i + 1}/${allBids.length})`,
        );
        await pause(250);
      }

      setStatusText("Using Gemini orchestration to choose the winner...");
      await pickWinner(taskId);

      for (let i = previewBidCount; i < allBids.length; i++) {
        setRevealedBidCountByTask((previous) => ({
          ...previous,
          [taskId]: i + 1,
        }));
        await pause(120);
      }

      if (!connected || !publicKey) {
        setStatusText("Winner selected. Connect navbar wallet to complete real x402 payment.");
        addToast("Wallet needed", "Connect navbar wallet to execute x402 payment", "warning");
        return;
      }

      await pause(200);
      await executeAndPay(taskId);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setErrorText(message);
      addToast("Flow failed", message, "warning");
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      <div className="fixed right-4 top-4 z-50 space-y-2 w-[320px] max-w-[90vw]">
        {toasts.map((toast) => (
          (() => {
            const style = getToastToneStyle(toast.tone);
            return (
              <div
                key={toast.id}
                className="neo-card p-3"
                style={{
                  backgroundColor: style.background,
                  borderLeft: `6px solid ${style.border}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <p
                    className={`text-sm font-black leading-tight ${toast.tone === "winner" ? "winner-glow" : ""
                      }`}
                    style={{ color: style.title }}
                  >
                    {toast.title}
                  </p>
                  <span
                    className="neo-pill px-2 py-1 text-[10px]"
                    style={{ backgroundColor: style.pill, color: style.title }}
                  >
                    {style.label}
                  </span>
                </div>
                {toast.detail ? (
                  <p className="mt-1 text-xs" style={{ color: style.detail }}>
                    {toast.detail}
                  </p>
                ) : null}
              </div>
            );
          })()
        ))}
      </div>
      <main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        <section className="neo-card p-6" style={{ backgroundColor: "var(--panel)" }}>
          <h1 className="section-title">Dashboard</h1>
          <p className="text-sm mt-2 copy-vivid-blue">
            Click Post Task on a task card to run bidding, selection, and real x402 payment on Solana devnet.
          </p>
          <p className="text-sm mt-3 font-semibold" style={{ color: "var(--brand)" }}>
            Status: {statusText}
          </p>
          {errorText ? (
            <p className="text-sm mt-2" style={{ color: "#ef4444" }}>
              {errorText}
            </p>
          ) : null}
        </section>

        <section className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
          <h2 className="font-bold">Spacetime Analytics</h2>
          <p className="text-xs mt-2 copy-vivid-blue">
            Persona profiles + task spend telemetry mirrored through Spacetime integration.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
            <div className="neo-card p-3" style={{ backgroundColor: "var(--panel-strong)" }}>
              <p className="mono text-xs copy-vivid-blue">PERSONAS</p>
              <p className="mt-1 text-lg font-black">{personaProfiles}</p>
            </div>
            <div className="neo-card p-3" style={{ backgroundColor: "var(--panel-strong)" }}>
              <p className="mono text-xs copy-vivid-blue">TASKS CREATED</p>
              <p className="mt-1 text-lg font-black">{spacetimeAnalytics?.tasksCreated ?? 0}</p>
            </div>
            <div className="neo-card p-3" style={{ backgroundColor: "var(--panel-strong)" }}>
              <p className="mono text-xs copy-vivid-blue">TOTAL SOL SPENT</p>
              <p className="mt-1 text-lg font-black">{(spacetimeAnalytics?.totalSolSpent ?? 0).toFixed(4)} SOL</p>
            </div>
            <div className="neo-card p-3" style={{ backgroundColor: "var(--panel-strong)" }}>
              <p className="mono text-xs copy-vivid-blue">AVG SETTLEMENT</p>
              <p className="mt-1 text-lg font-black">{(spacetimeAnalytics?.averageSettlementSol ?? 0).toFixed(4)} SOL</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="neo-card p-3" style={{ backgroundColor: "var(--panel-strong)" }}>
              <p className="mono text-xs copy-vivid-orange">TOP WINNING AGENTS</p>
              <div className="mt-2 space-y-1">
                {(spacetimeAnalytics?.topWinningAgents ?? []).length === 0 ? (
                  <p className="text-xs copy-vivid-teal">No winner analytics yet.</p>
                ) : (
                  (spacetimeAnalytics?.topWinningAgents ?? []).map((item) => (
                    <p key={item.agentName} className="text-xs font-bold">
                      {item.agentName} - {item.wins} wins
                    </p>
                  ))
                )}
              </div>
            </div>
            <div className="neo-card p-3" style={{ backgroundColor: "var(--panel-strong)" }}>
              <p className="mono text-xs copy-vivid-orange">TOP SPEND TASKS</p>
              <div className="mt-2 space-y-1">
                {(spacetimeAnalytics?.topSpendTasks ?? []).length === 0 ? (
                  <p className="text-xs copy-vivid-teal">No spend records yet.</p>
                ) : (
                  (spacetimeAnalytics?.topSpendTasks ?? []).map((item) => (
                    <p key={item.taskId} className="text-xs font-bold">
                      {item.taskId} - {item.amountSol.toFixed(4)} SOL
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
            <h2 className="font-bold">Wallets</h2>
            <p className="text-xs mt-2 copy-vivid-blue">
              Connected app wallet in navbar (x402 payer source)
            </p>
            <p className="mono text-sm">
              {truncateAddress(publicKey?.toBase58() || null)} {connected ? "(connected)" : "(not connected)"}
            </p>
            <p className="text-xs mt-1 copy-vivid-teal">
              Balance: {connectedWalletBalance !== null ? `${connectedWalletBalance.toFixed(4)} SOL` : "--"}
            </p>
            <p className="text-xs mt-1 copy-vivid-orange">
              No auto-airdrop to avoid devnet 429 rate limits.
            </p>
            <p className="text-xs mt-2 copy-vivid-blue">
              Shared AI wallet (destination for all similar AI agents)
            </p>
            <p className="mono text-sm">
              {truncateAddress(sharedAiWalletAddress)} | {sharedAiWalletBalance.toFixed(4)} SOL
            </p>
            <button
              onClick={initializeWallets}
              disabled={initializingWallets}
              className="neo-btn mt-4 px-4 py-2 font-bold"
              style={{
                backgroundColor: walletsInitialized ? "var(--panel-strong)" : "var(--brand)",
                color: walletsInitialized ? "var(--muted)" : "var(--ink)",
              }}
            >
              {initializingWallets ? "Initializing..." : walletsInitialized ? "Reinitialize Wallets" : "Initialize Wallets"}
            </button>
          </div>

          <div className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
            <h2 className="font-bold">Task Setup</h2>
            <p className="text-xs mt-2 copy-vivid-blue">
              Create many tasks, then pick one to run orchestration.
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                onClick={seedTasks}
                disabled={isBusy}
                className="neo-btn px-4 py-2 text-sm font-bold"
                style={{ backgroundColor: "var(--panel-strong)" }}
              >
                Add Many Demo Tasks
              </button>
              <button
                onClick={addContextEngineeringTask}
                disabled={isBusy}
                className="neo-btn px-4 py-2 text-sm font-bold"
                style={{ backgroundColor: "var(--panel-strong)" }}
              >
                Add Context Engineering Task
              </button>
            </div>
          </div>
        </section>

        <section className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">Tasks</h2>
            <div className="flex items-center gap-2">
              <input
                value={customTaskText}
                onChange={(e) => setCustomTaskText(e.target.value)}
                placeholder="Add custom task"
                className="neo-btn px-3 py-2 text-sm"
                style={{ backgroundColor: "var(--panel-strong)" }}
              />
              <button
                onClick={addCustomTask}
                disabled={isBusy || customTaskText.trim().length === 0}
                className="neo-btn px-3 py-2 text-sm font-bold"
                style={{ backgroundColor: "var(--brand)", color: "var(--ink)" }}
              >
                Add Task
              </button>
              <button
                onClick={resetAllOpen}
                disabled={isBusy}
                className="neo-btn px-3 py-2 text-sm font-bold"
                style={{ backgroundColor: "#dcfce7", color: "#166534" }}
              >
                Reset All OPEN
              </button>
            </div>
          </div>
          <div className="mt-3 space-y-2 max-h-60 overflow-y-auto pr-1">
            {tasks.length === 0 ? (
              <p className="text-sm copy-vivid-teal">
                No tasks yet.
              </p>
            ) : (
              tasks.map((task) => {
                const selected = task.id === selectedTaskId;
                return (
                  <div
                    key={task.id}
                    className="w-full text-left neo-card p-4 min-h-33"
                    onClick={() => setSelectedTaskId(task.id)}
                    style={{
                      backgroundColor: selected ? "var(--panel-strong)" : "var(--panel)",
                      borderColor: selected ? "var(--blue)" : "var(--line)",
                      cursor: "pointer",
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <p className="font-semibold">{task.title}</p>
                      <p
                        className="text-[10px] px-2 py-1 rounded-full mono font-bold"
                        style={phaseBadgeStyle(task.phase || "OPEN")}
                      >
                        {task.phase || "OPEN"}
                      </p>
                    </div>
                    <p className="text-xs mt-1 copy-vivid-blue">
                      {task.summary}
                    </p>
                    <p className="text-xs mt-2 mono copy-vivid-teal">
                      Budget {task.budgetSol} SOL | Deadline {task.deadlineHours}h
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      {selected ? (
                        <span
                          className="neo-pill px-2 py-1 text-[10px]"
                          style={{ backgroundColor: "#dbeafe", color: "#1e3a8a" }}
                        >
                          SELECTED
                        </span>
                      ) : null}
                      {selected ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void runTaskFlow(task);
                          }}
                          disabled={isBusy}
                          className="neo-btn px-3 py-2 text-xs font-bold"
                          style={{ backgroundColor: "var(--brand)", color: "var(--ink)" }}
                        >
                          Post Task
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
            <h2 className="font-bold">Agent Bids</h2>
            {selectedBids.length === 0 ? (
              <p className="text-sm mt-3 copy-vivid-teal">
                No bids for this task yet.
              </p>
            ) : (
              <div className="mt-3 space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedBids.map((bid) => (
                  <div key={bid.id} className="neo-card p-3" style={{ backgroundColor: "var(--panel-strong)" }}>
                    <div className="flex items-start gap-3">
                      <img
                        src={pixelAvatarUrl(`${bid.agentId}-${bid.agentName}`, 48)}
                        alt={`${bid.agentName} pixel avatar`}
                        className="pixel-avatar h-12 w-12"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold">{bid.agentName}</p>
                        <p className="text-xs mono mt-1 copy-vivid-blue">
                          Price {bid.priceSol} SOL | ETA {bid.etaHours}h | Confidence {(bid.confidence * 100).toFixed(0)}%
                        </p>
                      </div>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {bid.executionPlan.slice(0, 3).map((step) => (
                        <li key={step} className="text-xs copy-vivid-teal">
                          • {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
            <h2 className="font-bold">Winner</h2>
            {!selectedWinner ? (
              <p className="text-sm mt-3 copy-vivid-teal">
                {isBusy ? "Selecting winner with Gemini orchestration..." : "Winner not selected yet."}
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                <div className="flex items-start gap-3">
                  <img
                    src={pixelAvatarUrl(
                      `${selectedWinner.winner.agentId}-${selectedWinner.winner.agentName}`,
                      56,
                    )}
                    alt={`${selectedWinner.winner.agentName} winner avatar`}
                    className="pixel-avatar h-14 w-14"
                  />
                  <div>
                    <p className="font-semibold winner-glow text-gold">
                      {selectedWinner.winner.agentName}
                    </p>
                    <p className="text-xs mono copy-vivid-blue">
                      Price {selectedWinner.winner.priceSol} SOL | ETA {selectedWinner.winner.etaHours}h
                    </p>
                  </div>
                </div>
                <p className="text-xs mono copy-vivid-blue">
                  Strategy: {selectedWinner.strategy || "gemini"}
                </p>
                <p className="text-sm copy-vivid-teal">
                  {selectedWinner.rationale}
                </p>
                <div className="neo-card p-3" style={{ backgroundColor: "var(--winner-soft)" }}>
                  <p className="text-xs font-bold" style={{ color: "var(--winner-ink)" }}>
                    Gemini reasoning summary
                  </p>
                  <ul className="mt-1 space-y-1">
                    {selectedWinner.winner.executionPlan.slice(0, 3).map((step) => (
                      <li key={step} className="text-xs" style={{ color: "var(--warning-ink)" }}>
                        • {step}
                      </li>
                    ))}
                  </ul>
                </div>
                {selectedPaymentSummary ? (
                  <div className="neo-card p-3" style={{ backgroundColor: "var(--success-soft)" }}>
                    <p className="text-xs font-bold" style={{ color: "var(--success-ink)" }}>
                      Payment evidence
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#166534" }}>
                      {selectedPaymentSummary.amount !== null
                        ? `${selectedPaymentSummary.amount.toFixed(4)} SOL settled`
                        : "Settlement confirmed"}
                    </p>
                    {selectedPaymentSummary.signature ? (
                      <p className="text-xs mono mt-1" style={{ color: "#166534" }}>
                        TX: {selectedPaymentSummary.signature.slice(0, 10)}...
                      </p>
                    ) : null}
                    {selectedPaymentSummary.explorer ? (
                      <a
                        href={selectedPaymentSummary.explorer}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold underline mt-1 inline-block"
                        style={{ color: "#166534" }}
                      >
                        View on explorer
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>

        {visibleEvents.length > 0 || isBusy ? (
          <section className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
            <h2 className="font-bold">Live Events</h2>
            <div ref={eventsContainerRef} className="mt-3 max-h-64 overflow-y-auto space-y-2 pr-1">
              {visibleEvents.length === 0 ? (
                <p className="text-sm copy-vivid-blue">
                  Streaming runtime events...
                </p>
              ) : (
                visibleEvents.map((event, index) => (
                  <div key={`${event.timestamp}-${index}`} className="border-b pb-2" style={{ borderColor: "var(--line)" }}>
                    <p className="text-xs mono" style={{ color: "var(--blue)" }}>
                      {event.type}
                    </p>
                    <p className="text-xs copy-vivid-teal">
                      {eventMessage(event)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}
