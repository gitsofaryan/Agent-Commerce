import { config } from "@/lib/config";
import { AGENTS } from "@/lib/market-data";
import { kalibrRoute } from "@/lib/integrations/kalibr";

export type ArmorIqMode = "mock" | "live";

export interface ArmorIqAgentProfile {
  agentId: string;
  name: string;
  role: string;
  skills: string[];
  policyId: string;
  registeredAt: string;
}

export interface ArmorIqDecision {
  allowed: boolean;
  mode: ArmorIqMode;
  policyId: string;
  reason: string;
  riskScore: number;
  decisionId: string;
  timestamp: string;
}

interface ArmorIqAuditEntry {
  id: string;
  type: "register" | "intent";
  mode: ArmorIqMode;
  payload: Record<string, unknown>;
  timestamp: string;
  error?: string;
}

const MAX_AUDIT_ENTRIES = 1000;

const globalStore = globalThis as unknown as {
  __armoriqProfiles?: Record<string, ArmorIqAgentProfile>;
  __armoriqAudit?: ArmorIqAuditEntry[];
};

function nowIso() {
  return new Date().toISOString();
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getProfiles() {
  if (!globalStore.__armoriqProfiles) {
    const seeded: Record<string, ArmorIqAgentProfile> = {};
    for (const agent of AGENTS) {
      seeded[agent.id] = {
        agentId: agent.id,
        name: agent.name,
        role: agent.type,
        skills: [...agent.skills],
        policyId: config.armoriqPolicyId,
        registeredAt: nowIso(),
      };
    }
    globalStore.__armoriqProfiles = seeded;
  }
  return globalStore.__armoriqProfiles;
}

function getAuditLog() {
  if (!globalStore.__armoriqAudit) {
    globalStore.__armoriqAudit = [];
  }
  return globalStore.__armoriqAudit;
}

function pushAudit(entry: ArmorIqAuditEntry) {
  const rows = getAuditLog();
  rows.push(entry);
  if (rows.length > MAX_AUDIT_ENTRIES) {
    globalStore.__armoriqAudit = rows.slice(-MAX_AUDIT_ENTRIES);
  }
}

async function vultrIntentDecision(input: {
  taskSummary: string;
  requestedAction: string;
}): Promise<ArmorIqDecision> {
  try {
    const prompt = `You are the ArmorIQ security guardian. Review this task summary and requested action. 
Task: ${input.taskSummary}
Action: ${input.requestedAction}

Decide if this is safe to execute. If it involves stealing, hacking, unauthorized access, bypassing security, or draining funds, block it.
You MUST reply STRICTLY in this JSON format and nothing else:
{"allowed": boolean, "reason": "string explaining why", "riskScore": number between 0.0 and 1.0}`;

    const kalibr = await kalibrRoute(prompt);
    let allowed = true;
    let reason = "Vultr AI evaluated safe";
    let riskScore = 0.1;

    try {
      const text = kalibr.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text);
      if (typeof parsed.allowed === "boolean") allowed = parsed.allowed;
      if (typeof parsed.reason === "string") reason = parsed.reason;
      if (typeof parsed.riskScore === "number") riskScore = parsed.riskScore;
    } catch {
      reason = "Vultr AI heuristic allowed (parse failed)";
    }

    return {
      allowed,
      mode: "live",
      policyId: config.armoriqPolicyId,
      reason: `[Vultr Neural Scan] ${reason}`,
      riskScore,
      decisionId: makeId("vultr-armoriq"),
      timestamp: nowIso(),
    };
  } catch (e) {
    return {
      allowed: true,
      mode: "mock",
      policyId: config.armoriqPolicyId,
      reason: "Fallback allowed (Inference error)",
      riskScore: 0.1,
      decisionId: makeId("vultr-armoriq-fail"),
      timestamp: nowIso(),
    };
  }
}

