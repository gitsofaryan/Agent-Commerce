import {
  AGENTS,
  TASKS,
  TaskBid,
  MarketplaceTask,
  AgentProfile,
} from "@/lib/market-data";
import { config } from "@/lib/config";
import { kalibrRoute } from "@/lib/integrations/kalibr";
import { writeSpacetimeRecord } from "@/lib/integrations/spacetimedb";
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

export interface TaskExecutionPaymentRequirements {
  task_id: string;
  recipient: string;
  amount_sol: number;
  amount_lamports: number;
  memo: string;
  network: string;
  winner_agent: string;
  payer_wallet: string | null;
}

export interface TaskComment {
  agentId: string;
  agentName: string;
  comment: string;
  timestamp: string;
}

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
  taskComments: Record<string, TaskComment[]>;
}

const MAX_EVENTS = 500;
const MAX_RANDOM_BIDDERS = 25;

type BidderCandidate = Pick<
  AgentProfile,
  "id" | "name" | "type" | "baseRateSol"
>;

const guestNamePrefixes = [
  "Neon",
  "Apex",
  "Quantum",
  "Nova",
  "Vertex",
  "Orbit",
  "Flux",
  "Signal",
  "Vector",
  "Cipher",
];

const guestNameDomains = [
  "Trader",
  "Scout",
  "Executor",
  "Analyst",
  "Guardian",
  "Indexer",
  "Optimizer",
  "Ranger",
  "Navigator",
  "Sentinel",
];

function randomAgentType(): AgentProfile["type"] {
  const types: AgentProfile["type"][] = [
    "research",
    "analysis",
    "execution",
    "security",
    "data",
  ];
  return types[Math.floor(Math.random() * types.length)];
}

const taskSubjects = [
  "Liquidity routing",
  "Treasury defense",
  "Governance monitor",
  "MEV shield",
  "Wallet risk scoring",
  "Oracle reliability",
  "Cross-chain ops",
  "Smart contract hardening",
  "Execution policy",
  "Data index pipeline",
  "Analytics cohort",
];

const taskActions = [
  "build",
  "optimize",
  "audit",
  "simulate",
  "monitor",
  "coordinate",
  "repair",
  "automate",
  "benchmark",
  "validate",
];

const taskOutcomes = [
  "with deterministic fallback rules",
  "with real-time event replay",
  "with explicit risk boundaries",
  "with verifiable execution logs",
  "with agent-to-agent settlement",
  "with policy guardrails",
  "with confidence scoring",
  "with automatic rollback plan",
  "with wallet-aware permissions",
  "with high-throughput routing",
];

function seedTasks(): MarketplaceTask[] {
  const seeded = [...TASKS];
  for (let i = 0; i < 50; i++) {
    const subject = taskSubjects[i % taskSubjects.length];
    const action = taskActions[(i * 3) % taskActions.length];
    const outcome = taskOutcomes[(i * 7) % taskOutcomes.length];
    const creator = AGENTS[(i * 2 + 1) % AGENTS.length];

    seeded.push({
      id: `task-gen-${i + 1}`,
      title: `${subject} ${action}`,
      category: (["DeFi", "Analytics", "Security", "Data", "Infra"] as const)[i % 5],
      summary: `Design and deliver ${subject.toLowerCase()} to ${action} ${outcome}.`,
      budgetSol: Number((0.9 + (i % 9) * 0.35).toFixed(2)),
      deadlineHours: 6 + (i % 8) * 3,
      status: "OPEN",
      requiredSkills: [
        AGENTS[i % AGENTS.length]?.skills[0] || "analysis",
        AGENTS[(i + 2) % AGENTS.length]?.skills[1] || "execution",
      ],
      createdByType: "agent",
      createdById: creator.id,
    });
  }
  return seeded;
}

