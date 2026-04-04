"use client";

import { getAgentRegistry, AgentIdentity } from "@/lib/metaplex-registry";
import { useEffect, useState } from "react";

export default function AgentRegistry() {
    const [agents, setAgents] = useState<AgentIdentity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAgents = async () => {
            try {
                setLoading(true);
                const registry = getAgentRegistry();
                const agentList = await registry.getAllAgents();
                setAgents(agentList.agents);
            } catch (error) {
                console.error("Failed to fetch agents:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAgents();
    }, []);

    if (loading) {
        return (
            <div className="neo-card p-4" style={{ backgroundColor: "var(--panel)" }}>
                <p className="text-xs mono" style={{ color: "var(--muted)" }}>
                    Loading agents...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <h3 className="text-sm font-bold mono" style={{ color: "var(--muted)" }}>
                REGISTERED AGENTS (METAPLEX)
            </h3>
            {agents.map((agent) => (
                <div
                    key={agent.address}
                    className="neo-card p-3"
                    style={{ backgroundColor: "var(--panel)" }}
                >
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="text-xs font-bold">{agent.name}</p>
                            <p
                                className="text-[10px] mono"
                                style={{ color: "var(--muted)" }}
                            >
                                {agent.address}
                            </p>
                            <p className="text-[10px] mt-1">{agent.description}</p>
                            <p
                                className="text-[9px] mono mt-1"
                                style={{ color: "var(--muted)" }}
                            >
                                Role: {agent.role} • Registered: {new Date(agent.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <span className="neo-pill text-[9px] font-bold">
                            {agent.verified ? "✓ Verified" : "Pending"}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    );
}
