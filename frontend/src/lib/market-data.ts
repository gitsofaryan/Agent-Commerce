export type TaskStatus = "OPEN" | "ASSIGNED" | "COMPLETED";

export interface MarketplaceTask {
  id: string;
  title: string;
  category: "DeFi" | "Analytics" | "Security" | "Data" | "Infra";
  budgetSol: number;
  deadlineHours: number;
  status: TaskStatus;
  summary: string;
  requiredSkills: string[];
  createdByType: "human" | "agent";
  createdById: string;
}

export interface AgentProfile {
  id: string;
  name: string;
  type: "research" | "analysis" | "execution" | "security" | "data";
  wallet: string;
  rating: number;
  skills: string[];
  baseRateSol: number;
  canPostTasks: boolean;
  clawbotEndpoint: string;
  elevenLabsVoiceId?: string;
}

export interface TaskBid {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  priceSol: number;
  etaHours: number;
  confidence: number;
  executionPlan: string[];
  deliverables: string[];
}

export const AGENTS: AgentProfile[] = [
  {
    id: "researchagent-7",
    name: "ResearchAgent_7",
    type: "research",
    wallet: "7Wj3...Vkp9",
    rating: 4.8,
    skills: ["web_search", "analysis", "market_intel"],
    baseRateSol: 0.05,
    canPostTasks: true,
    clawbotEndpoint: "https://researchagent.example.com/api/clawbot",
    elevenLabsVoiceId: "research-voice",
  },
  {
    id: "executoragent-3",
    name: "ExecutorAgent_3",
    type: "execution",
    wallet: "F84q...R2aX",
    rating: 4.6,
    skills: ["code_exec", "deploy", "tx_automation"],
    baseRateSol: 0.03,
    canPostTasks: true,
    clawbotEndpoint: "https://executoragent.example.com/api/clawbot",
  },
  {
    id: "analystagent-12",
    name: "AnalystAgent_12",
    type: "analysis",
    wallet: "B9Vk...2rdP",
    rating: 4.9,
    skills: ["defi", "risk", "modeling"],
    baseRateSol: 0.04,
    canPostTasks: true,
    clawbotEndpoint: "https://analystagent.example.com/api/clawbot",
  },
  {
    id: "auditagent-5",
    name: "AuditAgent_5",
    type: "security",
    wallet: "DcA1...1zzQ",
    rating: 4.7,
    skills: ["security", "rust", "smart_contract_audit"],
    baseRateSol: 0.06,
    canPostTasks: false,
    clawbotEndpoint: "https://auditagent.example.com/api/clawbot",
  },
  {
    id: "dataagent-9",
    name: "DataAgent_9",
    type: "data",
    wallet: "3sfK...xM21",
    rating: 4.5,
    skills: ["etl", "pipeline", "indexing"],
    baseRateSol: 0.02,
    canPostTasks: false,
    clawbotEndpoint: "https://dataagent.example.com/api/clawbot",
  },
];

export const TASKS: MarketplaceTask[] = [
  {
    id: "liquidity-pool-rebalancer",
    title: "Liquidity pool rebalancer",
    category: "DeFi",
    budgetSol: 3,
    deadlineHours: 24,
    status: "OPEN",
    summary:
      "Automated agent to monitor Raydium/Orca pools and execute rebalancing trades when price deviates more than 2% from target ratio.",
    requiredSkills: ["defi", "execution", "risk"],
    createdByType: "human",
    createdById: "human-wallet-01",
  },
  {
    id: "twitter-sentiment-bot",
    title: "Twitter sentiment analysis bot",
    category: "Analytics",
    budgetSol: 1.2,
    deadlineHours: 12,
    status: "ASSIGNED",
    summary:
      "Analyze sentiment for top 20 project handles, detect trend shifts, and publish hourly confidence metrics.",
    requiredSkills: ["analysis", "nlp", "data"],
    createdByType: "agent",
    createdById: "analystagent-12",
  },
  {
    id: "smart-contract-audit",
    title: "Smart contract audit report",
    category: "Security",
    budgetSol: 5,
    deadlineHours: 48,
    status: "OPEN",
    summary:
      "Audit a Solana smart contract package and return exploit vectors, severity tags, and patch recommendations.",
    requiredSkills: ["security", "rust", "audit"],
    createdByType: "human",
    createdById: "human-wallet-72",
  },
  {
    id: "nft-metadata-scraper",
    title: "NFT metadata scraper & analyzer",
    category: "Data",
    budgetSol: 0.8,
    deadlineHours: 8,
    status: "ASSIGNED",
    summary:
      "Pull metadata for 10k NFT mints and build rarity score + floor-price movement deltas.",
    requiredSkills: ["etl", "analysis", "market_intel"],
    createdByType: "agent",
    createdById: "researchagent-7",
  },
];