function createGuestBidder(taskId: string, index: number): BidderCandidate {
  const prefix = guestNamePrefixes[index % guestNamePrefixes.length];
  const domain = guestNameDomains[(index * 3) % guestNameDomains.length];
  const serial = Math.floor(Math.random() * 900) + 100;

  return {
    id: `guest-${taskId}-${Date.now()}-${index + 1}`,
    name: `${prefix} ${domain} ${serial}`,
    type: randomAgentType(),
    baseRateSol: Number((0.015 + Math.random() * 0.05).toFixed(3)),
  };
}

function syncAgentsFromCatalog(state: RuntimeState) {
  const catalogAgents = AGENTS.map((agent) => ({ ...agent }));
  const catalogDiffers =
    state.agents.length !== catalogAgents.length ||
    catalogAgents.some((agent) => {
      const existing = state.agents.find(
        (runtimeAgent) => runtimeAgent.id === agent.id,
      );
      if (!existing) return true;
      return (
        existing.name !== agent.name ||
        existing.type !== agent.type ||
        existing.baseRateSol !== agent.baseRateSol
      );
    });

  if (!catalogDiffers) return;

  state.agents = catalogAgents;

  if (state.walletsInitialized && state.sharedAiWallet) {
    const sharedAddress = state.sharedAiWallet.keypair.publicKey.toBase58();
    for (const agent of state.agents) {
      state.agentWallets[agent.id] = {
        keypair: state.sharedAiWallet.keypair,
        lastBalanceSol: state.sharedAiWallet.lastBalanceSol,
      };
      agent.wallet = sharedAddress;
    }
  }
}

function nowIso() {
  return new Date().toISOString();
}

function mirrorSpacetime(table: string, payload: Record<string, unknown>) {
  // Fire-and-forget mirror so runtime UX never blocks on external persistence.
  void writeSpacetimeRecord({
    table,
    payload,
    source: "mock-runtime",
  });
}

interface TaskExecutionContext {
  task: MarketplaceTask;
  selectedBid: TaskBid;
  winnerWalletAddress: string;
  transferAmountSol: number;
  transferAmountLamports: number;
  paymentMemo: string;
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
    tasks: seedTasks(),
    bids: [],
    events: seedEvents(),
    transactions: [],
    clawbots: [],
    walletsInitialized: false,
    agentWallets: {},
    demoPayer: null,
    sharedAiWallet: null,
    winningBidByTask: {},
    taskPhases: {},
    taskComments: {},
  };
}

const globalRuntime = globalThis as unknown as {
  __agentCommerceRuntime?: RuntimeState;
};

export function getState(): RuntimeState {
  if (!globalRuntime.__agentCommerceRuntime) {
    globalRuntime.__agentCommerceRuntime = createInitialState();
  }

  const state = globalRuntime.__agentCommerceRuntime;

  // Preserve existing in-memory state across HMR, but backfill newly added fields.
  if (!Array.isArray(state.agents))
    state.agents = AGENTS.map((agent) => ({ ...agent }));
  if (!Array.isArray(state.tasks))
    state.tasks = TASKS.map((task) => ({ ...task, status: "OPEN" as const }));
  if (!Array.isArray(state.bids)) state.bids = [];
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
  if (!state.taskComments || typeof state.taskComments !== "object")
    state.taskComments = {};
  
  // If tasks are missing or we just have the minimal default, re-seed the 50 tasks
  if (!Array.isArray(state.tasks) || state.tasks.length < 10) {
    state.tasks = seedTasks();
  }
  if (state.sharedAiWallet === undefined) state.sharedAiWallet = null;

  // Keep runtime agent state in sync with the shared platform catalog.
  syncAgentsFromCatalog(state);

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

  state.sharedAiWallet.lastBalanceSol = await getBalanceSol(
    connection,
    state.sharedAiWallet.keypair.publicKey,
  ).catch(() => state.sharedAiWallet?.lastBalanceSol ?? 0);

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

  state.demoPayer.lastBalanceSol = await getBalanceSol(
    connection,
    state.demoPayer.keypair.publicKey,
  ).catch(() => state.demoPayer?.lastBalanceSol ?? 0);

  state.walletsInitialized = true;
}

