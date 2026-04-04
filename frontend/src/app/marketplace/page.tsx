"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { AGENTS } from "@/lib/market-data";

type AgentPreviousWork = {
    title: string;
    date: string;
    status: "completed";
};

type MarketplaceAgent = {
    id: string;
    name: string;
    role: string;
    avatar: string;
    skills: string[];
    balance: number;
    successRate: number;
    completedTasks: number;
    previousWork: AgentPreviousWork[];
};

type CreateAgentFormState = {
    agentName: string;
    role: string;
    description: string;
    skills: string;
    baseRateSol: string;
    x402Endpoint: string;
    walletAddress: string;
};

type ConnectClawbotFormState = {
    clawbotId: string;
    ownerWallet: string;
    bidEndpoint: string;
    metadataUrl: string;
    x402Endpoint: string;
    authScheme: string;
    skills: string;
};

type ApiAgentRow = {
    agent_id: string;
    name: string;
    role?: string;
    type?: string;
    skills?: string[];
    balance?: number;
    base_rate_sol?: number;
    rating?: number;
    source?: string;
};

const feedDates = ["1 hour ago", "3 hours ago", "8 hours ago"] as const;

const workFeedByRole: Record<string, string[]> = {
    Coordinator: [
        "Workflow orchestration for multi-agent bounty",
        "Cross-agent SLA conflict resolution",
        "Escrow release and settlement coordination",
    ],
    Intelligence: [
        "Macro signal synthesis report",
        "Token narrative intelligence brief",
        "Competitor protocol mapping",
    ],
    Financial: [
        "Treasury risk heatmap",
        "Yield strategy scoring",
        "Capital allocation recommendation",
    ],
    "On-chain": [
        "DEX route execution bundle",
        "Liquidity migration automation",
        "Program interaction runbook",
    ],
    Security: [
        "Permission boundary review",
        "Exploit simulation traces",
        "Critical issue patch guidance",
    ],
    Performance: [
        "Compute-unit optimization pass",
        "Batch execution throughput tuning",
        "Latency bottleneck analysis",
    ],
    Analytics: [
        "Data freshness audit",
        "Dashboard KPI integrity check",
        "Cohort behavior query pack",
    ],
    Trading: [
        "Momentum strategy backtest",
        "Cross-venue spread capture",
        "Risk-adjusted execution report",
    ],
    Infra: [
        "Indexer uptime hardening",
        "Queue failover rehearsal",
        "Endpoint reliability benchmark",
    ],
    Compliance: [
        "Policy guardrail validation",
        "KYT exception audit",
        "Rule-trigger replay analysis",
    ],
};

function roleLabelFromType(type: string) {
    if (type === "research") return "Intelligence";
    if (type === "analysis") return "Financial";
    if (type === "execution") return "On-chain";
    if (type === "security") return "Security";
    if (type === "data") return "Analytics";
    return "Analytics";
}

function normalizeMarketplaceRole(role?: string, type?: string) {
    const normalizedRole = (role || "").trim();
    if (!normalizedRole) return roleLabelFromType(type || "");

    const lower = normalizedRole.toLowerCase();
    if (lower === "research") return "Intelligence";
    if (lower === "analysis") return "Financial";
    if (lower === "execution") return "On-chain";
    if (lower === "security") return "Security";
    if (lower === "data") return "Analytics";
    return normalizedRole;
}

function avatarByType(type?: string) {
    if (type === "research") return "🔍";
    if (type === "analysis") return "📊";
    if (type === "execution") return "⚡";
    if (type === "security") return "🛡️";
    return "📈";
}

function previousWorkByRole(role: string): AgentPreviousWork[] {
    const workTitles = workFeedByRole[role] ?? [
        "Agent execution summary",
        "Protocol interaction report",
        "Task completion package",
    ];

    return workTitles.slice(0, 3).map((title, itemIndex) => ({
        title,
        date: feedDates[itemIndex],
        status: "completed",
    }));
}


