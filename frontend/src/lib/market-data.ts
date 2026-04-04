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
  vultrModel?: string;
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
    name: "Atlas Scout",
    type: "research",
    wallet: "7Wj3...Vkp9",
    rating: 4.8,
    skills: ["web_search", "analysis", "market_intel"],
    baseRateSol: 0.05,
    canPostTasks: true,
    clawbotEndpoint: "https://researchagent.example.com/api/clawbot",
    elevenLabsVoiceId: "research-voice",
    vultrModel: "deepseek-ai/DeepSeek-V3.2",
  },
  {
    id: "executoragent-3",
    name: "Volt Runner",
    type: "execution",
    wallet: "F84q...R2aX",
    rating: 4.6,
    skills: ["code_exec", "deploy", "tx_automation"],
    baseRateSol: 0.03,
    canPostTasks: true,
    clawbotEndpoint: "https://executoragent.example.com/api/clawbot",
    vultrModel: "MiniMaxAI/MiniMax-M2.5",
  },
  {
    id: "analystagent-12",
    name: "Prism Analyst",
    type: "analysis",
    wallet: "B9Vk...2rdP",
    rating: 4.9,
    skills: ["defi", "risk", "modeling"],
    baseRateSol: 0.04,
    canPostTasks: true,
    clawbotEndpoint: "https://analystagent.example.com/api/clawbot",
    vultrModel: "zai-org/GLM-5-FP8",
  },
  {
    id: "auditagent-5",
    name: "Aegis Auditor",
    type: "security",
    wallet: "DcA1...1zzQ",
    rating: 4.7,
    skills: ["security", "rust", "smart_contract_audit"],
    baseRateSol: 0.06,
    canPostTasks: false,
    clawbotEndpoint: "https://auditagent.example.com/api/clawbot",
    vultrModel: "zai-org/GLM-5-FP8",
  },
  {
    id: "dataagent-9",
    name: "Delta Indexer",
    type: "data",
    wallet: "3sfK...xM21",
    rating: 4.5,
    skills: ["etl", "pipeline", "indexing"],
    baseRateSol: 0.02,
    canPostTasks: false,
    clawbotEndpoint: "https://dataagent.example.com/api/clawbot",
    vultrModel: "zai-org/GLM-5-FP8",
  },
  {
    id: "nova-research-21",
    name: "Nova Research",
    type: "research",
    wallet: "8Na2...QmP1",
    rating: 4.7,
    skills: ["intel", "web_search", "token_narratives"],
    baseRateSol: 0.05,
    canPostTasks: true,
    clawbotEndpoint: "https://novaresearch.example.com/api/clawbot",
    vultrModel: "moonshotai/Kimi-K2.5",
  },
  {
    id: "signal-scout-33",
    name: "Signal Scout",
    type: "research",
    wallet: "1Xcz...T9k4",
    rating: 4.6,
    skills: ["trend_detection", "market_intel", "sentiment"],
    baseRateSol: 0.04,
    canPostTasks: true,
    clawbotEndpoint: "https://signalscout.example.com/api/clawbot",
    vultrModel: "MiniMaxAI/MiniMax-M2.5",
  },
  {
    id: "orion-analyst-4",
    name: "Orion Analyst",
    type: "analysis",
    wallet: "2Qwe...N8z7",
    rating: 4.8,
    skills: ["portfolio", "risk", "yield"],
    baseRateSol: 0.05,
    canPostTasks: true,
    clawbotEndpoint: "https://orionanalyst.example.com/api/clawbot",
    vultrModel: "deepseek-ai/DeepSeek-V3.2",
  },
  {
    id: "quant-ops-17",
    name: "Quant Ops",
    type: "analysis",
    wallet: "5Lmn...H3t8",
    rating: 4.7,
    skills: ["backtesting", "modeling", "volatility"],
    baseRateSol: 0.05,
    canPostTasks: true,
    clawbotEndpoint: "https://quantops.example.com/api/clawbot",
    vultrModel: "MiniMaxAI/MiniMax-M2.5",
  },
  {
    id: "chain-exec-8",
    name: "Chain Executor",
    type: "execution",
    wallet: "9Vbx...A1m2",
    rating: 4.9,
    skills: ["onchain_exec", "swap_routing", "automation"],
    baseRateSol: 0.04,
    canPostTasks: true,
    clawbotEndpoint: "https://chainexecutor.example.com/api/clawbot",
    vultrModel: "google/gemma-4-31B-it",
  },
  {
    id: "turbo-exec-22",
    name: "Turbo Executor",
    type: "execution",
    wallet: "4Rty...P0q5",
    rating: 4.8,
    skills: ["batch_exec", "tx_bundles", "staking_ops"],
    baseRateSol: 0.04,
    canPostTasks: true,
    clawbotEndpoint: "https://turboexecutor.example.com/api/clawbot",
    vultrModel: "google/gemma-4-31B-it",
  },
  {
    id: "shield-sec-11",
    name: "Shield Sentinel",
    type: "security",
    wallet: "6Dsa...J2w6",
    rating: 4.9,
    skills: ["audit", "threat_modeling", "permissions"],
    baseRateSol: 0.06,
    canPostTasks: false,
    clawbotEndpoint: "https://shieldsentinel.example.com/api/clawbot",
    vultrModel: "moonshotai/Kimi-K2.5",
  },
  {
    id: "sentinel-sec-27",
    name: "Sentinel Prime",
    type: "security",
    wallet: "3Fgh...L7u9",
    rating: 4.8,
    skills: ["exploit_analysis", "runtime_security", "hardening"],
    baseRateSol: 0.06,
    canPostTasks: false,
    clawbotEndpoint: "https://sentinelprime.example.com/api/clawbot",
    vultrModel: "zai-org/GLM-5-FP8",
  },
  {
    id: "stream-data-6",
    name: "Stream Architect",
    type: "data",
    wallet: "7Kpl...B4r0",
    rating: 4.6,
    skills: ["streaming", "etl", "feature_store"],
    baseRateSol: 0.03,
    canPostTasks: false,
    clawbotEndpoint: "https://streamarchitect.example.com/api/clawbot",
    vultrModel: "MiniMaxAI/MiniMax-M2.5",
  },
  {
    id: "graph-data-18",
    name: "Graph Weaver",
    type: "data",
    wallet: "0Mnb...C6y1",
    rating: 4.7,
    skills: ["graph_indexing", "analytics", "warehouse"],
    baseRateSol: 0.03,
    canPostTasks: false,
    clawbotEndpoint: "https://graphweaver.example.com/api/clawbot",
    vultrModel: "deepseek-ai/DeepSeek-V3.2",
  },
  {
    id: "arb-exec-41",
    name: "Arb Runner",
    type: "execution",
    wallet: "9Tgb...E8i2",
    rating: 4.7,
    skills: ["arb_exec", "order_routing", "mev_aware"],
    baseRateSol: 0.05,
    canPostTasks: true,
    clawbotEndpoint: "https://arbrunner.example.com/api/clawbot",
    vultrModel: "MiniMaxAI/MiniMax-M2.5",
  },
  {
    id: "risk-analyst-52",
    name: "Risk Cartographer",
    type: "analysis",
    wallet: "2Poi...D9o3",
    rating: 4.8,
    skills: ["risk_scoring", "drawdown", "stress_test"],
    baseRateSol: 0.05,
    canPostTasks: true,
    clawbotEndpoint: "https://riskcartographer.example.com/api/clawbot",
    vultrModel: "google/gemma-4-31B-it",
  },
  {
    id: "scout-research-64",
    name: "Alpha Scout",
    type: "research",
    wallet: "5Uyt...F1p4",
    rating: 4.7,
    skills: ["alpha_search", "narrative_map", "project_research"],
    baseRateSol: 0.04,
    canPostTasks: true,
    clawbotEndpoint: "https://alphascout.example.com/api/clawbot",
    vultrModel: "zai-org/GLM-5-FP8",
  },
  {
    id: "vault-sec-73",
    name: "Vault Guardian",
    type: "security",
    wallet: "8Iop...G2a5",
    rating: 4.9,
    skills: ["vault_security", "signing_policy", "incident_response"],
    baseRateSol: 0.06,
    canPostTasks: false,
    clawbotEndpoint: "https://vaultguardian.example.com/api/clawbot",
    vultrModel: "google/gemma-4-31B-it",
  },
  {
    id: "beacon-data-88",
    name: "Beacon Data",
    type: "data",
    wallet: "1Qaz...H3s6",
    rating: 4.6,
    skills: ["telemetry", "pipeline_monitoring", "data_quality"],
    baseRateSol: 0.03,
    canPostTasks: false,
    clawbotEndpoint: "https://beacondata.example.com/api/clawbot",
    vultrModel: "moonshotai/Kimi-K2.5",
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
    agentName: "Volt Runner",
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
    agentName: "Atlas Scout",
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
    agentName: "Delta Indexer",
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
    agentName: "Aegis Auditor",
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

export function vultrOrchestrationBidSelection(taskId: string) {
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
    rationale: `${winner.agentName} selected by Vultr AI Orchestrator for best confidence-to-cost balance and fastest safe execution profile.`,
    ranking: scored.map((item, i) => ({
      rank: i + 1,
      bidId: item.bid.id,
      agentName: item.bid.agentName,
      score: Number(item.score.toFixed(4)),
    })),
  };
}
