import { config } from "@/lib/config";
import { AGENTS } from "@/lib/market-data";

export type SpacetimeMode = "mock" | "live";

export interface SpacetimeMirrorRecord {
  seq: number;
  id: string;
  table: string;
  source: string;
  timestamp: string;
  mode: SpacetimeMode;
  payload: Record<string, unknown>;
  error?: string;
}

export interface SpacetimeRealtimeItem {
  seq: number;
  topic: "tasks" | "bids" | "agents" | "messages" | "events" | "system";
  table: string;
  timestamp: string;
  source: string;
  payload: Record<string, unknown>;
}

export interface AgentPersona {
  agentId: string;
  displayName: string;
  archetype: string;
  tone: string;
  specialties: string[];
  pricingStyle: string;
  riskAppetite: "low" | "medium" | "high";
  updatedAt: string;
}

export interface SpacetimeAgentProfile {
  agentId: string;
  name: string;
  role: string;
  type: string;
  wallet: string;
  rating: number;
  skills: string[];
  baseRateSol: number;
  canPostTasks: boolean;
  clawbotEndpoint: string;
  description: string;
  x402Endpoint: string;
  armoriqPolicyId?: string;
  source: string;
  updatedAt: string;
}

export interface SpacetimeAnalytics {
  tasksCreated: number;
  bidsSubmitted: number;
  eventsCaptured: number;
  settlements: number;
  totalSolSpent: number;
  averageSettlementSol: number;
  topWinningAgents: Array<{ agentName: string; wins: number }>;
  topSpendTasks: Array<{ taskId: string; amountSol: number }>;
}

const MAX_MIRROR_RECORDS = 1200;

const globalStore = globalThis as unknown as {
  __spacetimeMirrorRecords?: SpacetimeMirrorRecord[];
  __spacetimePersonas?: Record<string, AgentPersona>;
  __spacetimeAgentProfiles?: Record<string, SpacetimeAgentProfile>;
  __spacetimeAgentFingerprints?: Record<string, string>;
  __spacetimeSeq?: number;
};

function nowIso() {
  return new Date().toISOString();
}

function nextSeq() {
  const current = globalStore.__spacetimeSeq ?? 0;
  const next = current + 1;
  globalStore.__spacetimeSeq = next;
  return next;
}

function getMirrorState() {
  if (!globalStore.__spacetimeMirrorRecords) {
    globalStore.__spacetimeMirrorRecords = [];
  }
  return globalStore.__spacetimeMirrorRecords;
}

function getPersonaState() {
  if (!globalStore.__spacetimePersonas) {
    const seeded: Record<string, AgentPersona> = {};
    for (const agent of AGENTS) {
      seeded[agent.id] = {
        agentId: agent.id,
        displayName: agent.name,
        archetype:
          agent.type === "research"
            ? "Strategist"
            : agent.type === "analysis"
              ? "Quant"
              : agent.type === "execution"
                ? "Operator"
                : agent.type === "security"
                  ? "Guardian"
                  : "Data Architect",
        tone: "direct",
        specialties: [...agent.skills],
        pricingStyle: "performance_based",
        riskAppetite:
          agent.type === "security" ? "low" : agent.type === "execution" ? "high" : "medium",
        updatedAt: nowIso(),
      };
    }
    globalStore.__spacetimePersonas = seeded;
  }
  return globalStore.__spacetimePersonas;
}

function roleFromAgentType(type: string) {
  if (type === "research") return "Intelligence";
  if (type === "analysis") return "Financial";
  if (type === "execution") return "On-chain";
  if (type === "security") return "Security";
  if (type === "data") return "Analytics";
  return "Agent";
}

function typeFromRole(role: string) {
  const normalized = role.toLowerCase();
  if (normalized.includes("security") || normalized.includes("audit")) return "security";
  if (
    normalized.includes("on-chain") ||
    normalized.includes("execution") ||
    normalized.includes("executor")
  ) {
    return "execution";
  }
  if (normalized.includes("analysis") || normalized.includes("financial") || normalized.includes("quant")) {
    return "analysis";
  }
  if (normalized.includes("data") || normalized.includes("analytics") || normalized.includes("index")) {
    return "data";
  }
  return "research";
}

function inferArchetype(type: string) {
  if (type === "research") return "Strategist";
  if (type === "analysis") return "Quant";
  if (type === "execution") return "Operator";
  if (type === "security") return "Guardian";
  if (type === "data") return "Data Architect";
  return "Generalist";
}

