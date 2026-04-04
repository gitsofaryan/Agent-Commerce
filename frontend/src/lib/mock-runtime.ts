import {
  AGENTS,
  BIDS,
  TASKS,
  TaskBid,
  MarketplaceTask,
  AgentProfile,
} from "@/lib/market-data";
import { config } from "@/lib/config";
import { kalibrRoute } from "@/lib/integrations/kalibr";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

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

export type TaskPhase =
  | "OPEN"
  | "BIDDING"
  | "SELECTION"
  | "EXECUTION"
  | "COMPLETED";

interface RuntimeState {
  agents: AgentProfile[];
  tasks: MarketplaceTask[];
  bids: TaskBid[];
  events: RuntimeEvent[];
  transactions: RuntimeTransaction[];
  clawbots: RuntimeClawbot[];
  walletsInitialized: boolean;
  agentWallets: Record<string, { keypair: Keypair; lastBalanceSol: number }>;
  demoPayer: { keypair: Keypair; lastBalanceSol: number } | null;
  sharedAiWallet: { keypair: Keypair; lastBalanceSol: number } | null;
  winningBidByTask: Record<string, string>;
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
    agentWallets: {},
    demoPayer: null,
    sharedAiWallet: null,
    winningBidByTask: {},
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

  const state = globalRuntime.__agentCommerceRuntime;

  // Preserve existing in-memory state across HMR, but backfill newly added fields.
  if (!Array.isArray(state.agents))
    state.agents = AGENTS.map((agent) => ({ ...agent }));
  if (!Array.isArray(state.tasks))
    state.tasks = TASKS.map((task) => ({ ...task }));
  if (!Array.isArray(state.bids)) state.bids = BIDS.map((bid) => ({ ...bid }));
  if (!Array.isArray(state.events)) state.events = seedEvents();
  if (!Array.isArray(state.transactions)) state.transactions = [];
  if (!Array.isArray(state.clawbots)) state.clawbots = [];
  if (typeof state.walletsInitialized !== "boolean")
    state.walletsInitialized = false;
  if (!state.agentWallets || typeof state.agentWallets !== "object")
    state.agentWallets = {};
  if (!state.winningBidByTask || typeof state.winningBidByTask !== "object")
    state.winningBidByTask = {};
  if (!state.taskPhases || typeof state.taskPhases !== "object")
    state.taskPhases = {};
  if (state.demoPayer === undefined) state.demoPayer = null;
  if (state.sharedAiWallet === undefined) state.sharedAiWallet = null;

  return state;
}

function getConnection() {
  return new Connection(config.solanaRpcUrl, "confirmed");
}

async function getBalanceSol(connection: Connection, address: PublicKey) {
  const balanceLamports = await connection.getBalance(address, "confirmed");
  return Number((balanceLamports / LAMPORTS_PER_SOL).toFixed(6));
}

async function airdropToMinBalance(
  connection: Connection,
  keypair: Keypair,
  minSol: number,
) {
  const current = await getBalanceSol(connection, keypair.publicKey);
  if (current >= minSol) return current;

  const requestSol = Math.max(minSol - current, 0.2);
  const lamports = Math.ceil(requestSol * LAMPORTS_PER_SOL);
  const signature = await connection.requestAirdrop(
    keypair.publicKey,
    lamports,
  );
  await connection.confirmTransaction(signature, "confirmed");
  return getBalanceSol(connection, keypair.publicKey);
}

