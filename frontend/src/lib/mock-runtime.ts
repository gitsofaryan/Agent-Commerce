import {
  AGENTS,
  BIDS,
  TASKS,
  TaskBid,
  MarketplaceTask,
  AgentProfile,
  geminiStyleBidSelection,
} from "@/lib/market-data";

export interface RuntimeEvent {
  type: string;
  data: Record<string, unknown>;
  timestamp: string;
}

export interface RuntimeTransaction {
  from: string;
  to: string;
  amount_sol: number;
  signature: string;
  explorer_url: string;
  timestamp: string;
}

export interface RuntimeClawbot {
  id: string;
  owner_wallet: string;
  endpoint: string;
  skills: string[];
  connected_at: string;
}

export type TaskPhase = "OPEN" | "BIDDING" | "SELECTION" | "EXECUTION" | "COMPLETED";

interface RuntimeState {
  agents: AgentProfile[];
  tasks: MarketplaceTask[];
  bids: TaskBid[];
  events: RuntimeEvent[];
  transactions: RuntimeTransaction[];
  clawbots: RuntimeClawbot[];
  walletsInitialized: boolean;
  taskPhases: Record<string, { phase: TaskPhase; timestamp: string }>;
}

const MAX_EVENTS = 500;

function nowIso() {
  return new Date().toISOString();
}