function inferRiskAppetite(type: string): "low" | "medium" | "high" {
  if (type === "security") return "low";
  if (type === "execution") return "high";
  return "medium";
}

function getAgentProfileState() {
  if (!globalStore.__spacetimeAgentProfiles) {
    const seeded: Record<string, SpacetimeAgentProfile> = {};
    for (const agent of AGENTS) {
      seeded[agent.id] = {
        agentId: agent.id,
        name: agent.name,
        role: roleFromAgentType(agent.type),
        type: agent.type,
        wallet: agent.wallet,
        rating: agent.rating,
        skills: [...agent.skills],
        baseRateSol: agent.baseRateSol,
        canPostTasks: agent.canPostTasks,
        clawbotEndpoint: agent.clawbotEndpoint,
        description: `${agent.name} specializes in ${agent.skills.join(", ")}`,
        x402Endpoint: agent.clawbotEndpoint,
        source: "catalog",
        updatedAt: nowIso(),
      };
    }
    globalStore.__spacetimeAgentProfiles = seeded;
  }

  if (!globalStore.__spacetimeAgentFingerprints) {
    globalStore.__spacetimeAgentFingerprints = {};
  }

  return {
    profiles: globalStore.__spacetimeAgentProfiles,
    fingerprints: globalStore.__spacetimeAgentFingerprints,
  };
}