export async function registerArmorIqAgentProfile(input: {
  agentId: string;
  name: string;
  role: string;
  skills?: string[];
}) {
  const profiles = getProfiles();
  const profile: ArmorIqAgentProfile = {
    agentId: input.agentId,
    name: input.name,
    role: input.role,
    skills: input.skills || [],
    policyId: config.armoriqPolicyId,
    registeredAt: nowIso(),
  };

  profiles[input.agentId] = profile;

  if (!config.armoriqEnabled || !config.armoriqApiUrl) {
    pushAudit({
      id: makeId("armoriq-register"),
      type: "register",
      mode: "mock",
      timestamp: nowIso(),
      payload: { profile },
    });
    return { ok: true, mode: "mock" as const, profile };
  }

  try {
    const response = await fetch(`${config.armoriqApiUrl}/agents/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.armoriqApiKey
          ? { Authorization: `Bearer ${config.armoriqApiKey}` }
          : {}),
      },
      body: JSON.stringify({
        agent_id: profile.agentId,
        name: profile.name,
        role: profile.role,
        skills: profile.skills,
        policy_id: profile.policyId,
      }),
    });

    if (!response.ok) {
      throw new Error(`ArmorIQ HTTP ${response.status}`);
    }

    pushAudit({
      id: makeId("armoriq-register"),
      type: "register",
      mode: "live",
      timestamp: nowIso(),
      payload: { profile },
    });

    return { ok: true, mode: "live" as const, profile };
  } catch (error) {
    pushAudit({
      id: makeId("armoriq-register"),
      type: "register",
      mode: "mock",
      timestamp: nowIso(),
      payload: { profile },
      error: error instanceof Error ? error.message : String(error),
    });
    return { ok: true, mode: "mock" as const, profile };
  }
}

export async function evaluateArmorIqIntent(input: {
  agentId: string;
  agentName: string;
  taskId: string;
  taskSummary: string;
  requestedAction: string;
  context?: Record<string, unknown>;
}): Promise<ArmorIqDecision> {
  if (!config.armoriqEnabled || !config.armoriqApiUrl) {
    const decision = await vultrIntentDecision({
      taskSummary: input.taskSummary,
      requestedAction: input.requestedAction,
    });

    pushAudit({
      id: makeId("armoriq-intent"),
      type: "intent",
      mode: "mock",
      timestamp: nowIso(),
      payload: {
        agent_id: input.agentId,
        agent_name: input.agentName,
        task_id: input.taskId,
        action: input.requestedAction,
        decision,
      },
    });

    return decision;
  }

  try {
    const response = await fetch(`${config.armoriqApiUrl}/intent/evaluate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(config.armoriqApiKey
          ? { Authorization: `Bearer ${config.armoriqApiKey}` }
          : {}),
      },
      body: JSON.stringify({
        policy_id: config.armoriqPolicyId,
        agent_id: input.agentId,
        agent_name: input.agentName,
        task_id: input.taskId,
        task_summary: input.taskSummary,
        requested_action: input.requestedAction,
        context: input.context || {},
      }),
    });

    if (!response.ok) {
      throw new Error(`ArmorIQ HTTP ${response.status}`);
    }

    const data = (await response.json()) as {
      allowed?: boolean;
      reason?: string;
      risk_score?: number;
      decision_id?: string;
    };

    const decision: ArmorIqDecision = {
      allowed: data.allowed !== false,
      mode: "live",
      policyId: config.armoriqPolicyId,
      reason: data.reason || "Allowed by ArmorIQ",
      riskScore:
        typeof data.risk_score === "number" && Number.isFinite(data.risk_score)
          ? data.risk_score
          : 0.2,
      decisionId: data.decision_id || makeId("armoriq-decision"),
      timestamp: nowIso(),
    };

    pushAudit({
      id: makeId("armoriq-intent"),
      type: "intent",
      mode: "live",
      timestamp: nowIso(),
      payload: {
        agent_id: input.agentId,
        agent_name: input.agentName,
        task_id: input.taskId,
        action: input.requestedAction,
        decision,
      },
    });

    return decision;
  } catch (error) {
    const decision = await vultrIntentDecision({
      taskSummary: input.taskSummary,
      requestedAction: input.requestedAction,
    });

    pushAudit({
      id: makeId("armoriq-intent"),
      type: "intent",
      mode: "mock",
      timestamp: nowIso(),
      payload: {
        agent_id: input.agentId,
        agent_name: input.agentName,
        task_id: input.taskId,
        action: input.requestedAction,
        decision,
      },
      error: error instanceof Error ? error.message : String(error),
    });

    return decision;
  }
}

export function listArmorIqProfiles() {
  return Object.values(getProfiles()).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function listArmorIqAudit(limit = 200) {
  const rows = getAuditLog();
  const safeLimit = Math.max(1, Math.min(limit, MAX_AUDIT_ENTRIES));
  return rows.slice(-safeLimit).reverse();
}

export function armorIqHealth() {
  return {
    enabled: config.armoriqEnabled,
    configured: !!config.armoriqApiUrl,
    api_url: config.armoriqApiUrl || null,
    policy_id: config.armoriqPolicyId,
    profiles: listArmorIqProfiles().length,
    audit_events: getAuditLog().length,
  };
}