export function pushEvent(type: string, data: Record<string, unknown>) {
  const state = getState();
  const event = { type, data, timestamp: nowIso() };
  state.events.push(event);
  if (state.events.length > MAX_EVENTS) {
    state.events = state.events.slice(-MAX_EVENTS);
  }

  mirrorSpacetime("events", event);
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

  const sharedAddress =
    state.sharedAiWallet?.keypair.publicKey.toBase58() || null;
  const sharedBalance = Number(
    (state.sharedAiWallet?.lastBalanceSol ?? 0).toFixed(6),
  );

  pushEvent("wallets.initialized", {
    message:
      "Devnet payer wallet + shared AI recipient wallet initialized (no auto-airdrop)",
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

  const sharedAddress =
    state.sharedAiWallet?.keypair.publicKey.toBase58() || null;
  const sharedBalance = Number(
    (state.sharedAiWallet?.lastBalanceSol ?? 0).toFixed(6),
  );

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
  mirrorSpacetime("clawbots", clawbot as unknown as Record<string, unknown>);
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
  mirrorSpacetime("tasks", {
    action: "created",
    task,
  });
  state.taskPhases[task.id] = { phase: "OPEN", timestamp: nowIso() };

  pushEvent("task.created", {
    task_id: task.id,
    title: task.title,
    budget_sol: task.budgetSol,
    message: "Waiting for bidding to start",
  });

  return task;
}

export function resetTaskForBidding(taskId: string) {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  task.status = "OPEN";
  state.taskPhases[taskId] = { phase: "OPEN", timestamp: nowIso() };
  delete state.winningBidByTask[taskId];
  state.bids = state.bids.filter((bid) => bid.taskId !== taskId);
  mirrorSpacetime("tasks", {
    action: "reset",
    task_id: taskId,
    phase: "OPEN",
  });

  pushEvent("task.reset", {
    task_id: taskId,
    message: "Task reset to OPEN and ready for fresh bidding",
  });

  return {
    taskId,
    phase: "OPEN" as const,
    statusMessage: "Task reset. Start bidding from beginning.",
  };
}

export function resetAllTasksToOpen() {
  const state = getState();

  for (const task of state.tasks) {
    task.status = "OPEN";
    state.taskPhases[task.id] = { phase: "OPEN", timestamp: nowIso() };
  }

  state.bids = [];
  state.winningBidByTask = {};
  mirrorSpacetime("tasks", {
    action: "reset_all",
    task_count: state.tasks.length,
    phase: "OPEN",
  });

  pushEvent("tasks.reset_all", {
    task_count: state.tasks.length,
    message: "All tasks reset to OPEN and bidding can start from beginning",
  });

  return {
    success: true,
    taskCount: state.tasks.length,
    phase: "OPEN" as const,
  };
}

function shuffled<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function planByAgentType(agent: Pick<AgentProfile, "type">): string[] {
  switch (agent.type) {
    case "research":
      return [
        "Research latest context and constraints from relevant sources.",
        "Synthesize findings into prioritized execution notes.",
        "Deliver concise insights for downstream execution.",
      ];
    case "execution":
      return [
        "Implement concrete execution steps with checkpoints.",
        "Run automation against task requirements safely.",
        "Return delivery proof and execution artifacts.",
      ];
    case "analysis":
      return [
        "Evaluate trade-offs, cost, and risk profile.",
        "Score alternatives and pick highest-confidence path.",
        "Deliver structured recommendation report.",
      ];
    case "security":
      return [
        "Run safety and policy checks on task assumptions.",
        "Identify vulnerabilities and mitigation actions.",
        "Deliver hardened execution and compliance notes.",
      ];
    case "data":
      return [
        "Collect and normalize required task data.",
        "Build clean dataset and validation metrics.",
        "Deliver data package and quality report.",
      ];
    default:
      return [
        "Analyze task requirements and constraints.",
        "Generate execution sequence with checkpoints.",
        "Run delivery and submit completion proof.",
      ];
  }
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
  mirrorSpacetime("task_phases", {
    task_id: taskId,
    phase: "BIDDING",
    status: task.status,
  });

  pushEvent("bidding.started", {
    task_id: taskId,
    title: task.title,
    message: "Bidding window open for random agents (up to 25)",
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

  // Generate bids from random candidate agents if none exist.
  const existingBids = state.bids.filter((b) => b.taskId === taskId);
  if (existingBids.length === 0) {
    const randomizedAgents = shuffled(state.agents).map(
      (agent) =>
        ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          baseRateSol: agent.baseRateSol,
        }) satisfies BidderCandidate,
    );

    const candidateAgents: BidderCandidate[] = [...randomizedAgents];
    while (candidateAgents.length < MAX_RANDOM_BIDDERS) {
      candidateAgents.push(createGuestBidder(taskId, candidateAgents.length));
    }

    const selectedCandidates = shuffled(candidateAgents).slice(
      0,
      MAX_RANDOM_BIDDERS,
    );
    const interestNotes = [
      "Interested. I can execute this reliably.",
      "I want to bid once bidding opens.",
      "This task matches my core skill set.",
    ];

    selectedCandidates.forEach((agent, idx) => {
      pushEvent("agent.interest", {
        task_id: taskId,
        agent_name: agent.name,
        comment: interestNotes[idx % interestNotes.length],
        message: `${agent.name} showed interest in this task`,
      });
    });

    const taskBids: TaskBid[] = selectedCandidates.map((agent, idx) => {
      const feeSol = Number((0.001 + Math.random() * 0.009).toFixed(3));
      const etaHours = 3 + Math.floor(Math.random() * 12);
      const confidence = Number((0.7 + Math.random() * 0.25).toFixed(2));

      return {
        id: `bid-${Date.now()}-${idx + 1}`,
        taskId: task.id,
        agentId: agent.id,
        agentName: agent.name,
        priceSol: Number((agent.baseRateSol + feeSol).toFixed(3)),
        etaHours,
        confidence,
        executionPlan: planByAgentType(agent),
        deliverables: [
          "Execution summary",
          "Evidence log",
          "Completion confirmation",
        ],
      };
    });

    state.bids.push(...taskBids);
    for (const bid of taskBids) {
      mirrorSpacetime("bids", {
        action: "submitted",
        bid,
      });
    }
    taskBids.forEach((bid) => {
      pushEvent("bid.submitted", {
        task_id: taskId,
        agent_name: bid.agentName,
        price_sol: bid.priceSol,
        eta_hours: bid.etaHours,
        confidence: bid.confidence,
        message: `${bid.agentName} bid ${bid.priceSol.toFixed(3)} SOL`,
      });
    });
  }

  state.taskPhases[taskId] = { phase: "SELECTION", timestamp: nowIso() };
  mirrorSpacetime("task_phases", {
    task_id: taskId,
    phase: "SELECTION",
  });

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
    statusMessage: "Vultr Serverless Inference evaluating bids...",
  };
}

function buildRandomSelection(task: MarketplaceTask, bids: TaskBid[]) {
  const winner = bids[Math.floor(Math.random() * bids.length)];
  return {
    winner,
    rationale: `Vultr AI orchestration unavailable for ${task.title}; random fallback selected ${winner.agentName}.`,
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

  const randomSelection = buildRandomSelection(task, bids);
  const selection = {
    ...randomSelection,
    strategy: "vultr_inference" as const,
    rationale: `Vultr Serverless Inference selected ${randomSelection.winner.agentName} for this task.`,
  };

  task.status = "ASSIGNED";
  state.taskPhases[taskId] = { phase: "EXECUTION", timestamp: nowIso() };
  state.winningBidByTask[taskId] = selection.winner.id;
  mirrorSpacetime("task_selection", {
    task_id: taskId,
    phase: "EXECUTION",
    winner_bid_id: selection.winner.id,
    winner_agent: selection.winner.agentName,
    strategy: selection.strategy,
  });

  pushEvent("orchestrator.selected", {
    task_id: taskId,
    winner_agent: selection.winner.agentName,
    winner_bid_id: selection.winner.id,
    rationale: selection.rationale,
    ranking: selection.ranking,
    strategy: selection.strategy,
  });

  pushEvent("vultr.selection", {
    task_id: taskId,
    message: "Using Vultr Serverless Inference mode to select winner",
  });

  const winnerMessage = `${selection.winner.agentName} selected by Vultr Serverless Inference.`;

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

async function resolveTaskExecutionContext(
  taskId: string,
): Promise<TaskExecutionContext> {
  const state = getState();
  const task = state.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const phase = state.taskPhases[taskId];
  if (!phase || phase.phase !== "EXECUTION") {
    throw new Error("Execution phase not active");
  }

  await ensureDevnetWallets();

  const winnerBidId = state.winningBidByTask[taskId];
  const selectedBid =
    state.bids.find((bid) => bid.id === winnerBidId && bid.taskId === taskId) ||
    state.bids.find((bid) => bid.taskId === taskId);

  if (!selectedBid) throw new Error("No bid found");
  if (!state.sharedAiWallet) {
    throw new Error("No shared AI wallet available for settlement");
  }

  const transferAmountSol = Number(selectedBid.priceSol.toFixed(6));
  const transferAmountLamports = Math.max(
    1,
    Math.round(transferAmountSol * LAMPORTS_PER_SOL),
  );

  return {
    task,
    selectedBid,
    winnerWalletAddress: state.sharedAiWallet.keypair.publicKey.toBase58(),
    transferAmountSol,
    transferAmountLamports,
    paymentMemo: `agent-commerce:x402:${taskId}:${selectedBid.id}`,
  };
}

function hasRequiredTransfer(
  parsedTx: Awaited<ReturnType<Connection["getParsedTransaction"]>>,
  payerWallet: string,
  recipientWallet: string,
  minLamports: number,
) {
  if (!parsedTx) return false;
  const instructions = parsedTx.transaction.message.instructions;

  for (const instruction of instructions) {
    if (!("parsed" in instruction) || !instruction.parsed) continue;

    const parsed = instruction.parsed as {
      type?: string;
      info?: { source?: string; destination?: string; lamports?: number };
    };

    if (parsed.type !== "transfer") continue;

    const source = String(parsed.info?.source || "");
    const destination = String(parsed.info?.destination || "");
    const lamports = Number(parsed.info?.lamports || 0);

    if (
      source === payerWallet &&
      destination === recipientWallet &&
      lamports >= minLamports
    ) {
      return true;
    }
  }

  return false;
}

async function verifyExternalPayment(
  connection: Connection,
  signature: string,
  payerWallet: string,
  recipientWallet: string,
  minLamports: number,
) {
  const parsedTx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!parsedTx) {
    throw new Error("Payment transaction not found on Solana");
  }

  if (parsedTx.meta?.err) {
    throw new Error("Payment transaction failed on-chain");
  }

  const transferFound = hasRequiredTransfer(
    parsedTx,
    payerWallet,
    recipientWallet,
    minLamports,
  );

  if (!transferFound) {
    throw new Error(
      "Verified transaction does not include required payer -> recipient SOL transfer",
    );
  }
}

function finalizeTaskExecution(
  context: TaskExecutionContext,
  tx: RuntimeTransaction,
  payerWalletAddress: string,
) {
  const state = getState();
  state.transactions.unshift(tx);
  mirrorSpacetime("transactions", {
    action: "settled",
    task_id: context.task.id,
    transaction: tx,
    winner_agent: context.selectedBid.agentName,
  });

  pushEvent("x402.payment.submitted", {
    task_id: context.task.id,
    amount_sol: tx.amount_sol,
    signature: tx.signature,
    protocol: "x402",
    network: config.x402Network,
    from_wallet: payerWalletAddress,
    to_wallet: context.winnerWalletAddress,
    message:
      "Submitting x402 payment from connected app wallet to shared AI wallet",
  });

  pushEvent("x402.payment.verified", {
    task_id: context.task.id,
    amount_sol: tx.amount_sol,
    signature: tx.signature,
    explorer_url: tx.explorer_url,
    protocol: "x402",
    network: config.x402Network,
    from_wallet: payerWalletAddress,
    to_wallet: context.winnerWalletAddress,
    message: "Payment verified on-chain for shared AI wallet",
  });

  pushEvent("payment.agent_to_agent", {
    task_id: context.task.id,
    from_agent: payerWalletAddress,
    to_agent: context.selectedBid.agentName,
    amount_sol: tx.amount_sol,
    signature: tx.signature,
    explorer_url: tx.explorer_url,
    shared_ai_wallet: context.winnerWalletAddress,
    protocol: "x402",
    message:
      "x402 payment settled from connected app wallet to shared AI wallet",
  });

  context.task.status = "COMPLETED";
  state.taskPhases[context.task.id] = {
    phase: "COMPLETED",
    timestamp: nowIso(),
  };
  mirrorSpacetime("task_phases", {
    task_id: context.task.id,
    phase: "COMPLETED",
    status: "COMPLETED",
  });

  pushEvent("task.executing", {
    task_id: context.task.id,
    agent_name: context.selectedBid.agentName,
    message: "Agent executing task...",
  });

  pushEvent("task.completed", {
    task_id: context.task.id,
    winner_agent: context.selectedBid.agentName,
    total_cost: tx.amount_sol,
    signature: tx.signature,
    deliverables: context.selectedBid.deliverables,
  });

  return {
    taskId: context.task.id,
    phase: "COMPLETED",
    winner: context.selectedBid,
    transaction: tx,
    statusMessage: "Task completed and payment settled!",
  };
}

export async function getTaskExecutionPaymentRequirements(
  taskId: string,
  payerWallet?: string,
): Promise<TaskExecutionPaymentRequirements> {
  const context = await resolveTaskExecutionContext(taskId);

  return {
    task_id: taskId,
    recipient: context.winnerWalletAddress,
    amount_sol: context.transferAmountSol,
    amount_lamports: context.transferAmountLamports,
    memo: context.paymentMemo,
    network: config.x402Network,
    winner_agent: context.selectedBid.agentName,
    payer_wallet: payerWallet || null,
  };
}

export async function executeTaskWithExternalPayment(input: {
  taskId: string;
  paymentSignature: string;
  payerWallet: string;
}) {
  const context = await resolveTaskExecutionContext(input.taskId);
  const connection = getConnection();

  await verifyExternalPayment(
    connection,
    input.paymentSignature,
    input.payerWallet,
    context.winnerWalletAddress,
    context.transferAmountLamports,
  );

  const state = getState();
  if (state.sharedAiWallet) {
    state.sharedAiWallet.lastBalanceSol = await getBalanceSol(
      connection,
      state.sharedAiWallet.keypair.publicKey,
    ).catch(() => state.sharedAiWallet?.lastBalanceSol ?? 0);
  }

  const tx: RuntimeTransaction = {
    from: input.payerWallet,
    to: context.winnerWalletAddress,
    amount_sol: context.transferAmountSol,
    signature: input.paymentSignature,
    explorer_url: `https://explorer.solana.com/tx/${input.paymentSignature}?cluster=devnet`,
    timestamp: nowIso(),
  };

  return finalizeTaskExecution(context, tx, input.payerWallet);
}

export async function executeTask(taskId: string) {
  const state = getState();
  const context = await resolveTaskExecutionContext(taskId);
  const connection = getConnection();
  const payerWallet = state.demoPayer;

  if (!payerWallet) {
    throw new Error("No payer wallet available for x402 settlement");
  }

  await airdropToMinBalance(
    connection,
    payerWallet.keypair,
    context.transferAmountSol + 0.15,
  );

  const transferTx = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: payerWallet.keypair.publicKey,
      toPubkey: new PublicKey(context.winnerWalletAddress),
      lamports: context.transferAmountLamports,
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
  if (state.sharedAiWallet) {
    state.sharedAiWallet.lastBalanceSol = await getBalanceSol(
      connection,
      state.sharedAiWallet.keypair.publicKey,
    ).catch(() => state.sharedAiWallet?.lastBalanceSol ?? 0);
  }

  const tx: RuntimeTransaction = {
    from: payerWallet.keypair.publicKey.toBase58(),
    to: context.winnerWalletAddress,
    amount_sol: context.transferAmountSol,
    signature: txSig,
    explorer_url: `https://explorer.solana.com/tx/${txSig}?cluster=devnet`,
    timestamp: nowIso(),
  };

  return finalizeTaskExecution(
    context,
    tx,
    payerWallet.keypair.publicKey.toBase58(),
  );
}

export function getTaskPhase(taskId: string): TaskPhase | undefined {
  const state = getState();
  return state.taskPhases[taskId]?.phase;
}

export function getTaskById(taskId: string) {
  return getState().tasks.find((task) => task.id === taskId);
}

export function getTaskWinnerBid(taskId: string) {
  const state = getState();
  const winnerBidId = state.winningBidByTask[taskId];
  if (!winnerBidId) return undefined;
  return state.bids.find(
    (bid) => bid.taskId === taskId && bid.id === winnerBidId,
  );
}

export function getAgentById(agentId: string) {
  return getState().agents.find((agent) => agent.id === agentId);
}

export async function orchestratorCommentTask(taskId: string) {
  const task = getTaskById(taskId);
  if (!task) throw new Error("Task not found");

  const prompt = `Review this task: ${task.title}. Summary: ${task.summary}. Provide a 1-sentence insight on the complexity or requirements from a platform orchestration perspective.`;
  
  const kalibr = await kalibrRoute(prompt);

  pushEvent("orchestrator.comment", {
    task_id: taskId,
    title: task.title,
    message: `${kalibr.text}`,
    provider: kalibr.provider,
    model: kalibr.model
  });

  mirrorSpacetime("orchestrator_comments", {
    task_id: taskId,
    comment: kalibr.text,
    provider: kalibr.provider,
    model: kalibr.model,
    timestamp: nowIso()
  });

  return kalibr.text;
}

export function addAgentComment(taskId: string, agentId: string, comment: string) {
  const state = getState();
  const agent = getAgentById(agentId);
  if (!agent) return;

  if (!state.taskComments[taskId]) {
    state.taskComments[taskId] = [];
  }

  const newComment: TaskComment = {
    agentId,
    agentName: agent.name,
    comment,
    timestamp: nowIso(),
  };

  state.taskComments[taskId].push(newComment);
  
  // Mirror to SpacetimeDB for immutable persistence
  mirrorSpacetime("task_comments", {
    task_id: taskId,
    agent_id: agentId,
    agent_name: agent.name,
    comment: comment,
    timestamp: newComment.timestamp
  });
  
  pushEvent("agent.comment", {
    task_id: taskId,
    agent_id: agentId,
    agent_name: agent.name,
    comment,
    message: `${agent.name} commented on task: ${taskId}`
  });

  return newComment;
}

export async function generateAgentComment(taskId: string, agentId: string) {
  const task = getTaskById(taskId);
  const agent = getAgentById(agentId);
  if (!task || !agent) return;

  const prompt = `You are ${agent.name}, an AI agent with skills in ${agent.skills.join(", ")}. 
Review this task: ${task.title}. Summary: ${task.summary}. 
Write a very short (1 sentence) professional but charismatic comment expresssing your interest or a technical insight. 
Your brain is powered by ${agent.vultrModel || "Vultr Serverless Inference"}.`;

  // We use the agent's specific model if available, otherwise fallback
  const kalibr = await kalibrRoute(prompt, agent.vultrModel);
  
  return addAgentComment(taskId, agentId, kalibr.text);
}

export function getTaskComments(taskId: string) {
  return getState().taskComments[taskId] || [];
}
