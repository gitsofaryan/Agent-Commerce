"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import Link from "next/link";
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

export default function MyAgentsPage() {
  const [myAgents, setMyAgents] = useState<MarketplaceAgent[]>([]);
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
    setCreateAgentForm((prev) => ({ ...prev, [key]: value }));
  };

  const updateClawbotField = (key: keyof ConnectClawbotFormState, value: string) => {
    setClawbotForm((prev) => ({ ...prev, [key]: value }));
  };

  const refreshMyAgents = async () => {
    try {
      const response = await fetch("/api/agents", {
        method: "GET",
        cache: "no-store",
      });

      const rows = (await response.json()) as ApiAgentRow[];
      if (!response.ok || !Array.isArray(rows) || rows.length === 0) {
        return;
      }

      // In a real app, we would filter for "owned" agents here
      // For now, we'll show agents created with specific sources or IDs if they exist
      const mapped = rows
        .map((row, index) => {
          const role = row.role || "Analytics";
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
            avatar: "📈",
            skills: Array.isArray(row.skills) ? row.skills : ["analysis"],
            balance: Number((runtimeBalance > 0 ? runtimeBalance : syntheticBalance).toFixed(1)),
            successRate,
            completedTasks: row.source === "agent-register-api" ? 0 : 540 + index * 123,
            previousWork: [],
          } satisfies MarketplaceAgent;
        });

      setMyAgents(mapped);
    } catch {
      // Keep empty list or fallback when API is unavailable.
    }
  };

  useEffect(() => {
    void refreshMyAgents();
    
    fetch("/api/marketplace/clawbot/open", {
      method: "GET",
      cache: "no-store",
    })
      .then((res) => res.json())
      .then((json) => {
        if (typeof json?.registerEndpoint === "string" && json.registerEndpoint.trim()) {
          setOpenRegisterEndpoint(json.registerEndpoint);
        }
      })
      .catch(() => {});
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to connect clawbot.");
      }

      setClawbotSuccess(`Clawbot connected: ${result?.clawbot?.id || payload.id}. Marketplace bidding is now open.`);
      setShowClawbotModal(false);
      setClawbotForm(defaultClawbotForm);
      await refreshMyAgents();
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Agent registration failed.");
      }

      setCreateAgentSuccess(`Agent created. ArmorIQ mode: ${result?.armoriq?.mode || "unknown"}`);
      setCreateAgentForm(defaultCreateForm);
      setShowCreateAgentModal(false);
      await refreshMyAgents();
    } catch (error) {
      setCreateAgentError(error instanceof Error ? error.message : "Unable to create agent with ArmorIQ.");
    } finally {
      setIsCreatingAgent(false);
    }
  };

  return (
    <main className="min-h-screen bg-(--bg)">
      <header className="border-b" style={{ borderColor: "var(--line)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          <p className="mono text-xs text-(--muted)">AGENT ONBOARDING & MANAGEMENT</p>
          <h1 className="text-3xl font-black mt-2">MY AGENTS</h1>
          <p className="mt-3 max-w-3xl text-sm text-(--muted)">
            Connect your existing external agents or create new autonomous entities with ArmorIQ policy guardrails.
          </p>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        
        {/* Success/Error Alerts */}
        {(createAgentSuccess || clawbotSuccess) && (
          <div className="neo-card px-4 py-3 mb-5 text-xs mono font-bold bg-(--panel-strong) text-(--ink)">
            ✅ {createAgentSuccess || clawbotSuccess}
          </div>
        )}
        {(createAgentError || clawbotError) && (
          <div className="neo-card px-4 py-3 mb-5 text-xs mono font-bold bg-[#ffe5e5] text-[#7f1d1d] border-[#ef4444]">
            ⚠️ {createAgentError || clawbotError}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-12">
          <button
            onClick={() => {
              setCreateAgentError(null);
              setCreateAgentSuccess(null);
              setShowCreateAgentModal(true);
            }}
            className="neo-btn px-6 py-3 font-bold text-sm mono bg-(--brand) text-(--ink)"
          >
            + CREATE AGENT (ArmorIQ)
          </button>
          <button
            onClick={() => {
              setCreateAgentError(null);
              setCreateAgentSuccess(null);
              setCreateAgentForm({
                agentName: "Vultr Automaton",
                role: "Intelligence",
                description: "Powered by Vultr Serverless Inference models for high-throughput reasoning.",
                skills: "web_search, analysis, vultr_inference",
                baseRateSol: "0.1",
                x402Endpoint: "https://vultr-agent.app/api/execute",
                walletAddress: ""
              });
              setShowCreateAgentModal(true);
            }}
            className="neo-btn px-6 py-3 font-bold text-sm mono shadow-md bg-[#1e3a8a] text-[#60a5fa] border-[#1e40af]"
          >
            ☁️ CREATE VULTR AI AGENT
          </button>
          <button
            onClick={() => {
              setClawbotError(null);
              setClawbotSuccess(null);
              setShowClawbotModal(true);
            }}
            className="neo-btn px-6 py-3 font-bold text-sm mono bg-(--panel-strong)"
          >
            🤖 CONNECT CLAWBOT
          </button>
        </div>

        {/* My Agents Section */}
        <div className="mb-12">
          <h2 className="text-sm font-bold mono mb-6 text-(--muted)">
            YOUR ACTIVE AGENTS ({myAgents.length})
          </h2>
          
          {myAgents.length === 0 ? (
            <div className="neo-card p-12 text-center border-dashed bg-(--panel)">
              <p className="text-(--muted) mono text-sm">No agents registered to your wallet yet.</p>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {myAgents.map((agent) => (
                <div key={agent.id} className="neo-card p-4 bg-(--panel-strong)">
                  <div className="flex items-start justify-between mb-3">
                    <img
                      src={avatarUrl(`${agent.id}-${agent.name}`, 56)}
                      alt={agent.name}
                      className="pixel-avatar h-14 w-14"
                    />
                    <div className="text-right">
                      <p className="text-xs font-bold text-(--brand)">{agent.successRate}%</p>
                      <p className="text-xs mono text-(--muted)">success</p>
                    </div>
                  </div>
                  <h3 className="font-bold text-sm">{agent.name}</h3>
                  <p className="text-xs mono mt-1 text-(--muted)">{agent.role}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals are simplified versions of the ones in marketplace */}
      {showCreateAgentModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowCreateAgentModal(false)}>
          <div className="neo-card max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-(--panel-strong)" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 border-b px-6 py-4 bg-(--panel-strong) border-(--line)">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black uppercase">Create Agent</h2>
                  <p className="text-xs mono mt-1 text-(--muted)">Register on registry + attach ArmorIQ policy</p>
                </div>
                <button onClick={() => setShowCreateAgentModal(false)} className="text-xl font-bold">✕</button>
              </div>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleCreateAgent}>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs mono font-bold text-(--muted)">AGENT NAME</span>
                  <input value={createAgentForm.agentName} onChange={e => updateCreateAgentField("agentName", e.target.value)} required className="neo-input px-3 py-2 text-sm bg-(--panel)" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs mono font-bold text-(--muted)">ROLE</span>
                  <input value={createAgentForm.role} onChange={e => updateCreateAgentField("role", e.target.value)} required className="neo-input px-3 py-2 text-sm bg-(--panel)" />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs mono font-bold text-(--muted)">DESCRIPTION</span>
                <textarea value={createAgentForm.description} onChange={e => updateCreateAgentField("description", e.target.value)} className="neo-input px-3 py-2 text-sm min-h-21 bg-(--panel)" />
              </label>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs mono font-bold text-(--muted)">SKILLS (csv)</span>
                  <input value={createAgentForm.skills} onChange={e => updateCreateAgentField("skills", e.target.value)} className="neo-input px-3 py-2 text-sm bg-(--panel)" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs mono font-bold text-(--muted)">BASE RATE (SOL)</span>
                  <input type="number" step="0.01" value={createAgentForm.baseRateSol} onChange={e => updateCreateAgentField("baseRateSol", e.target.value)} required className="neo-input px-3 py-2 text-sm bg-(--panel)" />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs mono font-bold text-(--muted)">X402 ENDPOINT</span>
                <input value={createAgentForm.x402Endpoint} onChange={e => updateCreateAgentField("x402Endpoint", e.target.value)} required className="neo-input px-3 py-2 text-sm bg-(--panel)" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs mono font-bold text-(--muted)">WALLET ADDRESS</span>
                <input value={createAgentForm.walletAddress} onChange={e => updateCreateAgentField("walletAddress", e.target.value)} required className="neo-input px-3 py-2 text-sm bg-(--panel)" />
              </label>
              <button type="submit" disabled={isCreatingAgent} className="w-full neo-btn py-3 font-bold bg-(--brand) text-(--ink)">
                {isCreatingAgent ? "CREATING..." : "CREATE AGENT"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showClawbotModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={() => setShowClawbotModal(false)}>
          <div className="neo-card max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-(--panel-strong)" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 border-b px-6 py-4 bg-(--panel-strong) border-(--line)">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black uppercase">Connect Clawbot</h2>
                  <p className="text-xs mono mt-1 text-(--muted)">Register your external agent for bidding</p>
                </div>
                <button onClick={() => setShowClawbotModal(false)} className="text-xl font-bold">✕</button>
              </div>
            </div>
            <form className="p-6 space-y-4" onSubmit={handleConnectClawbot}>
              <div className="grid md:grid-cols-2 gap-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs mono font-bold text-(--muted)">CLAWBOT ID</span>
                  <input value={clawbotForm.clawbotId} onChange={e => updateClawbotField("clawbotId", e.target.value)} className="neo-input px-3 py-2 text-sm bg-(--panel)" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="text-xs mono font-bold text-(--muted)">OWNER WALLET</span>
                  <input value={clawbotForm.ownerWallet} onChange={e => updateClawbotField("ownerWallet", e.target.value)} required className="neo-input px-3 py-2 text-sm bg-(--panel)" />
                </label>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-xs mono font-bold text-(--muted)">BID ENDPOINT</span>
                <input value={clawbotForm.bidEndpoint} onChange={e => updateClawbotField("bidEndpoint", e.target.value)} required className="neo-input px-3 py-2 text-sm bg-(--panel)" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs mono font-bold text-(--muted)">METADATA URL</span>
                <input value={clawbotForm.metadataUrl} onChange={e => updateClawbotField("metadataUrl", e.target.value)} className="neo-input px-3 py-2 text-sm bg-(--panel)" />
              </label>
              <button type="submit" disabled={isConnectingClawbot} className="w-full neo-btn py-3 font-bold bg-(--brand) text-(--ink)">
                {isConnectingClawbot ? "CONNECTING..." : "CONNECT CLAWBOT"}
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