async function ensureDevnetWallets() {
  const state = getState();
  const connection = getConnection();

  if (!state.sharedAiWallet) {
    state.sharedAiWallet = {
      keypair: Keypair.generate(),
      lastBalanceSol: 0,
    };
  }

  try {
    state.sharedAiWallet.lastBalanceSol = await airdropToMinBalance(
      connection,
      state.sharedAiWallet.keypair,
      0.2,
    );
  } catch {
    state.sharedAiWallet.lastBalanceSol = await getBalanceSol(
      connection,
      state.sharedAiWallet.keypair.publicKey,
    ).catch(() => 0);
  }

  for (const agent of state.agents) {
    state.agentWallets[agent.id] = {
      keypair: state.sharedAiWallet.keypair,
      lastBalanceSol: state.sharedAiWallet.lastBalanceSol,
    };
    agent.wallet = state.sharedAiWallet.keypair.publicKey.toBase58();
  }

  if (!state.demoPayer) {
    state.demoPayer = {
      keypair: Keypair.generate(),
      lastBalanceSol: 0,
    };
  }

  try {
    state.demoPayer.lastBalanceSol = await airdropToMinBalance(
      connection,
      state.demoPayer.keypair,
      2,
    );
  } catch {
    state.demoPayer.lastBalanceSol = await getBalanceSol(
      connection,
      state.demoPayer.keypair.publicKey,
    ).catch(() => 0);
  }

  state.walletsInitialized = true;
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

export async function initWallets() {
  const state = getState();
  await ensureDevnetWallets();

  const sharedAddress = state.sharedAiWallet?.keypair.publicKey.toBase58() || null;
  const sharedBalance = Number((state.sharedAiWallet?.lastBalanceSol ?? 0).toFixed(6));

  pushEvent("wallets.initialized", {
    message: "Devnet payer wallet + shared AI recipient wallet initialized",
    agents: state.agents.length,
    shared_ai_wallet: sharedAddress,
    network: config.solanaCluster,
    rpc: config.solanaRpcUrl,
  });

  return state.agents.map((agent) => {
    return {
      agent_id: agent.id,
      name: agent.name,
      wallet_address: sharedAddress,
      balance: sharedBalance,
      network: config.solanaCluster,
    };
  });
}

export async function getWallets() {
  const state = getState();
  if (!state.walletsInitialized) {
    return state.agents.map((agent) => ({
      agent_id: agent.id,
      name: agent.name,
      wallet_address: null,
      balance: 0,
      network: config.solanaCluster,
    }));
  }

  await ensureDevnetWallets();

  const sharedAddress = state.sharedAiWallet?.keypair.publicKey.toBase58() || null;
  const sharedBalance = Number((state.sharedAiWallet?.lastBalanceSol ?? 0).toFixed(6));

  return state.agents.map((agent) => {
    return {
      agent_id: agent.id,
      name: agent.name,
      wallet_address: sharedAddress,
      balance: sharedBalance,
      network: config.solanaCluster,
    };
  });
}

export async function getPlatformWallet() {
  const state = getState();
  if (!state.walletsInitialized || !state.demoPayer) {
    return {
      wallet_address: null,
      balance: 0,
      network: config.solanaCluster,
    };
  }

  const connection = getConnection();
  state.demoPayer.lastBalanceSol = await getBalanceSol(
    connection,
    state.demoPayer.keypair.publicKey,
  ).catch(() => state.demoPayer?.lastBalanceSol ?? 0);

  return {
    wallet_address: state.demoPayer.keypair.publicKey.toBase58(),
    balance: Number((state.demoPayer.lastBalanceSol ?? 0).toFixed(6)),
    network: config.solanaCluster,
  };
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

  const currentPhase = state.taskPhases[taskId]?.phase;

  // Idempotent behavior for stale/repeated UI actions.
  if (currentPhase === "BIDDING") {
    return {
      taskId,
      phase: "BIDDING" as const,
      statusMessage: "Bidding already active.",
    };
  }

  if (currentPhase === "SELECTION") {
    return {
      taskId,
      phase: "SELECTION" as const,
      statusMessage: "Bidding already closed; in selection.",
    };
  }

  if (currentPhase === "EXECUTION") {
    return {
      taskId,
      phase: "EXECUTION" as const,
      statusMessage: "Winner already selected; task is executing.",
    };
  }

  if (currentPhase === "COMPLETED" || task.status === "COMPLETED") {
    state.taskPhases[taskId] = { phase: "COMPLETED", timestamp: nowIso() };
    return {
      taskId,
      phase: "COMPLETED" as const,
      statusMessage: "Task already completed.",
    };
  }

  if (task.status === "ASSIGNED") {
    state.taskPhases[taskId] = { phase: "EXECUTION", timestamp: nowIso() };
    return {
      taskId,
      phase: "EXECUTION" as const,
      statusMessage: "Task already assigned and executing.",
    };
  }

  if (task.status !== "OPEN") throw new Error("Task not in OPEN state");

  state.taskPhases[taskId] = { phase: "BIDDING", timestamp: nowIso() };
  task.status = "OPEN"; // Keep status, but track phase separately

  pushEvent("bidding.started", {
    task_id: taskId,
    title: task.title,
    message: "Bidding window open for 2 seconds",
  });

  return {
    taskId,
    phase: "BIDDING",
    statusMessage: "Agents preparing bids...",
  };
}

export function submitBids(taskId: string) {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = state.taskPhases[taskId];
  if (!phase) {
    throw new Error("Bidding window not active");
  }

  if (phase.phase === "SELECTION") {
    const currentBids = state.bids.filter((b) => b.taskId === taskId);
    return {
      taskId,
      phase: "SELECTION" as const,
      totalBids: currentBids.length,
      statusMessage: "Bidding already closed.",
    };
  }

  if (phase.phase === "EXECUTION") {
    const currentBids = state.bids.filter((b) => b.taskId === taskId);
    return {
      taskId,
      phase: "EXECUTION" as const,
      totalBids: currentBids.length,
      statusMessage: "Task already in execution.",
    };
  }

  if (phase.phase === "COMPLETED") {
    const currentBids = state.bids.filter((b) => b.taskId === taskId);
    return {
      taskId,
      phase: "COMPLETED" as const,
      totalBids: currentBids.length,
      statusMessage: "Task already completed.",
    };
  }

  if (phase.phase !== "BIDDING") {
    throw new Error("Bidding window not active");
  }

  // Generate bids from candidate agents if none exist
  const existingBids = state.bids.filter((b) => b.taskId === taskId);
  if (existingBids.length === 0) {
    const candidateAgents = state.agents.slice(
      0,
      Math.min(state.agents.length, 5),
    );
    const interestNotes = [
      "Interested. I can execute this reliably.",
      "I want to bid once bidding opens.",
      "This task matches my core skill set.",
    ];

    candidateAgents.forEach((agent, idx) => {
      pushEvent("agent.interest", {
        task_id: taskId,
        agent_name: agent.name,
        comment: interestNotes[idx % interestNotes.length],
        message: `${agent.name} showed interest in this task`,
      });
    });

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

  const finalBidCount = state.bids.filter((b) => b.taskId === taskId).length;

  pushEvent("bidding.closed", {
    task_id: taskId,
    bid_count: finalBidCount,
    message: "All bids received, moving to selection",
  });

  return {
    taskId,
    phase: "SELECTION",
    totalBids: finalBidCount,
    statusMessage: "Gemini evaluating bids (fallback random on failure)...",
  };
}

function buildRandomSelection(task: MarketplaceTask, bids: TaskBid[]) {
  const winner = bids[Math.floor(Math.random() * bids.length)];
  return {
    winner,
    rationale: `Gemini orchestration unavailable for ${task.title}; random fallback selected ${winner.agentName}.`,
    ranking: bids.map((bid, idx) => ({
      rank: idx + 1,
      bidId: bid.id,
      agentName: bid.agentName,
      score: 0,
      reason: "Random fallback ranking",
    })),
    strategy: "random_fallback" as const,
  };
}

async function analyzeBidsWithGemini(task: MarketplaceTask, bids: TaskBid[]) {
  const randomFallback = buildRandomSelection(task, bids);

  if (!config.geminiApiKey && !config.llmApiKey) {
    return randomFallback;
  }

  const prompt = [
    "You are Gemini orchestration engine for Agent-Commerce.",
    "Select best execution bid using confidence, price, ETA, and plan quality.",
    "Return strict JSON only with shape:",
    '{"winnerBidId":"...","rationale":"...","ranking":[{"bidId":"...","score":0-100,"reason":"..."}]}',
    `Task: ${task.title}`,
    `Summary: ${task.summary}`,
    `Budget SOL: ${task.budgetSol}`,
    `Bids: ${JSON.stringify(
      bids.map((bid) => ({
        bidId: bid.id,
        agentId: bid.agentId,
        agentName: bid.agentName,
        priceSol: bid.priceSol,
        etaHours: bid.etaHours,
        confidence: bid.confidence,
        executionPlan: bid.executionPlan,
      })),
    )}`,
  ].join("\n");

  try {
    const result = await kalibrRoute(prompt);
    const text = result.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return randomFallback;

    const parsed = JSON.parse(jsonMatch[0]) as {
      winnerBidId?: string;
      rationale?: string;
      ranking?: Array<{ bidId?: string; score?: number; reason?: string }>;
    };

    const winner =
      bids.find((bid) => bid.id === parsed.winnerBidId) || randomFallback.winner;
    const ranking = (parsed.ranking || [])
      .map((item, idx) => {
        const found = bids.find((bid) => bid.id === item.bidId);
        if (!found) return null;
        return {
          rank: idx + 1,
          bidId: found.id,
          agentName: found.agentName,
          score: Number((item.score ?? 0).toFixed(4)),
          reason: item.reason || "Gemini score-based ranking",
        };
      })
      .filter((item): item is NonNullable<typeof item> => !!item);

    return {
      winner,
      rationale:
        parsed.rationale ||
        `${winner.agentName} selected by Gemini for best overall execution quality.`,
      ranking: ranking.length > 0 ? ranking : randomFallback.ranking,
      strategy: "gemini" as const,
    };
  } catch {
    return randomFallback;
  }
}

export async function selectWinner(taskId: string) {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = state.taskPhases[taskId];
  if (!phase || phase.phase !== "SELECTION") {
    throw new Error("Selection phase not active");
  }

  const bids = state.bids.filter((b) => b.taskId === taskId);
  if (bids.length === 0) throw new Error("No bids for task");

  const selection = await analyzeBidsWithGemini(task, bids);

  task.status = "ASSIGNED";
  state.taskPhases[taskId] = { phase: "EXECUTION", timestamp: nowIso() };
  state.winningBidByTask[taskId] = selection.winner.id;

  pushEvent("orchestrator.selected", {
    task_id: taskId,
    winner_agent: selection.winner.agentName,
    winner_bid_id: selection.winner.id,
    rationale: selection.rationale,
    ranking: selection.ranking,
    strategy: selection.strategy,
  });

  if (selection.strategy === "random_fallback") {
    pushEvent("orchestrator.fallback", {
      task_id: taskId,
      message: "Gemini selection failed; used random fallback winner",
    });
  } else {
    pushEvent("gemini.selection", {
      task_id: taskId,
      message: "Gemini selected the best bid for orchestration",
    });
  }

  const winnerMessage =
    selection.strategy === "random_fallback"
      ? `${selection.winner.agentName} selected by fallback random strategy.`
      : `${selection.winner.agentName} selected by Gemini orchestration.`;

  pushEvent("orchestrator.assignment", {
    task_id: taskId,
    winner_agent: selection.winner.agentName,
    message: winnerMessage,
  });

  return {
    taskId,
    phase: "EXECUTION" as const,
    winner: selection.winner,
    rationale: selection.rationale,
    ranking: selection.ranking,
    strategy: selection.strategy,
    statusMessage: `${winnerMessage} Executing task...`,
  };
}

export async function executeTask(taskId: string) {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = state.taskPhases[taskId];
  if (!phase || phase.phase !== "EXECUTION") {
    throw new Error("Execution phase not active");
  }

  await ensureDevnetWallets();

  const connection = getConnection();

  const winnerBidId = state.winningBidByTask[taskId];
  const selectedBid =
    state.bids.find((bid) => bid.id === winnerBidId && bid.taskId === taskId) ||
    state.bids.find((bid) => bid.taskId === taskId);

  if (!selectedBid) throw new Error("No bid found");

  if (!state.sharedAiWallet) {
    throw new Error("No shared AI wallet available for settlement");
  }

  const winnerWallet = state.sharedAiWallet;
  const payerWallet = state.demoPayer;

  if (!payerWallet) {
    throw new Error("No payer wallet available for x402 settlement");
  }

  const transferAmountSol = Number(selectedBid.priceSol.toFixed(6));
  await airdropToMinBalance(
    connection,
    payerWallet.keypair,
    transferAmountSol + 0.15,
  );

  const transferTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payerWallet.keypair.publicKey,
      toPubkey: winnerWallet.keypair.publicKey,
      lamports: Math.max(1, Math.round(transferAmountSol * LAMPORTS_PER_SOL)),
    }),
  );

  const txSig = await sendAndConfirmTransaction(
    connection,
    transferTx,
    [payerWallet.keypair],
    { commitment: "confirmed" },
  );

  payerWallet.lastBalanceSol = await getBalanceSol(
    connection,
    payerWallet.keypair.publicKey,
  );
  winnerWallet.lastBalanceSol = await getBalanceSol(
    connection,
    winnerWallet.keypair.publicKey,
  );

  const tx: RuntimeTransaction = {
    from: payerWallet.keypair.publicKey.toBase58(),
    to: winnerWallet.keypair.publicKey.toBase58(),
    amount_sol: transferAmountSol,
    signature: txSig,
    explorer_url: `https://explorer.solana.com/tx/${txSig}?cluster=devnet`,
    timestamp: nowIso(),
  };
  state.transactions.unshift(tx);

  pushEvent("x402.payment.submitted", {
    task_id: taskId,
    amount_sol: tx.amount_sol,
    signature: tx.signature,
    protocol: "x402",
    network: config.x402Network,
    message: `Submitting x402 payment from devnet payer wallet to shared AI agent wallet`,
  });

  pushEvent("x402.payment.verified", {
    task_id: taskId,
    amount_sol: tx.amount_sol,
    signature: tx.signature,
    explorer_url: tx.explorer_url,
    protocol: "x402",
    network: config.x402Network,
    message: `Payment verified on-chain for shared AI wallet`,
  });

  pushEvent("payment.agent_to_agent", {
    task_id: taskId,
    from_agent:
      task.createdByType === "agent" ? task.createdById : "human-client",
    to_agent: selectedBid.agentName,
    amount_sol: tx.amount_sol,
    signature: tx.signature,
    explorer_url: tx.explorer_url,
    shared_ai_wallet: winnerWallet.keypair.publicKey.toBase58(),
    protocol: "x402",
    message: `x402 payment settled from devnet payer to shared AI wallet`,
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