const fallbackAgents: MarketplaceAgent[] = AGENTS.map((agent, index) => {
    const role =
        agent.type === "research"
            ? "Intelligence"
            : agent.type === "analysis"
                ? "Financial"
                : agent.type === "execution"
                    ? "On-chain"
                    : agent.type === "security"
                        ? "Security"
                        : "Analytics";

    const previousWork = previousWorkByRole(role);

    return {
        id: agent.id,
        name: agent.name,
        role,
        avatar:
            agent.type === "research"
                ? "🔍"
                : agent.type === "analysis"
                    ? "📊"
                    : agent.type === "execution"
                        ? "⚡"
                        : agent.type === "security"
                            ? "🛡️"
                            : "📈",
        skills: agent.skills,
        balance: Number((agent.baseRateSol * 700 + index * 1.4).toFixed(1)),
        successRate: Math.min(99, Math.round(agent.rating * 20 + (index % 2))),
        completedTasks: 540 + index * 123,
        previousWork,
    };
});

const defaultCreateForm: CreateAgentFormState = {
    agentName: "",
    role: "Security",
    description: "",
    skills: "threat detection, policy checks",
    baseRateSol: "0.08",
    x402Endpoint: "https://example.com/api/execute",
    walletAddress: "",
};

const defaultClawbotForm: ConnectClawbotFormState = {
    clawbotId: "",
    ownerWallet: "",
    bidEndpoint: "https://your-agent.app/api/clawbot/bid",
    metadataUrl: "https://your-agent.app/.well-known/agent.json",
    x402Endpoint: "https://your-agent.app/api/x402/service",
    authScheme: "bearer",
    skills: "research, execution",
};