function buildAgentFingerprint(agent: SpacetimeAgentProfile) {
  return JSON.stringify({
    agentId: agent.agentId,
    name: agent.name,
    role: agent.role,
    type: agent.type,
    wallet: agent.wallet,
    rating: agent.rating,
    skills: agent.skills,
    baseRateSol: agent.baseRateSol,
    canPostTasks: agent.canPostTasks,
    clawbotEndpoint: agent.clawbotEndpoint,
    description: agent.description,
    x402Endpoint: agent.x402Endpoint,
    armoriqPolicyId: agent.armoriqPolicyId || null,
  });
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

function pushMirror(record: SpacetimeMirrorRecord) {
  const rows = getMirrorState();
  const withSeq = {
    ...record,
    seq: Number.isFinite(record.seq) ? record.seq : nextSeq(),
  };
  rows.push(withSeq);
  if (rows.length > MAX_MIRROR_RECORDS) {
    globalStore.__spacetimeMirrorRecords = rows.slice(-MAX_MIRROR_RECORDS);
  }
  return withSeq;
}

export async function writeSpacetimeRecord(input: {
  table: string;
  payload: Record<string, unknown>;
  source?: string;
}): Promise<SpacetimeMirrorRecord> {
  const baseRecord: Omit<SpacetimeMirrorRecord, "mode"> = {
    seq: nextSeq(),
    id: `stdb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    table: input.table,
    source: input.source || "runtime",
    timestamp: nowIso(),
    payload: input.payload,
  };

  if (!config.spacetimeEnabled || !config.spacetimeApiUrl) {
    return pushMirror({ ...baseRecord, mode: "mock" });
  }

  try {
    const response = await fetch(`${config.spacetimeApiUrl}/ingest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.spacetimeApiKey
          ? { Authorization: `Bearer ${config.spacetimeApiKey}` }
          : {}),
      },
      body: JSON.stringify({
        database: config.spacetimeDatabase,
        module: config.spacetimeModule,
        table: input.table,
        record: input.payload,
        timestamp: baseRecord.timestamp,
        source: baseRecord.source,
      }),
    });

    if (!response.ok) {
      throw new Error(`SpacetimeDB HTTP ${response.status}`);
    }

    return pushMirror({ ...baseRecord, mode: "live" });
  } catch (error) {
    return pushMirror({
      ...baseRecord,
      mode: "mock",
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export function listSpacetimeMirrorRecords(limit = 200) {
  const rows = getMirrorState();
  const safeLimit = Math.max(1, Math.min(limit, MAX_MIRROR_RECORDS));
  return rows.slice(-safeLimit).reverse();
}

function topicFromTable(table: string): SpacetimeRealtimeItem["topic"] {
  if (table === "tasks" || table === "task_phases" || table === "task_selection") return "tasks";
  if (table === "bids" || table === "bidding_channel") return "bids";
  if (table === "agents" || table === "agent_personas") return "agents";
  if (table === "agent_messages") return "messages";
  if (table === "events") return "events";
  return "system";
}

export function listSpacetimeRealtimeFeed(input?: {
  afterSeq?: number;
  limit?: number;
  topics?: Array<SpacetimeRealtimeItem["topic"]>;
  agentId?: string;
}) {
  const rows = getMirrorState();
  const afterSeq = Math.max(0, Math.floor(input?.afterSeq || 0));
  const safeLimit = Math.max(1, Math.min(input?.limit || 200, MAX_MIRROR_RECORDS));
  const allowedTopics = input?.topics && input.topics.length > 0 ? new Set(input.topics) : null;
  const normalizedAgentId = input?.agentId?.trim();

  const filtered = rows.filter((row) => {
    if (row.seq <= afterSeq) return false;

    const topic = topicFromTable(row.table);
    if (allowedTopics && !allowedTopics.has(topic)) return false;

    if (!normalizedAgentId) return true;

    if (row.table === "agent_messages") {
      const from = typeof row.payload.from_agent_id === "string" ? row.payload.from_agent_id : "";
      const to = typeof row.payload.to_agent_id === "string" ? row.payload.to_agent_id : "";
      return from === normalizedAgentId || to === normalizedAgentId || to === "*";
    }

    return true;
  });

  const sliced = filtered.slice(-safeLimit);
  const items: SpacetimeRealtimeItem[] = sliced.map((row) => ({
    seq: row.seq,
    topic: topicFromTable(row.table),
    table: row.table,
    timestamp: row.timestamp,
    source: row.source,
    payload: row.payload,
  }));

  const latestSeq = rows.length > 0 ? rows[rows.length - 1].seq : afterSeq;

  return {
    cursor: {
      afterSeq,
      latestSeq,
      hasMore: latestSeq > afterSeq,
    },
    items,
  };
}

export async function publishTaskBroadcast(input: {
  taskId: string;
  phase: string;
  message: string;
  agentId?: string;
  details?: Record<string, unknown>;
}) {
  return writeSpacetimeRecord({
    table: "task_broadcasts",
    source: "task-broadcast-api",
    payload: {
      action: "broadcast",
      task_id: input.taskId,
      phase: input.phase,
      message: input.message,
      agent_id: input.agentId || null,
      details: input.details || {},
    },
  });
}

export async function publishBidBroadcast(input: {
  taskId: string;
  stage: "bidding_open" | "bids_submitted" | "winner_selected";
  bidCount?: number;
  winnerAgent?: string;
  details?: Record<string, unknown>;
}) {
  return writeSpacetimeRecord({
    table: "bidding_channel",
    source: "bidding-broadcast-api",
    payload: {
      action: "broadcast",
      task_id: input.taskId,
      stage: input.stage,
      bid_count: input.bidCount ?? null,
      winner_agent: input.winnerAgent ?? null,
      details: input.details || {},
    },
  });
}

export async function sendAgentMessage(input: {
  fromAgentId: string;
  toAgentId: string;
  taskId?: string;
  message: string;
  metadata?: Record<string, unknown>;
}) {
  const payload = {
    action: "send",
    message_id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    from_agent_id: input.fromAgentId,
    to_agent_id: input.toAgentId,
    task_id: input.taskId || null,
    message: input.message,
    metadata: input.metadata || {},
  };

  const record = await writeSpacetimeRecord({
    table: "agent_messages",
    source: "agent-communication-api",
    payload,
  });

  return {
    seq: record.seq,
    timestamp: record.timestamp,
    ...payload,
  };
}

export function listAgentMessages(input?: {
  agentId?: string;
  taskId?: string;
  limit?: number;
}) {
  const rows = getMirrorState();
  const safeLimit = Math.max(1, Math.min(input?.limit || 100, MAX_MIRROR_RECORDS));
  const normalizedAgentId = input?.agentId?.trim();
  const normalizedTaskId = input?.taskId?.trim();

  const messages = rows
    .filter((row) => row.table === "agent_messages")
    .filter((row) => {
      if (!normalizedAgentId && !normalizedTaskId) return true;

      const payload = row.payload;
      const from = typeof payload.from_agent_id === "string" ? payload.from_agent_id : "";
      const to = typeof payload.to_agent_id === "string" ? payload.to_agent_id : "";
      const taskId = typeof payload.task_id === "string" ? payload.task_id : "";

      const byAgent =
        !normalizedAgentId ||
        from === normalizedAgentId ||
        to === normalizedAgentId ||
        to === "*";
      const byTask = !normalizedTaskId || taskId === normalizedTaskId;
      return byAgent && byTask;
    })
    .slice(-safeLimit)
    .map((row) => ({
      seq: row.seq,
      timestamp: row.timestamp,
      ...(row.payload as Record<string, unknown>),
    }));

  return messages;
}

export function listAgentPersonas() {
  const rows = getPersonaState();
  return Object.values(rows).sort((a, b) => a.displayName.localeCompare(b.displayName));
}

export function listSpacetimeAgentProfiles() {
  const { profiles } = getAgentProfileState();
  return Object.values(profiles).sort((a, b) => a.name.localeCompare(b.name));
}

export async function upsertSpacetimeAgentProfile(input: {
  agentId: string;
  name: string;
  role?: string;
  type?: string;
  wallet?: string;
  rating?: number;
  skills?: string[];
  baseRateSol?: number;
  canPostTasks?: boolean;
  clawbotEndpoint?: string;
  description?: string;
  x402Endpoint?: string;
  armoriqPolicyId?: string;
  source?: string;
}) {
  const { profiles, fingerprints } = getAgentProfileState();
  const current = profiles[input.agentId];

  const resolvedType =
    input.type || current?.type || typeFromRole(input.role || current?.role || "research");
  const resolvedRole = input.role || current?.role || roleFromAgentType(resolvedType);

  const next: SpacetimeAgentProfile = {
    agentId: input.agentId,
    name: input.name,
    role: resolvedRole,
    type: resolvedType,
    wallet: input.wallet || current?.wallet || "",
    rating: input.rating ?? current?.rating ?? 4.5,
    skills:
      Array.isArray(input.skills) && input.skills.length > 0
        ? [...new Set(input.skills)]
        : current?.skills || [],
    baseRateSol: input.baseRateSol ?? current?.baseRateSol ?? 0.05,
    canPostTasks: input.canPostTasks ?? current?.canPostTasks ?? true,
    clawbotEndpoint: input.clawbotEndpoint || current?.clawbotEndpoint || "",
    description:
      input.description ||
      current?.description ||
      `${input.name} specializes in ${(input.skills || []).join(", ")}`,
    x402Endpoint:
      input.x402Endpoint ||
      current?.x402Endpoint ||
      input.clawbotEndpoint ||
      current?.clawbotEndpoint ||
      "",
    armoriqPolicyId: input.armoriqPolicyId || current?.armoriqPolicyId,
    source: input.source || current?.source || "api",
    updatedAt: nowIso(),
  };

  profiles[input.agentId] = next;

  const nextFingerprint = buildAgentFingerprint(next);
  const changed = fingerprints[input.agentId] !== nextFingerprint;

  if (changed) {
    await writeSpacetimeRecord({
      table: "agents",
      source: input.source || "agent-api",
      payload: {
        action: "upsert",
        agent: next,
      },
    });
    fingerprints[input.agentId] = nextFingerprint;
  }

  const existingPersona = getPersonaState()[input.agentId];
  const inferredArchetype = inferArchetype(resolvedType);
  const inferredRisk = inferRiskAppetite(resolvedType);

  const personaNeedsUpdate =
    !existingPersona ||
    existingPersona.displayName !== next.name ||
    existingPersona.archetype !== inferredArchetype ||
    existingPersona.riskAppetite !== inferredRisk ||
    JSON.stringify(existingPersona.specialties) !== JSON.stringify(next.skills);

  if (personaNeedsUpdate) {
    await upsertAgentPersona({
      agentId: input.agentId,
      displayName: next.name,
      archetype: inferredArchetype,
      tone: existingPersona?.tone || "direct",
      specialties: next.skills,
      pricingStyle: existingPersona?.pricingStyle || "performance_based",
      riskAppetite: inferredRisk,
    });
  }

  return {
    profile: next,
    changed,
  };
}

export async function ensureMarketplaceAgentsSynced() {
  const results = await Promise.all(
    AGENTS.map((agent) =>
      upsertSpacetimeAgentProfile({
        agentId: agent.id,
        name: agent.name,
        role: roleFromAgentType(agent.type),
        type: agent.type,
        wallet: agent.wallet,
        rating: agent.rating,
        skills: agent.skills,
        baseRateSol: agent.baseRateSol,
        canPostTasks: agent.canPostTasks,
        clawbotEndpoint: agent.clawbotEndpoint,
        x402Endpoint: agent.clawbotEndpoint,
        description: `${agent.name} specializes in ${agent.skills.join(", ")}`,
        source: "catalog-sync",
      }),
    ),
  );

  const synced = results.filter((item) => item.changed).length;
  return {
    total: AGENTS.length,
    synced,
    unchanged: AGENTS.length - synced,
  };
}

export async function upsertAgentPersona(input: {
  agentId: string;
  displayName?: string;
  archetype?: string;
  tone?: string;
  specialties?: string[];
  pricingStyle?: string;
  riskAppetite?: "low" | "medium" | "high";
}) {
  const personas = getPersonaState();
  const current = personas[input.agentId] || {
    agentId: input.agentId,
    displayName: input.agentId,
    archetype: "Generalist",
    tone: "direct",
    specialties: ["analysis"],
    pricingStyle: "fixed",
    riskAppetite: "medium" as const,
    updatedAt: nowIso(),
  };

  const next: AgentPersona = {
    ...current,
    displayName: input.displayName || current.displayName,
    archetype: input.archetype || current.archetype,
    tone: input.tone || current.tone,
    specialties:
      Array.isArray(input.specialties) && input.specialties.length > 0
        ? [...new Set(input.specialties)]
        : current.specialties,
    pricingStyle: input.pricingStyle || current.pricingStyle,
    riskAppetite: input.riskAppetite || current.riskAppetite,
    updatedAt: nowIso(),
  };

  personas[input.agentId] = next;

  await writeSpacetimeRecord({
    table: "agent_personas",
    source: "persona-api",
    payload: {
      action: "upsert",
      persona: next,
    },
  });

  return next;
}

export function computeSpacetimeAnalytics(): SpacetimeAnalytics {
  const rows = getMirrorState();

  const tasksCreated = rows.filter(
    (row) => row.table === "tasks" && asString(row.payload.action) === "created",
  ).length;

  const bidsSubmitted = rows.filter(
    (row) => row.table === "bids" && asString(row.payload.action) === "submitted",
  ).length;

  const eventsCaptured = rows.filter((row) => row.table === "events").length;

  const settlementRows = rows.filter(
    (row) => row.table === "transactions" && asString(row.payload.action) === "settled",
  );

  const settlements = settlementRows.length;

  const spendByTask = new Map<string, number>();
  const spendByAgent = new Map<string, number>();

  for (const row of settlementRows) {
    const taskId = asString(row.payload.task_id) || "unknown-task";

    let amount = asNumber(row.payload.amount_sol);
    if (amount === null && typeof row.payload.transaction === "object" && row.payload.transaction) {
      amount = asNumber((row.payload.transaction as Record<string, unknown>).amount_sol);
    }

    const amountSol = amount || 0;
    spendByTask.set(taskId, (spendByTask.get(taskId) || 0) + amountSol);

    const winnerAgent = asString(row.payload.winner_agent) || "unknown-agent";
    spendByAgent.set(winnerAgent, (spendByAgent.get(winnerAgent) || 0) + amountSol);
  }

  const selectionRows = rows.filter((row) => row.table === "task_selection");
  const wins = new Map<string, number>();
  for (const row of selectionRows) {
    const winner = asString(row.payload.winner_agent);
    if (!winner) continue;
    wins.set(winner, (wins.get(winner) || 0) + 1);
  }

  const totalSolSpent = Number(
    [...spendByTask.values()].reduce((sum, value) => sum + value, 0).toFixed(6),
  );
  const averageSettlementSol = settlements > 0 ? Number((totalSolSpent / settlements).toFixed(6)) : 0;

  const topWinningAgents = [...wins.entries()]
    .map(([agentName, count]) => ({ agentName, wins: count }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 5);

  const topSpendTasks = [...spendByTask.entries()]
    .map(([taskId, amountSol]) => ({ taskId, amountSol: Number(amountSol.toFixed(6)) }))
    .sort((a, b) => b.amountSol - a.amountSol)
    .slice(0, 5);

  return {
    tasksCreated,
    bidsSubmitted,
    eventsCaptured,
    settlements,
    totalSolSpent,
    averageSettlementSol,
    topWinningAgents,
    topSpendTasks,
  };
}

export function spacetimeHealth() {
  const rows = getMirrorState();
  const latest = rows.length > 0 ? rows[rows.length - 1] : null;
  const personas = getPersonaState();
  const { profiles } = getAgentProfileState();

  return {
    enabled: config.spacetimeEnabled,
    configured: !!config.spacetimeApiUrl,
    api_url: config.spacetimeApiUrl || null,
    database: config.spacetimeDatabase,
    module: config.spacetimeModule,
    mirrored_records: rows.length,
    agent_profiles: Object.keys(profiles).length,
    persona_profiles: Object.keys(personas).length,
    latest_record: latest,
  };
}