function randomSig() {
  return `mock-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function seedEvents(): RuntimeEvent[] {
  return [
    {
      type: "system.ready",
      data: { message: "Mock runtime initialized" },
      timestamp: nowIso(),
    },
  ];
}

function createInitialState(): RuntimeState {
  return {
    agents: AGENTS.map((agent) => ({ ...agent })),
    tasks: TASKS.map((task) => ({ ...task })),
    bids: BIDS.map((bid) => ({ ...bid })),
    events: seedEvents(),
    transactions: [],
    clawbots: [],
    walletsInitialized: false,
    taskPhases: {},
  };
}

const globalRuntime = globalThis as unknown as {
  __agentCommerceRuntime?: RuntimeState;
};

function getState() {
  if (!globalRuntime.__agentCommerceRuntime) {
    globalRuntime.__agentCommerceRuntime = createInitialState();
  }
  return globalRuntime.__agentCommerceRuntime;
}

export function pushEvent(type: string, data: Record<string, unknown>) {
  const state = getState();
  state.events.push({ type, data, timestamp: nowIso() });
  if (state.events.length > MAX_EVENTS) {
    state.events = state.events.slice(-MAX_EVENTS);
  }
}

export function listEvents(since?: string) {
  const state = getState();
  if (!since) return [...state.events];
  return state.events.filter((event) => event.timestamp > since);
}

export function listAgents() {
  return [...getState().agents];
}

export function listTasks() {
  return [...getState().tasks];
}

export function listBids(taskId?: string) {
  const bids = getState().bids;
  return taskId ? bids.filter((bid) => bid.taskId === taskId) : [...bids];
}

export function listTransactions() {
  return [...getState().transactions];
}

export function listClawbots() {
  return [...getState().clawbots];
}

export function initWallets() {
  const state = getState();
  state.walletsInitialized = true;
  pushEvent("wallets.initialized", {
    message: "Mock wallets initialized for all agents",
    agents: state.agents.length,
  });

  return state.agents.map((agent, idx) => ({
    agent_id: agent.id,
    name: agent.name,
    wallet_address: `${agent.wallet}-mock`,
    balance: Number((1 + idx * 0.25).toFixed(3)),
    airdrop_signature: randomSig(),
  }));
}

export function getWallets() {
  const state = getState();
  return state.agents.map((agent, idx) => ({
    agent_id: agent.id,
    name: agent.name,
    wallet_address: `${agent.wallet}-mock`,
    balance: Number((state.walletsInitialized ? 1 + idx * 0.25 : 0).toFixed(3)),
  }));
}

export function registerClawbot(input: {
  id: string;
  owner_wallet: string;
  endpoint: string;
  skills?: string[];
}) {
  const state = getState();
  const clawbot: RuntimeClawbot = {
    id: input.id,
    owner_wallet: input.owner_wallet,
    endpoint: input.endpoint,
    skills: input.skills ?? [],
    connected_at: nowIso(),
  };
  state.clawbots.push(clawbot);
  pushEvent("clawbot.connected", {
    clawbot_id: clawbot.id,
    owner_wallet: clawbot.owner_wallet,
  });
  return clawbot;
}

export function createTask(input: {
  title?: string;
  description: string;
  budgetSol?: number;
  deadlineHours?: number;
  requiredSkills?: string[];
  createdByType?: "human" | "agent";
  createdById?: string;
}) {
  const state = getState();
  const slug = input.description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 48);

  const taskId = `${slug || "task"}-${Date.now()}`;
  const task: MarketplaceTask = {
    id: taskId,
    title: input.title || input.description.slice(0, 56),
    category: "Infra",
    budgetSol: input.budgetSol ?? 1,
    deadlineHours: input.deadlineHours ?? 12,
    status: "OPEN",
    summary: input.description,
    requiredSkills: input.requiredSkills ?? ["analysis", "execution"],
    createdByType: input.createdByType ?? "human",
    createdById: input.createdById ?? "wallet-user",
  };

  state.tasks.unshift(task);
  state.taskPhases[task.id] = { phase: "OPEN", timestamp: nowIso() };
  
  pushEvent("task.created", {
    task_id: task.id,
    title: task.title,
    budget_sol: task.budgetSol,
    message: "Waiting for bidding to start",
  });

  return task;
}

export function startBidding(taskId: string) {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);
  if (task.status !== "OPEN") throw new Error("Task not in OPEN state");

  state.taskPhases[taskId] = { phase: "BIDDING", timestamp: nowIso() };
  task.status = "OPEN"; // Keep status, but track phase separately
  
  pushEvent("bidding.started", {
    task_id: taskId,
    title: task.title,
    message: "Bidding window open for 2 seconds",
  });

  return { taskId, phase: "BIDDING", statusMessage: "Agents preparing bids..." };
}

export function submitBids(taskId: string) {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = state.taskPhases[taskId];
  if (!phase || phase.phase !== "BIDDING") {
    throw new Error("Bidding window not active");
  }

  // Generate bids from candidate agents if none exist
  const existingBids = state.bids.filter((b) => b.taskId === taskId);
  if (existingBids.length === 0) {
    const candidateAgents = state.agents.slice(0, 3);
    const taskBids: TaskBid[] = candidateAgents.map((agent, idx) => ({
      id: `bid-${Date.now()}-${idx + 1}`,
      taskId: task.id,
      agentId: agent.id,
      agentName: agent.name,
      priceSol: Number((agent.baseRateSol + idx * 0.01).toFixed(3)),
      etaHours: 4 + idx * 3,
      confidence: Number((0.92 - idx * 0.06).toFixed(2)),
      executionPlan: [
        "Analyze task requirements and constraints.",
        "Generate execution sequence with checkpoints.",
        "Run delivery and submit completion proof.",
      ],
      deliverables: [
        "Execution summary",
        "Evidence log",
        "Completion confirmation",
      ],
    }));

    state.bids.push(...taskBids);
    taskBids.forEach((bid) => {
      pushEvent("bid.submitted", {
        task_id: taskId,
        agent_name: bid.agentName,
        price_sol: bid.priceSol,
        eta_hours: bid.etaHours,
        confidence: bid.confidence,
      });
    });
  }

  state.taskPhases[taskId] = { phase: "SELECTION", timestamp: nowIso() };
  
  pushEvent("bidding.closed", {
    task_id: taskId,
    bid_count: existingBids.length || 3,
    message: "All bids received, moving to selection",
  });

  return {
    taskId,
    phase: "SELECTION",
    totalBids: existingBids.length || 3,
    statusMessage: "Gemini evaluating bids...",
  };
}

export function selectWinner(taskId: string) {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = state.taskPhases[taskId];
  if (!phase || phase.phase !== "SELECTION") {
    throw new Error("Selection phase not active");
  }

  const bids = state.bids.filter((b) => b.taskId === taskId);
  if (bids.length === 0) throw new Error("No bids for task");

  const selection = geminiStyleBidSelection(taskId);
  if (!selection) throw new Error("Selection failed");

  task.status = "ASSIGNED";
  state.taskPhases[taskId] = { phase: "EXECUTION", timestamp: nowIso() };

  pushEvent("gemini.selected", {
    task_id: taskId,
    winner_agent: selection.winner.agentName,
    winner_bid_id: selection.winner.id,
    rationale: selection.rationale,
    ranking: selection.ranking,
  });

  return {
    taskId,
    phase: "EXECUTION" as const,
    winner: selection.winner,
    rationale: selection.rationale,
    statusMessage: `${selection.winner.agentName} selected. Executing task...`,
  };
}

export function executeTask(taskId: string) {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = state.taskPhases[taskId];
  if (!phase || phase.phase !== "EXECUTION") {
    throw new Error("Execution phase not active");
  }

  const winnerBid = state.bids.find(
    (b) => b.taskId === taskId && task.status === "ASSIGNED"
  );
  
  if (!winnerBid) {
    const bids = state.bids.filter((b) => b.taskId === taskId);
    if (bids.length > 0) {
      // Use the highest confidence bid
      const sorted = [...bids].sort((a, b) => b.confidence - a.confidence);
      state.bids.splice(state.bids.indexOf(sorted[0]), 1);
      state.bids.push({ ...sorted[0] });
    }
  }

  const selectedBid = state.bids.find(
    (b) => b.taskId === taskId
  );
  if (!selectedBid) throw new Error("No bid found");

  const txSig = randomSig();
  const tx: RuntimeTransaction = {
    from: task.createdById,
    to: selectedBid.agentName,
    amount_sol: selectedBid.priceSol,
    signature: txSig,
    explorer_url: `https://explorer.solana.com/tx/${txSig}?cluster=devnet`,
    timestamp: nowIso(),
  };
  state.transactions.unshift(tx);

  pushEvent("x402.payment.submitted", {
    task_id: taskId,
    amount_sol: tx.amount_sol,
    signature: tx.signature,
    message: `Submitting x402 payment to ${selectedBid.agentName}`,
  });

  pushEvent("x402.payment.verified", {
    task_id: taskId,
    amount_sol: tx.amount_sol,
    signature: tx.signature,
    explorer_url: tx.explorer_url,
    message: `Payment verified: ${selectedBid.agentName} confirmed`,
  });

  task.status = "COMPLETED";
  state.taskPhases[taskId] = { phase: "COMPLETED", timestamp: nowIso() };

  pushEvent("task.executing", {
    task_id: taskId,
    agent_name: selectedBid.agentName,
    message: "Agent executing task...",
  });

  pushEvent("task.completed", {
    task_id: taskId,
    winner_agent: selectedBid.agentName,
    total_cost: tx.amount_sol,
    signature: tx.signature,
    deliverables: selectedBid.deliverables,
  });

  return {
    taskId,
    phase: "COMPLETED",
    winner: selectedBid,
    transaction: tx,
    statusMessage: "Task completed and payment settled!",
  };
}

export function getTaskPhase(taskId: string): TaskPhase | undefined {
  const state = getState();
  return state.taskPhases[taskId]?.phase;
}

export function getTaskById(taskId: string) {
  return getState().tasks.find((task) => task.id === taskId);
}

export function getAgentById(agentId: string) {
  return getState().agents.find((agent) => agent.id === agentId);
}