export default function MarketplacePage() {
    const [selectedAgent, setSelectedAgent] = useState<MarketplaceAgent | null>(null);
    const [marketAgents, setMarketAgents] = useState<MarketplaceAgent[]>(fallbackAgents);
    const [showCreateAgentModal, setShowCreateAgentModal] = useState(false);
    const [createAgentForm, setCreateAgentForm] = useState<CreateAgentFormState>(defaultCreateForm);
    const [createAgentError, setCreateAgentError] = useState<string | null>(null);
    const [createAgentSuccess, setCreateAgentSuccess] = useState<string | null>(null);
    const [isCreatingAgent, setIsCreatingAgent] = useState(false);
    const [showClawbotModal, setShowClawbotModal] = useState(false);
    const [clawbotForm, setClawbotForm] = useState<ConnectClawbotFormState>(defaultClawbotForm);
    const [isConnectingClawbot, setIsConnectingClawbot] = useState(false);
    const [clawbotError, setClawbotError] = useState<string | null>(null);
    const [clawbotSuccess, setClawbotSuccess] = useState<string | null>(null);
    const [openRegisterEndpoint, setOpenRegisterEndpoint] = useState("/api/clawbot/register");

    const avatarUrl = (seed: string, size = 96) =>
        `https://api.dicebear.com/9.x/pixel-art/svg?seed=${encodeURIComponent(seed)}&size=${size}`;

    const updateCreateAgentField = (key: keyof CreateAgentFormState, value: string) => {
        setCreateAgentForm((previous) => ({ ...previous, [key]: value }));
    };

    const updateClawbotField = (key: keyof ConnectClawbotFormState, value: string) => {
        setClawbotForm((previous) => ({ ...previous, [key]: value }));
    };

    const refreshMarketplaceAgents = async () => {
        try {
            const response = await fetch("/api/agents", {
                method: "GET",
                cache: "no-store",
            });

            const rows = (await response.json()) as ApiAgentRow[];
            if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
                return;
            }

            const mapped = rows.map((row, index) => {
                const role = normalizeMarketplaceRole(row.role, row.type);
                const rating = typeof row.rating === "number" ? row.rating : 4.75;
                const successRate = Math.min(99, Math.max(80, Math.round(rating * 20)));
                const runtimeBalance = typeof row.balance === "number" ? row.balance : 0;
                const syntheticBalance =
                    typeof row.base_rate_sol === "number"
                        ? Number((row.base_rate_sol * 700).toFixed(1))
                        : 0;

                return {
                    id: row.agent_id,
                    name: row.name,
                    role,
                    avatar: avatarByType(row.type),
                    skills: Array.isArray(row.skills) ? row.skills : ["analysis"],
                    balance: Number((runtimeBalance > 0 ? runtimeBalance : syntheticBalance).toFixed(1)),
                    successRate,
                    completedTasks: row.source === "agent-register-api" ? 0 : 540 + index * 123,
                    previousWork: previousWorkByRole(role),
                } satisfies MarketplaceAgent;
            });

            setMarketAgents(mapped);
        } catch {
            // Keep fallback catalog when API is unavailable.
        }
    };

    useEffect(() => {
        void fetch("/api/spacetimedb/status?limit=1", {
            method: "GET",
            cache: "no-store",
        }).catch(() => {
            // Non-blocking sync trigger; UI should not fail if this request is unavailable.
        });

        void fetch("/api/marketplace/clawbot/open", {
            method: "GET",
            cache: "no-store",
        })
            .then((response) => response.json())
            .then((json) => {
                if (typeof json?.registerEndpoint === "string" && json.registerEndpoint.trim()) {
                    setOpenRegisterEndpoint(json.registerEndpoint);
                }
            })
            .catch(() => {
                // Keep default endpoint if open-channel endpoint is unavailable.
            });

        void refreshMarketplaceAgents();
    }, []);

    const handleConnectClawbot = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setClawbotError(null);
        setClawbotSuccess(null);
        setIsConnectingClawbot(true);

        try {
            const payload = {
                id: clawbotForm.clawbotId.trim(),
                owner_wallet: clawbotForm.ownerWallet.trim(),
                endpoint: clawbotForm.bidEndpoint.trim(),
                metadata_url: clawbotForm.metadataUrl.trim(),
                x402_endpoint: clawbotForm.x402Endpoint.trim(),
                auth_scheme: clawbotForm.authScheme.trim(),
                skills: clawbotForm.skills
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
            };

            const response = await fetch(openRegisterEndpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok || !result?.ok) {
                throw new Error(result?.error || "Unable to connect clawbot.");
            }

            setClawbotSuccess(
                `Clawbot connected: ${result?.clawbot?.id || payload.id || "new clawbot"}. Marketplace bidding is now open.`,
            );
            setShowClawbotModal(false);
            setClawbotForm(defaultClawbotForm);
        } catch (error) {
            setClawbotError(error instanceof Error ? error.message : "Clawbot connection failed.");
        } finally {
            setIsConnectingClawbot(false);
        }
    };

    const handleCreateAgent = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setCreateAgentError(null);
        setCreateAgentSuccess(null);
        setIsCreatingAgent(true);

        try {
            const parsedSkills = createAgentForm.skills
                .split(",")
                .map((skill) => skill.trim())
                .filter(Boolean);

            const payload = {
                agentName: createAgentForm.agentName.trim(),
                role: createAgentForm.role.trim(),
                description: createAgentForm.description.trim(),
                skills: parsedSkills,
                baseRateSol: Number(createAgentForm.baseRateSol || "0.08"),
                x402Endpoint: createAgentForm.x402Endpoint.trim(),
                walletAddress: createAgentForm.walletAddress.trim(),
            };

            const response = await fetch("/api/agents/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || "Agent registration failed.");
            }

            await refreshMarketplaceAgents();
            setCreateAgentSuccess(
                `Agent created. ArmorIQ mode: ${result?.armoriq?.mode || "unknown"}${result?.armoriq?.policyId ? ` | Policy: ${result.armoriq.policyId}` : ""}`,
            );
            setCreateAgentForm(defaultCreateForm);
            setShowCreateAgentModal(false);
        } catch (error) {
            setCreateAgentError(
                error instanceof Error ? error.message : "Unable to create agent with ArmorIQ.",
            );
        } finally {
            setIsCreatingAgent(false);
        }
    };

    return (
        <main style={{ backgroundColor: "var(--bg)" }} className="min-h-screen">
            <header className="border-b" style={{ borderColor: "var(--line)" }}>
                <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
                    <h1 className="text-3xl font-black">AGENT MARKETPLACE</h1>
                    <p className="text-xs mono mt-2" style={{ color: "var(--muted)" }}>
                        Discover and hire specialized AI agents
                    </p>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">

                {createAgentSuccess && (
                    <div
                        className="neo-card px-4 py-3 mb-5 text-xs mono font-bold"
                        style={{ backgroundColor: "var(--panel-strong)", color: "var(--ink)" }}
                    >
                        ✅ {createAgentSuccess}
                    </div>
                )}

                {createAgentError && (
                    <div
                        className="neo-card px-4 py-3 mb-5 text-xs mono font-bold"
                        style={{ backgroundColor: "#ffe5e5", color: "#7f1d1d", borderColor: "#ef4444" }}
                    >
                        ⚠️ {createAgentError}
                    </div>
                )}

                {clawbotSuccess && (
                    <div
                        className="neo-card px-4 py-3 mb-5 text-xs mono font-bold"
                        style={{ backgroundColor: "#e8fff0", color: "#14532d", borderColor: "#22c55e" }}
                    >
                        🤖 {clawbotSuccess}
                    </div>
                )}

                {clawbotError && (
                    <div
                        className="neo-card px-4 py-3 mb-5 text-xs mono font-bold"
                        style={{ backgroundColor: "#ffe5e5", color: "#7f1d1d", borderColor: "#ef4444" }}
                    >
                        ⚠️ {clawbotError}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                    <button
                        onClick={() => {
                            setCreateAgentError(null);
                            setCreateAgentSuccess(null);
                            setShowCreateAgentModal(true);
                        }}
                        className="neo-btn px-4 py-2 font-bold text-sm mono"
                        style={{ background: "var(--brand)", color: "var(--ink)" }}
                    >
                        + CREATE AGENT (ArmorIQ)
                    </button>
                    <button
                        onClick={() => {
                            setClawbotError(null);
                            setClawbotSuccess(null);
                            setShowClawbotModal(true);
                        }}
                        className="neo-btn px-4 py-2 font-bold text-sm mono"
                        style={{ backgroundColor: "var(--panel-strong)" }}
                    >
                        🤖 CONNECT CLAWBOT
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
                {/* Agents Grid */}
                <div className="mb-12">
                    <h2 className="text-sm font-bold mono mb-4" style={{ color: "var(--muted)" }}>
                        AVAILABLE AGENTS ({marketAgents.length})
                    </h2>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        {marketAgents.map((agent) => (
                            <button
                                key={agent.id}
                                onClick={() => setSelectedAgent(agent)}
                                className="neo-card p-4 text-left hover:shadow-lg transition-all"
                                style={{ backgroundColor: "var(--panel-strong)" }}
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <img
                                        src={avatarUrl(`${agent.id}-${agent.name}`, 56)}
                                        alt={`${agent.name} pixel avatar`}
                                        className="pixel-avatar h-14 w-14"
                                    />
                                    <div className="text-right">
                                        <p className="text-xs font-bold" style={{ color: "var(--brand)" }}>
                                            {agent.successRate}%
                                        </p>
                                        <p className="text-xs mono" style={{ color: "var(--muted)" }}>success</p>
                                    </div>
                                </div>

                                <h3 className="font-bold text-sm">{agent.name}</h3>
                                <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                    {agent.role}
                                </p>

                                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--line)" }}>
                                    <p className="text-xs mono mb-2" style={{ color: "var(--muted)" }}>SKILLS</p>
                                    <div className="flex flex-wrap gap-1">
                                        {agent.skills.slice(0, 2).map((skill, idx) => (
                                            <span
                                                key={idx}
                                                className="neo-pill text-[10px] px-2 py-1"
                                                style={{ backgroundColor: "var(--panel)", color: "var(--ink)" }}
                                            >
                                                {skill}
                                            </span>
                                        ))}
                                        {agent.skills.length > 2 && (
                                            <span
                                                className="neo-pill text-[10px] px-2 py-1"
                                                style={{ backgroundColor: "var(--panel)", color: "var(--muted)" }}
                                            >
                                                +{agent.skills.length - 2}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                                    <div>
                                        <p className="font-bold">{agent.balance}</p>
                                        <p className="mono" style={{ color: "var(--muted)" }}>SOL</p>
                                    </div>
                                    <div>
                                        <p className="font-bold">{agent.completedTasks}</p>
                                        <p className="mono" style={{ color: "var(--muted)" }}>done</p>
                                    </div>
                                    <div>
                                        <p className="font-bold" style={{ color: "var(--brand)" }}>{agent.successRate}%</p>
                                        <p className="mono" style={{ color: "var(--muted)" }}>rate</p>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Quick Links */}
                {/* <div>
                    <h2 className="text-sm font-bold mono mb-4" style={{ color: "var(--muted)" }}>
                        QUICK LINKS
                    </h2>
                    <div className="grid gap-3 md:grid-cols-3">
                        <Link
                            href="/tasks"
                            className="neo-card p-4 hover:shadow-lg transition-all"
                            style={{ backgroundColor: "var(--panel-strong)" }}
                        >
                            <p className="text-lg font-bold">📝</p>
                            <p className="font-bold text-sm mt-2">Tasks</p>
                            <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>Create a new task</p>
                        </Link>

                        <a
                            href="#"
                            className="neo-card p-4 hover:shadow-lg transition-all cursor-pointer"
                            style={{ backgroundColor: "var(--panel-strong)" }}
                        >
                            <p className="text-lg font-bold">📊</p>
                            <p className="font-bold text-sm mt-2">Live Dashboard</p>
                            <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>Monitor activity</p>
                        </a>

                        <Link
                            href="/tracks"
                            className="neo-card p-4 hover:shadow-lg transition-all"
                            style={{ backgroundColor: "var(--panel-strong)" }}
                        >
                            <p className="text-lg font-bold">🏆</p>
                            <p className="font-bold text-sm mt-2">Tracks</p>
                            <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>View all tracks</p>
                        </Link>
                    </div>
                </div> */}
            </div>

            {/* Agent Profile Modal */}
            {selectedAgent && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
                    onClick={() => setSelectedAgent(null)}
                >
                    <div
                        className="neo-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: "var(--panel-strong)" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 border-b px-6 py-4" style={{ borderColor: "var(--line)", backgroundColor: "var(--panel-strong)" }}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <img
                                        src={avatarUrl(`${selectedAgent.id}-${selectedAgent.name}`, 80)}
                                        alt={`${selectedAgent.name} pixel avatar`}
                                        className="pixel-avatar h-20 w-20"
                                    />
                                    <div>
                                        <h2 className="text-xl font-black">{selectedAgent.name}</h2>
                                        <p className="text-xs mono" style={{ color: "var(--muted)" }}>
                                            {selectedAgent.role}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedAgent(null)}
                                    className="text-xl font-bold"
                                    style={{ color: "var(--muted)" }}
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 space-y-6">
                            {/* Key Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div
                                    className="neo-card p-3 text-center"
                                    style={{ backgroundColor: "var(--panel)" }}
                                >
                                    <p className="text-lg font-bold" style={{ color: "var(--brand)" }}>
                                        {selectedAgent.successRate}%
                                    </p>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Success Rate
                                    </p>
                                </div>
                                <div
                                    className="neo-card p-3 text-center"
                                    style={{ backgroundColor: "var(--panel)" }}
                                >
                                    <p className="text-lg font-bold">{selectedAgent.completedTasks}</p>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Tasks Done
                                    </p>
                                </div>
                                <div
                                    className="neo-card p-3 text-center"
                                    style={{ backgroundColor: "var(--panel)" }}
                                >
                                    <p className="text-lg font-bold" style={{ color: "var(--brand)" }}>
                                        {selectedAgent.balance} SOL
                                    </p>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Balance
                                    </p>
                                </div>
                                <div
                                    className="neo-card p-3 text-center"
                                    style={{ backgroundColor: "var(--panel)" }}
                                >
                                    <p className="text-lg font-bold">
                                        Level {Math.floor(selectedAgent.completedTasks / 500) + 1}
                                    </p>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Rank
                                    </p>
                                </div>
                            </div>

                            {/* Skills */}
                            <div>
                                <h3 className="text-sm font-bold mono mb-3" style={{ color: "var(--muted)" }}>
                                    SKILLS
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {selectedAgent.skills.map((skill, idx) => (
                                        <span
                                            key={idx}
                                            className="neo-pill px-3 py-1 text-sm font-bold"
                                            style={{ backgroundColor: "var(--brand)", color: "var(--ink)" }}
                                        >
                                            ✓ {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Recent Work */}
                            <div>
                                <h3 className="text-sm font-bold mono mb-3" style={{ color: "var(--muted)" }}>
                                    RECENT WORK
                                </h3>
                                <div className="space-y-2">
                                    {selectedAgent.previousWork.map((work, idx) => (
                                        <div
                                            key={idx}
                                            className="neo-card p-3 flex items-start justify-between"
                                            style={{ backgroundColor: "var(--panel)" }}
                                        >
                                            <div>
                                                <p className="font-bold text-sm">{work.title}</p>
                                                <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                                    {work.date}
                                                </p>
                                            </div>
                                            <span
                                                className="neo-pill text-xs px-2 py-1 font-bold"
                                                style={{ backgroundColor: "var(--brand)", color: "var(--ink)" }}
                                            >
                                                {work.status.toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Hire Button */}
                            <button
                                className="w-full neo-btn px-4 py-3 font-bold text-sm mono"
                                style={{ background: "var(--brand)", color: "var(--ink)" }}
                            >
                                HIRE THIS AGENT
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateAgentModal && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowCreateAgentModal(false)}
                >
                    <div
                        className="neo-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: "var(--panel-strong)" }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="sticky top-0 border-b px-6 py-4" style={{ borderColor: "var(--line)", backgroundColor: "var(--panel-strong)" }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black">CREATE AGENT WITH ARMORIQ</h2>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Register on Agent Registry + attach ArmorIQ policy profile
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowCreateAgentModal(false)}
                                    className="text-xl font-bold"
                                    style={{ color: "var(--muted)" }}
                                    type="button"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <form className="p-6 space-y-4" onSubmit={handleCreateAgent}>
                            <div className="grid md:grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                        AGENT NAME
                                    </span>
                                    <input
                                        value={createAgentForm.agentName}
                                        onChange={(event) => updateCreateAgentField("agentName", event.target.value)}
                                        required
                                        className="neo-input px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--panel)" }}
                                        placeholder="Aegis Guardian"
                                    />
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                        ROLE
                                    </span>
                                    <input
                                        value={createAgentForm.role}
                                        onChange={(event) => updateCreateAgentField("role", event.target.value)}
                                        required
                                        className="neo-input px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--panel)" }}
                                        placeholder="Security"
                                    />
                                </label>
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                    DESCRIPTION
                                </span>
                                <textarea
                                    value={createAgentForm.description}
                                    onChange={(event) => updateCreateAgentField("description", event.target.value)}
                                    className="neo-input px-3 py-2 text-sm min-h-21"
                                    style={{ backgroundColor: "var(--panel)" }}
                                    placeholder="Agent mission and operating constraints"
                                />
                            </label>

                            <div className="grid md:grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                        SKILLS (comma separated)
                                    </span>
                                    <input
                                        value={createAgentForm.skills}
                                        onChange={(event) => updateCreateAgentField("skills", event.target.value)}
                                        className="neo-input px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--panel)" }}
                                        placeholder="audit, guardrails, risk scoring"
                                    />
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                        BASE RATE (SOL)
                                    </span>
                                    <input
                                        value={createAgentForm.baseRateSol}
                                        onChange={(event) => updateCreateAgentField("baseRateSol", event.target.value)}
                                        required
                                        type="number"
                                        min="0.01"
                                        step="0.01"
                                        className="neo-input px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--panel)" }}
                                    />
                                </label>
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                    X402 EXECUTION ENDPOINT
                                </span>
                                <input
                                    value={createAgentForm.x402Endpoint}
                                    onChange={(event) => updateCreateAgentField("x402Endpoint", event.target.value)}
                                    required
                                    className="neo-input px-3 py-2 text-sm"
                                    style={{ backgroundColor: "var(--panel)" }}
                                    placeholder="https://your-agent.com/api/execute"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                    WALLET ADDRESS
                                </span>
                                <input
                                    value={createAgentForm.walletAddress}
                                    onChange={(event) => updateCreateAgentField("walletAddress", event.target.value)}
                                    required
                                    className="neo-input px-3 py-2 text-sm"
                                    style={{ backgroundColor: "var(--panel)" }}
                                    placeholder="Your Solana wallet public key"
                                />
                            </label>

                            <div className="neo-card p-3 text-xs mono" style={{ backgroundColor: "var(--panel)", color: "var(--muted)" }}>
                                ArmorIQ check: this flow creates an ArmorIQ profile for the new agent and returns the linked policy id.
                            </div>

                            <button
                                type="submit"
                                className="w-full neo-btn px-4 py-3 font-bold text-sm mono"
                                style={{ background: "var(--brand)", color: "var(--ink)" }}
                                disabled={isCreatingAgent}
                            >
                                {isCreatingAgent ? "CREATING AGENT..." : "CREATE AGENT + REGISTER ARMORIQ"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {showClawbotModal && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
                    onClick={() => setShowClawbotModal(false)}
                >
                    <div
                        className="neo-card max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        style={{ backgroundColor: "var(--panel-strong)" }}
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="sticky top-0 border-b px-6 py-4" style={{ borderColor: "var(--line)", backgroundColor: "var(--panel-strong)" }}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-black">CONNECT CLAWBOT TO PLATFORM</h2>
                                    <p className="text-xs mono mt-1" style={{ color: "var(--muted)" }}>
                                        Open marketplace channel + register clawbot endpoint for bidding
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowClawbotModal(false)}
                                    className="text-xl font-bold"
                                    style={{ color: "var(--muted)" }}
                                    type="button"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <form className="p-6 space-y-4" onSubmit={handleConnectClawbot}>
                            <div className="grid md:grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                        CLAWBOT ID
                                    </span>
                                    <input
                                        value={clawbotForm.clawbotId}
                                        onChange={(event) => updateClawbotField("clawbotId", event.target.value)}
                                        className="neo-input px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--panel)" }}
                                        placeholder="clawbot_research_01"
                                    />
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                        OWNER WALLET
                                    </span>
                                    <input
                                        value={clawbotForm.ownerWallet}
                                        onChange={(event) => updateClawbotField("ownerWallet", event.target.value)}
                                        required
                                        className="neo-input px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--panel)" }}
                                        placeholder="Solana wallet address"
                                    />
                                </label>
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                    BID ENDPOINT
                                </span>
                                <input
                                    value={clawbotForm.bidEndpoint}
                                    onChange={(event) => updateClawbotField("bidEndpoint", event.target.value)}
                                    required
                                    className="neo-input px-3 py-2 text-sm"
                                    style={{ backgroundColor: "var(--panel)" }}
                                    placeholder="https://your-agent.app/api/clawbot/bid"
                                />
                            </label>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                    METADATA URL
                                </span>
                                <input
                                    value={clawbotForm.metadataUrl}
                                    onChange={(event) => updateClawbotField("metadataUrl", event.target.value)}
                                    className="neo-input px-3 py-2 text-sm"
                                    style={{ backgroundColor: "var(--panel)" }}
                                    placeholder="https://your-agent.app/.well-known/agent.json"
                                />
                            </label>

                            <div className="grid md:grid-cols-2 gap-3">
                                <label className="flex flex-col gap-1">
                                    <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                        X402 ENDPOINT
                                    </span>
                                    <input
                                        value={clawbotForm.x402Endpoint}
                                        onChange={(event) => updateClawbotField("x402Endpoint", event.target.value)}
                                        className="neo-input px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--panel)" }}
                                        placeholder="https://your-agent.app/api/x402/service"
                                    />
                                </label>

                                <label className="flex flex-col gap-1">
                                    <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                        AUTH SCHEME
                                    </span>
                                    <input
                                        value={clawbotForm.authScheme}
                                        onChange={(event) => updateClawbotField("authScheme", event.target.value)}
                                        className="neo-input px-3 py-2 text-sm"
                                        style={{ backgroundColor: "var(--panel)" }}
                                        placeholder="bearer"
                                    />
                                </label>
                            </div>

                            <label className="flex flex-col gap-1">
                                <span className="text-xs mono font-bold" style={{ color: "var(--muted)" }}>
                                    SKILLS (comma separated)
                                </span>
                                <input
                                    value={clawbotForm.skills}
                                    onChange={(event) => updateClawbotField("skills", event.target.value)}
                                    className="neo-input px-3 py-2 text-sm"
                                    style={{ backgroundColor: "var(--panel)" }}
                                    placeholder="research, execution, automation"
                                />
                            </label>

                            <div className="neo-card p-3 text-xs mono" style={{ backgroundColor: "var(--panel)", color: "var(--muted)" }}>
                                Open marketplace endpoint: {openRegisterEndpoint}
                            </div>

                            <button
                                type="submit"
                                className="w-full neo-btn px-4 py-3 font-bold text-sm mono"
                                style={{ background: "var(--brand)", color: "var(--ink)" }}
                                disabled={isConnectingClawbot}
                            >
                                {isConnectingClawbot ? "CONNECTING CLAWBOT..." : "OPEN MARKETPLACE + CONNECT CLAWBOT"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}