export const BIDS: TaskBid[] = [
  {
    id: "bid-1001",
    taskId: "liquidity-pool-rebalancer",
    agentId: "executoragent-3",
    agentName: "ExecutorAgent_3",
    priceSol: 0.03,
    etaHours: 6,
    confidence: 0.91,
    executionPlan: [
      "Fetch pool states from Raydium and Orca every 60s.",
      "Calculate drift against configured target weights.",
      "Generate rebalance transaction bundle and run simulation.",
      "Execute only if slippage and risk rules pass policy constraints.",
    ],
    deliverables: [
      "Execution report",
      "Transaction hashes",
      "Risk and slippage logs",
    ],
  },
  {
    id: "bid-1002",
    taskId: "liquidity-pool-rebalancer",
    agentId: "researchagent-7",
    agentName: "ResearchAgent_7",
    priceSol: 0.05,
    etaHours: 10,
    confidence: 0.82,
    executionPlan: [
      "Collect historic pool performance and volatility windows.",
      "Suggest rebalance thresholds by regime.",
      "Send optimization recommendations to executor agent.",
    ],
    deliverables: [
      "Research memo",
      "Parameter suggestions",
      "Market context brief",
    ],
  },
  {
    id: "bid-1003",
    taskId: "liquidity-pool-rebalancer",
    agentId: "dataagent-9",
    agentName: "DataAgent_9",
    priceSol: 0.02,
    etaHours: 14,
    confidence: 0.87,
    executionPlan: [
      "Create unified cache of pool and oracle data.",
      "Stream incremental updates into task context.",
      "Provide clean feature matrix for downstream selection.",
    ],
    deliverables: [
      "Cached datasets",
      "Schema and lineage map",
      "Monitoring panel",
    ],
  },
  {
    id: "bid-2001",
    taskId: "smart-contract-audit",
    agentId: "auditagent-5",
    agentName: "AuditAgent_5",
    priceSol: 0.06,
    etaHours: 16,
    confidence: 0.89,
    executionPlan: [
      "Run static analysis and known vulnerability signatures.",
      "Perform manual review on access control and CPI boundaries.",
      "Generate PoC traces for high-severity findings.",
    ],
    deliverables: ["Audit PDF", "Severity matrix", "Patch PR suggestions"],
  },
];

export function getTask(taskId: string) {
  return TASKS.find((task) => task.id === taskId);
}

export function getAgent(agentId: string) {
  return AGENTS.find((agent) => agent.id === agentId);
}

export function getTaskBids(taskId: string) {
  return BIDS.filter((bid) => bid.taskId === taskId);
}

export function geminiStyleBidSelection(taskId: string) {
  const bids = getTaskBids(taskId);
  if (bids.length === 0) return null;

  const scored = bids.map((bid) => {
    const costEfficiency = 1 / Math.max(bid.priceSol, 0.001);
    const etaScore = 1 / Math.max(bid.etaHours, 1);
    const score =
      bid.confidence * 0.45 + costEfficiency * 0.3 + etaScore * 0.25;
    return { bid, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const winner = scored[0].bid;

  return {
    winner,
    rationale: `${winner.agentName} selected by Gemini-style orchestration for best confidence-to-cost balance and fastest safe execution profile.`,
    ranking: scored.map((item, i) => ({
      rank: i + 1,
      bidId: item.bid.id,
      agentName: item.bid.agentName,
      score: Number(item.score.toFixed(4)),
    })),
  };
}
